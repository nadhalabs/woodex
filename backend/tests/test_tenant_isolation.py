import uuid
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import SessionLocal
from backend.models import User, Business, Customer, Product, Order, Invoice, Category, Supplier
from backend.seed import seed_database
from backend.auth import create_access_token

client = TestClient(app)
TEST_DATE = "2026-08-29"


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database(confirm_destructive=True)


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


def test_tenant_isolation_customers():
    # User A: Oakwood (Lite)
    headers_a = get_auth_headers("owner@oakwood.com")
    # User B: TimberCraft (Standard)
    headers_b = get_auth_headers("owner@timbercraft.com")

    # 1. User A creates a customer
    res_a = client.post("/api/v1/customers", json={
        "name": "Exclusive Customer A",
        "phone": "9999911111",
        "address": "Address A",
        "notes": "Secret Notes A"
    }, headers=headers_a)
    assert res_a.status_code == 201
    cust_a_id = res_a.json()["id"]

    # 2. User A can fetch Customer A
    res_get_a = client.get(f"/api/v1/customers/{cust_a_id}", headers=headers_a)
    assert res_get_a.status_code == 200
    assert res_get_a.json()["name"] == "Exclusive Customer A"
    assert res_get_a.json()["notes"] == "Secret Notes A"

    # 3. User B attempts direct read by ID -> MUST return 404
    res_get_b = client.get(f"/api/v1/customers/{cust_a_id}", headers=headers_b)
    assert res_get_b.status_code == 404

    # 4. User B attempts update -> MUST return 404
    res_put_b = client.put(f"/api/v1/customers/{cust_a_id}", json={"name": "Hacked"}, headers=headers_b)
    assert res_put_b.status_code == 404

    # 5. User B attempts delete -> MUST return 404
    res_del_b = client.delete(f"/api/v1/customers/{cust_a_id}", headers=headers_b)
    assert res_del_b.status_code == 404

    # 6. User B gets customer list -> Must NOT include Customer A
    res_list_b = client.get("/api/v1/customers", headers=headers_b)
    assert res_list_b.status_code == 200
    b_cust_ids = [c["id"] for c in res_list_b.json()]
    assert cust_a_id not in b_cust_ids

    # 7. User B searches by phone -> Must NOT return Customer A
    res_search_b = client.get("/api/v1/customers?q=9999911111", headers=headers_b)
    assert res_search_b.status_code == 200
    assert len(res_search_b.json()) == 0


def test_tenant_isolation_categories():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    # 1. User A creates a unique category
    res_create = client.post("/api/v1/categories", json={
        "name": "Oak Recliners",
        "description": "Premium leather and teak recliners",
        "image_url": "https://example.com/recliner.jpg",
        "image_public_id": "woodex/oakwood/categories/oak-recliners"
    }, headers=headers_a)
    assert res_create.status_code == 201
    cat_a = res_create.json()
    assert cat_a["name"] == "Oak Recliners"
    assert cat_a["slug"] == "oak-recliners"

    # 2. User A can retrieve category
    res_get_a = client.get(f"/api/v1/categories/{cat_a['id']}", headers=headers_a)
    assert res_get_a.status_code == 200
    assert res_get_a.json()["id"] == cat_a["id"]

    # 3. User B cannot retrieve User A's category
    res_get_b = client.get(f"/api/v1/categories/{cat_a['id']}", headers=headers_b)
    assert res_get_b.status_code == 404

    # 4. User B cannot modify User A's category
    res_put_b = client.put(f"/api/v1/categories/{cat_a['id']}", json={"name": "Hacked"}, headers=headers_b)
    assert res_put_b.status_code == 404

    # 5. User B cannot delete User A's category
    res_del_b = client.delete(f"/api/v1/categories/{cat_a['id']}", headers=headers_b)
    assert res_del_b.status_code == 404

    # 6. User B creating a category with same slug "oak-recliners" is allowed (tenant-scoped uniqueness)
    res_create_b = client.post("/api/v1/categories", json={
        "name": "Oak Recliners",
        "description": "TimberCraft recliners"
    }, headers=headers_b)
    assert res_create_b.status_code == 201
    assert res_create_b.json()["slug"] == "oak-recliners"

    # 7. User A trying to create duplicate slug in same business is rejected
    res_duplicate_a = client.post("/api/v1/categories", json={
        "name": "Oak Recliners",
        "slug": "oak-recliners"
    }, headers=headers_a)
    assert res_duplicate_a.status_code == 400


def test_category_safe_deletion_and_reassignment():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    # Create category 1 and category 2 in Tenant A
    res_c1 = client.post("/api/v1/categories", json={"name": "Temp Study Desks"}, headers=headers_a)
    assert res_c1.status_code == 201
    c1_id = res_c1.json()["id"]

    res_c2 = client.post("/api/v1/categories", json={"name": "Permanent Study Desks"}, headers=headers_a)
    assert res_c2.status_code == 201
    c2_id = res_c2.json()["id"]

    # Create category in Tenant B
    res_cb = client.post("/api/v1/categories", json={"name": "Tenant B Desk Cat"}, headers=headers_b)
    assert res_cb.status_code == 201
    cb_id = res_cb.json()["id"]

    # Create a product in category 1
    res_p = client.post("/api/v1/products", json={
        "name": "Ergonomic Teak Desk",
        "category_id": c1_id,
        "selling_price": 18000.0,
        "cost_price": 10000.0,
        "current_stock": 5
    }, headers=headers_a)
    assert res_p.status_code == 201
    p_id = res_p.json()["id"]

    # Attempting to delete category 1 without action fails
    res_del_blocked = client.delete(f"/api/v1/categories/{c1_id}", headers=headers_a)
    assert res_del_blocked.status_code == 400
    assert "action_required" in str(res_del_blocked.json())

    # User A tries to reassign to Tenant B's category ID -> MUST return 404
    res_cross_reassign = client.delete(
        f"/api/v1/categories/{c1_id}?action=move&reassign_to_category_id={cb_id}",
        headers=headers_a
    )
    assert res_cross_reassign.status_code == 404

    # Move products to category 2 and delete category 1
    res_del_move = client.delete(
        f"/api/v1/categories/{c1_id}?action=move&reassign_to_category_id={c2_id}",
        headers=headers_a
    )
    assert res_del_move.status_code == 200

    # Verify product is now in category 2
    res_p_check = client.get(f"/api/v1/products/{p_id}", headers=headers_a)
    assert res_p_check.status_code == 200
    assert res_p_check.json()["category_id"] == c2_id

    # Test uncategorize action
    res_del_uncat = client.delete(
        f"/api/v1/categories/{c2_id}?action=uncategorize",
        headers=headers_a
    )
    assert res_del_uncat.status_code == 200

    res_p_uncat = client.get(f"/api/v1/products/{p_id}", headers=headers_a)
    assert res_p_uncat.status_code == 200
    assert res_p_uncat.json()["category_id"] is None
    assert res_p_uncat.json()["category"] == "Uncategorized"


def test_category_reordering_isolation():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    # Get categories for User A and User B
    cats_a = client.get("/api/v1/categories", headers=headers_a).json()
    cats_b = client.get("/api/v1/categories", headers=headers_b).json()

    assert len(cats_a) >= 2
    assert len(cats_b) >= 1

    # User A reorders its own categories
    reorder_payload = {
        "items": [
            {"id": cats_a[0]["id"], "display_order": 50},
            {"id": cats_a[1]["id"], "display_order": 10},
        ]
    }
    res_reorder = client.put("/api/v1/categories/order", json=reorder_payload, headers=headers_a)
    assert res_reorder.status_code == 200

    # User A attempts to include User B's category ID in reorder -> MUST fail 400
    bad_reorder = {
        "items": [
            {"id": cats_a[0]["id"], "display_order": 1},
            {"id": cats_b[0]["id"], "display_order": 2},
        ]
    }
    res_bad = client.put("/api/v1/categories/order", json=bad_reorder, headers=headers_a)
    assert res_bad.status_code == 400


def test_tenant_isolation_products():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    cat_a = client.get("/api/v1/categories", headers=headers_a).json()[0]
    cat_b = client.get("/api/v1/categories", headers=headers_b).json()[0]

    # 1. User A creates a product
    res_prod_a = client.post("/api/v1/products", json={
        "name": "Handcrafted Oak Bench",
        "category_id": cat_a["id"],
        "selling_price": 9500.0,
        "cost_price": 5000.0,
        "current_stock": 8,
        "sku": "OAK-BENCH-01",
        "description": "Oak bench for A"
    }, headers=headers_a)
    assert res_prod_a.status_code == 201
    prod_a = res_prod_a.json()
    prod_a_id = prod_a["id"]

    # 2. User A can fetch product
    res_get_a = client.get(f"/api/v1/products/{prod_a_id}", headers=headers_a)
    assert res_get_a.status_code == 200
    assert res_get_a.json()["name"] == "Handcrafted Oak Bench"

    # 3. User B direct read by ID -> MUST return 404
    res_get_b = client.get(f"/api/v1/products/{prod_a_id}", headers=headers_b)
    assert res_get_b.status_code == 404

    # 4. User B update -> MUST return 404
    res_put_b = client.put(f"/api/v1/products/{prod_a_id}", json={"name": "Compromised"}, headers=headers_b)
    assert res_put_b.status_code == 404

    # 5. User B adjust stock -> MUST return 404
    res_adj_b = client.post(f"/api/v1/products/{prod_a_id}/adjust-stock", json={"new_stock": 999}, headers=headers_b)
    assert res_adj_b.status_code == 404

    # 6. User B delete -> MUST return 404
    res_del_b = client.delete(f"/api/v1/products/{prod_a_id}", headers=headers_b)
    assert res_del_b.status_code == 404

    # 7. User B tries creating a product referencing Tenant A's category_id -> MUST return 400
    res_cross_cat = client.post("/api/v1/products", json={
        "name": "Cross Tenant Product",
        "category_id": cat_a["id"],
        "selling_price": 1000.0,
    }, headers=headers_b)
    assert res_cross_cat.status_code == 400

    # 8. User B creates a valid product, then tries updating category_id to Tenant A's category -> MUST return 400
    res_prod_b = client.post("/api/v1/products", json={
        "name": "Valid Tenant B Product",
        "category_id": cat_b["id"],
        "selling_price": 2000.0,
    }, headers=headers_b)
    assert res_prod_b.status_code == 201
    prod_b_id = res_prod_b.json()["id"]

    res_cross_cat_update = client.put(f"/api/v1/products/{prod_b_id}", json={
        "category_id": cat_a["id"]
    }, headers=headers_b)
    assert res_cross_cat_update.status_code == 400

    # 9. User B product list -> excludes Tenant A's product
    b_prods = client.get("/api/v1/products", headers=headers_b).json()
    b_prod_ids = [p["id"] for p in b_prods]
    assert prod_a_id not in b_prod_ids


def test_product_images_and_primary_integrity():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    # 1. Create a product without images in Tenant A
    res_prod = client.post("/api/v1/products", json={
        "name": "Luxury Rocking Chair",
        "category": "Chair",
        "selling_price": 15000.0,
        "cost_price": 8000.0,
        "current_stock": 3
    }, headers=headers_a)
    assert res_prod.status_code == 201
    prod_id = res_prod.json()["id"]

    # 2. Add first image -> automatically primary
    res_img1 = client.post(f"/api/v1/products/{prod_id}/images", json={
        "url": "https://cloudinary.com/woodex/img1.jpg",
        "public_id": "woodex/oakwood/products/rocking-chair/1",
        "display_order": 0
    }, headers=headers_a)
    assert res_img1.status_code == 201
    img1 = res_img1.json()
    assert img1["is_primary"] is True

    # Check product updated with main image
    prod_check = client.get(f"/api/v1/products/{prod_id}", headers=headers_a).json()
    assert prod_check["image_url"] == "https://cloudinary.com/woodex/img1.jpg"

    # 3. Add second image with is_primary=True -> sets img1 is_primary=False
    res_img2 = client.post(f"/api/v1/products/{prod_id}/images", json={
        "url": "https://cloudinary.com/woodex/img2.jpg",
        "public_id": "woodex/oakwood/products/rocking-chair/2",
        "display_order": 1,
        "is_primary": True
    }, headers=headers_a)
    assert res_img2.status_code == 201
    img2 = res_img2.json()
    assert img2["is_primary"] is True

    # Verify img1 is no longer primary and product has img2 as main
    prod_check2 = client.get(f"/api/v1/products/{prod_id}", headers=headers_a).json()
    assert prod_check2["image_url"] == "https://cloudinary.com/woodex/img2.jpg"
    img1_status = [img for img in prod_check2["images"] if img["id"] == img1["id"]][0]
    assert img1_status["is_primary"] is False

    # 4. User B cannot access or modify User A's product image
    res_b_img_add = client.post(f"/api/v1/products/{prod_id}/images", json={
        "url": "https://hack.com/bad.jpg"
    }, headers=headers_b)
    assert res_b_img_add.status_code == 404

    res_b_img_set = client.put(f"/api/v1/products/{prod_id}/images/{img2['id']}/primary", headers=headers_b)
    assert res_b_img_set.status_code == 404

    res_b_img_del = client.delete(f"/api/v1/products/{prod_id}/images/{img2['id']}", headers=headers_b)
    assert res_b_img_del.status_code == 404

    # 5. User A deletes primary image (img2) -> automatically promotes first remaining (img1) to primary
    res_del_primary = client.delete(f"/api/v1/products/{prod_id}/images/{img2['id']}", headers=headers_a)
    assert res_del_primary.status_code == 200

    prod_check3 = client.get(f"/api/v1/products/{prod_id}", headers=headers_a).json()
    assert len(prod_check3["images"]) == 1
    assert prod_check3["images"][0]["id"] == img1["id"]
    assert prod_check3["images"][0]["is_primary"] is True
    assert prod_check3["image_url"] == "https://cloudinary.com/woodex/img1.jpg"


def test_tenant_isolation_quotations():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    cust_a = client.get("/api/v1/customers", headers=headers_a).json()[0]
    prod_a = client.get("/api/v1/products", headers=headers_a).json()[0]
    cust_b = client.get("/api/v1/customers", headers=headers_b).json()[0]
    prod_b = client.get("/api/v1/products", headers=headers_b).json()[0]

    # 1. User A creates a quotation
    res_q_a = client.post("/api/v1/quotations", json={
        "customer_id": cust_a["id"],
        "items": [
            {"product_id": prod_a["id"], "product_name": prod_a["name"], "quantity": 1, "unit_price": prod_a["selling_price"]}
        ],
        "notes": "Quotation for Tenant A"
    }, headers=headers_a)
    assert res_q_a.status_code == 201
    q_a = res_q_a.json()
    q_a_id = q_a["id"]

    # 2. User A reads quotation
    res_get_a = client.get(f"/api/v1/quotations/{q_a_id}", headers=headers_a)
    assert res_get_a.status_code == 200
    assert res_get_a.json()["customer_name"] == cust_a["name"]

    # 3. User B direct read by ID -> MUST return 404
    res_get_b = client.get(f"/api/v1/quotations/{q_a_id}", headers=headers_b)
    assert res_get_b.status_code == 404

    # 4. User B update status -> MUST return 404
    res_put_b = client.put(f"/api/v1/quotations/{q_a_id}/status", json={"status": "accepted"}, headers=headers_b)
    assert res_put_b.status_code == 404

    # 5. User B convert to order -> MUST return 404
    res_conv_b = client.post(f"/api/v1/quotations/{q_a_id}/convert-to-order", headers=headers_b)
    assert res_conv_b.status_code == 404

    # 6. User B delete -> MUST return 404
    res_del_b = client.delete(f"/api/v1/quotations/{q_a_id}", headers=headers_b)
    assert res_del_b.status_code == 404

    # 7. User B tries to create quotation referencing Tenant A's customer -> MUST return 404
    res_cross_cust = client.post("/api/v1/quotations", json={
        "customer_id": cust_a["id"],
        "items": [{"product_id": prod_b["id"], "product_name": prod_b["name"], "quantity": 1, "unit_price": 100}]
    }, headers=headers_b)
    assert res_cross_cust.status_code == 404

    # 8. User B tries to create quotation referencing Tenant A's product -> MUST return 404
    res_cross_prod = client.post("/api/v1/quotations", json={
        "customer_id": cust_b["id"],
        "items": [{"product_id": prod_a["id"], "product_name": prod_a["name"], "quantity": 1, "unit_price": 100}]
    }, headers=headers_b)
    assert res_cross_prod.status_code == 404

    # 9. User B quotation list excludes Tenant A's quotation
    b_quotes = client.get("/api/v1/quotations", headers=headers_b).json()
    b_quote_ids = [q["id"] for q in b_quotes]
    assert q_a_id not in b_quote_ids


def test_tenant_isolation_orders():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    cust_a = client.get("/api/v1/customers", headers=headers_a).json()[0]
    prod_a = client.get("/api/v1/products", headers=headers_a).json()[0]
    cust_b = client.get("/api/v1/customers", headers=headers_b).json()[0]
    prod_b = client.get("/api/v1/products", headers=headers_b).json()[0]

    # 1. User A creates order
    res_order_a = client.post("/api/v1/orders", json={
        "customer_id": cust_a["id"],
        "order_date": TEST_DATE,
        "items": [{"product_id": prod_a["id"], "product_name": prod_a["name"], "quantity": 1, "unit_price": prod_a["selling_price"]}],
        "delivery_notes": "Handle with care"
    }, headers=headers_a)
    assert res_order_a.status_code == 201
    order_a = res_order_a.json()
    order_a_id = order_a["id"]

    # 2. User A can read order
    res_get_a = client.get(f"/api/v1/orders/{order_a_id}", headers=headers_a)
    assert res_get_a.status_code == 200
    assert res_get_a.json()["customer_name"] == cust_a["name"]

    # 3. User B direct read by ID -> MUST return 404
    res_b_read = client.get(f"/api/v1/orders/{order_a_id}", headers=headers_b)
    assert res_b_read.status_code == 404

    # 4. User B update status -> MUST return 404
    res_b_update = client.put(f"/api/v1/orders/{order_a_id}/status", json={"order_status": "delivered"}, headers=headers_b)
    assert res_b_update.status_code == 404

    # 5. User B delete -> MUST return 404
    res_b_del = client.delete(f"/api/v1/orders/{order_a_id}", headers=headers_b)
    assert res_b_del.status_code == 404

    # 6. User B tries to create order referencing Tenant A's customer -> MUST return 404
    res_cross_cust = client.post("/api/v1/orders", json={
        "customer_id": cust_a["id"],
        "order_date": TEST_DATE,
        "items": [{"product_id": prod_b["id"], "product_name": prod_b["name"], "quantity": 1, "unit_price": 100}]
    }, headers=headers_b)
    assert res_cross_cust.status_code == 404

    # 7. User B tries to create order referencing Tenant A's product -> MUST return 404
    res_cross_prod = client.post("/api/v1/orders", json={
        "customer_id": cust_b["id"],
        "order_date": TEST_DATE,
        "items": [{"product_id": prod_a["id"], "product_name": prod_a["name"], "quantity": 1, "unit_price": 100}]
    }, headers=headers_b)
    assert res_cross_prod.status_code == 404

    # 8. User B order list excludes Tenant A's order
    b_orders = client.get("/api/v1/orders", headers=headers_b).json()
    b_order_ids = [o["id"] for o in b_orders]
    assert order_a_id not in b_order_ids


def test_tenant_isolation_invoices():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    # Fetch User A's seeded invoice
    invoices_a = client.get("/api/v1/invoices", headers=headers_a).json()
    assert len(invoices_a) > 0
    inv_a_id = invoices_a[0]["id"]
    order_a_id = invoices_a[0]["order_id"]

    cust_a = client.get("/api/v1/customers", headers=headers_a).json()[0]
    prod_a = client.get("/api/v1/products", headers=headers_a).json()[0]
    cust_b = client.get("/api/v1/customers", headers=headers_b).json()[0]
    prod_b = client.get("/api/v1/products", headers=headers_b).json()[0]

    # 1. User B direct read A invoice -> MUST return 404
    res_b_read = client.get(f"/api/v1/invoices/{inv_a_id}", headers=headers_b)
    assert res_b_read.status_code == 404

    # 2. User B tries to create invoice referencing Tenant A's order -> MUST return 404
    res_cross_order = client.post("/api/v1/invoices", json={
        "order_id": order_a_id,
        "customer_id": cust_b["id"],
        "issue_date": TEST_DATE,
        "items": [{"product_id": prod_b["id"], "product_name": prod_b["name"], "quantity": 1, "unit_price": 100}]
    }, headers=headers_b)
    assert res_cross_order.status_code == 404

    # 3. User B tries to create invoice referencing Tenant A's customer -> MUST return 404
    res_cross_cust = client.post("/api/v1/invoices", json={
        "customer_id": cust_a["id"],
        "issue_date": TEST_DATE,
        "items": [{"product_id": prod_b["id"], "product_name": prod_b["name"], "quantity": 1, "unit_price": 100}]
    }, headers=headers_b)
    assert res_cross_cust.status_code == 404

    # 4. User B tries to create invoice referencing Tenant A's product -> MUST return 404
    res_cross_prod = client.post("/api/v1/invoices", json={
        "customer_id": cust_b["id"],
        "issue_date": TEST_DATE,
        "items": [{"product_id": prod_a["id"], "product_name": prod_a["name"], "quantity": 1, "unit_price": 100}]
    }, headers=headers_b)
    assert res_cross_prod.status_code == 404

    # 5. User B tries to create invoice from-order with Tenant A's order_id -> MUST return 404
    res_from_order = client.post(f"/api/v1/invoices/from-order/{order_a_id}", headers=headers_b)
    assert res_from_order.status_code == 404

    # 6. User B invoice list excludes Tenant A's invoices
    b_invoices = client.get("/api/v1/invoices", headers=headers_b).json()
    b_inv_ids = [i["id"] for i in b_invoices]
    assert inv_a_id not in b_inv_ids


def test_tenant_isolation_payments():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    # Fetch User A's order and payments
    orders_a = client.get("/api/v1/orders", headers=headers_a).json()
    order_a = orders_a[0]
    payments_a = client.get("/api/v1/payments", headers=headers_a).json()
    assert len(payments_a) > 0
    pay_a_id = payments_a[0]["id"]

    # 1. User B tries to record payment against Tenant A's order -> MUST return 404
    res_pay_b = client.post("/api/v1/payments", json={
        "order_id": order_a["id"],
        "amount": 100.0,
        "payment_method": "cash",
        "payment_date": TEST_DATE
    }, headers=headers_b)
    assert res_pay_b.status_code == 404

    # 2. User B payment list excludes Tenant A's payments
    payments_b = client.get("/api/v1/payments", headers=headers_b).json()
    b_pay_ids = [p["id"] for p in payments_b]
    assert pay_a_id not in b_pay_ids

    # 3. User B queries payments with ?order_id=<order_a_id> -> MUST return empty list []
    scoped_pay_query = client.get(f"/api/v1/payments?order_id={order_a['id']}", headers=headers_b).json()
    assert scoped_pay_query == []


def test_tenant_isolation_counter_pos_and_held_bills():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    cust_a = client.get("/api/v1/customers", headers=headers_a).json()[0]
    prod_a = client.get("/api/v1/products", headers=headers_a).json()[0]

    # 1. User B counter checkout referencing Tenant A's customer_id -> MUST return 404
    res_co_cust = client.post("/api/v1/counter/checkout", json={
        "sale_type": "direct_sale",
        "customer_id": cust_a["id"],
        "items": [{"product_name": "Direct Sale Item", "quantity": 1, "unit_price": 500.0}],
        "paid_amount": 500.0
    }, headers=headers_b)
    assert res_co_cust.status_code == 404

    # 2. User B counter checkout referencing Tenant A's product_id -> MUST return 404
    res_co_prod = client.post("/api/v1/counter/checkout", json={
        "sale_type": "direct_sale",
        "customer_name": "Walk-in B",
        "items": [{"product_id": prod_a["id"], "product_name": prod_a["name"], "quantity": 1, "unit_price": prod_a["selling_price"]}],
        "paid_amount": prod_a["selling_price"]
    }, headers=headers_b)
    assert res_co_prod.status_code == 404

    # 3. Held Bills isolation: User A creates a held bill
    res_held_a = client.post("/api/v1/counter/held-bills", json={
        "hold_label": "Oakwood Held Table",
        "bill_data": {"items": [{"name": "Table", "price": 1000}]}
    }, headers=headers_a)
    assert res_held_a.status_code == 201
    held_a_id = res_held_a.json()["id"]

    # User B lists held bills -> MUST NOT include Tenant A's held bill
    held_b_list = client.get("/api/v1/counter/held-bills", headers=headers_b).json()
    assert held_a_id not in [h["id"] for h in held_b_list]

    # User B attempts to delete Tenant A's held bill -> MUST return 404
    res_del_held = client.delete(f"/api/v1/counter/held-bills/{held_a_id}", headers=headers_b)
    assert res_del_held.status_code == 404

    # 4. Search counter orders: User B searches by Tenant A's order number or customer name -> MUST return empty []
    order_a = client.get("/api/v1/orders", headers=headers_a).json()[0]
    res_search_b = client.get(f"/api/v1/counter/search-orders?q={order_a['order_number']}", headers=headers_b).json()
    assert res_search_b == []

    # 5. Idempotency Key Isolation: Tenant A and Tenant B both check out with the exact same idempotency key
    shared_key = f"IDEMP-SHARED-{uuid.uuid4()}"
    res_idemp_a = client.post("/api/v1/counter/checkout", json={
        "sale_type": "direct_sale",
        "customer_name": "Tenant A Customer",
        "items": [{"product_name": "Product A", "quantity": 1, "unit_price": 200.0}],
        "paid_amount": 200.0,
        "idempotency_key": shared_key
    }, headers=headers_a)
    assert res_idemp_a.status_code == 201
    assert res_idemp_a.json()["customer"]["name"] == "Tenant A Customer"

    res_idemp_b = client.post("/api/v1/counter/checkout", json={
        "sale_type": "direct_sale",
        "customer_name": "Tenant B Customer",
        "items": [{"product_name": "Product B", "quantity": 1, "unit_price": 300.0}],
        "paid_amount": 300.0,
        "idempotency_key": shared_key
    }, headers=headers_b)
    assert res_idemp_b.status_code == 201
    # Ensure B receives its own order result, NOT A's cached result
    assert res_idemp_b.json()["customer"]["name"] == "Tenant B Customer"
    assert res_idemp_b.json()["order"]["id"] != res_idemp_a.json()["order"]["id"]


def test_tenant_isolation_expenses():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    # 1. User A creates an expense
    res_exp_a = client.post("/api/v1/expenses", json={
        "category": "Transport",
        "amount": 2500.0,
        "date": TEST_DATE,
        "description": "Private Delivery Truck"
    }, headers=headers_a)
    assert res_exp_a.status_code == 201
    exp_a_id = res_exp_a.json()["id"]

    # 2. User B lists expenses -> MUST NOT include Tenant A's expense
    expenses_b = client.get("/api/v1/expenses", headers=headers_b).json()
    assert exp_a_id not in [e["id"] for e in expenses_b]

    # 3. User B tries to delete Tenant A's expense -> MUST return 404
    res_del_b = client.delete(f"/api/v1/expenses/{exp_a_id}", headers=headers_b)
    assert res_del_b.status_code == 404


def test_tenant_isolation_suppliers_and_purchases_across_standard_tenants():
    # Register a second Standard tenant (Tenant C)
    reg_res = client.post("/api/v1/auth/register", json={
        "business_name": "Royal Woodcraft Co.",
        "owner_name": "Rajiv Mehra",
        "email": "owner@royalwoodcraft.com",
        "password": "WoodexTest123!",
        "plan": "standard"
    })
    assert reg_res.status_code == 200
    headers_c = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    headers_b = get_auth_headers("owner@timbercraft.com")

    # 1. Tenant B creates a supplier
    res_sup_b = client.post("/api/v1/suppliers", json={
        "name": "TimberCraft Exclusive Supplier",
        "phone": "9800098000",
        "notes": "Exclusive vendor"
    }, headers=headers_b)
    assert res_sup_b.status_code == 201
    sup_b_id = res_sup_b.json()["id"]

    # 2. Tenant C lists suppliers -> excludes Tenant B's supplier
    suppliers_c = client.get("/api/v1/suppliers", headers=headers_c).json()
    assert sup_b_id not in [s["id"] for s in suppliers_c]

    # 3. Tenant C attempts to delete Tenant B's supplier -> MUST return 404
    res_del_sup = client.delete(f"/api/v1/suppliers/{sup_b_id}", headers=headers_c)
    assert res_del_sup.status_code == 404

    # 4. Tenant C tries to create purchase referencing Tenant B's supplier -> MUST return 404
    res_po_cross_sup = client.post("/api/v1/purchases", json={
        "supplier_id": sup_b_id,
        "purchase_date": TEST_DATE,
        "items": [{"product_name": "Teak Logs", "quantity": 1, "unit_price": 10000.0}]
    }, headers=headers_c)
    assert res_po_cross_sup.status_code == 404

    # 5. Tenant C creates its own supplier and product
    res_sup_c = client.post("/api/v1/suppliers", json={"name": "Royal Supplier"}, headers=headers_c)
    assert res_sup_c.status_code == 201
    sup_c_id = res_sup_c.json()["id"]

    prod_b = client.get("/api/v1/products", headers=headers_b).json()[0]

    # 6. Tenant C tries to create purchase referencing Tenant B's product -> MUST return 404
    res_po_cross_prod = client.post("/api/v1/purchases", json={
        "supplier_id": sup_c_id,
        "purchase_date": TEST_DATE,
        "items": [{"product_id": prod_b["id"], "product_name": prod_b["name"], "quantity": 1, "unit_price": 5000.0}]
    }, headers=headers_c)
    assert res_po_cross_prod.status_code == 404

    # 7. Tenant B's seeded purchase PO-0001 is NOT visible to Tenant C
    purchases_c = client.get("/api/v1/purchases", headers=headers_c).json()
    assert len(purchases_c) == 0

    # 8. Tenant C inventory movements list excludes Tenant B's movements
    movements_c = client.get("/api/v1/inventory/movements", headers=headers_c).json()
    assert len(movements_c) == 0


def test_tenant_isolation_staff():
    # Register another standard business to test staff isolation
    reg_res = client.post("/api/v1/auth/register", json={
        "business_name": "Apex Carpentry",
        "owner_name": "Anil Kapoor",
        "email": "owner@apexcarpentry.com",
        "password": "WoodexTest123!",
        "plan": "standard"
    })
    assert reg_res.status_code == 200
    headers_apex = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    headers_tc = get_auth_headers("owner@timbercraft.com")

    # TimberCraft has seeded staff (e.g. manager@timbercraft.com, sales@timbercraft.com)
    tc_staff = client.get("/api/v1/staff", headers=headers_tc).json()
    assert len(tc_staff) >= 2
    tc_sales_user_id = [u["id"] for u in tc_staff if u["email"] == "sales@timbercraft.com"][0]

    # Apex Carpentry lists staff -> only sees Apex owner, NOT TimberCraft staff
    apex_staff = client.get("/api/v1/staff", headers=headers_apex).json()
    assert len(apex_staff) == 1
    assert apex_staff[0]["email"] == "owner@apexcarpentry.com"
    assert tc_sales_user_id not in [u["id"] for u in apex_staff]

    # Apex Carpentry owner attempts to delete TimberCraft sales staff -> MUST return 404
    res_del_staff = client.delete(f"/api/v1/staff/{tc_sales_user_id}", headers=headers_apex)
    assert res_del_staff.status_code == 404


def test_tenant_isolation_reports_and_aggregates():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    # Fetch initial dashboard metrics for Tenant B
    dash_b_initial = client.get("/api/v1/reports/dashboard", headers=headers_b).json()

    # Tenant A generates high value orders and expenses
    cust_a = client.get("/api/v1/customers", headers=headers_a).json()[0]
    client.post("/api/v1/orders", json={
        "customer_id": cust_a["id"],
        "order_date": TEST_DATE,
        "items": [{"product_name": "Massive Wholesale Timber", "quantity": 100, "unit_price": 50000.0}],
        "advance_amount": 2500000.0
    }, headers=headers_a)

    client.post("/api/v1/expenses", json={
        "category": "Rent",
        "amount": 900000.0,
        "date": TEST_DATE,
        "description": "Massive Warehouse Lease"
    }, headers=headers_a)

    # Fetch Tenant B dashboard metrics again
    dash_b_after = client.get("/api/v1/reports/dashboard", headers=headers_b).json()

    # Tenant B metrics must remain unaffected by Tenant A's large transactions
    assert dash_b_after["monthly_revenue"] == dash_b_initial["monthly_revenue"]
    assert dash_b_after["monthly_expenses"] == dash_b_initial["monthly_expenses"]
    assert dash_b_after["orders_this_month"] == dash_b_initial["orders_this_month"]
    assert dash_b_after["stock_valuation"] == dash_b_initial["stock_valuation"]
    assert dash_b_after["estimated_gross_profit"] == dash_b_initial["estimated_gross_profit"]

    # Verify recent orders in Tenant B dashboard contains ONLY Tenant B orders
    b_order_ids = [o["id"] for o in client.get("/api/v1/orders", headers=headers_b).json()]
    for order in dash_b_after["recent_orders"]:
        assert order["id"] in b_order_ids


def test_tenant_isolation_auth_and_tokens():
    # 1. Stale or manipulated JWT: Token contains sub=User A, business_id=Business B
    db = SessionLocal()
    try:
        user_a = db.query(User).filter(User.email == "owner@oakwood.com").first()
        biz_b = db.query(Business).filter(Business.email == "info@timbercraft.com").first()
        manipulated_token = create_access_token({
            "sub": user_a.id,
            "business_id": biz_b.id,
            "role": user_a.role
        })
    finally:
        db.close()

    # Request with manipulated token MUST fail with 401 Unauthorized
    res_manipulated = client.get("/api/v1/customers", headers={"Authorization": f"Bearer {manipulated_token}"})
    assert res_manipulated.status_code == 401
    assert res_manipulated.json() == {"detail": "Could not validate credentials"}

    # 2. Token with nonexistent user ID
    fake_user_token = create_access_token({"sub": str(uuid.uuid4()), "role": "owner"})
    res_fake_user = client.get("/api/v1/customers", headers={"Authorization": f"Bearer {fake_user_token}"})
    assert res_fake_user.status_code == 401

    # 3. Registration isolation: Newly registered business creates isolated tenant server-side
    new_email = f"isolation-test-{uuid.uuid4()}@example.com"
    res_reg = client.post("/api/v1/auth/register", json={
        "business_name": "Self Contained Corp",
        "owner_name": "Test Owner",
        "email": new_email,
        "password": "WoodexTest123!",
        "plan": "lite"
    })
    assert res_reg.status_code == 200
    new_token = res_reg.json()["access_token"]
    headers_new = {"Authorization": f"Bearer {new_token}"}

    # Verify newly registered user is isolated: has 0 customers, 0 orders, 0 invoices
    assert client.get("/api/v1/customers", headers=headers_new).json() == []
    assert client.get("/api/v1/orders", headers=headers_new).json() == []
    assert client.get("/api/v1/invoices", headers=headers_new).json() == []


def test_plan_feature_gating():
    # User A is on Lite Plan
    headers_lite = get_auth_headers("owner@oakwood.com")
    # User B is on Standard Plan
    headers_std = get_auth_headers("owner@timbercraft.com")

    # Lite user trying to access Suppliers -> MUST return 403 Forbidden
    res_suppliers_lite = client.get("/api/v1/suppliers", headers=headers_lite)
    assert res_suppliers_lite.status_code == 403
    assert "Standard Plan" in res_suppliers_lite.json()["detail"]

    # Standard user accessing Suppliers -> MUST succeed 200
    res_suppliers_std = client.get("/api/v1/suppliers", headers=headers_std)
    assert res_suppliers_std.status_code == 200
