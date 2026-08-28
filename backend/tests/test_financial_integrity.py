import uuid

import pytest
from fastapi.testclient import TestClient

from backend.auth import create_access_token
from backend.database import SessionLocal
from backend.main import app
from backend.models import Business, Customer, Order, Payment, Product, User
from backend.seed import seed_database


client = TestClient(app)
TEST_DATE = "2026-08-29"


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database(confirm_destructive=True)


def get_auth_headers(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        token = create_access_token(
            {"sub": user.id, "business_id": user.business_id, "role": user.role}
        )
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()


@pytest.fixture(scope="module")
def owner_headers():
    return get_auth_headers("owner@timbercraft.com")


@pytest.fixture(scope="module")
def manager_headers():
    return get_auth_headers("manager@timbercraft.com")


def get_standard_customer_id():
    db = SessionLocal()
    try:
        business = db.query(Business).filter(Business.email == "info@timbercraft.com").first()
        return db.query(Customer).filter(Customer.business_id == business.id).first().id
    finally:
        db.close()


def create_order(headers, *, total=100.0, advance=0.0, product_id=None, idempotency_key=None):
    request_headers = dict(headers)
    if idempotency_key:
        request_headers["X-Idempotency-Key"] = idempotency_key
    return client.post(
        "/api/v1/orders",
        headers=request_headers,
        json={
            "customer_id": get_standard_customer_id(),
            "order_date": TEST_DATE,
            "advance_amount": advance,
            "items": [
                {
                    "product_id": product_id,
                    "product_name": "Financial Integrity Item",
                    "quantity": 1,
                    "unit_price": total,
                }
            ],
        },
    )


def test_order_advance_enters_ledger_and_later_payment_stays_consistent(manager_headers):
    order_response = create_order(manager_headers, total=1000, advance=300)
    assert order_response.status_code == 201
    order = order_response.json()

    payments = client.get(
        f"/api/v1/payments?order_id={order['id']}", headers=manager_headers
    ).json()
    assert len(payments) == 1
    assert payments[0]["amount"] == 300
    assert payments[0]["payment_method"] == "cash"
    assert order["advance_amount"] == 300
    assert order["balance_amount"] == 700
    assert order["payment_status"] == "partially_paid"

    later_payment = client.post(
        "/api/v1/payments",
        headers=manager_headers,
        json={
            "order_id": order["id"],
            "amount": 700,
            "payment_method": "upi",
            "payment_date": TEST_DATE,
            "reference_number": f"FINAL-{uuid.uuid4()}",
        },
    )
    assert later_payment.status_code == 201

    updated = client.get(f"/api/v1/orders/{order['id']}", headers=manager_headers).json()
    assert updated["advance_amount"] == 1000
    assert updated["balance_amount"] == 0
    assert updated["payment_status"] == "paid"
    assert sum(payment["amount"] for payment in client.get(
        f"/api/v1/payments?order_id={order['id']}", headers=manager_headers
    ).json()) == 1000


def test_zero_advance_creates_no_payment(manager_headers):
    order = create_order(manager_headers, total=250, advance=0).json()
    payments = client.get(
        f"/api/v1/payments?order_id={order['id']}", headers=manager_headers
    ).json()
    assert payments == []
    assert order["payment_status"] == "unpaid"
    assert order["balance_amount"] == 250


def test_order_idempotency_prevents_duplicate_stock_and_advance(manager_headers):
    product = client.post(
        "/api/v1/products",
        headers=manager_headers,
        json={
            "name": "Idempotent Order Product",
            "selling_price": 500,
            "current_stock": 5,
        },
    ).json()
    first = create_order(
        manager_headers,
        total=500,
        advance=100,
        product_id=product["id"],
    )
    second = create_order(
        manager_headers,
        total=500,
        advance=100,
        product_id=product["id"],
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]

    refreshed_product = client.get(
        f"/api/v1/products/{product['id']}", headers=manager_headers
    ).json()
    assert refreshed_product["current_stock"] == 4
    payments = client.get(
        f"/api/v1/payments?order_id={first.json()['id']}", headers=manager_headers
    ).json()
    assert len(payments) == 1
    assert payments[0]["amount"] == 100


def test_quotation_conversion_is_single_use_and_deducts_stock_once(manager_headers):
    product = client.post(
        "/api/v1/products",
        headers=manager_headers,
        json={
            "name": "Quotation Conversion Product",
            "selling_price": 200,
            "current_stock": 10,
        },
    ).json()
    quotation = client.post(
        "/api/v1/quotations",
        headers=manager_headers,
        json={
            "customer_id": get_standard_customer_id(),
            "items": [
                {
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": 2,
                    "unit_price": 200,
                }
            ],
        },
    ).json()

    first = client.post(
        f"/api/v1/quotations/{quotation['id']}/convert-to-order",
        headers=manager_headers,
    )
    second = client.post(
        f"/api/v1/quotations/{quotation['id']}/convert-to-order",
        headers=manager_headers,
    )
    assert first.status_code == 200
    assert second.status_code == 409

    refreshed_product = client.get(
        f"/api/v1/products/{product['id']}", headers=manager_headers
    ).json()
    assert refreshed_product["current_stock"] == 8
    converted = client.get(
        f"/api/v1/quotations/{quotation['id']}", headers=manager_headers
    ).json()
    assert converted["status"] == "converted"
    assert client.put(
        f"/api/v1/quotations/{quotation['id']}/status",
        headers=manager_headers,
        json={"status": "accepted"},
    ).status_code == 409


@pytest.mark.parametrize("amount", [0, -1])
def test_zero_and_negative_manual_payments_are_rejected(manager_headers, amount):
    order = create_order(manager_headers, total=100).json()
    response = client.post(
        "/api/v1/payments",
        headers=manager_headers,
        json={
            "order_id": order["id"],
            "amount": amount,
            "payment_method": "cash",
            "payment_date": TEST_DATE,
        },
    )
    assert response.status_code == 422


def test_invalid_method_overpayment_and_duplicate_payment_are_rejected(manager_headers):
    order = create_order(manager_headers, total=100).json()

    invalid_method = client.post(
        "/api/v1/payments",
        headers=manager_headers,
        json={
            "order_id": order["id"],
            "amount": 10,
            "payment_method": "crypto",
            "payment_date": TEST_DATE,
        },
    )
    assert invalid_method.status_code == 422

    overpayment = client.post(
        "/api/v1/payments",
        headers=manager_headers,
        json={
            "order_id": order["id"],
            "amount": 101,
            "payment_method": "cash",
            "payment_date": TEST_DATE,
        },
    )
    assert overpayment.status_code == 400

    payload = {
        "order_id": order["id"],
        "amount": 25,
        "payment_method": "card",
        "payment_date": TEST_DATE,
    }
    first = client.post("/api/v1/payments", headers=manager_headers, json=payload)
    duplicate = client.post("/api/v1/payments", headers=manager_headers, json=payload)
    assert first.status_code == 201
    assert duplicate.status_code == 409
    assert len(client.get(
        f"/api/v1/payments?order_id={order['id']}", headers=manager_headers
    ).json()) == 1


def test_cross_tenant_payment_and_invoice_references_are_rejected(manager_headers):
    db = SessionLocal()
    try:
        lite_owner = db.query(User).filter(User.email == "owner@oakwood.com").first()
        lite_order = db.query(Order).filter(Order.business_id == lite_owner.business_id).first()
    finally:
        db.close()

    payment = client.post(
        "/api/v1/payments",
        headers=manager_headers,
        json={
            "order_id": lite_order.id,
            "amount": 1,
            "payment_method": "cash",
            "payment_date": TEST_DATE,
        },
    )
    assert payment.status_code == 404

    invoice = client.post(
        "/api/v1/invoices",
        headers=manager_headers,
        json={
            "order_id": lite_order.id,
            "customer_id": get_standard_customer_id(),
            "issue_date": TEST_DATE,
            "items": [{"product_name": "Cross Tenant", "quantity": 1, "unit_price": 10}],
        },
    )
    assert invoice.status_code == 404


def test_invoice_generation_is_idempotent_and_tracks_later_payments(manager_headers):
    order = create_order(manager_headers, total=100, advance=20).json()
    first = client.post(
        f"/api/v1/invoices/from-order/{order['id']}", headers=manager_headers
    )
    second = client.post(
        f"/api/v1/invoices/from-order/{order['id']}", headers=manager_headers
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["paid_amount"] == 20
    assert first.json()["balance_amount"] == 80

    payment = client.post(
        "/api/v1/payments",
        headers=manager_headers,
        json={
            "order_id": order["id"],
            "amount": 30,
            "payment_method": "bank_transfer",
            "payment_date": TEST_DATE,
            "reference_number": f"INVOICE-SYNC-{uuid.uuid4()}",
        },
    )
    assert payment.status_code == 201
    refreshed_invoice = client.get(
        f"/api/v1/invoices/{first.json()['id']}", headers=manager_headers
    ).json()
    assert refreshed_invoice["paid_amount"] == 50
    assert refreshed_invoice["balance_amount"] == 50

    invoices = client.get(
        f"/api/v1/invoices?order_id={order['id']}", headers=manager_headers
    ).json()
    assert len(invoices) == 1


def test_standalone_invoice_rejects_paid_amount_above_total(manager_headers):
    response = client.post(
        "/api/v1/invoices",
        headers=manager_headers,
        json={
            "customer_id": get_standard_customer_id(),
            "issue_date": TEST_DATE,
            "paid_amount": 101,
            "items": [{"product_name": "Invoice Item", "quantity": 1, "unit_price": 100}],
        },
    )
    assert response.status_code == 400


def test_phase_2_owner_and_manager_permissions_remain(owner_headers, manager_headers):
    assert client.put("/api/v1/business", headers=owner_headers, json={}).status_code == 200
    assert client.put("/api/v1/business", headers=manager_headers, json={}).status_code == 403
