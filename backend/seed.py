import argparse
import os
import re
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.engine import make_url

from backend.config import settings
from backend.database import SessionLocal, engine, Base
from backend.models import (
    Business, User, Customer, Category, Product, ProductImage, Quotation, QuotationItem,
    Order, OrderItem, Payment, Invoice, InvoiceItem, Expense,
    Supplier, Purchase, PurchaseItem, InventoryMovement
)
from backend.auth import get_password_hash

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text or "category"

DEFAULT_CATEGORIES = [
    ("Sofa", "Living room sofas, sectionals & couches", "https://images.unsplash.com/photo-1555041469-a586c61ea9bc"),
    ("Bed", "King, queen, hydraulic & storage beds", "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85"),
    ("Dining Table", "Solid wood, 4/6/8-seater dining table sets", "https://images.unsplash.com/photo-1617806118233-18e1de247200"),
    ("Chair", "Executive, accent, dining & ergonomic chairs", "https://images.unsplash.com/photo-1580481072645-022f9a6d8310"),
    ("Wardrobe", "2/3/4-door wooden wardrobes & closets", "https://images.unsplash.com/photo-1595428774223-ef52624120d2"),
    ("Mattress", "Orthopedic, memory foam & pocket spring mattresses", "https://images.unsplash.com/photo-1631049307264-da0ec9d70304"),
    ("Office Furniture", "Desks, conference tables & workstations", "https://images.unsplash.com/photo-1524758631624-e2822e304c36"),
    ("Custom Furniture", "Bespoke handcrafted architectural furniture", "https://images.unsplash.com/photo-1538688525198-9b88f6f53126"),
    ("Timber / Wood", "Seasoned teak, sheesham & pinewood planks", "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c"),
]

def seed_categories_for_business(db, business_id):
    cat_map = {}
    for idx, (name, desc, img) in enumerate(DEFAULT_CATEGORIES):
        slug = slugify(name)
        cat = Category(
            business_id=business_id,
            name=name,
            slug=slug,
            description=desc,
            image_url=img,
            image_public_id=f"categories/{slug}",
            display_order=idx + 1,
            is_active=True,
        )
        db.add(cat)
        cat_map[name.lower()] = cat
        cat_map[slug] = cat
    db.flush()
    return cat_map

def _validate_destructive_seed_request(confirm_destructive: bool) -> str:
    if settings.APP_ENV not in {"development", "test"}:
        raise RuntimeError("Demo seeding is allowed only in development or test environments")
    if not confirm_destructive or os.getenv("WOODEX_ALLOW_DESTRUCTIVE_SEED") != "true":
        raise RuntimeError("Destructive demo seeding requires explicit confirmation")

    database_name = (make_url(settings.DATABASE_URL).database or "").lower()
    if not re.search(r"(^|[_-])(test|dev|demo)([_-]|$)", database_name):
        raise RuntimeError("Refusing destructive seeding: database is not explicitly named as test, dev, or demo")

    demo_password = os.getenv("WOODEX_DEMO_PASSWORD", "")
    if len(demo_password) < 12:
        raise RuntimeError("WOODEX_DEMO_PASSWORD must be explicitly set to at least 12 characters")
    return demo_password


def seed_database(*, confirm_destructive: bool = False):
    demo_password = _validate_destructive_seed_request(confirm_destructive)
    table_names = ", ".join(f'"{table.name}"' for table in reversed(Base.metadata.sorted_tables))
    try:
        with engine.begin() as connection:
            connection.execute(text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE"))
    except Exception as exc:
        raise RuntimeError(
            "Unable to reset demo data; run 'alembic upgrade head' on the dedicated database first"
        ) from exc
    
    db = SessionLocal()
    try:
        print("🌱 Seeding WOODEX PostgreSQL Database...")
        
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        yesterday_str = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

        # ----------------------------------------------------
        # 1. OAKWOOD FURNITURE STORE (WOODEX LITE EDITION)
        # ----------------------------------------------------
        lite_biz = Business(
            name="Oakwood Furniture Store",
            email="contact@oakwoodfurniture.com",
            phone="+91 98765 43210",
            address="102 MG Road, Furniture Market, Bengaluru, Karnataka",
            gstin="29ABCDE1234F1Z5",
            plan="lite",
            currency="₹"
        )
        db.add(lite_biz)
        db.flush()

        lite_owner = User(
            business_id=lite_biz.id,
            name="Ramesh Oakwood",
            email="owner@oakwood.com",
            password_hash=get_password_hash(demo_password),
            role="owner"
        )
        lite_staff = User(
            business_id=lite_biz.id,
            name="Suresh Kumar",
            email="staff@oakwood.com",
            password_hash=get_password_hash(demo_password),
            role="staff"
        )
        db.add_all([lite_owner, lite_staff])
        db.flush()

        lite_cats = seed_categories_for_business(db, lite_biz.id)

        c1 = Customer(business_id=lite_biz.id, name="Rajesh Sharma", phone="9823011223", address="Indiranagar 1st Stage, Bengaluru", notes="Prefers teak wood finish")
        c2 = Customer(business_id=lite_biz.id, name="Priya Patel", phone="9988776655", address="Koramangala 4th Block, Bengaluru", notes="Bulk office furniture inquiry")
        c3 = Customer(business_id=lite_biz.id, name="Amit Verma", phone="9711223344", address="Whitefield, Bengaluru", notes="Delivered 2 days ago")
        db.add_all([c1, c2, c3])
        db.flush()

        p1 = Product(
            business_id=lite_biz.id,
            category_id=lite_cats["sofa"].id,
            name="Teak Wood 3-Seater Sofa",
            category="Sofa",
            description="High quality Sheesham wood frame with premium cushion fabric upholstery.",
            sku="SOFA-TK-01",
            selling_price=35000.0,
            cost_price=22000.0,
            current_stock=4,
            low_stock_level=2,
            image_url="https://images.unsplash.com/photo-1555041469-a586c61ea9bc",
            image_public_id="woodex/lite/products/sofa-tk-01/main",
            is_active=True,
            notes="High quality Sheesham wood frame with cushion"
        )
        p2 = Product(
            business_id=lite_biz.id,
            category_id=lite_cats["bed"].id,
            name="King Size Wooden Bed with Storage",
            category="Bed",
            description="King size bed with hydraulic storage system and teak finish.",
            sku="BED-KG-02",
            selling_price=45000.0,
            cost_price=30000.0,
            current_stock=2,
            low_stock_level=3,
            image_url="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
            image_public_id="woodex/lite/products/bed-kg-02/main",
            is_active=True,
            notes="Hydraulic storage mechanism"
        )
        p3 = Product(
            business_id=lite_biz.id,
            category_id=lite_cats["dining table"].id,
            name="6-Seater Solid Wood Dining Table",
            category="Dining Table",
            description="Solid wood dining table set includes 6 matching chairs.",
            sku="DINE-6S-03",
            selling_price=52000.0,
            cost_price=34000.0,
            current_stock=1,
            low_stock_level=2,
            image_url="https://images.unsplash.com/photo-1617806118233-18e1de247200",
            image_public_id="woodex/lite/products/dine-6s-03/main",
            is_active=True,
            notes="Includes 6 upholstered wooden chairs"
        )
        p4 = Product(
            business_id=lite_biz.id,
            category_id=lite_cats["chair"].id,
            name="Ergonomic Wooden Executive Chair",
            category="Chair",
            description="High-back office mesh chair with solid wood base and lumbar support.",
            sku="CHR-OFF-04",
            selling_price=8500.0,
            cost_price=5000.0,
            current_stock=12,
            low_stock_level=5,
            image_url="https://images.unsplash.com/photo-1580481072645-022f9a6d8310",
            image_public_id="woodex/lite/products/chr-off-04/main",
            is_active=True,
            notes="High-back office mesh chair with wood base"
        )
        p5 = Product(
            business_id=lite_biz.id,
            category_id=lite_cats["timber / wood"].id,
            name="Raw Sheesham Wood Planks (Per Cubic Ft)",
            category="Timber / Wood",
            description="Kiln seasoned & chemically treated pure Sheesham wood timber planks.",
            sku="TMB-SHS-05",
            selling_price=1800.0,
            cost_price=1200.0,
            current_stock=50,
            low_stock_level=10,
            image_url="https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c",
            image_public_id="woodex/lite/products/tmb-shs-05/main",
            is_active=True,
            notes="Seasoned & treated wood timber"
        )
        db.add_all([p1, p2, p3, p4, p5])
        db.flush()

        # Seed gallery photos for p1
        db.add_all([
            ProductImage(business_id=lite_biz.id, product_id=p1.id, url=p1.image_url, public_id=p1.image_public_id, display_order=0, is_primary=True),
            ProductImage(business_id=lite_biz.id, product_id=p1.id, url="https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e", public_id="woodex/lite/products/sofa-tk-01/side", display_order=1, is_primary=False),
            ProductImage(business_id=lite_biz.id, product_id=p2.id, url=p2.image_url, public_id=p2.image_public_id, display_order=0, is_primary=True),
            ProductImage(business_id=lite_biz.id, product_id=p3.id, url=p3.image_url, public_id=p3.image_public_id, display_order=0, is_primary=True),
            ProductImage(business_id=lite_biz.id, product_id=p4.id, url=p4.image_url, public_id=p4.image_public_id, display_order=0, is_primary=True),
            ProductImage(business_id=lite_biz.id, product_id=p5.id, url=p5.image_url, public_id=p5.image_public_id, display_order=0, is_primary=True),
        ])
        db.flush()

        # Quotations for Lite
        q1 = Quotation(
            business_id=lite_biz.id,
            quotation_number="QT-0001",
            customer_id=c1.id,
            status="sent",
            validity_date=(datetime.utcnow() + timedelta(days=15)).strftime("%Y-%m-%d"),
            notes="Valid for 15 days from issue",
            subtotal=35000.0,
            discount=1000.0,
            tax_rate=18.0,
            tax_amount=6120.0,
            total_amount=40120.0
        )
        db.add(q1)
        db.flush()
        db.add(QuotationItem(quotation_id=q1.id, product_id=p1.id, product_name=p1.name, quantity=1, unit_price=35000.0, total_price=35000.0))

        # Orders for Lite
        o1 = Order(
            business_id=lite_biz.id,
            order_number="ORD-0001",
            customer_id=c1.id,
            order_date=today_str,
            expected_delivery_date=(datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d"),
            custom_specs={"notes": "Walnut polish requested, firm cushion foam"},
            subtotal=52000.0,
            discount=2000.0,
            tax_amount=9000.0,
            total_amount=59000.0,
            advance_amount=25000.0,
            balance_amount=34000.0,
            payment_status="partially_paid",
            order_status="in_progress",
            delivery_status="scheduled",
            delivery_address=c1.address,
            delivery_notes="Call customer before delivery"
        )
        o2 = Order(
            business_id=lite_biz.id,
            order_number="ORD-0002",
            customer_id=c3.id,
            order_date=yesterday_str,
            expected_delivery_date=yesterday_str,
            subtotal=45000.0,
            discount=0.0,
            tax_amount=8100.0,
            total_amount=53100.0,
            advance_amount=53100.0,
            balance_amount=0.0,
            payment_status="paid",
            order_status="delivered",
            delivery_status="delivered",
            delivery_address=c3.address
        )
        db.add_all([o1, o2])
        db.flush()

        db.add(OrderItem(order_id=o1.id, product_id=p3.id, product_name=p3.name, quantity=1, unit_price=52000.0, total_price=52000.0))
        db.add(OrderItem(order_id=o2.id, product_id=p2.id, product_name=p2.name, quantity=1, unit_price=45000.0, total_price=45000.0))

        # Advance Payment against Order 1
        pay1 = Payment(business_id=lite_biz.id, order_id=o1.id, amount=25000.0, payment_method="upi", payment_date=today_str, reference_number="UPI/83910283", notes="Advance via Google Pay")
        pay2 = Payment(business_id=lite_biz.id, order_id=o2.id, amount=53100.0, payment_method="bank_transfer", payment_date=yesterday_str, reference_number="NEFT/991283", notes="Full payment received")
        db.add_all([pay1, pay2])

        # Invoice for Order 2
        inv2 = Invoice(
            business_id=lite_biz.id,
            invoice_number="INV-0001",
            order_id=o2.id,
            customer_id=c3.id,
            issue_date=yesterday_str,
            due_date=yesterday_str,
            gstin=lite_biz.gstin,
            subtotal=45000.0,
            discount=0.0,
            tax_amount=8100.0,
            total_amount=53100.0,
            paid_amount=53100.0,
            balance_amount=0.0,
            notes="Paid in full via Bank Transfer"
        )
        db.add(inv2)
        db.flush()
        db.add(InvoiceItem(invoice_id=inv2.id, product_name=p2.name, quantity=1, unit_price=45000.0, total_price=45000.0))

        # Expenses for Lite
        e1 = Expense(business_id=lite_biz.id, category="Transport", amount=1500.0, date=today_str, description="Tempo transport for raw wood planks")
        e2 = Expense(business_id=lite_biz.id, category="Rent", amount=45000.0, date="2026-08-01", description="Monthly showroom rent")
        db.add_all([e1, e2])


        # ----------------------------------------------------
        # 2. TIMBERCRAFT LUXURY SHOWROOM (WOODEX STANDARD EDITION)
        # ----------------------------------------------------
        std_biz = Business(
            name="TimberCraft Luxury Showroom",
            email="info@timbercraft.com",
            phone="+91 99000 11223",
            address="45 Park Street, Commercial Complex, Mumbai, Maharashtra",
            gstin="27XYZAB9876C1Z2",
            plan="standard",
            currency="₹"
        )
        db.add(std_biz)
        db.flush()

        std_owner = User(business_id=std_biz.id, name="Vikramaditya Rao", email="owner@timbercraft.com", password_hash=get_password_hash(demo_password), role="owner")
        std_mgr = User(business_id=std_biz.id, name="Meera Nair", email="manager@timbercraft.com", password_hash=get_password_hash(demo_password), role="manager")
        std_sales = User(business_id=std_biz.id, name="Karan Singh", email="sales@timbercraft.com", password_hash=get_password_hash(demo_password), role="staff")
        db.add_all([std_owner, std_mgr, std_sales])
        db.flush()

        std_cats = seed_categories_for_business(db, std_biz.id)

        sc1 = Customer(business_id=std_biz.id, name="Dr. Ananya Roy", phone="9845099887", address="Bandra West, Mumbai", notes="VIP Architect Client")
        db.add(sc1)
        db.flush()

        sp1 = Product(
            business_id=std_biz.id,
            category_id=std_cats["chair"].id,
            name="Handcrafted Sheesham Dining Chair",
            category="Chair",
            description="Pure handcrafted Indian Sheesham wood chair available in multiple custom polishes.",
            sku="CHR-ROYAL-01",
            selling_price=12000.0,
            cost_price=7000.0,
            current_stock=18,
            low_stock_level=4,
            image_url="https://images.unsplash.com/photo-1580481072645-022f9a6d8310",
            image_public_id="woodex/std/products/chr-royal-01/main",
            is_active=True,
            notes="Available in 4 premium finishes",
            variants_json=[
                {"name": "Teak", "price": 12000.0},
                {"name": "Walnut", "price": 12500.0},
                {"name": "Black", "price": 11500.0},
                {"name": "Brown", "price": 12000.0}
            ]
        )
        sp2 = Product(
            business_id=std_biz.id,
            category_id=std_cats["custom furniture"].id,
            name="Custom Royal Teak Wardrobe 4-Door",
            category="Custom Furniture",
            description="Bespoke luxury 4-door wardrobe with antique brass handles and velvet lined drawers.",
            sku="WRD-CUSTOM-02",
            selling_price=110000.0,
            cost_price=75000.0,
            current_stock=3,
            low_stock_level=1,
            image_url="https://images.unsplash.com/photo-1595428774223-ef52624120d2",
            image_public_id="woodex/std/products/wrd-custom-02/main",
            is_active=True,
            notes="Made to order custom spec wardrobe"
        )
        db.add_all([sp1, sp2])
        db.flush()

        db.add_all([
            ProductImage(business_id=std_biz.id, product_id=sp1.id, url=sp1.image_url, public_id=sp1.image_public_id, display_order=0, is_primary=True),
            ProductImage(business_id=std_biz.id, product_id=sp2.id, url=sp2.image_url, public_id=sp2.image_public_id, display_order=0, is_primary=True),
        ])
        db.flush()

        # Suppliers & Purchases (Standard Only)
        sup1 = Supplier(business_id=std_biz.id, name="National Timber & Ply Co.", phone="9898000111", address="Industrial Area Phase II, Navi Mumbai", gstin="27SUPPLIER1234A", notes="Primary teak supplier")
        db.add(sup1)
        db.flush()

        po1 = Purchase(business_id=std_biz.id, purchase_number="PO-0001", supplier_id=sup1.id, purchase_date=today_str, tax_amount=9000.0, total_amount=59000.0, payment_status="paid", notes="50 cubic ft teak wood blocks")
        db.add(po1)
        db.flush()
        db.add(PurchaseItem(purchase_id=po1.id, product_id=sp2.id, product_name=sp2.name, quantity=2, unit_price=25000.0, total_price=50000.0))

        # Standard Custom Spec Order
        so1 = Order(
            business_id=std_biz.id,
            order_number="ORD-0001",
            customer_id=sc1.id,
            order_date=today_str,
            expected_delivery_date=(datetime.utcnow() + timedelta(days=10)).strftime("%Y-%m-%d"),
            custom_specs={
                "dimensions": "78in L x 36in W x 30in H",
                "wood_type": "Burma Teak",
                "color": "Dark Walnut Polish",
                "fabric": "Royal Blue Velvet Upholstery",
                "finish": "Matte PU Lacquer",
                "design_notes": "Brass inlay trim on table edges requested"
            },
            subtotal=110000.0,
            discount=5000.0,
            tax_amount=18900.0,
            total_amount=123900.0,
            advance_amount=50000.0,
            balance_amount=73900.0,
            payment_status="partially_paid",
            order_status="confirmed",
            delivery_status="pending",
            delivery_address=sc1.address
        )
        db.add(so1)
        db.flush()
        db.add(OrderItem(order_id=so1.id, product_id=sp2.id, product_name=sp2.name, quantity=1, unit_price=105000.0, total_price=105000.0))
        db.add(Payment(business_id=std_biz.id, order_id=so1.id, amount=50000.0, payment_method="card", payment_date=today_str, reference_number="TXN-CARD-9912", notes="Booking advance"))

        # Inventory Movement log
        db.add(InventoryMovement(
            business_id=std_biz.id,
            product_id=sp1.id,
            type="stock_in",
            quantity_change=20,
            previous_stock=0,
            new_stock=20,
            notes="Initial stock intake"
        ))

        db.commit()
        print("✅ Database successfully seeded with categories and product galleries!")
        print("--------------------------------------------------")
        print("1. OAKWOOD FURNITURE (WOODEX LITE):")
        print("   Owner Login: owner@oakwood.com")
        print("   Staff Login: staff@oakwood.com")
        print("2. TIMBERCRAFT SHOWROOM (WOODEX STANDARD):")
        print("   Owner Login: owner@timbercraft.com")
        print("   Manager Login: manager@timbercraft.com")
        print("   All demo users use the password supplied via WOODEX_DEMO_PASSWORD.")
        print("--------------------------------------------------")
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Explicitly reset and seed a disposable Woodex demo database")
    parser.add_argument(
        "--reset-demo-data",
        action="store_true",
        help="Confirm that the configured disposable database may be dropped and reseeded",
    )
    args = parser.parse_args()
    seed_database(confirm_destructive=args.reset_demo_data)
