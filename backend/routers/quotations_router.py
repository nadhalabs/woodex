from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Quotation, QuotationItem, Customer, Product, Order, OrderItem, Business, InventoryMovement
from backend.schemas import QuotationCreate, QuotationStatusUpdate, QuotationResponse, OrderResponse
from backend.auth import get_current_business

router = APIRouter(prefix="/quotations", tags=["Quotations"])

def generate_quotation_number(db: Session, business_id: str) -> str:
    count = db.query(Quotation).filter(Quotation.business_id == business_id).count()
    return f"QT-{(count + 1):04d}"

def generate_order_number(db: Session, business_id: str) -> str:
    count = db.query(Order).filter(Order.business_id == business_id).count()
    return f"ORD-{(count + 1):04d}"

@router.get("", response_model=List[QuotationResponse])
def get_quotations(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    query = db.query(Quotation).filter(Quotation.business_id == business.id)
    if status_filter:
        query = query.filter(Quotation.status == status_filter)
    
    quotations = query.order_by(Quotation.created_at.desc()).all()
    res = []
    for q in quotations:
        c = db.query(Customer).filter(Customer.id == q.customer_id).first()
        q_dict = QuotationResponse.model_validate(q)
        if c:
            q_dict.customer_name = c.name
            q_dict.customer_phone = c.phone
        res.append(q_dict)
    return res

@router.post("", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_quotation(
    req: QuotationCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    customer = db.query(Customer).filter(Customer.id == req.customer_id, Customer.business_id == business.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

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

    customer = db.query(Customer).filter(Customer.id == quotation.customer_id).first()
    res = QuotationResponse.model_validate(quotation)
    if customer:
        res.customer_name = customer.name
        res.customer_phone = customer.phone
    return res

@router.put("/{quotation_id}/status", response_model=QuotationResponse)
def update_quotation_status(
    quotation_id: str,
    req: QuotationStatusUpdate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.business_id == business.id
    ).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    valid_statuses = ["draft", "sent", "accepted", "rejected"]
    if req.status.lower() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    quotation.status = req.status.lower()
    db.commit()
    db.refresh(quotation)

    customer = db.query(Customer).filter(Customer.id == quotation.customer_id).first()
    res = QuotationResponse.model_validate(quotation)
    if customer:
        res.customer_name = customer.name
        res.customer_phone = customer.phone
    return res

@router.post("/{quotation_id}/convert-to-order", response_model=OrderResponse)
def convert_to_order(
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

    customer = db.query(Customer).filter(Customer.id == quotation.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Mark quotation accepted
    quotation.status = "accepted"

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
            prod = db.query(Product).filter(Product.id == item.product_id, Product.business_id == business.id).first()
            if prod:
                prev_stock = prod.current_stock
                prod.current_stock = max(0, prod.current_stock - item.quantity)
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

    db.commit()
    db.refresh(order)

    res = OrderResponse.model_validate(order)
    res.customer_name = customer.name
    res.customer_phone = customer.phone
    return res

@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
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

    db.delete(quotation)
    db.commit()
    return None
