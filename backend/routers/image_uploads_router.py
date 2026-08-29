import hashlib
import re
import time

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.auth import get_current_business, require_manager_or_owner
from backend.config import settings
from backend.database import get_db
from backend.models import Business, Category, Product
from backend.schemas import ImageUploadSignatureRequest, ImageUploadSignatureResponse

router = APIRouter(prefix="/image-uploads", tags=["Image Uploads"])


def _slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^\w\s-]", "", value)
    value = re.sub(r"[\s_-]+", "-", value)
    return re.sub(r"^-+|-+$", "", value) or "item"


def _sign_upload_params(folder: str, timestamp: int, api_secret: str) -> str:
    params_to_sign = f"folder={folder}&timestamp={timestamp}"
    return hashlib.sha1(f"{params_to_sign}{api_secret}".encode("utf-8")).hexdigest()


@router.post(
    "/signature",
    response_model=ImageUploadSignatureResponse,
    dependencies=[Depends(require_manager_or_owner)],
)
def create_image_upload_signature(
    req: ImageUploadSignatureRequest,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
):
    cloud_name = settings.CLOUDINARY_CLOUD_NAME.strip()
    api_key = settings.CLOUDINARY_API_KEY.strip()
    api_secret = settings.CLOUDINARY_API_SECRET.get_secret_value()
    if not cloud_name or not api_key or not api_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image uploads are not configured",
        )

    if req.resource_type == "category":
        category = (
            db.query(Category)
            .filter(Category.id == req.resource_id, Category.business_id == business.id)
            .first()
        )
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
        folder = f"woodex/{business.id}/categories"
    elif req.resource_type == "product":
        product = (
            db.query(Product)
            .filter(Product.id == req.resource_id, Product.business_id == business.id)
            .first()
        )
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )
        folder = f"woodex/{business.id}/products/{_slugify(product.name)}"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid resource type",
        )

    timestamp = int(time.time())
    signature = _sign_upload_params(folder, timestamp, api_secret)

    return ImageUploadSignatureResponse(
        cloud_name=cloud_name,
        api_key=api_key,
        timestamp=timestamp,
        signature=signature,
        folder=folder,
    )
