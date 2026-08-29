from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session, selectinload
from backend.database import get_db
from backend.models import Quotation, QuotationItem, Customer, Product, Order, OrderItem, Business, InventoryMovement
from backend.schemas import QuotationCreate, QuotationStatusUpdate, QuotationResponse, OrderResponse
from backend.auth import get_current_business, require_manager_or_owner
from backend.services.sequence_service import get_next_sequence_number

router = APIRouter(prefix="/quotations", tags=["Quotations"])

def generate_quotation_number(db: Session, business_id: str) -> str:
    count = db.query(Quotation).filter(Quotation.business_id == business_id).count()
    return f"QT-{(count + 1):04d}"

def generate_order_number(db: Session, business_id: str) -> str:
    return get_next_sequence_number(db, business_id, "order")

@router.get("", response_model=List[QuotationResponse])
def get_quotations(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    query = db.query(Quotation).filter(Quotation.business_id == business.id)
    if status_filter:
        query = query.filter(Quotation.status == status_filter)
    
    quotations = (
        query.options(selectinload(Quotation.items))
        .outerjoin(
            Customer,
            and_(Customer.id == Quotation.customer_id, Customer.business_id == business.id),
        )
        .with_entities(Quotation, Customer)
        .order_by(Quotation.created_at.desc())
        .all()
    )
    res = []
    for quotation, customer in quotations:
        q_dict = QuotationResponse.model_validate(quotation)
        if customer:
            q_dict.customer_name = customer.name
            q_dict.customer_phone = customer.phone
        res.append(q_dict)
    return res

@router.post("", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_owner)])
def create_quotation(
    req: QuotationCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    customer = db.query(Customer).filter(Customer.id == req.customer_id, Customer.business_id == business.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    product_ids = sorted({item.product_id for item in req.items if item.product_id})
    if product_ids:
        tenant_product_ids = {
            product.id for product in db.query(Product).filter(
                Product.business_id == business.id,
                Product.id.in_(product_ids),
            ).all()
        }
        if tenant_product_ids != set(product_ids):
            raise HTTPException(status_code=404, detail="Product not found")

    subtotal = sum(item.quantity * item.unit_price for item in req.items)
    taxable = max(0.0, subtotal - req.discount)
    tax_amount = round(taxable * (req.tax_rate / 100.0), 2)
    total_amount = round(taxable + tax_amount, 2)

    quotation = Quotation(
        business_id=business.id,
        quotation_number=generate_quotation_number(db, business.id),
        customer_id=req.customer_id,
        status="draft",
        validity_date=req.validity_date,
        notes=req.notes,
        subtotal=subtotal,
        discount=req.discount,
        tax_rate=req.tax_rate,
        tax_amount=tax_amount,
        total_amount=total_amount
    )
    db.add(quotation)
    db.flush()

    for item in req.items:
        q_item = QuotationItem(
            quotation_id=quotation.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.quantity * item.unit_price
        )
        db.add(q_item)

    db.commit()
    db.refresh(quotation)

    res = QuotationResponse.model_validate(quotation)
    res.customer_name = customer.name
    res.customer_phone = customer.phone
    return res

@router.get("/{quotation_id}", response_model=QuotationResponse)
def get_quotation(
    quotation_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.business_id == business.id
    ).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    customer = db.query(Customer).filter(
        Customer.id == quotation.customer_id,
        Customer.business_id == business.id,
    ).first()
    res = QuotationResponse.model_validate(quotation)
    if customer:
        res.customer_name = customer.name
        res.customer_phone = customer.phone
    return res

@router.put("/{quotation_id}/status", response_model=QuotationResponse, dependencies=[Depends(require_manager_or_owner)])
def update_quotation_status(
    quotation_id: str,
    req: QuotationStatusUpdate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.business_id == business.id
    ).with_for_update().first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    if quotation.status == "converted":
        raise HTTPException(status_code=409, detail="Converted quotation status cannot be changed")

    if quotation.status == "rejected" and req.status != "rejected":
        raise HTTPException(status_code=409, detail="Rejected quotation status cannot be changed")

    quotation.status = req.status
    db.commit()
    db.refresh(quotation)

    customer = db.query(Customer).filter(
        Customer.id == quotation.customer_id,
        Customer.business_id == business.id,
    ).first()
    res = QuotationResponse.model_validate(quotation)
    if customer:
        res.customer_name = customer.name
        res.customer_phone = customer.phone
    return res

@router.post("/{quotation_id}/convert-to-order", response_model=OrderResponse, dependencies=[Depends(require_manager_or_owner)])
def convert_to_order(
    quotation_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.business_id == business.id
    ).with_for_update().first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    if quotation.status == "converted":
        raise HTTPException(status_code=409, detail="Quotation has already been converted")
    if quotation.status == "rejected":
        raise HTTPException(status_code=409, detail="Rejected quotation cannot be converted")

    customer = db.query(Customer).filter(
        Customer.id == quotation.customer_id,
        Customer.business_id == business.id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    requested_quantities = {}
    for item in quotation.items:
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
    product_map = {product.id: product for product in locked_products}
    for product_id in sorted(requested_quantities):
        product = product_map.get(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        requested = requested_quantities[product_id]
        if requested > product.current_stock and not business.allow_negative_stock:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}'. Requested: {requested}, Available: {product.current_stock}",
            )

    order_num = generate_order_number(db, business.id)
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    order = Order(
        business_id=business.id,
        order_number=order_num,
        customer_id=quotation.customer_id,
        order_date=today_str,
        expected_delivery_date=quotation.validity_date,
        subtotal=quotation.subtotal,
        discount=quotation.discount,
        tax_amount=quotation.tax_amount,
        total_amount=quotation.total_amount,
        advance_amount=0.0,
        balance_amount=quotation.total_amount,
        payment_status="unpaid",
        order_status="new",
        delivery_status="pending",
        delivery_address=customer.address,
        delivery_notes=quotation.notes
    )
    db.add(order)
    db.flush()

    for item in quotation.items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price
        )
        db.add(order_item)

        # Deduct stock if product exists
        if item.product_id:
            prod = product_map.get(item.product_id)
            if prod:
                prev_stock = prod.current_stock
                prod.current_stock = prod.current_stock - item.quantity
                if business.plan == "standard":
                    db.add(InventoryMovement(
                        business_id=business.id,
                        product_id=prod.id,
                        type="sale",
                        quantity_change=-item.quantity,
                        previous_stock=prev_stock,
                        new_stock=prod.current_stock,
                        reference_id=order.id,
                        notes=f"Order {order_num} from Quotation {quotation.quotation_number}"
                    ))

    quotation.status = "converted"

    db.commit()
    db.refresh(order)

    res = OrderResponse.model_validate(order)
    res.customer_name = customer.name
    res.customer_phone = customer.phone
    return res

@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_manager_or_owner)])
def delete_quotation(
    quotation_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.business_id == business.id
    ).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    if quotation.status == "converted":
        raise HTTPException(status_code=409, detail="Converted quotation cannot be deleted")

    db.delete(quotation)
    db.commit()
    return None
