from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from backend.database import get_db
from backend.models import (
    Product, Business, InventoryMovement, Category, ProductImage,
    InvoiceItem, OrderItem, PurchaseItem, QuotationItem,
    Order, Invoice, Quotation, Purchase,
)
from backend.schemas import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    StockAdjustmentRequest,
    ProductImageCreate,
    ProductImageResponse,
    ProductImageReorderRequest,
)
from backend.auth import get_current_business, require_manager_or_owner

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/categories")
def get_product_categories(
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    """
    Returns categories for current business (backward compatibility).
    """
    categories = (
        db.query(Category)
        .filter(Category.business_id == business.id)
        .order_by(Category.display_order.asc(), Category.name.asc())
        .all()
    )
    return [c.name for c in categories]


@router.get("", response_model=List[ProductResponse])
def get_products(
    q: Optional[str] = Query(None, description="Search name, SKU or category"),
    category: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    low_stock_only: bool = Query(False),
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    query = (
        db.query(Product)
        .options(joinedload(Product.images), joinedload(Product.category_rel))
        .filter(Product.business_id == business.id)
    )

    if category_id:
        query = query.filter(Product.category_id == category_id)
    elif category:
        query = query.filter(
            or_(
                Product.category.ilike(category),
                Product.category_rel.has(Category.name.ilike(category)),
                Product.category_rel.has(Category.slug.ilike(category)),
            )
        )

    if low_stock_only:
        query = query.filter(Product.current_stock <= Product.low_stock_level)

    if q:
        search_pattern = f"%{q}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_pattern),
                Product.category.ilike(search_pattern),
                Product.sku.ilike(search_pattern),
                Product.description.ilike(search_pattern)
            )
        )

    products = query.order_by(Product.name.asc()).all()
    return products


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_owner)])
def create_product(
    req: ProductCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    # Resolve category
    resolved_category_id = None
    resolved_category_name = req.category

    if req.category_id:
        cat = (
            db.query(Category)
            .filter(Category.id == req.category_id, Category.business_id == business.id)
            .first()
        )
        if not cat:
            raise HTTPException(status_code=400, detail="Specified category_id does not exist for this business")
        resolved_category_id = cat.id
        resolved_category_name = cat.name
    elif req.category:
        cat = (
            db.query(Category)
            .filter(
                Category.business_id == business.id,
                or_(
                    Category.name.ilike(req.category.strip()),
                    Category.slug.ilike(req.category.strip().lower())
                )
            )
            .first()
        )
        if cat:
            resolved_category_id = cat.id
            resolved_category_name = cat.name

    product = Product(
        business_id=business.id,
        category_id=resolved_category_id,
        name=req.name.strip(),
        category=resolved_category_name,
        description=req.description,
        sku=req.sku,
        selling_price=req.selling_price,
        cost_price=req.cost_price,
        current_stock=req.current_stock,
        low_stock_level=req.low_stock_level,
        image_url=req.image_url,
        image_public_id=req.image_public_id,
        is_active=req.is_active,
        notes=req.notes,
        variants_json=req.variants_json if business.plan == "standard" else None
    )
    db.add(product)
    db.flush()

    # Process gallery images if provided
    if req.images:
        has_primary = any(img.is_primary for img in req.images)
        for idx, img_in in enumerate(req.images):
            # Enforce max 1 primary; if none marked primary, first image is primary
            is_primary = img_in.is_primary if has_primary else (idx == 0)
            if has_primary and is_primary and idx > 0:
                # If multiple were marked primary in request, only first marked is primary
                is_primary = (idx == [i.is_primary for i in req.images].index(True))

            p_img = ProductImage(
                business_id=business.id,
                product_id=product.id,
                url=img_in.url,
                public_id=img_in.public_id,
                display_order=img_in.display_order if img_in.display_order != 0 else idx,
                is_primary=is_primary,
            )
            db.add(p_img)
            if is_primary:
                product.image_url = img_in.url
                product.image_public_id = img_in.public_id

    db.commit()
    
    # Reload with relationships
    refreshed_product = (
        db.query(Product)
        .options(joinedload(Product.images), joinedload(Product.category_rel))
        .filter(Product.id == product.id, Product.business_id == business.id)
        .first()
    )
    return refreshed_product


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    product = (
        db.query(Product)
        .options(joinedload(Product.images), joinedload(Product.category_rel))
        .filter(
            Product.id == product_id,
            Product.business_id == business.id
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductResponse, dependencies=[Depends(require_manager_or_owner)])
def update_product(
    product_id: str,
    req: ProductUpdate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    product = (
        db.query(Product)
        .options(joinedload(Product.images), joinedload(Product.category_rel))
        .filter(
            Product.id == product_id,
            Product.business_id == business.id
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if req.name is not None:
        product.name = req.name.strip()

    if req.category_id is not None:
        if req.category_id == "":
            product.category_id = None
            product.category = "Uncategorized"
        else:
            cat = (
                db.query(Category)
                .filter(Category.id == req.category_id, Category.business_id == business.id)
                .first()
            )
            if not cat:
                raise HTTPException(status_code=400, detail="Specified category_id does not exist for this business")
            product.category_id = cat.id
            product.category = cat.name
    elif req.category is not None:
        cat = (
            db.query(Category)
            .filter(
                Category.business_id == business.id,
                or_(
                    Category.name.ilike(req.category.strip()),
                    Category.slug.ilike(req.category.strip().lower())
                )
            )
            .first()
        )
        if cat:
            product.category_id = cat.id
            product.category = cat.name
        else:
            product.category = req.category

    if req.description is not None:
        product.description = req.description
    if req.sku is not None:
        product.sku = req.sku
    if req.selling_price is not None:
        product.selling_price = req.selling_price
    if req.cost_price is not None:
        product.cost_price = req.cost_price
    if req.current_stock is not None:
        product.current_stock = req.current_stock
    if req.low_stock_level is not None:
        product.low_stock_level = req.low_stock_level
    if req.image_url is not None:
        product.image_url = req.image_url
    if req.image_public_id is not None:
        product.image_public_id = req.image_public_id
    if req.is_active is not None:
        product.is_active = req.is_active
    if req.notes is not None:
        product.notes = req.notes
    if req.variants_json is not None and business.plan == "standard":
        product.variants_json = req.variants_json

    # If images array explicitly provided in update, sync images
    if req.images is not None:
        # Delete existing images
        db.query(ProductImage).filter(
            ProductImage.product_id == product.id,
            ProductImage.business_id == business.id
        ).delete()
        
        has_primary = any(img.is_primary for img in req.images)
        for idx, img_in in enumerate(req.images):
            is_primary = img_in.is_primary if has_primary else (idx == 0)
            if has_primary and is_primary and idx > 0:
                is_primary = (idx == [i.is_primary for i in req.images].index(True))

            p_img = ProductImage(
                business_id=business.id,
                product_id=product.id,
                url=img_in.url,
                public_id=img_in.public_id,
                display_order=img_in.display_order if img_in.display_order != 0 else idx,
                is_primary=is_primary,
            )
            db.add(p_img)
            if is_primary:
                product.image_url = img_in.url
                product.image_public_id = img_in.public_id

        if not req.images:
            product.image_url = None
            product.image_public_id = None

    db.commit()

    refreshed_product = (
        db.query(Product)
        .options(joinedload(Product.images), joinedload(Product.category_rel))
        .filter(Product.id == product.id, Product.business_id == business.id)
        .first()
    )
    return refreshed_product


@router.post("/{product_id}/adjust-stock", response_model=ProductResponse, dependencies=[Depends(require_manager_or_owner)])
def adjust_stock(
    product_id: str,
    req: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == business.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    prev_stock = product.current_stock
    change = req.new_stock - prev_stock
    product.current_stock = req.new_stock

    # Log movement if standard plan
    if business.plan == "standard":
        movement = InventoryMovement(
            business_id=business.id,
            product_id=product.id,
            type="adjustment",
            quantity_change=change,
            previous_stock=prev_stock,
            new_stock=req.new_stock,
            notes=req.notes
        )
        db.add(movement)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_manager_or_owner)])
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == business.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    referenced = (
        db.query(OrderItem).join(Order, and_(Order.id == OrderItem.order_id, Order.business_id == business.id)).filter(OrderItem.product_id == product.id).first()
        or db.query(InvoiceItem).join(Invoice, and_(Invoice.id == InvoiceItem.invoice_id, Invoice.business_id == business.id)).filter(InvoiceItem.product_id == product.id).first()
        or db.query(QuotationItem).join(Quotation, and_(Quotation.id == QuotationItem.quotation_id, Quotation.business_id == business.id)).filter(QuotationItem.product_id == product.id).first()
        or db.query(PurchaseItem).join(Purchase, and_(Purchase.id == PurchaseItem.purchase_id, Purchase.business_id == business.id)).filter(PurchaseItem.product_id == product.id).first()
        or db.query(InventoryMovement).filter(
            InventoryMovement.business_id == business.id,
            InventoryMovement.product_id == product.id,
        ).first()
    )
    if referenced:
        raise HTTPException(status_code=409, detail="Product with transaction history cannot be deleted")

    db.delete(product)
    db.commit()
    return None


# ----------------------------------------------------
# Product Images Sub-Endpoints
# ----------------------------------------------------

# Static route for reordering before dynamic /{image_id}
@router.put("/{product_id}/images/order", status_code=status.HTTP_200_OK, dependencies=[Depends(require_manager_or_owner)])
def reorder_product_images(
    product_id: str,
    req: ProductImageReorderRequest,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    # Verify product ownership
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == business.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not req.items:
        return {"message": "No items provided"}

    req_ids = [item.id for item in req.items]
    if len(req_ids) != len(set(req_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate image IDs in reorder request"
        )

    # Fetch images belonging to this product & business
    images = (
        db.query(ProductImage)
        .filter(
            ProductImage.product_id == product_id,
            ProductImage.business_id == business.id,
            ProductImage.id.in_(req_ids)
        )
        .all()
    )
    img_map = {img.id: img for img in images}

    if len(img_map) != len(req_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more image IDs are invalid or belong to another product/business"
        )

    for item in req.items:
        img_map[item.id].display_order = item.display_order

    db.commit()
    return {"message": "Images reordered successfully"}


@router.post("/{product_id}/images", response_model=ProductImageResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_owner)])
def add_product_image(
    product_id: str,
    req: ProductImageCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    # 1. Verify product ownership
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == business.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # 2. Check existing images
    existing_images = (
        db.query(ProductImage)
        .filter(
            ProductImage.product_id == product.id,
            ProductImage.business_id == business.id
        )
        .all()
    )

    # If first image or requested primary, make it primary
    is_primary = req.is_primary or (len(existing_images) == 0)

    if is_primary:
        # Enforce maximum one primary image transactionally
        db.query(ProductImage).filter(
            ProductImage.product_id == product.id,
            ProductImage.business_id == business.id
        ).update({"is_primary": False})
        product.image_url = req.url
        product.image_public_id = req.public_id

    display_order = req.display_order
    if display_order == 0 and existing_images:
        max_order = max((img.display_order for img in existing_images), default=0)
        display_order = max_order + 1

    p_img = ProductImage(
        business_id=business.id,
        product_id=product.id,
        url=req.url,
        public_id=req.public_id,
        display_order=display_order,
        is_primary=is_primary,
    )
    db.add(p_img)
    db.commit()
    db.refresh(p_img)
    return p_img


@router.put("/{product_id}/images/{image_id}/primary", response_model=ProductImageResponse, dependencies=[Depends(require_manager_or_owner)])
def set_primary_product_image(
    product_id: str,
    image_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    # Verify product ownership
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == business.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Verify image ownership
    target_img = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product.id,
        ProductImage.business_id == business.id
    ).first()
    if not target_img:
        raise HTTPException(status_code=404, detail="Image not found for this product")

    # Transactionally set all images to is_primary=False, then set this to True
    db.query(ProductImage).filter(
        ProductImage.product_id == product.id,
        ProductImage.business_id == business.id
    ).update({"is_primary": False})

    target_img.is_primary = True
    product.image_url = target_img.url
    product.image_public_id = target_img.public_id

    db.commit()
    db.refresh(target_img)
    return target_img


@router.delete("/{product_id}/images/{image_id}", status_code=status.HTTP_200_OK, dependencies=[Depends(require_manager_or_owner)])
def delete_product_image(
    product_id: str,
    image_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    # Verify product ownership
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == business.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Verify image ownership
    target_img = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product.id,
        ProductImage.business_id == business.id
    ).first()
    if not target_img:
        raise HTTPException(status_code=404, detail="Image not found for this product")

    was_primary = target_img.is_primary
    db.delete(target_img)
    db.flush()

    # If deleted image was primary, promote first remaining image to primary
    if was_primary:
        remaining_first = (
            db.query(ProductImage)
            .filter(
                ProductImage.product_id == product.id,
                ProductImage.business_id == business.id
            )
            .order_by(ProductImage.display_order.asc(), ProductImage.created_at.asc())
            .first()
        )
        if remaining_first:
            remaining_first.is_primary = True
            product.image_url = remaining_first.url
            product.image_public_id = remaining_first.public_id
        else:
            product.image_url = None
            product.image_public_id = None

    db.commit()
    return {"message": "Image deleted successfully"}
