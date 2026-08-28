import re
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import Category, Product, Business
from backend.schemas import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryReorderRequest,
)
from backend.auth import get_current_business

router = APIRouter(prefix="/categories", tags=["Categories"])

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text or "category"


@router.get("", response_model=List[CategoryResponse])
def get_categories(
    active_only: bool = Query(False, description="Filter only active categories"),
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
):
    query = db.query(Category).filter(Category.business_id == business.id)
    if active_only:
        query = query.filter(Category.is_active.is_(True))

    categories = query.order_by(Category.display_order.asc(), Category.name.asc()).all()

    # Calculate product counts for each category in single query
    counts = (
        db.query(Product.category_id, func.count(Product.id))
        .filter(Product.business_id == business.id, Product.category_id.isnot(None))
        .group_by(Product.category_id)
        .all()
    )
    count_map = {cat_id: count for cat_id, count in counts}

    results = []
    for cat in categories:
        cat_dict = {
            "id": cat.id,
            "business_id": cat.business_id,
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description,
            "image_url": cat.image_url,
            "image_public_id": cat.image_public_id,
            "display_order": cat.display_order,
            "is_active": cat.is_active,
            "product_count": count_map.get(cat.id, 0),
            "created_at": cat.created_at,
            "updated_at": cat.updated_at,
        }
        results.append(cat_dict)

    return results


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    req: CategoryCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
):
    # Determine slug
    raw_slug = req.slug.strip() if req.slug and req.slug.strip() else slugify(req.name)
    final_slug = slugify(raw_slug)

    # Check for duplicate slug within this business
    existing = (
        db.query(Category)
        .filter(Category.business_id == business.id, Category.slug == final_slug)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with slug '{final_slug}' already exists for this business.",
        )

    # If display_order was not specified, assign next order
    display_order = req.display_order
    if display_order == 0:
        max_order = (
            db.query(func.max(Category.display_order))
            .filter(Category.business_id == business.id)
            .scalar()
        )
        display_order = (max_order + 1) if max_order is not None else 0

    category = Category(
        business_id=business.id,
        name=req.name.strip(),
        slug=final_slug,
        description=req.description,
        image_url=req.image_url,
        image_public_id=req.image_public_id,
        display_order=display_order,
        is_active=req.is_active,
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    return {
        "id": category.id,
        "business_id": category.business_id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "image_url": category.image_url,
        "image_public_id": category.image_public_id,
        "display_order": category.display_order,
        "is_active": category.is_active,
        "product_count": 0,
        "created_at": category.created_at,
        "updated_at": category.updated_at,
    }


# Static reorder route registered BEFORE dynamic /{category_id}
@router.put("/order", status_code=status.HTTP_200_OK)
def reorder_categories(
    req: CategoryReorderRequest,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
):
    if not req.items:
        return {"message": "No items provided"}

    req_ids = [item.id for item in req.items]
    if len(req_ids) != len(set(req_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate category IDs in reorder request",
        )

    # Fetch all categories belonging to current tenant
    db_cats = (
        db.query(Category)
        .filter(Category.business_id == business.id, Category.id.in_(req_ids))
        .all()
    )
    cat_map = {c.id: c for c in db_cats}

    if len(cat_map) != len(req_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more category IDs are invalid or belong to another business",
        )

    # Update within transaction
    for item in req.items:
        cat_map[item.id].display_order = item.display_order
        cat_map[item.id].updated_at = datetime.utcnow()

    db.commit()
    return {"message": "Categories reordered successfully"}


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
):
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.business_id == business.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    prod_count = (
        db.query(func.count(Product.id))
        .filter(Product.business_id == business.id, Product.category_id == category.id)
        .scalar()
        or 0
    )

    return {
        "id": category.id,
        "business_id": category.business_id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "image_url": category.image_url,
        "image_public_id": category.image_public_id,
        "display_order": category.display_order,
        "is_active": category.is_active,
        "product_count": prod_count,
        "created_at": category.created_at,
        "updated_at": category.updated_at,
    }


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    req: CategoryUpdate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
):
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.business_id == business.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    old_name = category.name

    if req.name is not None:
        category.name = req.name.strip()

    if req.slug is not None:
        new_slug = slugify(req.slug)
        if new_slug != category.slug:
            # Check unique
            exists = (
                db.query(Category)
                .filter(
                    Category.business_id == business.id,
                    Category.slug == new_slug,
                    Category.id != category.id,
                )
                .first()
            )
            if exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Category with slug '{new_slug}' already exists for this business.",
                )
            category.slug = new_slug

    if req.description is not None:
        category.description = req.description
    if req.image_url is not None:
        category.image_url = req.image_url
    if req.image_public_id is not None:
        category.image_public_id = req.image_public_id
    if req.display_order is not None:
        category.display_order = req.display_order
    if req.is_active is not None:
        category.is_active = req.is_active

    category.updated_at = datetime.utcnow()

    # Synchronize product legacy category string if name changed
    if req.name is not None and req.name.strip() != old_name:
        db.query(Product).filter(
            Product.business_id == business.id,
            Product.category_id == category.id,
        ).update({"category": category.name})

    db.commit()
    db.refresh(category)

    prod_count = (
        db.query(func.count(Product.id))
        .filter(Product.business_id == business.id, Product.category_id == category.id)
        .scalar()
        or 0
    )

    return {
        "id": category.id,
        "business_id": category.business_id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "image_url": category.image_url,
        "image_public_id": category.image_public_id,
        "display_order": category.display_order,
        "is_active": category.is_active,
        "product_count": prod_count,
        "created_at": category.created_at,
        "updated_at": category.updated_at,
    }


@router.delete("/{category_id}", status_code=status.HTTP_200_OK)
def delete_category(
    category_id: str,
    action: Optional[str] = Query(None, description="Action for existing products: 'move' or 'uncategorize'"),
    reassign_to_category_id: Optional[str] = Query(None, description="Target category ID when action is 'move'"),
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
):
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.business_id == business.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Count linked products
    linked_products = (
        db.query(Product)
        .filter(Product.business_id == business.id, Product.category_id == category.id)
        .all()
    )
    count = len(linked_products)

    if count > 0:
        if action == "move":
            if not reassign_to_category_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Target category ID (reassign_to_category_id) is required when action is 'move'",
                )
            if reassign_to_category_id == category.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot reassign products to the category being deleted",
                )
            target_cat = (
                db.query(Category)
                .filter(Category.id == reassign_to_category_id, Category.business_id == business.id)
                .first()
            )
            if not target_cat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Target category not found for this business",
                )

            # Move all products
            db.query(Product).filter(
                Product.business_id == business.id,
                Product.category_id == category.id,
            ).update({"category_id": target_cat.id, "category": target_cat.name}, synchronize_session="fetch")
            db.flush()

        elif action == "uncategorize":
            db.query(Product).filter(
                Product.business_id == business.id,
                Product.category_id == category.id,
            ).update({"category_id": None, "category": "Uncategorized"}, synchronize_session="fetch")
            db.flush()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": f"Category contains {count} products. Safe deletion requires selecting an action: 'move' or 'uncategorize'.",
                    "product_count": count,
                    "action_required": True,
                },
            )

    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully", "affected_products": count}
