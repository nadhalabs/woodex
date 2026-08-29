import logging
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from backend.config import settings
from backend.database import SessionLocal

from backend.routers import (
    auth_router,
    customers_router,
    categories_router,
    products_router,
    quotations_router,
    orders_router,
    payments_router,
    invoices_router,
    expenses_router,
    reports_router,
    suppliers_router,
    purchases_router,
    inventory_router,
    image_uploads_router,
    staff_router,
    business_router,
    counter_router,
)

logger = logging.getLogger("woodex")
logger.setLevel(logging.INFO)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)


def request_id_for(request: Request) -> str:
    return getattr(request.state, "request_id", "unavailable")


@app.middleware("http")
async def request_correlation(request: Request, call_next):
    request.state.request_id = uuid4().hex
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(
            "event=unhandled_exception request_id=%s method=%s path=%s error_type=%s",
            request.state.request_id,
            request.method,
            request.url.path,
            type(exc).__name__,
        )
        response = JSONResponse(status_code=500, content={"detail": "Internal server error"})
    response.headers["X-Request-ID"] = request.state.request_id
    return response


@app.on_event("startup")
async def log_startup():
    logger.info("event=application_startup")


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.warning(
        "event=database_conflict request_id=%s error_type=%s",
        request_id_for(request),
        type(exc).__name__,
    )
    return JSONResponse(status_code=409, content={"detail": "Database conflict"})


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error(
        "event=database_failure request_id=%s error_type=%s",
        request_id_for(request),
        type(exc).__name__,
    )
    return JSONResponse(status_code=500, content={"detail": "Database operation failed"})


# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router.router, prefix=settings.API_V1_STR)
app.include_router(customers_router.router, prefix=settings.API_V1_STR)
app.include_router(categories_router.router, prefix=settings.API_V1_STR)
app.include_router(products_router.router, prefix=settings.API_V1_STR)
app.include_router(quotations_router.router, prefix=settings.API_V1_STR)
app.include_router(orders_router.router, prefix=settings.API_V1_STR)
app.include_router(payments_router.router, prefix=settings.API_V1_STR)
app.include_router(invoices_router.router, prefix=settings.API_V1_STR)
app.include_router(expenses_router.router, prefix=settings.API_V1_STR)
app.include_router(reports_router.router, prefix=settings.API_V1_STR)
app.include_router(suppliers_router.router, prefix=settings.API_V1_STR)
app.include_router(purchases_router.router, prefix=settings.API_V1_STR)
app.include_router(inventory_router.router, prefix=settings.API_V1_STR)
app.include_router(image_uploads_router.router, prefix=settings.API_V1_STR)
app.include_router(staff_router.router, prefix=settings.API_V1_STR)
app.include_router(business_router.router, prefix=settings.API_V1_STR)
app.include_router(counter_router.router, prefix=settings.API_V1_STR)


@app.get("/health/live", include_in_schema=False)
def liveness():
    return {"status": "ok"}


@app.get("/health/ready", include_in_schema=False)
def readiness(request: Request):
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except SQLAlchemyError as exc:
        logger.error(
            "event=readiness_database_failure request_id=%s error_type=%s",
            request_id_for(request),
            type(exc).__name__,
        )
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "message": "Welcome to WOODEX REST API",
        "version": settings.VERSION,
        "docs": "/docs"
    }
