import uuid

import pytest
from fastapi.testclient import TestClient

from backend.auth import create_access_token
from backend.database import SessionLocal
from backend.main import app
from backend.models import Business, Customer, Product, User
from backend.seed import seed_database


client = TestClient(app)
safe_client = TestClient(app, raise_server_exceptions=False)
TEST_DATE = "2026-08-29"


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database(confirm_destructive=True)


def auth_headers(email):
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
def manager_headers():
    return auth_headers("manager@timbercraft.com")


def standard_customer_id():
    db = SessionLocal()
    try:
        business = db.query(Business).filter(Business.email == "info@timbercraft.com").first()
        return db.query(Customer).filter(Customer.business_id == business.id).first().id
    finally:
        db.close()


def valid_order_payload(**overrides):
    payload = {
        "customer_id": standard_customer_id(),
        "order_date": TEST_DATE,
        "delivery_notes": uuid.uuid4().hex,
        "items": [{"product_name": "Validation Item", "quantity": 1, "unit_price": 100}],
    }
    payload.update(overrides)
    return payload


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        ("/api/v1/orders", {"customer_id": "unused", "order_date": TEST_DATE, "items": []}),
        ("/api/v1/quotations", {"customer_id": "unused", "items": []}),
        ("/api/v1/invoices", {"customer_id": "unused", "issue_date": TEST_DATE, "items": []}),
        ("/api/v1/purchases", {"supplier_id": "unused", "purchase_date": TEST_DATE, "items": []}),
    ],
)
def test_empty_mutating_item_lists_are_rejected(manager_headers, path, payload):
    assert client.post(path, headers=manager_headers, json=payload).status_code == 422


@pytest.mark.parametrize("quantity", [0, -1])
def test_invalid_quantities_are_rejected(manager_headers, quantity):
    payload = valid_order_payload()
    payload["items"][0]["quantity"] = quantity
    assert client.post("/api/v1/orders", headers=manager_headers, json=payload).status_code == 422


@pytest.mark.parametrize(
    ("field", "value"),
    [("discount", -1), ("tax_amount", -1), ("advance_amount", -1)],
)
def test_negative_order_financial_values_are_rejected(manager_headers, field, value):
    assert client.post(
        "/api/v1/orders",
        headers=manager_headers,
        json=valid_order_payload(**{field: value}),
    ).status_code == 422


def test_invalid_dates_statuses_and_payment_method_are_rejected(manager_headers):
    malformed_date = valid_order_payload(order_date="29/08/2026")
    assert client.post("/api/v1/orders", headers=manager_headers, json=malformed_date).status_code == 422

    order = client.post(
        "/api/v1/orders", headers=manager_headers, json=valid_order_payload()
    ).json()
    assert client.put(
        f"/api/v1/orders/{order['id']}/status",
        headers=manager_headers,
        json={"order_status": "unknown"},
    ).status_code == 422

    assert client.post(
        "/api/v1/auth/register",
        json={
            "business_name": "Invalid Plan Business",
            "owner_name": "Invalid Plan Owner",
            "email": f"invalid-plan-{uuid.uuid4()}@example.com",
            "password": "invalid-plan-password",
            "plan": "enterprise",
        },
    ).status_code == 422
    assert client.post(
        "/api/v1/payments",
        headers=manager_headers,
        json={
            "order_id": order["id"],
            "amount": 1,
            "payment_method": "crypto",
            "payment_date": TEST_DATE,
        },
    ).status_code == 422


def test_terminal_statuses_reject_contradictory_changes(manager_headers):
    order = client.post(
        "/api/v1/orders", headers=manager_headers, json=valid_order_payload()
    ).json()
    delivered = client.put(
        f"/api/v1/orders/{order['id']}/status",
        headers=manager_headers,
        json={"order_status": "delivered"},
    )
    assert delivered.status_code == 200
    assert client.put(
        f"/api/v1/orders/{order['id']}/status",
        headers=manager_headers,
        json={"order_status": "in_progress"},
    ).status_code == 409


def test_order_linked_invoice_uses_authoritative_order_totals(manager_headers):
    order = client.post(
        "/api/v1/orders", headers=manager_headers, json=valid_order_payload()
    ).json()
    response = client.post(
        "/api/v1/invoices",
        headers=manager_headers,
        json={
            "order_id": order["id"],
            "customer_id": order["customer_id"],
            "issue_date": TEST_DATE,
            "discount": 99,
            "tax_amount": 99,
            "items": [{"product_name": "Untrusted Client Item", "quantity": 1, "unit_price": 1}],
        },
    )
    assert response.status_code == 201
    assert response.json()["subtotal"] == order["subtotal"]
    assert response.json()["total_amount"] == order["total_amount"]
    assert response.json()["items"][0]["product_name"] == "Validation Item"


def test_cross_tenant_submitted_ids_are_rejected(manager_headers):
    db = SessionLocal()
    try:
        lite_business = db.query(Business).filter(Business.email == "contact@oakwoodfurniture.com").first()
        lite_customer = db.query(Customer).filter(Customer.business_id == lite_business.id).first()
        lite_product = db.query(Product).filter(Product.business_id == lite_business.id).first()
    finally:
        db.close()

    assert client.post(
        "/api/v1/orders",
        headers=manager_headers,
        json={
            "customer_id": lite_customer.id,
            "order_date": TEST_DATE,
            "items": [{"product_name": "Cross tenant", "quantity": 1, "unit_price": 1}],
        },
    ).status_code == 404
    assert client.post(
        "/api/v1/quotations",
        headers=manager_headers,
        json={
            "customer_id": standard_customer_id(),
            "items": [{
                "product_id": lite_product.id,
                "product_name": lite_product.name,
                "quantity": 1,
                "unit_price": 1,
            }],
        },
    ).status_code == 404
    assert client.post(
        "/api/v1/counter/checkout",
        headers=manager_headers,
        json={
            "customer_id": lite_customer.id,
            "items": [{"product_name": "Cross tenant", "quantity": 1, "unit_price": 1}],
            "tax_rate": 0,
        },
    ).status_code == 404


def test_database_failure_rolls_back_and_returns_generic_conflict():
    db = SessionLocal()
    try:
        business_count = db.query(Business).count()
        user_count = db.query(User).count()
    finally:
        db.close()

    response = safe_client.post(
        "/api/v1/auth/register",
        json={
            "business_name": "Duplicate Business",
            "owner_name": "Duplicate Owner",
            "email": "info@timbercraft.com",
            "password": "duplicate-password",
            "plan": "standard",
        },
    )
    assert response.status_code == 409
    assert response.json() == {"detail": "Database conflict"}

    db = SessionLocal()
    try:
        assert db.query(Business).count() == business_count
        assert db.query(User).count() == user_count
    finally:
        db.close()


def test_unsafe_historical_deletes_are_rejected(manager_headers):
    product = client.post(
        "/api/v1/products",
        headers=manager_headers,
        json={
            "name": f"Historical Product {uuid.uuid4().hex}",
            "selling_price": 100,
            "current_stock": 1,
        },
    ).json()
    order_payload = valid_order_payload()
    order_payload["items"] = [{
        "product_id": product["id"],
        "product_name": product["name"],
        "quantity": 1,
        "unit_price": 100,
    }]
    order = client.post("/api/v1/orders", headers=manager_headers, json=order_payload).json()

    assert client.delete(
        f"/api/v1/orders/{order['id']}", headers=manager_headers
    ).status_code == 409
    assert client.delete(
        f"/api/v1/products/{product['id']}", headers=manager_headers
    ).status_code == 409
    assert client.delete(
        f"/api/v1/customers/{order['customer_id']}", headers=manager_headers
    ).status_code == 409
