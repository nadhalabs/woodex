import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from backend.database import SessionLocal
from backend.models import Business, Customer, Invoice, Order, Purchase, Quotation, Supplier, User
from backend.seed import seed_database


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database(confirm_destructive=True)


def standard_records(db):
    business = db.query(Business).filter(Business.email == "info@timbercraft.com").first()
    customer = db.query(Customer).filter(Customer.business_id == business.id).first()
    supplier = db.query(Supplier).filter(Supplier.business_id == business.id).first()
    return business, customer, supplier


def test_invoice_order_is_unique():
    db = SessionLocal()
    try:
        business, customer, _supplier = standard_records(db)
        unique = uuid.uuid4().hex
        order = Order(
            business_id=business.id,
            order_number=f"DB-ORDER-{unique}",
            customer_id=customer.id,
            order_date="2026-08-29",
        )
        db.add(order)
        db.flush()
        db.add(Invoice(
            business_id=business.id,
            invoice_number=f"DB-INV-A-{unique}",
            order_id=order.id,
            customer_id=customer.id,
            issue_date="2026-08-29",
        ))
        db.commit()

        db.add(Invoice(
            business_id=business.id,
            invoice_number=f"DB-INV-B-{unique}",
            order_id=order.id,
            customer_id=customer.id,
            issue_date="2026-08-29",
        ))
        with pytest.raises(IntegrityError):
            db.commit()
    finally:
        db.rollback()
        db.close()


@pytest.mark.parametrize("record_type", ["quotation", "purchase"])
def test_tenant_scoped_document_numbers_are_unique(record_type):
    db = SessionLocal()
    try:
        business, customer, supplier = standard_records(db)
        number = f"DB-DOC-{uuid.uuid4().hex}"
        if record_type == "quotation":
            records = [
                Quotation(
                    business_id=business.id,
                    quotation_number=number,
                    customer_id=customer.id,
                )
                for _ in range(2)
            ]
        else:
            records = [
                Purchase(
                    business_id=business.id,
                    purchase_number=number,
                    supplier_id=supplier.id,
                    purchase_date="2026-08-29",
                )
                for _ in range(2)
            ]
        db.add_all(records)
        with pytest.raises(IntegrityError):
            db.commit()
    finally:
        db.rollback()
        db.close()


def test_role_and_plan_values_are_constrained():
    db = SessionLocal()
    try:
        business, _customer, _supplier = standard_records(db)
        user = db.query(User).filter(User.business_id == business.id).first()
        user.role = "administrator"
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

        business = db.query(Business).filter(Business.email == "info@timbercraft.com").first()
        business.plan = "enterprise"
        with pytest.raises(IntegrityError):
            db.commit()
    finally:
        db.rollback()
        db.close()
