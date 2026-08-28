from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Order, OrderItem, Customer, Product, Business, InventoryMovement
from backend.schemas import OrderCreate, OrderStatusUpdate, OrderResponse
from backend.auth import get_current_business

from backend.services.sequence_service import get_next_sequence_number

router = APIRouter(prefix="/orders", tags=["Orders"])

def generate_order_number(db: Session, business_id: str) -> str:
    return get_next_sequence_number(db, business_id, "order")

@router.get("", response_model=List[OrderResponse])
def get_orders(
    status_filter: Optional[str] = Query(None, description="Filter by order_status"),
    payment_status_filter: Optional[str] = Query(None, description="Filter by payment_status"),
    delivery_status_filter: Optional[str] = Query(None, description="Filter by delivery_status"),
    customer_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    query = db.query(Order).filter(Order.business_id == business.id)

    if status_filter:
        query = query.filter(Order.order_status == status_filter.lower())
    if payment_status_filter:
        query = query.filter(Order.payment_status == payment_status_filter.lower())
    if delivery_status_filter:
        query = query.filter(Order.delivery_status == delivery_status_filter.lower())
    if customer_id:
        query = query.filter(Order.customer_id == customer_id)

    orders = query.order_by(Order.created_at.desc()).all()
    res = []
    for ord_obj in orders:
        c = db.query(Customer).filter(Customer.id == ord_obj.customer_id).first()
        ord_dict = OrderResponse.model_validate(ord_obj)
        if c:
            ord_dict.customer_name = c.name
            ord_dict.customer_phone = c.phone
        res.append(ord_dict)
    return res

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    req: OrderCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    customer = db.query(Customer).filter(Customer.id == req.customer_id, Customer.business_id == business.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    subtotal = sum(item.quantity * item.unit_price for item in req.items)
    taxable = max(0.0, subtotal - req.discount)
    total_amount = round(taxable + req.tax_amount, 2)
    advance = min(req.advance_amount, total_amount)
    balance = max(0.0, round(total_amount - advance, 2))

    if advance >= total_amount and total_amount > 0:
        pay_status = "paid"
    elif advance > 0:
        pay_status = "partially_paid"
    else:
        pay_status = "unpaid"

    order_num = generate_order_number(db, business.id)

    order = Order(
        business_id=business.id,
        order_number=order_num,
        customer_id=req.customer_id,
        order_date=req.order_date,
        expected_delivery_date=req.expected_delivery_date,
        custom_specs=req.custom_specs,
        subtotal=subtotal,
        discount=req.discount,
        tax_amount=req.tax_amount,
        total_amount=total_amount,
        advance_amount=advance,
        balance_amount=balance,
        payment_status=pay_status,
        order_status="new",
        delivery_status="pending",
        delivery_address=req.delivery_address or customer.address,
        delivery_notes=req.delivery_notes
    )
    db.add(order)
    db.flush()

    for item in req.items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            product_name=item.product_name,
            variant_name=item.variant_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.quantity * item.unit_price
        )
        db.add(order_item)

        # Deduct stock if product reference exists
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
                        notes=f"Order {order_num}"
                    ))

    db.commit()
    db.refresh(order)

    res = OrderResponse.model_validate(order)
    res.customer_name = customer.name
    res.customer_phone = customer.phone
    return res

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.business_id == business.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    res = OrderResponse.model_validate(order)
    if customer:
        res.customer_name = customer.name
        res.customer_phone = customer.phone
    return res

@router.put("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    req: OrderStatusUpdate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.business_id == business.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    valid_order_statuses = ["new", "confirmed", "in_progress", "ready", "out_for_delivery", "delivered"]
    valid_delivery_statuses = ["pending", "scheduled", "out_for_delivery", "delivered"]

    if req.order_status:
        st = req.order_status.lower()
        if st in valid_order_statuses:
            order.order_status = st
            # Sync delivery status if order is marked out for delivery or delivered
            if st == "out_for_delivery":
                order.delivery_status = "out_for_delivery"
            elif st == "delivered":
                order.delivery_status = "delivered"

    if req.delivery_status:
        dst = req.delivery_status.lower()
        if dst in valid_delivery_statuses:
            order.delivery_status = dst

    db.commit()
    db.refresh(order)

    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    res = OrderResponse.model_validate(order)
    if customer:
        res.customer_name = customer.name
        res.customer_phone = customer.phone
    return res

@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.business_id == business.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    db.delete(order)
    db.commit()
    return None
