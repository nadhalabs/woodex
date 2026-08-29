from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
import hashlib
import json
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import (
    Order, OrderItem, Customer, Product, Business, InventoryMovement,
    Invoice, InvoiceItem, Payment, CheckoutIdempotency, HeldBill, User
)
from backend.schemas import (
    CounterCheckoutRequest, CounterCheckoutResponse, OrderResponse,
    InvoiceResponse, PaymentResponse, CustomerResponse,
    HeldBillCreateRequest, HeldBillResponse
)
from backend.auth import get_current_business, get_current_user
from backend.services.sequence_service import get_next_sequence_number
from backend.services.billing_calculator import calculate_counter_bill

router = APIRouter(prefix="/counter", tags=["Counter & POS Billing"])


def _checkout_fingerprint(req: CounterCheckoutRequest) -> str:
    payload = req.model_dump(mode="json", exclude={"idempotency_key"})
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _replay_checkout(record: CheckoutIdempotency, fingerprint: str) -> CounterCheckoutResponse:
    stored = record.response_data or {}
    stored_fingerprint = stored.get("request_fingerprint")
    if stored_fingerprint and stored_fingerprint != fingerprint:
        raise HTTPException(status_code=409, detail="Idempotency key was already used for a different request")

    if stored.get("state") == "completed":
        return CounterCheckoutResponse.model_validate(stored["result"])

    # Compatibility with successful records created before request fingerprints were stored.
    if "order" in stored:
        return CounterCheckoutResponse.model_validate(stored)

    raise HTTPException(status_code=409, detail="Checkout with this idempotency key is still in progress")


@router.post("/checkout", response_model=CounterCheckoutResponse, status_code=status.HTTP_201_CREATED)
def counter_checkout(
    req: CounterCheckoutRequest,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    idempotency_key_header: Optional[str] = Header(None, alias="X-Idempotency-Key")
):
    """
    Atomic Point-of-Sale / Front-Counter Checkout with authoritative Decimal financial calculations,
    idempotency duplicate protection, stock validation, and invoice snapshotting.
    """
    body_key = req.idempotency_key.strip() if req.idempotency_key is not None else None
    header_key = idempotency_key_header.strip() if idempotency_key_header is not None else None
    if req.idempotency_key is not None and not body_key:
        raise HTTPException(status_code=400, detail="Idempotency key cannot be empty")
    if idempotency_key_header is not None and not header_key:
        raise HTTPException(status_code=400, detail="Idempotency key cannot be empty")
    if body_key and header_key and body_key != header_key:
        raise HTTPException(status_code=400, detail="Conflicting idempotency keys")

    idempotency_key = body_key or header_key
    if idempotency_key and len(idempotency_key) > 200:
        raise HTTPException(status_code=400, detail="Idempotency key is too long")

    fingerprint = _checkout_fingerprint(req) if idempotency_key else None
    idempotency_record = None
    if idempotency_key:
        cached = (
            db.query(CheckoutIdempotency)
            .filter(
                CheckoutIdempotency.business_id == business.id,
                CheckoutIdempotency.idempotency_key == idempotency_key
            )
            .first()
        )
        if cached:
            return _replay_checkout(cached, fingerprint)

        idempotency_record = CheckoutIdempotency(
            business_id=business.id,
            idempotency_key=idempotency_key,
            response_data={"state": "in_progress", "request_fingerprint": fingerprint},
        )
        db.add(idempotency_record)
        try:
            # The unique constraint serializes concurrent requests using the same key.
            db.flush()
        except IntegrityError:
            db.rollback()
            cached = (
                db.query(CheckoutIdempotency)
                .filter(
                    CheckoutIdempotency.business_id == business.id,
                    CheckoutIdempotency.idempotency_key == idempotency_key,
                )
                .first()
            )
            if cached:
                return _replay_checkout(cached, fingerprint)
            raise

    # 1. Resolve or Create Customer
    customer = None
    if req.customer_id:
        customer = db.query(Customer).filter(
            Customer.id == req.customer_id,
            Customer.business_id == business.id
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

    if not customer and req.customer_phone:
        # Search by phone for this business
        customer = db.query(Customer).filter(
            Customer.business_id == business.id,
            Customer.phone == req.customer_phone.strip()
        ).first()

    if not customer:
        cust_name = req.customer_name.strip() if req.customer_name else "Walk-in Customer"
        cust_phone = req.customer_phone.strip() if req.customer_phone else "0000000000"
        
        # Check if walk-in customer already exists
        if cust_name == "Walk-in Customer" and cust_phone == "0000000000":
            customer = db.query(Customer).filter(
                Customer.business_id == business.id,
                Customer.name == "Walk-in Customer",
                Customer.phone == "0000000000"
            ).first()

        if not customer:
            customer = Customer(
                business_id=business.id,
                name=cust_name,
                phone=cust_phone,
                address=req.customer_address,
                gstin=req.customer_gstin
            )
            db.add(customer)
            db.flush()

    # 2. Validate Items & Stock Availability
    if not req.items or len(req.items) == 0:
        raise HTTPException(status_code=400, detail="Bill must contain at least one item")

    requested_quantities: Dict[str, int] = {}
    for item in req.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail=f"Invalid quantity {item.quantity} for item '{item.product_name}'")
        if item.product_id:
            requested_quantities[item.product_id] = requested_quantities.get(item.product_id, 0) + item.quantity

    locked_products = []
    if requested_quantities:
        locked_products = (
            db.query(Product)
            .filter(
                Product.business_id == business.id,
                Product.id.in_(sorted(requested_quantities)),
            )
            .order_by(Product.id)
            .with_for_update()
            .all()
        )
    product_map: Dict[str, Product] = {product.id: product for product in locked_products}

    for product_id in sorted(requested_quantities):
        prod = product_map.get(product_id)
        if not prod:
            raise HTTPException(status_code=404, detail="Product not found")
        requested = requested_quantities[product_id]
        if requested > prod.current_stock and not business.allow_negative_stock:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{prod.name}'. Requested: {requested}, Available: {prod.current_stock}"
            )

    for item in req.items:
        if item.product_id:
            prod = product_map[item.product_id]
            if current_user.role == "staff" and item.unit_price < prod.selling_price:
                raise HTTPException(
                    status_code=403,
                    detail=f"Staff cannot override unit price below default selling price (₹{prod.selling_price}) for '{prod.name}'"
                )

    # 3. Authoritative Financial Calculations via Decimal
    calc = calculate_counter_bill(
        items=req.items,
        bill_discount=req.bill_discount,
        discount_type=req.discount_type,
        tax_rate=req.tax_rate if req.tax_rate is not None else (business.default_tax_rate or 18.0),
        tax_inclusive=req.tax_inclusive if req.tax_inclusive is not None else bool(business.tax_inclusive),
        paid_amount=req.paid_amount
    )
    if req.paid_amount > calc["total_amount"]:
        raise HTTPException(status_code=400, detail="Paid amount cannot exceed order total")

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    is_direct_sale = req.sale_type == "direct_sale"

    # 4. Generate Concurrency-Safe Order Number
    order_num = get_next_sequence_number(db, business.id, "order")

    order = Order(
        business_id=business.id,
        order_number=order_num,
        customer_id=customer.id,
        order_date=today_str,
        expected_delivery_date=today_str if is_direct_sale else req.expected_delivery_date,
        custom_specs=req.custom_specs,
        subtotal=calc["subtotal"],
        discount=calc["discount"],
        tax_rate=calc["tax_rate"],
        tax_amount=calc["tax_amount"],
        tax_inclusive=calc["tax_inclusive"],
        total_amount=calc["total_amount"],
        advance_amount=calc["paid_amount"],
        balance_amount=calc["balance_amount"],
        payment_status=calc["payment_status"],
        order_status="delivered" if is_direct_sale else "confirmed",
        delivery_status="delivered" if is_direct_sale else "pending",
        delivery_address=req.delivery_address or customer.address,
        delivery_notes=req.delivery_notes
    )
    db.add(order)
    db.flush()

    # 5. Create Order Items & Deduct Stock
    for item_data in calc["items"]:
        prod_id = item_data["product_id"]
        sku_val = item_data["sku"]
        if prod_id and prod_id in product_map and not sku_val:
            sku_val = product_map[prod_id].sku

        order_item = OrderItem(
            order_id=order.id,
            product_id=prod_id,
            product_name=item_data["product_name"],
            sku=sku_val,
            variant_name=item_data["variant_name"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            total_price=item_data["total_price"]
        )
        db.add(order_item)

        # Stock deduction
        if prod_id and prod_id in product_map:
            prod = product_map[prod_id]
            prev_stock = prod.current_stock
            prod.current_stock = prod.current_stock - item_data["quantity"]

            if business.plan == "standard":
                db.add(InventoryMovement(
                    business_id=business.id,
                    product_id=prod.id,
                    type="sale",
                    quantity_change=-item_data["quantity"],
                    previous_stock=prev_stock,
                    new_stock=prod.current_stock,
                    reference_id=order.id,
                    notes=f"Counter {'Direct Sale' if is_direct_sale else 'Order'} {order_num}"
                ))

    # 6. Generate Invoice with Immutable Historical Snapshot
    inv_num = get_next_sequence_number(db, business.id, "invoice")
    invoice = Invoice(
        business_id=business.id,
        invoice_number=inv_num,
        order_id=order.id,
        customer_id=customer.id,
        issue_date=today_str,
        due_date=req.expected_delivery_date if not is_direct_sale else today_str,
        gstin=customer.gstin or business.gstin,
        
        # Snapshots
        customer_name=customer.name,
        customer_phone=customer.phone,
        customer_address=customer.address,
        customer_gstin=customer.gstin,
        business_name=business.name,
        business_address=business.address,
        business_phone=business.phone,
        business_gstin=business.gstin,
        staff_name=current_user.name,

        subtotal=calc["subtotal"],
        discount=calc["discount"],
        tax_rate=calc["tax_rate"],
        tax_amount=calc["tax_amount"],
        tax_inclusive=calc["tax_inclusive"],
        total_amount=calc["total_amount"],
        paid_amount=calc["paid_amount"],
        balance_amount=calc["balance_amount"],
        notes=f"Generated at Counter by {current_user.name}"
    )
    db.add(invoice)
    db.flush()

    for item_data in calc["items"]:
        inv_item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=item_data["product_id"],
            product_name=item_data["product_name"],
            sku=item_data["sku"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            discount=item_data["discount"],
            tax_rate=calc["tax_rate"],
            tax_amount=0.0,
            total_price=item_data["total_price"]
        )
        db.add(inv_item)

    # 7. Record Payment Ledger Entry if paid > 0
    payment = None
    if calc["paid_amount"] > 0:
        payment = Payment(
            business_id=business.id,
            order_id=order.id,
            invoice_id=invoice.id,
            amount=calc["paid_amount"],
            payment_method=req.payment_method.lower(),
            payment_date=today_str,
            reference_number=req.payment_reference,
            notes=req.payment_notes or f"Counter Payment ({req.payment_method.upper()})"
        )
        db.add(payment)
        db.flush()

    db.flush()

    # Prepare response
    order_res = OrderResponse.model_validate(order)
    order_res.customer_name = customer.name
    order_res.customer_phone = customer.phone

    inv_res = InvoiceResponse.model_validate(invoice)
    inv_res.customer_name = customer.name
    inv_res.customer_phone = customer.phone

    pay_res = PaymentResponse.model_validate(payment) if payment else None
    cust_res = CustomerResponse.model_validate(customer)

    result_payload = {
        "order": order_res.model_dump(mode="json"),
        "invoice": inv_res.model_dump(mode="json") if inv_res else None,
        "payment": pay_res.model_dump(mode="json") if pay_res else None,
        "customer": cust_res.model_dump(mode="json")
    }

    # 8. Finalize the idempotency result in the same transaction as the sale.
    if idempotency_record:
        idempotency_record.order_id = order.id
        idempotency_record.invoice_id = invoice.id
        idempotency_record.response_data = {
            "state": "completed",
            "request_fingerprint": fingerprint,
            "result": result_payload,
        }

    db.commit()

    return CounterCheckoutResponse(
        order=order_res,
        invoice=inv_res,
        payment=pay_res,
        customer=cust_res
    )


@router.get("/search-orders", response_model=List[OrderResponse])
def search_counter_orders(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    """
    Search existing orders by Order #, Customer Name, or Phone Number for counter lookups.
    """
    query_str = f"%{q.strip()}%"
    orders = (
        db.query(Order)
        .join(
            Customer,
            and_(Order.customer_id == Customer.id, Customer.business_id == business.id),
        )
        .filter(
            Order.business_id == business.id,
            (
                Order.order_number.ilike(query_str) |
                Customer.name.ilike(query_str) |
                Customer.phone.ilike(query_str)
            )
        )
        .order_by(Order.created_at.desc())
        .limit(20)
        .all()
    )

    res = []
    for ord_obj in orders:
        c = ord_obj.customer
        ord_dict = OrderResponse.model_validate(ord_obj)
        if c and c.business_id == business.id:
            ord_dict.customer_name = c.name
            ord_dict.customer_phone = c.phone
        res.append(ord_dict)
    return res


# Held Bills (Drafts)
@router.get("/held-bills", response_model=List[HeldBillResponse])
def get_held_bills(
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    """List currently held bills for this business."""
    return (
        db.query(HeldBill)
        .filter(HeldBill.business_id == business.id)
        .order_by(HeldBill.created_at.desc())
        .all()
    )


@router.post("/held-bills", response_model=HeldBillResponse, status_code=status.HTTP_201_CREATED)
def create_held_bill(
    req: HeldBillCreateRequest,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    """Hold an active counter bill for later resumption."""
    held = HeldBill(
        business_id=business.id,
        hold_label=req.hold_label or "Held Bill",
        bill_data=req.bill_data
    )
    db.add(held)
    db.commit()
    db.refresh(held)
    return held


@router.delete("/held-bills/{held_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_held_bill(
    held_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    """Resume or discard a held bill."""
    held = (
        db.query(HeldBill)
        .filter(HeldBill.id == held_id, HeldBill.business_id == business.id)
        .first()
    )
    if not held:
        raise HTTPException(status_code=404, detail="Held bill not found")
    db.delete(held)
    db.commit()
    return None
