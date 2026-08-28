from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Business
from backend.schemas import BusinessResponse
from backend.auth import get_current_business, get_current_user, User

router = APIRouter(prefix="/business", tags=["Business & Plan Settings"])

class BusinessUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    plan: Optional[str] = None  # "lite" or "standard"
    invoice_prefix: Optional[str] = None
    order_prefix: Optional[str] = None
    default_tax_rate: Optional[float] = None
    tax_inclusive: Optional[bool] = None
    invoice_footer: Optional[str] = None
    allow_negative_stock: Optional[bool] = None

@router.get("", response_model=BusinessResponse)
def get_business_details(
    business: Business = Depends(get_current_business)
):
    return business

@router.put("", response_model=BusinessResponse)
def update_business_details(
    req: BusinessUpdateRequest,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can modify business settings")

    if req.name is not None:
        business.name = req.name
    if req.phone is not None:
        business.phone = req.phone
    if req.address is not None:
        business.address = req.address
    if req.gstin is not None:
        business.gstin = req.gstin
    if req.plan is not None:
        plan_lower = req.plan.lower()
        if plan_lower in ["lite", "standard"]:
            business.plan = plan_lower
    if req.invoice_prefix is not None:
        business.invoice_prefix = req.invoice_prefix.strip()
    if req.order_prefix is not None:
        business.order_prefix = req.order_prefix.strip()
    if req.default_tax_rate is not None:
        business.default_tax_rate = max(0.0, float(req.default_tax_rate))
    if req.tax_inclusive is not None:
        business.tax_inclusive = req.tax_inclusive
    if req.invoice_footer is not None:
        business.invoice_footer = req.invoice_footer
    if req.allow_negative_stock is not None:
        business.allow_negative_stock = req.allow_negative_stock

    db.commit()
    db.refresh(business)
    return business
