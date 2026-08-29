from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
import logging
import re
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Business, User
from backend.schemas import LoginRequest, BusinessRegisterRequest, Token, UserResponse, BusinessResponse
from backend.auth import get_password_hash, verify_password, create_access_token, get_current_user, get_current_business

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("woodex.auth")

PASSWORD_REQUIREMENTS_MESSAGE = (
    "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol"
)


def password_is_strong(password: str) -> bool:
    return (
        len(password) >= 8
        and bool(re.search(r"[A-Z]", password))
        and bool(re.search(r"[a-z]", password))
        and bool(re.search(r"\d", password))
        and bool(re.search(r"[^A-Za-z0-9]", password))
    )

@router.post("/register", response_model=Token)
def register_business(req: BusinessRegisterRequest, response: Response, db: Session = Depends(get_db)):
    business_email = str(req.business_email or req.email).strip().lower()
    owner_email = str(req.owner_email or req.email).strip().lower()

    duplicate_business = db.query(Business.id).filter(
        func.lower(Business.email) == business_email
    ).first()
    duplicate_owner = db.query(User.id).filter(
        func.lower(User.email) == owner_email
    ).first()
    if duplicate_business or duplicate_owner:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database conflict",
        )

    if req.plan is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Subscription plan cannot be selected during registration",
        )

    if not password_is_strong(req.password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=PASSWORD_REQUIREMENTS_MESSAGE,
        )

    password_hash = get_password_hash(req.password)
    new_business = Business(
        name=req.business_name,
        email=business_email,
        phone=req.phone,
        address=req.address,
        gstin=req.gstin,
        plan="lite",
    )
    try:
        db.add(new_business)
        db.flush()
        owner_user = User(
            business_id=new_business.id,
            name=req.owner_name,
            email=owner_email,
            password_hash=password_hash,
            role="owner",
        )
        db.add(owner_user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database conflict",
        ) from None
    db.refresh(owner_user)

    token = create_access_token({
        "sub": owner_user.id,
        "business_id": new_business.id,
        "role": owner_user.role,
        "plan": new_business.plan
    })

    # Set HTTP-only cookie
    response.set_cookie(
        key="woodex_session",
        value=token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,
        samesite="lax"
    )
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(req: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        logger.warning(
            "event=authentication_failed request_id=%s path=%s reason=invalid_login",
            getattr(request.state, "request_id", "unavailable"),
            request.url.path,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    business = db.query(Business).filter(Business.id == user.business_id).first()
    if not business:
        logger.warning(
            "event=authentication_failed request_id=%s path=%s reason=business_not_found",
            getattr(request.state, "request_id", "unavailable"),
            request.url.path,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    token = create_access_token({
        "sub": user.id,
        "business_id": user.business_id,
        "role": user.role,
        "plan": business.plan
    })

    response.set_cookie(
        key="woodex_session",
        value=token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,
        samesite="lax"
    )
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business)
):
    return {
        "user": UserResponse.model_validate(current_user),
        "business": BusinessResponse.model_validate(business)
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="woodex_session")
    return {"message": "Logged out successfully"}
