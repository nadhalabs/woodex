import hashlib
import re
import time

from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth import get_current_business, require_manager_or_owner
from backend.config import settings
from backend.models import Business
from backend.schemas import ImageUploadSignatureRequest, ImageUploadSignatureResponse

router = APIRouter(prefix="/image-uploads", tags=["Image Uploads"])


def _slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^\w\s-]", "", value)
    value = re.sub(r"[\s_-]+", "-", value)
    return re.sub(r"^-+|-+$", "", value) or "item"


def _tenant_folder(requested_folder: str, business_id: str) -> str:
    parts = [part for part in requested_folder.strip("/").split("/") if part]
    if parts and parts[-1] == "categories":
        return f"woodex/{business_id}/categories"
    if len(parts) >= 2 and parts[-2] == "products":
        return f"woodex/{business_id}/products/{_slugify(parts[-1])}"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Image folder must target an existing product or category upload flow",
    )


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

    timestamp = int(time.time())
    folder = _tenant_folder(req.folder, business.id)
    signature = _sign_upload_params(folder, timestamp, api_secret)

    return ImageUploadSignatureResponse(
        cloud_name=cloud_name,
        api_key=api_key,
        timestamp=timestamp,
        signature=signature,
        folder=folder,
    )
