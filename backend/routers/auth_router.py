from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
import logging
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Business, User
from backend.schemas import LoginRequest, BusinessRegisterRequest, Token, UserResponse, BusinessResponse
from backend.auth import get_password_hash, verify_password, create_access_token, get_current_user, get_current_business

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("woodex.auth")

@router.post("/register", response_model=Token)
def register_business(req: BusinessRegisterRequest, response: Response, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
    
    # Create Business
    new_business = Business(
        name=req.business_name,
        email=req.email,
        phone=req.phone,
        address=req.address,
        gstin=req.gstin,
        plan=req.plan
    )
    db.add(new_business)
    db.flush()

    # Create Owner User
    owner_user = User(
        business_id=new_business.id,
        name=req.owner_name,
        email=req.email,
        password_hash=get_password_hash(req.password),
        role="owner"
    )
    db.add(owner_user)
    db.commit()
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
