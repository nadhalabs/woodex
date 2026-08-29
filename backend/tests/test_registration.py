import uuid
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import SessionLocal
from backend.models import User, Business
from backend.seed import seed_database

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database(confirm_destructive=True)


def test_successful_registration():
    unique_id = uuid.uuid4().hex[:8]
    business_email = f"contact-{unique_id}@woodcraft.com"
    owner_email = f"owner-{unique_id}@woodcraft.com"

    res = client.post("/api/v1/auth/register", json={
        "business_name": f"Woodcraft {unique_id}",
        "business_email": business_email,
        "owner_name": "Test Owner",
        "owner_email": owner_email,
        "password": "StrongPassword123!",
        "phone": "+91 9876543210",
        "address": "123 Timber Lane, Bengaluru",
        "gstin": "29ABCDE1234F1Z5",
    })
    assert res.status_code == 200
    token_data = res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    # Verify Business and Owner User in database
    db = SessionLocal()
    try:
        owner = db.query(User).filter(User.email == owner_email).first()
        assert owner is not None
        assert owner.name == "Test Owner"
        assert owner.role == "owner"

        biz = db.query(Business).filter(Business.id == owner.business_id).first()
        assert biz is not None
        assert biz.name == f"Woodcraft {unique_id}"
        assert biz.email == business_email
        assert biz.plan == "lite"
        assert biz.phone == "+91 9876543210"
        assert biz.address == "123 Timber Lane, Bengaluru"
    finally:
        db.close()

    # Verify authentication works with issued token
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["user"]["email"] == owner_email
    assert me_data["user"]["role"] == "owner"
    assert me_data["business"]["plan"] == "lite"

    # Verify login works with owner email and password
    login_res = client.post("/api/v1/auth/login", json={
        "email": owner_email,
        "password": "StrongPassword123!",
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_registration_with_single_email_fallback():
    unique_id = uuid.uuid4().hex[:8]
    shared_email = f"shared-{unique_id}@timberland.com"

    res = client.post("/api/v1/auth/register", json={
        "business_name": f"Timberland {unique_id}",
        "owner_name": "Shared Owner",
        "email": shared_email,
        "password": "StrongPassword123!",
    })
    assert res.status_code == 200

    db = SessionLocal()
    try:
        owner = db.query(User).filter(User.email == shared_email).first()
        assert owner is not None
        biz = db.query(Business).filter(Business.id == owner.business_id).first()
        assert biz is not None
        assert biz.email == shared_email
        assert biz.plan == "lite"
    finally:
        db.close()


def test_registration_server_controlled_plan_and_role():
    # Attempt to supply plan in registration -> rejected with 422
    unique_id = uuid.uuid4().hex[:8]
    res_plan = client.post("/api/v1/auth/register", json={
        "business_name": f"Standard Hack {unique_id}",
        "owner_name": "Plan Hacker",
        "email": f"hacker-{unique_id}@hack.com",
        "password": "StrongPassword123!",
        "plan": "standard",
    })
    assert res_plan.status_code == 422
    assert "Subscription plan cannot be selected during registration" in res_plan.json()["detail"]

    # Attempt to pass extra role field -> rejected by ConfigDict(extra="forbid")
    res_role = client.post("/api/v1/auth/register", json={
        "business_name": f"Admin Hack {unique_id}",
        "owner_name": "Role Hacker",
        "email": f"role-{unique_id}@hack.com",
        "password": "StrongPassword123!",
        "role": "admin",
    })
    assert res_role.status_code == 422


def test_strong_password_enforcement():
    unique_id = uuid.uuid4().hex[:8]
    base_payload = {
        "business_name": f"Password Test {unique_id}",
        "owner_name": "Password User",
        "email": f"pwd-{unique_id}@example.com",
    }

    # Too short (< 8 chars)
    res = client.post("/api/v1/auth/register", json={**base_payload, "password": "Ab1!"})
    assert res.status_code == 422
    assert "Password must be at least 8 characters" in res.json()["detail"]

    # Missing uppercase
    res = client.post("/api/v1/auth/register", json={**base_payload, "password": "password123!"})
    assert res.status_code == 422

    # Missing lowercase
    res = client.post("/api/v1/auth/register", json={**base_payload, "password": "PASSWORD123!"})
    assert res.status_code == 422

    # Missing digit
    res = client.post("/api/v1/auth/register", json={**base_payload, "password": "Password!!!!"})
    assert res.status_code == 422

    # Missing symbol
    res = client.post("/api/v1/auth/register", json={**base_payload, "password": "Password1234"})
    assert res.status_code == 422


def test_duplicate_email_conflict_handling():
    # Existing seeded owner: owner@oakwood.com, business: contact@oakwoodfurniture.com
    res_dup_owner = client.post("/api/v1/auth/register", json={
        "business_name": "Dup Business",
        "owner_name": "Dup Owner",
        "business_email": "new-biz@oakwood.com",
        "owner_email": "OWNER@oakwood.com",  # case-insensitive check
        "password": "StrongPassword123!",
    })
    assert res_dup_owner.status_code == 409
    assert res_dup_owner.json() == {"detail": "Database conflict"}

    res_dup_business = client.post("/api/v1/auth/register", json={
        "business_name": "Dup Business 2",
        "owner_name": "Dup Owner 2",
        "business_email": "CONTACT@OAKWOODFURNITURE.COM",  # case-insensitive check
        "owner_email": "unique-owner@newbiz.com",
        "password": "StrongPassword123!",
    })
    assert res_dup_business.status_code == 409
    assert res_dup_business.json() == {"detail": "Database conflict"}


def test_transaction_rollback_on_failure():
    db = SessionLocal()
    try:
        initial_biz_count = db.query(Business).count()
        initial_user_count = db.query(User).count()
    finally:
        db.close()

    # Register with owner email that conflicts with existing user
    res = client.post("/api/v1/auth/register", json={
        "business_name": "Rollback Corp",
        "owner_name": "Rollback Owner",
        "business_email": "unregistered-biz-email@rollback.com",
        "owner_email": "owner@timbercraft.com",  # existing user
        "password": "StrongPassword123!",
    })
    assert res.status_code == 409

    # Verify no partial business was created
    db = SessionLocal()
    try:
        assert db.query(Business).count() == initial_biz_count
        assert db.query(User).count() == initial_user_count
        orphan_biz = db.query(Business).filter(Business.email == "unregistered-biz-email@rollback.com").first()
        assert orphan_biz is None
    finally:
        db.close()


def test_registration_tenant_isolation():
    # Register two completely independent businesses
    id1 = uuid.uuid4().hex[:6]
    id2 = uuid.uuid4().hex[:6]

    res1 = client.post("/api/v1/auth/register", json={
        "business_name": f"Tenant One {id1}",
        "owner_name": "Owner One",
        "email": f"owner1-{id1}@tenantone.com",
        "password": "StrongPassword123!",
    })
    assert res1.status_code == 200
    headers1 = {"Authorization": f"Bearer {res1.json()['access_token']}"}

    res2 = client.post("/api/v1/auth/register", json={
        "business_name": f"Tenant Two {id2}",
        "owner_name": "Owner Two",
        "email": f"owner2-{id2}@tenanttwo.com",
        "password": "StrongPassword123!",
    })
    assert res2.status_code == 200
    headers2 = {"Authorization": f"Bearer {res2.json()['access_token']}"}

    # Tenant 1 creates a customer
    res_cust1 = client.post("/api/v1/customers", json={
        "name": "Customer for Tenant One",
        "phone": "9111122222",
    }, headers=headers1)
    assert res_cust1.status_code == 201
    cust1_id = res_cust1.json()["id"]

    # Tenant 2 cannot see or read Tenant 1's customer
    assert client.get(f"/api/v1/customers/{cust1_id}", headers=headers2).status_code == 404
    custs2 = client.get("/api/v1/customers", headers=headers2).json()
    assert cust1_id not in [c["id"] for c in custs2]
