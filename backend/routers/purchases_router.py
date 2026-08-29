from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session, selectinload
from backend.database import get_db
from backend.models import Purchase, PurchaseItem, Supplier, Product, Business, InventoryMovement
from backend.schemas import PurchaseCreate, PurchaseResponse
from backend.auth import get_current_business, require_standard_plan, require_manager_or_owner

router = APIRouter(prefix="/purchases", tags=["Purchases (Standard)"], dependencies=[Depends(require_manager_or_owner)])

def generate_purchase_number(db: Session, business_id: str) -> str:
    count = db.query(Purchase).filter(Purchase.business_id == business_id).count()
    return f"PO-{(count + 1):04d}"

@router.get("", response_model=List[PurchaseResponse])
def get_purchases(
    db: Session = Depends(get_db),
    business: Business = Depends(require_standard_plan)
):
    purchases = (
        db.query(Purchase)
        .filter(Purchase.business_id == business.id)
        .options(selectinload(Purchase.items))
        .outerjoin(
            Supplier,
            and_(Supplier.id == Purchase.supplier_id, Supplier.business_id == business.id),
        )
        .with_entities(Purchase, Supplier)
        .order_by(Purchase.created_at.desc())
        .all()
    )
    res = []
    for purchase, supplier in purchases:
        p_res = PurchaseResponse.model_validate(purchase)
        if supplier:
            p_res.supplier_name = supplier.name
        res.append(p_res)
    return res

@router.post("", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
def create_purchase(
    req: PurchaseCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(require_standard_plan)
):
    supplier = db.query(Supplier).filter(Supplier.id == req.supplier_id, Supplier.business_id == business.id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    product_ids = sorted({item.product_id for item in req.items if item.product_id})
    products = []
    if product_ids:
        products = db.query(Product).filter(
            Product.business_id == business.id,
            Product.id.in_(product_ids),
        ).all()
        if {product.id for product in products} != set(product_ids):
            raise HTTPException(status_code=404, detail="Product not found")
    product_map = {product.id: product for product in products}

    subtotal = sum(item.quantity * item.unit_price for item in req.items)
    total_amount = round(subtotal + req.tax_amount, 2)

    po_num = generate_purchase_number(db, business.id)

    purchase = Purchase(
        business_id=business.id,
        purchase_number=po_num,
        supplier_id=req.supplier_id,
        purchase_date=req.purchase_date,
        tax_amount=req.tax_amount,
        total_amount=total_amount,
        payment_status="paid",
        notes=req.notes
    )
    db.add(purchase)
    db.flush()

    for item in req.items:
        p_item = PurchaseItem(
            purchase_id=purchase.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.quantity * item.unit_price
        )
        db.add(p_item)

        # Increment product stock on purchase receipt
        if item.product_id:
            prod = product_map.get(item.product_id)
            if prod:
                prev_stock = prod.current_stock
                prod.current_stock += item.quantity
                db.add(InventoryMovement(
                    business_id=business.id,
                    product_id=prod.id,
                    type="purchase_received",
                    quantity_change=item.quantity,
                    previous_stock=prev_stock,
                    new_stock=prod.current_stock,
                    reference_id=purchase.id,
                    notes=f"Received PO {po_num} from {supplier.name}"
                ))

    db.commit()
    db.refresh(purchase)

    res = PurchaseResponse.model_validate(purchase)
    res.supplier_name = supplier.name
    return res
