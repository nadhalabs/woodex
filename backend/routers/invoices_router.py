from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Invoice, InvoiceItem, Order, Payment, Customer, Product, Business
from backend.schemas import InvoiceCreate, InvoiceResponse
from backend.auth import get_current_business, require_manager_or_owner

from backend.services.sequence_service import get_next_sequence_number

router = APIRouter(prefix="/invoices", tags=["Invoices"])

def generate_invoice_number(db: Session, business_id: str) -> str:
    return get_next_sequence_number(db, business_id, "invoice")

@router.get("", response_model=List[InvoiceResponse])
def get_invoices(
    order_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    query = db.query(Invoice).filter(Invoice.business_id == business.id)
    if order_id:
        query = query.filter(Invoice.order_id == order_id)
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)

    invoices = query.order_by(Invoice.created_at.desc()).all()
    res = []
    for inv in invoices:
        inv_dict = InvoiceResponse.model_validate(inv)
        if not inv_dict.customer_name and inv.customer and inv.customer.business_id == business.id:
            inv_dict.customer_name = inv.customer.name
        res.append(inv_dict)
    return res

@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_owner)])
def create_invoice(
    req: InvoiceCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    order = None
    if req.order_id:
        order = db.query(Order).filter(
            Order.id == req.order_id,
            Order.business_id == business.id,
        ).with_for_update().first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.customer_id != req.customer_id:
            raise HTTPException(status_code=400, detail="Invoice customer must match order customer")
        existing_invoice = db.query(Invoice).filter(
            Invoice.business_id == business.id,
            Invoice.order_id == order.id,
        ).first()
        if existing_invoice:
            raise HTTPException(status_code=409, detail="Invoice already exists for this order")

    customer = db.query(Customer).filter(Customer.id == req.customer_id, Customer.business_id == business.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    product_ids = sorted({item.product_id for item in req.items if item.product_id}) if not order else []
    if product_ids:
        tenant_product_ids = {
            product.id for product in db.query(Product).filter(
                Product.business_id == business.id,
                Product.id.in_(product_ids),
            ).all()
        }
        if tenant_product_ids != set(product_ids):
            raise HTTPException(status_code=404, detail="Product not found")

    if order:
        subtotal = order.subtotal
        discount = order.discount
        tax_amount = order.tax_amount
        total_amount = order.total_amount
    else:
        subtotal = sum(item.quantity * item.unit_price for item in req.items)
        discount = req.discount
        tax_amount = req.tax_amount
        taxable = max(0.0, subtotal - discount)
        total_amount = round(taxable + tax_amount, 2)
    if req.paid_amount > total_amount:
        raise HTTPException(status_code=400, detail="Paid amount cannot exceed invoice total")

    paid_amount = req.paid_amount
    if order:
        paid_amount = min(
            round(sum(payment.amount for payment in order.payments), 2),
            total_amount,
        )
    balance_amount = max(0.0, round(total_amount - paid_amount, 2))

    invoice = Invoice(
        business_id=business.id,
        invoice_number=generate_invoice_number(db, business.id),
        order_id=req.order_id,
        customer_id=req.customer_id,
        issue_date=req.issue_date,
        due_date=order.expected_delivery_date if order else req.due_date,
        gstin=req.gstin or customer.gstin or business.gstin,
        
        # Snapshots
        customer_name=customer.name,
        customer_phone=customer.phone,
        customer_address=customer.address,
        customer_gstin=customer.gstin,
        business_name=business.name,
        business_address=business.address,
        business_phone=business.phone,
        business_gstin=business.gstin,

        subtotal=subtotal,
        discount=discount,
        tax_rate=order.tax_rate if order else 18.0,
        tax_amount=tax_amount,
        tax_inclusive=order.tax_inclusive if order else False,
        total_amount=total_amount,
        paid_amount=paid_amount,
        balance_amount=balance_amount,
        notes=req.notes
    )
    db.add(invoice)
    db.flush()

    if order:
        for item in order.items:
            db.add(InvoiceItem(
                invoice_id=invoice.id,
                product_id=item.product_id,
                product_name=item.product_name,
                sku=item.sku,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
            ))
    else:
        for item in req.items:
            db.add(InvoiceItem(
                invoice_id=invoice.id,
                product_id=item.product_id,
                product_name=item.product_name,
                sku=item.sku,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount=item.discount,
                tax_rate=item.tax_rate,
                tax_amount=item.tax_amount,
                total_price=item.quantity * item.unit_price,
            ))

    db.commit()
    db.refresh(invoice)

    res = InvoiceResponse.model_validate(invoice)
    res.customer_name = customer.name
    return res

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.business_id == business.id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    res = InvoiceResponse.model_validate(invoice)
    if not res.customer_name and invoice.customer and invoice.customer.business_id == business.id:
        res.customer_name = invoice.customer.name
    return res

@router.post("/from-order/{order_id}", response_model=InvoiceResponse, dependencies=[Depends(require_manager_or_owner)])
def create_invoice_from_order(
    order_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.business_id == business.id
    ).with_for_update().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    existing_inv = db.query(Invoice).filter(Invoice.order_id == order.id, Invoice.business_id == business.id).first()
    if existing_inv:
        res = InvoiceResponse.model_validate(existing_inv)
        if not res.customer_name and existing_inv.customer:
            res.customer_name = existing_inv.customer.name
        return res

    customer = db.query(Customer).filter(
        Customer.id == order.customer_id,
        Customer.business_id == business.id,
    ).first()
    total_paid = round(sum(payment.amount for payment in order.payments), 2)
    paid_amount = min(total_paid, order.total_amount)
    balance_amount = max(0.0, round(order.total_amount - paid_amount, 2))

    order.advance_amount = paid_amount
    order.balance_amount = balance_amount
    if order.total_amount > 0 and balance_amount == 0:
        order.payment_status = "paid"
    elif paid_amount > 0:
        order.payment_status = "partially_paid"
    else:
        order.payment_status = "unpaid"

    invoice = Invoice(
        business_id=business.id,
        invoice_number=generate_invoice_number(db, business.id),
        order_id=order.id,
        customer_id=order.customer_id,
        issue_date=order.order_date,
        due_date=order.expected_delivery_date,
        gstin=customer.gstin if customer and customer.gstin else business.gstin,
        
        # Snapshots
        customer_name=customer.name if customer else None,
        customer_phone=customer.phone if customer else None,
        customer_address=order.delivery_address or (customer.address if customer else None),
        customer_gstin=customer.gstin if customer else None,
        business_name=business.name,
        business_address=business.address,
        business_phone=business.phone,
        business_gstin=business.gstin,

        subtotal=order.subtotal,
        discount=order.discount,
        tax_rate=order.tax_rate if hasattr(order, 'tax_rate') else 18.0,
        tax_amount=order.tax_amount,
        tax_inclusive=order.tax_inclusive if hasattr(order, 'tax_inclusive') else False,
        total_amount=order.total_amount,
        paid_amount=paid_amount,
        balance_amount=balance_amount,
        notes=f"Generated from Order {order.order_number}"
    )
    db.add(invoice)
    db.flush()

    for item in order.items:
        p_name = item.product_name
        if item.variant_name:
            p_name += f" ({item.variant_name})"
        inv_item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=item.product_id,
            product_name=p_name,
            sku=item.sku if hasattr(item, 'sku') else None,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price
        )
        db.add(inv_item)

    db.commit()
    db.refresh(invoice)

    res = InvoiceResponse.model_validate(invoice)
    if customer:
        res.customer_name = customer.name
    return res
