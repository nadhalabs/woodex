import uuid

import pytest
from fastapi.testclient import TestClient

from backend.auth import create_access_token
from backend.database import SessionLocal
from backend.main import app
from backend.models import Customer, Order, Product, User
from backend.seed import seed_database


client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database(confirm_destructive=True)


def get_auth_headers(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise ValueError(f"User {email} not found")
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


@pytest.fixture(scope="module")
def staff_headers():
    return get_auth_headers("sales@timbercraft.com")


def get_seeded_ids():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "sales@timbercraft.com").first()
        customer = db.query(Customer).filter(Customer.business_id == user.business_id).first()
        product = db.query(Product).filter(Product.business_id == user.business_id).first()
        order = db.query(Order).filter(Order.business_id == user.business_id).first()
        return customer.id, product.id, order.id
    finally:
        db.close()


def assert_forbidden(response):
    assert response.status_code == 403
    assert response.json() == {"detail": "Insufficient permissions"}


def test_unauthenticated_is_401_and_forbidden_is_generic(staff_headers):
    unauthenticated = client.get("/api/v1/staff")
    assert unauthenticated.status_code == 401

    forbidden = client.get("/api/v1/staff", headers=staff_headers)
    assert_forbidden(forbidden)


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/expenses",
        "/api/v1/reports/dashboard",
        "/api/v1/suppliers",
        "/api/v1/purchases",
        "/api/v1/inventory/movements",
        "/api/v1/staff",
    ],
)
def test_staff_cannot_read_restricted_management_areas(staff_headers, path):
    assert_forbidden(client.get(path, headers=staff_headers))


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/business",
        "/api/v1/categories",
        "/api/v1/products",
        "/api/v1/customers",
        "/api/v1/orders",
        "/api/v1/quotations",
        "/api/v1/invoices",
        "/api/v1/payments",
        "/api/v1/counter/held-bills",
    ],
)
def test_staff_can_read_operational_data(staff_headers, path):
    assert client.get(path, headers=staff_headers).status_code == 200


def test_staff_can_manage_customers_orders_and_held_bills(staff_headers):
    customer = client.post(
        "/api/v1/customers",
        headers=staff_headers,
        json={"name": "Authorization Customer", "phone": "9000000001"},
    )
    assert customer.status_code == 201
    customer_id = customer.json()["id"]

    updated_customer = client.put(
        f"/api/v1/customers/{customer_id}",
        headers=staff_headers,
        json={"notes": "Updated by sales staff"},
    )
    assert updated_customer.status_code == 200

    order = client.post(
        "/api/v1/orders",
        headers=staff_headers,
        json={
            "customer_id": customer_id,
            "order_date": "2026-08-29",
            "items": [{"product_name": "Custom Work", "quantity": 1, "unit_price": 1000}],
        },
    )
    assert order.status_code == 201
    order_id = order.json()["id"]

    status_update = client.put(
        f"/api/v1/orders/{order_id}/status",
        headers=staff_headers,
        json={"delivery_status": "scheduled"},
    )
    assert status_update.status_code == 200
    assert status_update.json()["delivery_status"] == "scheduled"

    held = client.post(
        "/api/v1/counter/held-bills",
        headers=staff_headers,
        json={"hold_label": "Staff authorization test", "bill_data": {"items": []}},
    )
    assert held.status_code == 201
    assert client.delete(
        f"/api/v1/counter/held-bills/{held.json()['id']}", headers=staff_headers
    ).status_code == 204


def test_staff_cannot_perform_sensitive_mutations(staff_headers):
    customer_id, product_id, order_id = get_seeded_ids()

    requests = [
        client.put("/api/v1/business", headers=staff_headers, json={"name": "Blocked"}),
        client.post(
            "/api/v1/staff",
            headers=staff_headers,
            json={
                "name": "Blocked User",
                "email": "blocked@example.com",
                "password": "blocked-password",
                "role": "staff",
            },
        ),
        client.post(
            "/api/v1/payments",
            headers=staff_headers,
            json={
                "order_id": order_id,
                "amount": 1,
                "payment_method": "cash",
                "payment_date": "2026-08-29",
            },
        ),
        client.post(
            f"/api/v1/products/{product_id}/adjust-stock",
            headers=staff_headers,
            json={"new_stock": 99},
        ),
        client.post(
            "/api/v1/suppliers",
            headers=staff_headers,
            json={"name": "Blocked Supplier"},
        ),
        client.post(
            "/api/v1/purchases",
            headers=staff_headers,
            json={
                "supplier_id": str(uuid.uuid4()),
                "purchase_date": "2026-08-29",
                "items": [],
            },
        ),
        client.post(
            "/api/v1/quotations",
            headers=staff_headers,
            json={"customer_id": customer_id, "items": []},
        ),
        client.post(
            "/api/v1/invoices/from-order/" + order_id,
            headers=staff_headers,
        ),
        client.delete(f"/api/v1/products/{product_id}", headers=staff_headers),
        client.delete(f"/api/v1/customers/{customer_id}", headers=staff_headers),
        client.delete(f"/api/v1/orders/{order_id}", headers=staff_headers),
    ]

    for response in requests:
        assert_forbidden(response)


def test_staff_counter_access_preserves_price_floor(staff_headers):
    _, product_id, _ = get_seeded_ids()
    product = client.get(f"/api/v1/products/{product_id}", headers=staff_headers).json()

    response = client.post(
        "/api/v1/counter/checkout",
        headers=staff_headers,
        json={
            "sale_type": "direct_sale",
            "customer_name": "Price Floor Test",
            "customer_phone": "9000000002",
            "items": [
                {
                    "product_id": product_id,
                    "product_name": product["name"],
                    "quantity": 1,
                    "unit_price": max(0, product["selling_price"] - 1),
                }
            ],
        },
    )
    assert response.status_code == 403
    assert "cannot override unit price" in response.json()["detail"]


def test_manager_has_operational_management_but_not_owner_access(manager_headers):
    customer_id, _, _ = get_seeded_ids()
    assert client.get("/api/v1/reports/dashboard", headers=manager_headers).status_code == 200
    assert client.get("/api/v1/suppliers", headers=manager_headers).status_code == 200
    assert client.get("/api/v1/purchases", headers=manager_headers).status_code == 200
    assert client.get("/api/v1/inventory/movements", headers=manager_headers).status_code == 200

    product = client.post(
        "/api/v1/products",
        headers=manager_headers,
        json={"name": "Manager Authorization Product", "selling_price": 100, "current_stock": 2},
    )
    assert product.status_code == 201
    product_id = product.json()["id"]
    assert client.post(
        f"/api/v1/products/{product_id}/adjust-stock",
        headers=manager_headers,
        json={"new_stock": 3},
    ).status_code == 200

    deletable_product = client.post(
        "/api/v1/products",
        headers=manager_headers,
        json={"name": "Manager Deletion Product", "selling_price": 50},
    )
    assert deletable_product.status_code == 201
    assert client.delete(
        f"/api/v1/products/{deletable_product.json()['id']}", headers=manager_headers
    ).status_code == 204

    expense = client.post(
        "/api/v1/expenses",
        headers=manager_headers,
        json={"category": "Other", "amount": 1, "date": "2026-08-29"},
    )
    assert expense.status_code == 201
    assert client.delete(
        f"/api/v1/expenses/{expense.json()['id']}", headers=manager_headers
    ).status_code == 204

    quotation = client.post(
        "/api/v1/quotations",
        headers=manager_headers,
        json={"customer_id": customer_id, "items": []},
    )
    assert quotation.status_code == 201
    assert client.delete(
        f"/api/v1/quotations/{quotation.json()['id']}", headers=manager_headers
    ).status_code == 204

    supplier = client.post(
        "/api/v1/suppliers",
        headers=manager_headers,
        json={"name": "Manager Authorization Supplier"},
    )
    assert supplier.status_code == 201
    purchase = client.post(
        "/api/v1/purchases",
        headers=manager_headers,
        json={
            "supplier_id": supplier.json()["id"],
            "purchase_date": "2026-08-29",
            "items": [],
        },
    )
    assert purchase.status_code == 201

    missing_id = str(uuid.uuid4())
    assert client.post(
        "/api/v1/payments",
        headers=manager_headers,
        json={
            "order_id": missing_id,
            "amount": 1,
            "payment_method": "cash",
            "payment_date": "2026-08-29",
        },
    ).status_code == 404
    assert client.post(
        f"/api/v1/invoices/from-order/{missing_id}", headers=manager_headers
    ).status_code == 404

    assert_forbidden(client.put("/api/v1/business", headers=manager_headers, json={}))
    assert_forbidden(client.get("/api/v1/staff", headers=manager_headers))
    assert_forbidden(
        client.post(
            "/api/v1/staff",
            headers=manager_headers,
            json={
                "name": "Manager Cannot Create Owner",
                "email": "manager-owner@example.com",
                "password": "blocked-password",
                "role": "owner",
            },
        )
    )


def test_owner_retains_staff_and_business_administration(owner_headers):
    assert client.put("/api/v1/business", headers=owner_headers, json={}).status_code == 200
    assert client.get("/api/v1/staff", headers=owner_headers).status_code == 200

    email = f"phase2-owner-{uuid.uuid4()}@example.com"
    created = client.post(
        "/api/v1/staff",
        headers=owner_headers,
        json={
            "name": "Additional Owner",
            "email": email,
            "password": "owner-test-password",
            "role": "owner",
        },
    )
    assert created.status_code == 201
    assert created.json()["role"] == "owner"

    db = SessionLocal()
    try:
        current_owner = db.query(User).filter(User.email == "owner@timbercraft.com").first()
        current_owner_id = current_owner.id
    finally:
        db.close()
    self_delete = client.delete(f"/api/v1/staff/{current_owner_id}", headers=owner_headers)
    assert self_delete.status_code == 400


def test_invalid_staff_role_is_rejected(owner_headers):
    response = client.post(
        "/api/v1/staff",
        headers=owner_headers,
        json={
            "name": "Invalid Role",
            "email": "invalid-role@example.com",
            "password": "invalid-role-password",
            "role": "administrator",
        },
    )
    assert response.status_code == 422
