from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Payment, Order, Invoice, Business
from backend.schemas import PaymentCreate, PaymentResponse
from backend.auth import get_current_business, require_manager_or_owner

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.get("", response_model=List[PaymentResponse])
def get_payments(
    order_id: str = None,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    query = db.query(Payment).filter(Payment.business_id == business.id)
    if order_id:
        query = query.filter(Payment.order_id == order_id)
    return query.order_by(Payment.created_at.desc()).all()

@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_owner)])
def record_payment(
    req: PaymentCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    order = db.query(Order).filter(
        Order.id == req.order_id,
        Order.business_id == business.id
    ).with_for_update().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment_method = req.payment_method.lower()
    reference_number = req.reference_number.strip() if req.reference_number else None

    if reference_number:
        duplicate_query = db.query(Payment).filter(
            Payment.business_id == business.id,
            Payment.order_id == order.id,
            Payment.reference_number == reference_number,
        )
    else:
        duplicate_query = db.query(Payment).filter(
            Payment.business_id == business.id,
            Payment.order_id == order.id,
            Payment.amount == req.amount,
            Payment.payment_method == payment_method,
            Payment.payment_date == req.payment_date,
            Payment.reference_number.is_(None),
            Payment.created_at >= datetime.utcnow() - timedelta(minutes=5),
        )
    if duplicate_query.first():
        raise HTTPException(status_code=409, detail="Duplicate payment submission")

    existing_total = round(sum(payment.amount for payment in order.payments), 2)
    remaining_balance = max(0.0, round(order.total_amount - existing_total, 2))
    if req.amount > remaining_balance:
        raise HTTPException(status_code=400, detail="Payment amount cannot exceed order balance")

    invoices = db.query(Invoice).filter(
        Invoice.business_id == business.id,
        Invoice.order_id == order.id,
    ).all()

    payment = Payment(
        business_id=business.id,
        order_id=req.order_id,
        amount=req.amount,
        invoice_id=invoices[0].id if invoices else None,
        payment_method=payment_method,
        payment_date=req.payment_date,
        reference_number=reference_number,
        notes=req.notes
    )
    db.add(payment)
    db.flush()

    # Recalculate Order payments and balance
    total_paid = round(existing_total + req.amount, 2)
    
    order.advance_amount = min(total_paid, order.total_amount)
    order.balance_amount = max(0.0, round(order.total_amount - total_paid, 2))

    if order.balance_amount <= 0:
        order.payment_status = "paid"
    elif total_paid > 0:
        order.payment_status = "partially_paid"
    else:
        order.payment_status = "unpaid"

    for invoice in invoices:
        invoice.paid_amount = min(total_paid, invoice.total_amount)
        invoice.balance_amount = max(0.0, round(invoice.total_amount - invoice.paid_amount, 2))

    db.commit()
    db.refresh(payment)
    return payment
