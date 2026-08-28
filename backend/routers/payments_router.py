from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Payment, Order, Business
from backend.schemas import PaymentCreate, PaymentResponse
from backend.auth import get_current_business

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

@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment(
    req: PaymentCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    order = db.query(Order).filter(
        Order.id == req.order_id,
        Order.business_id == business.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    payment = Payment(
        business_id=business.id,
        order_id=req.order_id,
        amount=req.amount,
        payment_method=req.payment_method.lower(),
        payment_date=req.payment_date,
        reference_number=req.reference_number,
        notes=req.notes
    )
    db.add(payment)
    db.flush()

    # Recalculate Order payments and balance
    all_payments = db.query(Payment).filter(Payment.order_id == order.id).all()
    total_paid = sum(p.amount for p in all_payments)
    
    order.advance_amount = min(total_paid, order.total_amount)
    order.balance_amount = max(0.0, round(order.total_amount - total_paid, 2))

    if order.balance_amount <= 0:
        order.payment_status = "paid"
    elif total_paid > 0:
        order.payment_status = "partially_paid"
    else:
        order.payment_status = "unpaid"

    db.commit()
    db.refresh(payment)
    return payment
