from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field

# Auth & Token
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[str] = None
    business_id: Optional[str] = None
    role: Optional[str] = None
    plan: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class BusinessRegisterRequest(BaseModel):
    business_name: str
    owner_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    plan: str = "lite"  # "lite" or "standard"

# Business & User
class BusinessResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    plan: str
    currency: str
    invoice_prefix: Optional[str] = "INV-"
    order_prefix: Optional[str] = "ORD-"
    default_tax_rate: Optional[float] = 18.0
    tax_inclusive: Optional[bool] = False
    invoice_footer: Optional[str] = None
    allow_negative_stock: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: str
    business_id: str
    name: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "staff"  # "owner", "manager", "staff"

# Customer
class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: Optional[str] = None
    gstin: Optional[str] = None
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(CustomerCreate):
    id: str
    business_id: str
    created_at: datetime
    pending_balance: Optional[float] = 0.0
    total_orders_count: Optional[int] = 0

    class Config:
        from_attributes = True

# Category
class CategoryCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_public_id: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_public_id: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class CategoryReorderItem(BaseModel):
    id: str
    display_order: int

class CategoryReorderRequest(BaseModel):
    items: List[CategoryReorderItem]

class CategoryResponse(BaseModel):
    id: str
    business_id: str
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_public_id: Optional[str] = None
    display_order: int = 0
    is_active: bool = True
    product_count: Optional[int] = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Product Image
class ProductImageBase(BaseModel):
    url: str
    public_id: Optional[str] = None
    display_order: int = 0
    is_primary: bool = False

class ProductImageCreate(ProductImageBase):
    pass

class ProductImageResponse(ProductImageBase):
    id: str
    business_id: str
    product_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProductImageReorderItem(BaseModel):
    id: str
    display_order: int

class ProductImageReorderRequest(BaseModel):
    items: List[ProductImageReorderItem]

# Product
class ProductCreate(BaseModel):
    name: str
    category_id: Optional[str] = None
    category: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    selling_price: float = 0.0
    cost_price: float = 0.0
    current_stock: int = 0
    low_stock_level: int = 5
    image_url: Optional[str] = None
    image_public_id: Optional[str] = None
    images: Optional[List[ProductImageCreate]] = None
    is_active: bool = True
    notes: Optional[str] = None
    variants_json: Optional[List[Dict[str, Any]]] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    category: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    selling_price: Optional[float] = None
    cost_price: Optional[float] = None
    current_stock: Optional[int] = None
    low_stock_level: Optional[int] = None
    image_url: Optional[str] = None
    image_public_id: Optional[str] = None
    images: Optional[List[ProductImageCreate]] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    variants_json: Optional[List[Dict[str, Any]]] = None

class ProductResponse(BaseModel):
    id: str
    business_id: str
    category_id: Optional[str] = None
    category: Optional[str] = None
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    selling_price: float = 0.0
    cost_price: float = 0.0
    current_stock: int = 0
    low_stock_level: int = 5
    image_url: Optional[str] = None
    image_public_id: Optional[str] = None
    is_active: bool = True
    notes: Optional[str] = None
    variants_json: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    images: List[ProductImageResponse] = []
    category_rel: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True

class StockAdjustmentRequest(BaseModel):
    new_stock: int
    notes: Optional[str] = "Manual stock adjustment"

# Quotation
class QuotationItemBase(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    quantity: int = 1
    unit_price: float = 0.0

class QuotationCreate(BaseModel):
    customer_id: str
    validity_date: Optional[str] = None
    notes: Optional[str] = None
    discount: float = 0.0
    tax_rate: float = 18.0
    items: List[QuotationItemBase]

class QuotationStatusUpdate(BaseModel):
    status: str  # draft, sent, accepted, rejected

class QuotationItemResponse(QuotationItemBase):
    id: str
    total_price: float

    class Config:
        from_attributes = True

class QuotationResponse(BaseModel):
    id: str
    business_id: str
    quotation_number: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    status: str
    validity_date: Optional[str] = None
    notes: Optional[str] = None
    subtotal: float
    discount: float
    tax_rate: float
    tax_amount: float
    total_amount: float
    created_at: datetime
    items: List[QuotationItemResponse] = []

    class Config:
        from_attributes = True

# Order
class OrderItemBase(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    variant_name: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0.0

class OrderCreate(BaseModel):
    customer_id: str
    order_date: str
    expected_delivery_date: Optional[str] = None
    custom_specs: Optional[Dict[str, Any]] = None  # dimensions, wood_type, color, fabric, finish, design_notes
    discount: float = 0.0
    tax_amount: float = 0.0
    advance_amount: float = 0.0
    delivery_address: Optional[str] = None
    delivery_notes: Optional[str] = None
    items: List[OrderItemBase]

class OrderStatusUpdate(BaseModel):
    order_status: Optional[str] = None  # new, confirmed, in_progress, ready, out_for_delivery, delivered
    delivery_status: Optional[str] = None  # pending, scheduled, out_for_delivery, delivered

class OrderItemResponse(OrderItemBase):
    id: str
    total_price: float

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: str
    business_id: str
    order_number: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    order_date: str
    expected_delivery_date: Optional[str] = None
    custom_specs: Optional[Dict[str, Any]] = None
    subtotal: float
    discount: float
    tax_amount: float
    total_amount: float
    advance_amount: float
    balance_amount: float
    payment_status: str
    order_status: str
    delivery_status: str
    delivery_address: Optional[str] = None
    delivery_notes: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True

# Payment
class PaymentCreate(BaseModel):
    order_id: str
    amount: float
    payment_method: str = "cash"  # cash, upi, card, bank_transfer, other
    payment_date: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(PaymentCreate):
    id: str
    business_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Invoice
class InvoiceItemBase(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    sku: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0.0
    discount: float = 0.0
    tax_rate: float = 18.0
    tax_amount: float = 0.0

class InvoiceCreate(BaseModel):
    order_id: Optional[str] = None
    customer_id: str
    issue_date: str
    due_date: Optional[str] = None
    gstin: Optional[str] = None
    discount: float = 0.0
    tax_amount: float = 0.0
    paid_amount: float = 0.0
    notes: Optional[str] = None
    items: List[InvoiceItemBase]

class InvoiceItemResponse(InvoiceItemBase):
    id: str
    total_price: float

    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: str
    business_id: str
    invoice_number: str
    order_id: Optional[str] = None
    customer_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    customer_gstin: Optional[str] = None
    business_name: Optional[str] = None
    business_address: Optional[str] = None
    business_phone: Optional[str] = None
    business_gstin: Optional[str] = None
    staff_name: Optional[str] = None
    issue_date: str
    due_date: Optional[str] = None
    gstin: Optional[str] = None
    subtotal: float
    discount: float
    tax_rate: float = 18.0
    tax_amount: float
    tax_inclusive: bool = False
    total_amount: float
    paid_amount: float
    balance_amount: float
    notes: Optional[str] = None
    created_at: datetime
    items: List[InvoiceItemResponse] = []

    class Config:
        from_attributes = True


# Counter & Point-of-Sale Schemas
class CounterItemInput(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    sku: Optional[str] = None
    variant_name: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(default=0.0, ge=0.0)
    discount: float = Field(default=0.0, ge=0.0)

class CounterCheckoutRequest(BaseModel):
    sale_type: str = "direct_sale"  # "direct_sale" or "customer_order"
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    customer_gstin: Optional[str] = None
    items: List[CounterItemInput]
    bill_discount: float = 0.0
    discount_type: str = "fixed"  # "fixed" or "percentage"
    tax_rate: float = 18.0
    tax_inclusive: bool = False
    paid_amount: float = 0.0
    payment_method: str = "cash"  # "cash", "upi", "card", "bank_transfer", "other"
    payment_reference: Optional[str] = None
    payment_notes: Optional[str] = None
    expected_delivery_date: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_notes: Optional[str] = None
    custom_specs: Optional[Dict[str, Any]] = None
    idempotency_key: Optional[str] = None

class CounterCheckoutResponse(BaseModel):
    order: OrderResponse
    invoice: Optional[InvoiceResponse] = None
    payment: Optional[PaymentResponse] = None
    customer: CustomerResponse

class HeldBillCreateRequest(BaseModel):
    hold_label: str = "Held Bill"
    bill_data: Dict[str, Any]

class HeldBillResponse(BaseModel):
    id: str
    business_id: str
    hold_label: str
    bill_data: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# Expense
class ExpenseCreate(BaseModel):
    category: str  # transport, labour, electricity, rent, maintenance, other
    amount: float
    date: str
    description: Optional[str] = None

class ExpenseResponse(ExpenseCreate):
    id: str
    business_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Supplier & Purchase (Standard)
class SupplierCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    notes: Optional[str] = None

class SupplierResponse(SupplierCreate):
    id: str
    business_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class PurchaseItemBase(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    quantity: int = 1
    unit_price: float = 0.0

class PurchaseCreate(BaseModel):
    supplier_id: str
    purchase_date: str
    tax_amount: float = 0.0
    notes: Optional[str] = None
    items: List[PurchaseItemBase]

class PurchaseItemResponse(PurchaseItemBase):
    id: str
    total_price: float

    class Config:
        from_attributes = True

class PurchaseResponse(BaseModel):
    id: str
    business_id: str
    purchase_number: str
    supplier_id: str
    supplier_name: Optional[str] = None
    purchase_date: str
    tax_amount: float
    total_amount: float
    payment_status: str
    notes: Optional[str] = None
    created_at: datetime
    items: List[PurchaseItemResponse] = []

    class Config:
        from_attributes = True

# Inventory Movement (Standard)
class InventoryMovementResponse(BaseModel):
    id: str
    business_id: str
    product_id: str
    product_name: Optional[str] = None
    type: str  # stock_in, stock_out, adjustment, sale, purchase_received
    quantity_change: int
    previous_stock: int
    new_stock: int
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Dashboard & Reports Summary
class LiteDashboardResponse(BaseModel):
    today_sales: float
    active_orders_count: int
    pending_payments: float
    upcoming_deliveries_count: int
    low_stock_products_count: int
    recent_orders: List[OrderResponse] = []
    low_stock_products: List[ProductResponse] = []

class StandardDashboardResponse(LiteDashboardResponse):
    monthly_revenue: float
    orders_this_month: int
    monthly_expenses: float
    estimated_gross_profit: float
    stock_valuation: float
    top_selling_products: List[Dict[str, Any]] = []
