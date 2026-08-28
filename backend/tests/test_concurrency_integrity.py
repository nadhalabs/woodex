import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from fastapi.testclient import TestClient

from backend.auth import create_access_token
from backend.database import SessionLocal
from backend.main import app
from backend.models import Business, CheckoutIdempotency, Customer, Order, Payment, Product, Quotation, User
from backend.seed import seed_database


client = TestClient(app)
TEST_DATE = "2026-08-29"


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database(confirm_destructive=True)


def get_auth_headers(email):
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


def create_product(headers, *, stock=1, price=100.0):
    unique = uuid.uuid4().hex
    response = client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "name": f"Concurrency Product {unique}",
            "sku": f"CON-{unique}",
            "selling_price": price,
            "cost_price": price / 2,
            "current_stock": stock,
        },
    )
    assert response.status_code == 201
    return response.json()


def create_customer(headers):
    unique = uuid.uuid4().hex
    response = client.post(
        "/api/v1/customers",
        headers=headers,
        json={"name": f"Concurrency Customer {unique}", "phone": unique[:10]},
    )
    assert response.status_code == 201
    return response.json()


def counter_payload(product, *, key=None, quantity=1, phone=None):
    payload = {
        "sale_type": "direct_sale",
        "customer_name": "Concurrency Counter Customer",
        "customer_phone": phone or uuid.uuid4().hex[:10],
        "items": [
            {
                "product_id": product["id"],
                "product_name": product["name"],
                "quantity": quantity,
                "unit_price": product["selling_price"],
            }
        ],
        "tax_rate": 0,
        "paid_amount": product["selling_price"] * quantity,
        "payment_method": "cash",
    }
    if key is not None:
        payload["idempotency_key"] = key
    return payload


def run_concurrently(path, headers, payloads):
    barrier = Barrier(len(payloads))

    def post(payload):
        barrier.wait()
        return TestClient(app).post(path, headers=headers, json=payload)

    with ThreadPoolExecutor(max_workers=len(payloads)) as executor:
        return list(executor.map(post, payloads))


def current_stock(product_id):
    db = SessionLocal()
    try:
        return db.query(Product).filter(Product.id == product_id).first().current_stock
    finally:
        db.close()


def test_concurrent_counter_checkout_cannot_oversell(manager_headers):
    product = create_product(manager_headers, stock=1)
    payloads = [
        counter_payload(product, key=f"counter-stock-{uuid.uuid4()}")
        for _ in range(2)
    ]

    responses = run_concurrently("/api/v1/counter/checkout", manager_headers, payloads)

    assert sorted(response.status_code for response in responses) == [201, 400]
    assert current_stock(product["id"]) == 0


def test_concurrent_same_counter_key_creates_one_transaction(manager_headers):
    product = create_product(manager_headers, stock=2)
    key = f"counter-same-{uuid.uuid4()}"
    payload = counter_payload(product, key=key, phone=uuid.uuid4().hex[:10])

    responses = run_concurrently("/api/v1/counter/checkout", manager_headers, [payload, payload])

    assert [response.status_code for response in responses] == [201, 201]
    order_ids = {response.json()["order"]["id"] for response in responses}
    assert len(order_ids) == 1
    assert current_stock(product["id"]) == 1

    db = SessionLocal()
    try:
        order_id = order_ids.pop()
        assert db.query(Order).filter(Order.id == order_id).count() == 1
        assert db.query(Payment).filter(Payment.order_id == order_id).count() == 1
        assert db.query(CheckoutIdempotency).filter(
            CheckoutIdempotency.idempotency_key == key
        ).count() == 1
    finally:
        db.close()


def test_counter_key_payload_conflict_and_key_validation(manager_headers):
    product = create_product(manager_headers, stock=3)
    key = f"counter-conflict-{uuid.uuid4()}"
    first = counter_payload(product, key=key, quantity=1)
    assert client.post("/api/v1/counter/checkout", headers=manager_headers, json=first).status_code == 201

    changed = counter_payload(product, key=key, quantity=2)
    conflict = client.post("/api/v1/counter/checkout", headers=manager_headers, json=changed)
    assert conflict.status_code == 409
    assert current_stock(product["id"]) == 2

    for invalid_key in ("   ", "x" * 201):
        invalid = counter_payload(product, key=invalid_key)
        response = client.post("/api/v1/counter/checkout", headers=manager_headers, json=invalid)
        assert response.status_code == 400
    assert current_stock(product["id"]) == 2


def test_failed_counter_checkout_rolls_back_and_does_not_poison_key(manager_headers):
    product = create_product(manager_headers, stock=1)
    key = f"counter-retry-{uuid.uuid4()}"
    payload = counter_payload(product, key=key, quantity=2)

    db = SessionLocal()
    try:
        order_count_before = db.query(Order).count()
        payment_count_before = db.query(Payment).count()
    finally:
        db.close()

    failed = client.post("/api/v1/counter/checkout", headers=manager_headers, json=payload)
    assert failed.status_code == 400
    assert current_stock(product["id"]) == 1

    db = SessionLocal()
    try:
        assert db.query(CheckoutIdempotency).filter(
            CheckoutIdempotency.idempotency_key == key
        ).count() == 0
        assert db.query(Customer).filter(Customer.phone == payload["customer_phone"]).count() == 0
        assert db.query(Order).count() == order_count_before
        assert db.query(Payment).count() == payment_count_before
    finally:
        db.close()

    restocked = client.put(
        f"/api/v1/products/{product['id']}",
        headers=manager_headers,
        json={"current_stock": 2},
    )
    assert restocked.status_code == 200
    retried = client.post("/api/v1/counter/checkout", headers=manager_headers, json=payload)
    assert retried.status_code == 201
    assert current_stock(product["id"]) == 0


def test_concurrent_ordinary_orders_cannot_oversell(manager_headers):
    product = create_product(manager_headers, stock=1)
    customer = create_customer(manager_headers)

    def payload(note):
        return {
            "customer_id": customer["id"],
            "order_date": TEST_DATE,
            "delivery_notes": note,
            "items": [
                {
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": 1,
                    "unit_price": product["selling_price"],
                }
            ],
        }

    responses = run_concurrently(
        "/api/v1/orders",
        manager_headers,
        [payload("ordinary-a"), payload("ordinary-b")],
    )
    assert sorted(response.status_code for response in responses) == [201, 400]
    assert current_stock(product["id"]) == 0


def test_concurrent_quotation_conversions_cannot_oversell(manager_headers):
    product = create_product(manager_headers, stock=1)
    customer = create_customer(manager_headers)

    quotation_ids = []
    for suffix in ("a", "b"):
        response = client.post(
            "/api/v1/quotations",
            headers=manager_headers,
            json={
                "customer_id": customer["id"],
                "notes": f"concurrent quote {suffix}",
                "tax_rate": 0,
                "items": [
                    {
                        "product_id": product["id"],
                        "product_name": product["name"],
                        "quantity": 1,
                        "unit_price": product["selling_price"],
                    }
                ],
            },
        )
        assert response.status_code == 201
        quotation_ids.append(response.json()["id"])

    barrier = Barrier(2)

    def convert(quotation_id):
        barrier.wait()
        return TestClient(app).post(
            f"/api/v1/quotations/{quotation_id}/convert-to-order",
            headers=manager_headers,
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(convert, quotation_ids))

    assert sorted(response.status_code for response in responses) == [200, 400]
    assert current_stock(product["id"]) == 0

    converted_id = quotation_ids[responses.index(next(r for r in responses if r.status_code == 200))]
    repeated = client.post(
        f"/api/v1/quotations/{converted_id}/convert-to-order",
        headers=manager_headers,
    )
    assert repeated.status_code == 409
    assert current_stock(product["id"]) == 0


def test_allow_negative_stock_remains_intentional(owner_headers, manager_headers):
    product = create_product(manager_headers, stock=0)
    enabled = client.put(
        "/api/v1/business",
        headers=owner_headers,
        json={"allow_negative_stock": True},
    )
    assert enabled.status_code == 200
    try:
        response = client.post(
            "/api/v1/counter/checkout",
            headers=manager_headers,
            json=counter_payload(product, key=f"negative-{uuid.uuid4()}"),
        )
        assert response.status_code == 201
        assert current_stock(product["id"]) == -1
    finally:
        reset = client.put(
            "/api/v1/business",
            headers=owner_headers,
            json={"allow_negative_stock": False},
        )
        assert reset.status_code == 200
