from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Expense, Business
from backend.schemas import ExpenseCreate, ExpenseResponse
from backend.auth import get_current_business, require_manager_or_owner

router = APIRouter(prefix="/expenses", tags=["Expenses"], dependencies=[Depends(require_manager_or_owner)])

EXPENSE_CATEGORIES = ["Transport", "Labour", "Electricity", "Rent", "Maintenance", "Other"]

@router.get("/categories")
def get_categories():
    return EXPENSE_CATEGORIES

@router.get("", response_model=List[ExpenseResponse])
def get_expenses(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    query = db.query(Expense).filter(Expense.business_id == business.id)
    if category:
        query = query.filter(Expense.category == category)
    return query.order_by(Expense.date.desc(), Expense.created_at.desc()).all()

@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    req: ExpenseCreate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    expense = Expense(
        business_id=business.id,
        category=req.category,
        amount=req.amount,
        date=req.date,
        description=req.description
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.business_id == business.id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()
    return None
