from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import InventoryMovement, Product, Business
from backend.schemas import InventoryMovementResponse
from backend.auth import get_current_business, require_standard_plan, require_manager_or_owner

router = APIRouter(prefix="/inventory", tags=["Inventory Movements (Standard)"], dependencies=[Depends(require_manager_or_owner)])

@router.get("/movements", response_model=List[InventoryMovementResponse])
def get_inventory_movements(
    product_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    business: Business = Depends(require_standard_plan)
):
    query = db.query(InventoryMovement).filter(InventoryMovement.business_id == business.id)
    if product_id:
        query = query.filter(InventoryMovement.product_id == product_id)
    
    movements = (
        query.outerjoin(
            Product,
            and_(Product.id == InventoryMovement.product_id, Product.business_id == business.id),
        )
        .with_entities(InventoryMovement, Product.name)
        .order_by(InventoryMovement.created_at.desc())
        .all()
    )
    res = []
    for movement, product_name in movements:
        m_res = InventoryMovementResponse.model_validate(movement)
        if product_name:
            m_res.product_name = product_name
        res.append(m_res)
    return res
