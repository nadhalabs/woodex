from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, Business
from backend.schemas import UserCreateRequest, UserResponse
from backend.auth import get_current_user, get_password_hash, require_standard_plan, require_owner

router = APIRouter(
    prefix="/staff",
    tags=["Staff & RBAC (Standard)"],
    dependencies=[Depends(require_owner)],
)

@router.get("", response_model=List[UserResponse])
def get_staff_members(
    db: Session = Depends(get_db),
    business: Business = Depends(require_standard_plan)
):
    return db.query(User).filter(User.business_id == business.id).order_by(User.name.asc()).all()

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def add_staff_member(
    req: UserCreateRequest,
    db: Session = Depends(get_db),
    business: Business = Depends(require_standard_plan),
):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        business_id=business.id,
        name=req.name,
        email=req.email,
        password_hash=get_password_hash(req.password),
        role=req.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff_member(
    user_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(require_standard_plan),
    current_user: User = Depends(get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    target = db.query(User).filter(User.id == user_id, User.business_id == business.id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Staff user not found")

    db.delete(target)
    db.commit()
    return None
