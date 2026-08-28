from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Supplier, Business
from backend.schemas import SupplierCreate, SupplierResponse
from backend.auth import get_current_business, require_standard_plan

router = APIRouter(prefix="/suppliers", tags=["Suppliers (Standard)"])

@router.get("", response_model=List[SupplierResponse])
def get_suppliers(
    db: Session = Depends(get_db),
    business: Business = Depends(require_standard_plan)
):
    return db.query(Supplier).filter(Supplier.business_id == business.id).order_by(Supplier.name.asc()).all()

@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    req: SupplierCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(require_standard_plan)
):
    supplier = Supplier(
        business_id=business.id,
        name=req.name,
        phone=req.phone,
        address=req.address,
        gstin=req.gstin,
        notes=req.notes
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(require_standard_plan)
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.business_id == business.id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(supplier)
    db.commit()
    return None
