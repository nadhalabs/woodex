import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.billing_calculator import calculate_counter_bill

from backend.database import SessionLocal
from backend.models import User, Business
from backend.auth import create_access_token

client = TestClient(app)

def get_auth_headers(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise ValueError(f"User {email} not found")
        token = create_access_token({"sub": user.id, "business_id": user.business_id, "role": user.role})
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()


def test_financial_calculator_authority():
    """Verify backend authoritative calculation using Decimal arithmetic."""
    # Test Tax-Exclusive with percentage discount
    items = [
        {"product_name": "Chair", "quantity": 4, "unit_price": 2500.0, "discount": 0.0},
        {"product_name": "Table", "quantity": 1, "unit_price": 15000.0, "discount": 1000.0},
    ]
    # Subtotal: (4*2500 = 10000) + (1*15000 - 1000 = 14000) = 24000
    # Bill discount: 10% of 24000 = 2400 -> Taxable: 21600
    # Tax: 18% of 21600 = 3888
    # Grand Total: 25488
    calc = calculate_counter_bill(
        items=items,
        bill_discount=10.0,
        discount_type="percentage",
        tax_rate=18.0,
        tax_inclusive=False,
        paid_amount=15488.0
    )
    assert calc["subtotal"] == 24000.0
    assert calc["discount"] == 2400.0
    assert calc["tax_amount"] == 3888.0
    assert calc["total_amount"] == 25488.0
    assert calc["paid_amount"] == 15488.0
    assert calc["balance_amount"] == 10000.0
    assert calc["payment_status"] == "partially_paid"


def test_direct_sale_checkout():
    """Test standard Direct Sale workflow with full payment and stock deduction."""
    headers = get_auth_headers("owner@timbercraft.com")

    # 1. Create a product
    prod_res = client.post("/api/v1/products", headers=headers, json={
        "name": "Oak Dining Chair Counter Test",
        "sku": "ODC-POS-01",
        "selling_price": 4500.0,
        "cost_price": 2500.0,
        "current_stock": 20,
        "low_stock_level": 5
    })
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # 2. Perform Direct Sale Checkout
    checkout_payload = {
        "sale_type": "direct_sale",
        "customer_name": "Rohan Sharma",
        "customer_phone": "9988776655",
        "customer_address": "Indiranagar, Bangalore",
        "items": [
            {
                "product_id": prod_id,
                "product_name": "Oak Dining Chair Counter Test",
                "quantity": 2,
                "unit_price": 4500.0
            }
        ],
        "bill_discount": 500.0,
        "discount_type": "fixed",
        "tax_rate": 18.0,
        "tax_inclusive": False,
        "paid_amount": 10030.0,  # (9000 - 500 = 8500) + 18% tax (1530) = 10030
        "payment_method": "upi",
        "payment_reference": "UPI-TXN-987654"
    }

    res = client.post("/api/v1/counter/checkout", headers=headers, json=checkout_payload)
    assert res.status_code == 201
    data = res.json()

    assert data["order"]["payment_status"] == "paid"
    assert data["order"]["order_status"] == "delivered"
    assert data["order"]["total_amount"] == 10030.0
    assert data["order"]["balance_amount"] == 0.0
    assert data["invoice"]["invoice_number"].startswith("INV-")
    assert data["payment"]["payment_method"] == "upi"
    assert data["payment"]["amount"] == 10030.0

    # Verify stock deduction
    updated_prod = client.get("/api/v1/products", headers=headers).json()
    chair = next(p for p in updated_prod if p["id"] == prod_id)
    assert chair["current_stock"] == 18  # 20 - 2


def test_customer_order_advance_and_multiple_payments():
    """Test furniture Customer Order with advance payment and subsequent payment ledger entries."""
    headers = get_auth_headers("owner@timbercraft.com")

    # 1. Create a luxury product
    prod_res = client.post("/api/v1/products", headers=headers, json={
        "name": "Teak Wood King Bed Counter Test",
        "sku": "TKB-POS-01",
        "selling_price": 60000.0,
        "cost_price": 35000.0,
        "current_stock": 5
    })
    prod_id = prod_res.json()["id"]

    # 2. Checkout Customer Order with ₹20,000 advance
    checkout_payload = {
        "sale_type": "customer_order",
        "customer_name": "Priya Nair",
        "customer_phone": "9845012345",
        "customer_address": "Koramangala 4th Block",
        "items": [
            {
                "product_id": prod_id,
                "product_name": "Teak Wood King Bed Counter Test",
                "quantity": 1,
                "unit_price": 60000.0
            }
        ],
        "bill_discount": 0.0,
        "tax_rate": 0.0,
        "paid_amount": 20000.0,
        "payment_method": "card",
        "expected_delivery_date": "2026-09-15",
        "delivery_notes": "Call before dispatch",
        "custom_specs": {
            "dimensions": "78x72 inches",
            "wood_type": "Teak",
            "finish": "Walnut Matte",
            "fabric": "Beige Velvet"
        }
    }

    res = client.post("/api/v1/counter/checkout", headers=headers, json=checkout_payload)
    assert res.status_code == 201
    data = res.json()

    order_id = data["order"]["id"]
    assert data["order"]["order_status"] == "confirmed"
    assert data["order"]["payment_status"] == "partially_paid"
    assert data["order"]["advance_amount"] == 20000.0
    assert data["order"]["balance_amount"] == 40000.0
    assert data["order"]["custom_specs"]["wood_type"] == "Teak"

    # 3. Record Second Payment (₹25,000 Bank Transfer)
    pay2_res = client.post("/api/v1/payments", headers=headers, json={
        "order_id": order_id,
        "amount": 25000.0,
        "payment_method": "bank_transfer",
        "payment_date": "2026-08-25",
        "reference_number": "NEFT-789012"
    })
    assert pay2_res.status_code == 201

    # Check updated order balance (60000 - 45000 = 15000)
    ord_check1 = client.get(f"/api/v1/orders/{order_id}", headers=headers).json()
    assert ord_check1["payment_status"] == "partially_paid"
    assert ord_check1["advance_amount"] == 45000.0
    assert ord_check1["balance_amount"] == 15000.0

    # 4. Record Final Payment (₹15,000 Cash)
    pay3_res = client.post("/api/v1/payments", headers=headers, json={
        "order_id": order_id,
        "amount": 15000.0,
        "payment_method": "cash",
        "payment_date": "2026-09-15"
    })
    assert pay3_res.status_code == 201

    # Check order is fully paid
    ord_check2 = client.get(f"/api/v1/orders/{order_id}", headers=headers).json()
    assert ord_check2["payment_status"] == "paid"
    assert ord_check2["balance_amount"] == 0.0

    # Verify payment ledger has all 3 payments
    payments_list = client.get(f"/api/v1/payments?order_id={order_id}", headers=headers).json()
    assert len(payments_list) == 3


def test_idempotency_duplicate_protection():
    """Test that rapid duplicate checkouts with identical idempotency key do not duplicate orders, invoices, or stock deductions."""
    headers = get_auth_headers("owner@timbercraft.com")

    prod_res = client.post("/api/v1/products", headers=headers, json={
        "name": "Coffee Table POS Test",
        "sku": "CT-POS-01",
        "selling_price": 8000.0,
        "cost_price": 4000.0,
        "current_stock": 10
    })
    prod_id = prod_res.json()["id"]

    idempotency_key = f"IDEMP-TEST-{uuid.uuid4()}"

    checkout_payload = {
        "sale_type": "direct_sale",
        "customer_name": "Idemp Customer",
        "customer_phone": "9112233445",
        "items": [
            {"product_id": prod_id, "product_name": "Coffee Table POS Test", "quantity": 2, "unit_price": 8000.0}
        ],
        "paid_amount": 16000.0,
        "tax_rate": 0.0,
        "payment_method": "cash",
        "idempotency_key": idempotency_key
    }

    # First request
    res1 = client.post("/api/v1/counter/checkout", headers=headers, json=checkout_payload)
    assert res1.status_code == 201
    order1_id = res1.json()["order"]["id"]
    inv1_id = res1.json()["invoice"]["id"]

    # Duplicate request with same idempotency key
    res2 = client.post("/api/v1/counter/checkout", headers=headers, json=checkout_payload)
    assert res2.status_code == 201
    assert res2.json()["order"]["id"] == order1_id
    assert res2.json()["invoice"]["id"] == inv1_id

    # Stock should only be deducted ONCE (10 - 2 = 8)
    updated_prod = client.get("/api/v1/products", headers=headers).json()
    table = next(p for p in updated_prod if p["id"] == prod_id)
    assert table["current_stock"] == 8


def test_stock_shortage_validation():
    """Test that insufficient stock blocks checkout when allow_negative_stock is false."""
    headers = get_auth_headers("owner@timbercraft.com")

    prod_res = client.post("/api/v1/products", headers=headers, json={
        "name": "Limited Wardrobe POS Test",
        "sku": "LW-POS-01",
        "selling_price": 30000.0,
        "cost_price": 18000.0,
        "current_stock": 1
    })
    prod_id = prod_res.json()["id"]

    checkout_payload = {
        "sale_type": "direct_sale",
        "customer_name": "Stock Tester",
        "customer_phone": "9123456780",
        "items": [
            {"product_id": prod_id, "product_name": "Limited Wardrobe POS Test", "quantity": 3, "unit_price": 30000.0}
        ],
        "paid_amount": 90000.0
    }

    res = client.post("/api/v1/counter/checkout", headers=headers, json=checkout_payload)
    assert res.status_code == 400
    assert "Insufficient stock" in res.json()["detail"]


def test_invoice_snapshot_integrity():
    """Verify historical invoice snapshot remains intact even if customer or product are modified later."""
    headers = get_auth_headers("owner@timbercraft.com")

    cust_res = client.post("/api/v1/customers", headers=headers, json={
        "name": "Original Customer Name",
        "phone": "9998887771",
        "address": "Original Customer Address"
    })
    cust_id = cust_res.json()["id"]

    prod_res = client.post("/api/v1/products", headers=headers, json={
        "name": "Original Sofa Model POS",
        "selling_price": 20000.0,
        "current_stock": 5
    })
    prod_id = prod_res.json()["id"]

    # Checkout
    checkout_payload = {
        "sale_type": "direct_sale",
        "customer_id": cust_id,
        "items": [
            {"product_id": prod_id, "product_name": "Original Sofa Model POS", "quantity": 1, "unit_price": 20000.0}
        ],
        "paid_amount": 20000.0,
        "tax_rate": 0.0
    }

    checkout_res = client.post("/api/v1/counter/checkout", headers=headers, json=checkout_payload)
    assert checkout_res.status_code == 201
    inv_id = checkout_res.json()["invoice"]["id"]

    # Now modify customer and product names
    client.put(f"/api/v1/customers/{cust_id}", headers=headers, json={
        "name": "CHANGED Customer Name",
        "address": "CHANGED Customer Address"
    })
    client.put(f"/api/v1/products/{prod_id}", headers=headers, json={
        "name": "CHANGED Sofa Model",
        "selling_price": 28000.0
    })

    # Retrieve Invoice and verify snapshot values are preserved
    inv_check = client.get(f"/api/v1/invoices/{inv_id}", headers=headers).json()
    assert inv_check["customer_name"] == "Original Customer Name"
    assert inv_check["customer_address"] == "Original Customer Address"
    assert inv_check["items"][0]["product_name"] == "Original Sofa Model POS"
    assert inv_check["items"][0]["unit_price"] == 20000.0


def test_tenant_isolation_counter():
    """Verify Business A cannot access or search Business B's orders or held bills."""
    headers1 = get_auth_headers("owner@timbercraft.com")
    headers2 = get_auth_headers("owner@oakwood.com")

    # Hold a bill in TimberCraft
    hold_res = client.post("/api/v1/counter/held-bills", headers=headers1, json={
        "hold_label": "TimberCraft Draft Bill",
        "bill_data": {"test": "data_timbercraft"}
    })
    assert hold_res.status_code == 201
    held_id = hold_res.json()["id"]

    # Oakwood tries to list held bills
    oakwood_held = client.get("/api/v1/counter/held-bills", headers=headers2).json()
    assert not any(h["id"] == held_id for h in oakwood_held)

    # Oakwood tries to delete TimberCraft's held bill
    del_res = client.delete(f"/api/v1/counter/held-bills/{held_id}", headers=headers2)
    assert del_res.status_code == 404
