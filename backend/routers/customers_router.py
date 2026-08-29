from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.database import get_db
from backend.models import Customer, Business, Invoice, Order, Quotation
from backend.schemas import CustomerCreate, CustomerUpdate, CustomerResponse
from backend.auth import get_current_business, require_manager_or_owner

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def get_customers(
    q: Optional[str] = Query(None, description="Search by name or phone"),
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    query = db.query(Customer).filter(Customer.business_id == business.id)
    if q:
        search_pattern = f"%{q}%"
        query = query.filter(
            or_(
                Customer.name.ilike(search_pattern),
                Customer.phone.ilike(search_pattern)
            )
        )
    customers = query.order_by(Customer.created_at.desc()).all()

    result = []
    for c in customers:
        orders = db.query(Order).filter(Order.business_id == business.id, Order.customer_id == c.id).all()
        pending_balance = sum(o.balance_amount for o in orders)
        c_dict = CustomerResponse.model_validate(c)
        c_dict.pending_balance = pending_balance
        c_dict.total_orders_count = len(orders)
        result.append(c_dict)

    return result

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    req: CustomerCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    new_customer = Customer(
        business_id=business.id,
        name=req.name,
        phone=req.phone,
        address=req.address,
        notes=req.notes
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == business.id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    orders = db.query(Order).filter(Order.business_id == business.id, Order.customer_id == customer.id).all()
    res = CustomerResponse.model_validate(customer)
    res.pending_balance = sum(o.balance_amount for o in orders)
    res.total_orders_count = len(orders)
    return res

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: str,
    req: CustomerUpdate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == business.id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if req.name is not None:
        customer.name = req.name
    if req.phone is not None:
        customer.phone = req.phone
    if req.address is not None:
        customer.address = req.address
    if req.notes is not None:
        customer.notes = req.notes

    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_manager_or_owner)])
def delete_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == business.id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    has_history = (
        db.query(Order).filter(Order.business_id == business.id, Order.customer_id == customer.id).first()
        or db.query(Invoice).filter(Invoice.business_id == business.id, Invoice.customer_id == customer.id).first()
        or db.query(Quotation).filter(Quotation.business_id == business.id, Quotation.customer_id == customer.id).first()
    )
    if has_history:
        raise HTTPException(status_code=409, detail="Customer with transaction history cannot be deleted")

    db.delete(customer)
    db.commit()
    return None
