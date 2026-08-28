from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import Base, engine

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
    staff_router,
    business_router,
    counter_router,
)

# Auto create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

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
app.include_router(staff_router.router, prefix=settings.API_V1_STR)
app.include_router(business_router.router, prefix=settings.API_V1_STR)
app.include_router(counter_router.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to WOODEX REST API",
        "version": settings.VERSION,
        "docs": "/docs"
    }
