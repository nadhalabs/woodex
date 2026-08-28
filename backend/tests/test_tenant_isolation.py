import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal, engine, Base
from backend.seed import seed_database
from backend.auth import create_access_token

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database()

def get_auth_headers(email: str):
    from backend.models import User
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
        "address": "Address A"
    }, headers=headers_a)
    assert res_a.status_code == 201
    cust_a_id = res_a.json()["id"]

    # 2. User A can fetch Customer A
    res_get_a = client.get(f"/api/v1/customers/{cust_a_id}", headers=headers_a)
    assert res_get_a.status_code == 200
    assert res_get_a.json()["name"] == "Exclusive Customer A"

    # 3. User B attempts to access Customer A -> MUST return 404 Not Found (isolated!)
    res_get_b = client.get(f"/api/v1/customers/{cust_a_id}", headers=headers_b)
    assert res_get_b.status_code == 404

    # 4. User B gets customer list -> Must NOT include Customer A
    res_list_b = client.get("/api/v1/customers", headers=headers_b)
    assert res_list_b.status_code == 200
    b_cust_ids = [c["id"] for c in res_list_b.json()]
    assert cust_a_id not in b_cust_ids

def test_tenant_isolation_orders():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    # Fetch User A orders
    res_orders_a = client.get("/api/v1/orders", headers=headers_a)
    assert res_orders_a.status_code == 200
    order_a_id = res_orders_a.json()[0]["id"]

    # User B tries to read Order A -> MUST return 404
    res_b_read = client.get(f"/api/v1/orders/{order_a_id}", headers=headers_b)
    assert res_b_read.status_code == 404

    # User B tries to update Order A status -> MUST return 404
    res_b_update = client.put(f"/api/v1/orders/{order_a_id}/status", json={"order_status": "delivered"}, headers=headers_b)
    assert res_b_update.status_code == 404

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


# ----------------------------------------------------
# Category Tenant Isolation & Management Tests
# ----------------------------------------------------

def test_categories_tenant_isolation():
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

    # Create category 1 and category 2
    res_c1 = client.post("/api/v1/categories", json={"name": "Temp Study Desks"}, headers=headers_a)
    assert res_c1.status_code == 201
    c1_id = res_c1.json()["id"]

    res_c2 = client.post("/api/v1/categories", json={"name": "Permanent Study Desks"}, headers=headers_a)
    assert res_c2.status_code == 201
    c2_id = res_c2.json()["id"]

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

    # Attempting to delete category 1 without action should fail with 400 action_required
    res_del_blocked = client.delete(f"/api/v1/categories/{c1_id}", headers=headers_a)
    assert res_del_blocked.status_code == 400
    assert "action_required" in str(res_del_blocked.json())

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

    # Get categories for User A
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


# ----------------------------------------------------
# Product Image Gallery & Primary Integrity Tests
# ----------------------------------------------------

def test_product_images_and_primary_integrity():
    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    # 1. Create a product without images
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
