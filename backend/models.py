import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON, Boolean, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from backend.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Business(Base):
    __tablename__ = "businesses"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    gstin = Column(String, nullable=True)
    plan = Column(String, nullable=False, default="lite")  # "lite" or "standard"
    currency = Column(String, default="₹")
    
    # Billing & Counter Settings
    invoice_prefix = Column(String, default="INV-")
    order_prefix = Column(String, default="ORD-")
    default_tax_rate = Column(Float, default=18.0)
    tax_inclusive = Column(Boolean, default=False)
    invoice_footer = Column(Text, nullable=True)
    allow_negative_stock = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="business", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="business", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="business", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="business", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="business", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="business", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="business", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="business", cascade="all, delete-orphan")
    purchases = relationship("Purchase", back_populates="business", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    image_public_id = Column(String, nullable=True)
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("business_id", "slug", name="uq_categories_business_slug"),
        Index("ix_categories_business_name", "business_id", "name"),
        Index("ix_categories_business_slug", "business_id", "slug"),
    )

    business = relationship("Business", back_populates="categories")
    products = relationship("Product", back_populates="category_rel", passive_deletes=True)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="owner")  # "owner", "manager", "staff"
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="users")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False, index=True)
    address = Column(Text, nullable=True)
    gstin = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_customers_business_phone", "business_id", "phone"),
        Index("ix_customers_business_name", "business_id", "name"),
    )

    business = relationship("Business", back_populates="customers")
    orders = relationship("Order", back_populates="customer")
    quotations = relationship("Quotation", back_populates="customer")
    invoices = relationship("Invoice", back_populates="customer")


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True, index=True)  # Preserved legacy string for backward compatibility
    description = Column(Text, nullable=True)
    sku = Column(String, nullable=True)
    selling_price = Column(Float, nullable=False, default=0.0)
    cost_price = Column(Float, nullable=False, default=0.0)
    current_stock = Column(Integer, nullable=False, default=0)
    low_stock_level = Column(Integer, nullable=False, default=5)
    image_url = Column(String, nullable=True)
    image_public_id = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    notes = Column(Text, nullable=True)
    variants_json = Column(JSON, nullable=True)  # Standard edition variants (e.g. [{"name": "Teak", "price": 12000}])
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_products_business_name", "business_id", "name"),
        Index("ix_products_business_category_id", "business_id", "category_id"),
    )

    business = relationship("Business", back_populates="products")
    category_rel = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.display_order")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String, nullable=False)
    public_id = Column(String, nullable=True)
    display_order = Column(Integer, nullable=False, default=0)
    is_primary = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_product_images_product_display_order", "product_id", "display_order"),
    )

    product = relationship("Product", back_populates="images")


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    quotation_number = Column(String, nullable=False, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    status = Column(String, nullable=False, default="draft")  # draft, sent, accepted, rejected
    validity_date = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    subtotal = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, nullable=False, default=0.0)
    tax_rate = Column(Float, nullable=False, default=18.0)  # GST %
    tax_amount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="quotations")
    customer = relationship("Customer", back_populates="quotations")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    quotation_id = Column(String, ForeignKey("quotations.id"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, default=0.0)
    total_price = Column(Float, nullable=False, default=0.0)

    quotation = relationship("Quotation", back_populates="items")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    order_number = Column(String, nullable=False, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    order_date = Column(String, nullable=False)
    expected_delivery_date = Column(String, nullable=True)
    custom_specs = Column(JSON, nullable=True)  # dimensions, wood_type, color, fabric, finish, design_notes
    subtotal = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, nullable=False, default=0.0)
    tax_rate = Column(Float, nullable=False, default=18.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    tax_inclusive = Column(Boolean, default=False)
    total_amount = Column(Float, nullable=False, default=0.0)
    advance_amount = Column(Float, nullable=False, default=0.0)
    balance_amount = Column(Float, nullable=False, default=0.0)
    payment_status = Column(String, nullable=False, default="unpaid")  # unpaid, partially_paid, paid
    order_status = Column(String, nullable=False, default="new")  # new, confirmed, in_progress, ready, out_for_delivery, delivered, cancelled
    delivery_status = Column(String, nullable=False, default="pending")  # pending, scheduled, out_for_delivery, delivered
    delivery_address = Column(Text, nullable=True)
    delivery_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("business_id", "order_number", name="uq_orders_business_order_number"),
        Index("ix_orders_business_order_number", "business_id", "order_number"),
    )

    business = relationship("Business", back_populates="orders")
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    product_name = Column(String, nullable=False)
    sku = Column(String, nullable=True)
    variant_name = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, default=0.0)
    total_price = Column(Float, nullable=False, default=0.0)

    order = relationship("Order", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False, index=True)
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=True)
    amount = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False, default="cash")  # cash, upi, card, bank_transfer, other
    payment_date = Column(String, nullable=False)
    reference_number = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="payments")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    invoice_number = Column(String, nullable=False, index=True)
    order_id = Column(String, ForeignKey("orders.id"), nullable=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    issue_date = Column(String, nullable=False)
    due_date = Column(String, nullable=True)
    gstin = Column(String, nullable=True)
    
    # Snapshot fields for permanent historical accuracy
    customer_name = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    customer_address = Column(Text, nullable=True)
    customer_gstin = Column(String, nullable=True)
    business_name = Column(String, nullable=True)
    business_address = Column(Text, nullable=True)
    business_phone = Column(String, nullable=True)
    business_gstin = Column(String, nullable=True)
    staff_name = Column(String, nullable=True)
    
    subtotal = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, nullable=False, default=0.0)
    tax_rate = Column(Float, nullable=False, default=18.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    tax_inclusive = Column(Boolean, default=False)
    total_amount = Column(Float, nullable=False, default=0.0)
    paid_amount = Column(Float, nullable=False, default=0.0)
    balance_amount = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("business_id", "invoice_number", name="uq_invoices_business_invoice_number"),
        Index("ix_invoices_business_invoice_number", "business_id", "invoice_number"),
    )

    business = relationship("Business", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")
    order = relationship("Order", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    product_name = Column(String, nullable=False)
    sku = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, nullable=False, default=0.0)
    tax_rate = Column(Float, nullable=False, default=18.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    total_price = Column(Float, nullable=False, default=0.0)

    invoice = relationship("Invoice", back_populates="items")


# Concurrency-safe Sequence Tracking
class BusinessSequence(Base):
    __tablename__ = "business_sequences"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence_type = Column(String, nullable=False)  # 'order', 'invoice', 'quotation', 'purchase'
    year = Column(Integer, nullable=False, default=2026)
    current_val = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("business_id", "sequence_type", "year", name="uq_business_seq_type_year"),
        Index("ix_business_seq_lookup", "business_id", "sequence_type", "year"),
    )

    business = relationship("Business")


# Checkout Idempotency Store
class CheckoutIdempotency(Base):
    __tablename__ = "checkout_idempotencies"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    idempotency_key = Column(String, nullable=False)
    order_id = Column(String, nullable=True)
    invoice_id = Column(String, nullable=True)
    response_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("business_id", "idempotency_key", name="uq_idempotency_business_key"),
        Index("ix_idempotency_business_key", "business_id", "idempotency_key"),
    )

    business = relationship("Business")


# Held Bills Store
class HeldBill(Base):
    __tablename__ = "held_bills"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    hold_label = Column(String, nullable=False, default="Held Bill")
    bill_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    category = Column(String, nullable=False)  # transport, labour, electricity, rent, maintenance, other
    amount = Column(Float, nullable=False)
    date = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="expenses")


# Standard Edition Models
class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    gstin = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="suppliers")
    purchases = relationship("Purchase", back_populates="supplier")


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    purchase_number = Column(String, nullable=False, index=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    purchase_date = Column(String, nullable=False)
    tax_amount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    payment_status = Column(String, nullable=False, default="unpaid")  # unpaid, partially_paid, paid
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="purchases")
    supplier = relationship("Supplier", back_populates="purchases")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    purchase_id = Column(String, ForeignKey("purchases.id"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, default=0.0)
    total_price = Column(Float, nullable=False, default=0.0)

    purchase = relationship("Purchase", back_populates="items")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # stock_in, stock_out, adjustment, sale, purchase_received
    quantity_change = Column(Integer, nullable=False)
    previous_stock = Column(Integer, nullable=False)
    new_stock = Column(Integer, nullable=False)
    reference_id = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
