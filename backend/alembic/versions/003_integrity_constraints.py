"""Add critical tenant, invoice, role, and plan constraints.

Revision ID: 003_integrity_constraints
Revises: 002_counter_billing_seq
Create Date: 2026-08-29 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003_integrity_constraints"
down_revision: Union[str, None] = "002_counter_billing_seq"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PRESERVED_UNIQUE_GUARANTEES = (
    ("orders", "uq_orders_business_order_number", ("business_id", "order_number")),
    ("invoices", "uq_invoices_business_invoice_number", ("business_id", "invoice_number")),
)

PHASE5_UNIQUE_GUARANTEES = (
    ("invoices", "uq_invoices_order_id", ("order_id",)),
    ("quotations", "uq_quotations_business_quotation_number", ("business_id", "quotation_number")),
    ("purchases", "uq_purchases_business_purchase_number", ("business_id", "purchase_number")),
)


def _assert_no_duplicates(table: str, columns: tuple[str, ...]) -> None:
    bind = op.get_bind()
    grouped_columns = ", ".join(columns)
    not_null = " AND ".join(f"{column} IS NOT NULL" for column in columns)
    duplicate = bind.execute(
        sa.text(
            f"SELECT 1 FROM {table} WHERE {not_null} "
            f"GROUP BY {grouped_columns} HAVING COUNT(*) > 1 LIMIT 1"
        )
    ).first()
    if duplicate:
        raise RuntimeError(
            f"Cannot add uniqueness guarantee on {table}({grouped_columns}): duplicate data exists"
        )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    for table, name, columns in PRESERVED_UNIQUE_GUARANTEES + PHASE5_UNIQUE_GUARANTEES:
        existing = {constraint["name"] for constraint in inspector.get_unique_constraints(table)}
        if name not in existing:
            _assert_no_duplicates(table, columns)
            op.create_unique_constraint(name, table, list(columns))

    user_checks = {constraint["name"] for constraint in inspector.get_check_constraints("users")}
    if "ck_users_role_valid" not in user_checks:
        invalid_role = bind.execute(
            sa.text("SELECT 1 FROM users WHERE role NOT IN ('owner', 'manager', 'staff') LIMIT 1")
        ).first()
        if invalid_role:
            raise RuntimeError("Cannot add role constraint: invalid user roles exist")
        op.create_check_constraint(
            "ck_users_role_valid", "users", "role IN ('owner', 'manager', 'staff')"
        )

    business_checks = {
        constraint["name"] for constraint in inspector.get_check_constraints("businesses")
    }
    if "ck_businesses_plan_valid" not in business_checks:
        invalid_plan = bind.execute(
            sa.text("SELECT 1 FROM businesses WHERE plan NOT IN ('lite', 'standard') LIMIT 1")
        ).first()
        if invalid_plan:
            raise RuntimeError("Cannot add plan constraint: invalid business plans exist")
        op.create_check_constraint(
            "ck_businesses_plan_valid", "businesses", "plan IN ('lite', 'standard')"
        )

    # Revision 002 added these columns as nullable for compatibility. Existing NULLs
    # receive the same values the application already treats as defaults before the
    # schema is tightened to match the models.
    bind.execute(sa.text("UPDATE orders SET tax_rate = 18.0 WHERE tax_rate IS NULL"))
    bind.execute(sa.text("UPDATE invoices SET tax_rate = 18.0 WHERE tax_rate IS NULL"))
    bind.execute(sa.text("UPDATE invoice_items SET discount = 0.0 WHERE discount IS NULL"))
    bind.execute(sa.text("UPDATE invoice_items SET tax_rate = 18.0 WHERE tax_rate IS NULL"))
    bind.execute(sa.text("UPDATE invoice_items SET tax_amount = 0.0 WHERE tax_amount IS NULL"))
    op.alter_column("orders", "tax_rate", existing_type=sa.Float(), nullable=False)
    op.alter_column("invoices", "tax_rate", existing_type=sa.Float(), nullable=False)
    op.alter_column("invoice_items", "discount", existing_type=sa.Float(), nullable=False)
    op.alter_column("invoice_items", "tax_rate", existing_type=sa.Float(), nullable=False)
    op.alter_column("invoice_items", "tax_amount", existing_type=sa.Float(), nullable=False)


def downgrade() -> None:
    op.alter_column("invoice_items", "tax_amount", existing_type=sa.Float(), nullable=True)
    op.alter_column("invoice_items", "tax_rate", existing_type=sa.Float(), nullable=True)
    op.alter_column("invoice_items", "discount", existing_type=sa.Float(), nullable=True)
    op.alter_column("invoices", "tax_rate", existing_type=sa.Float(), nullable=True)
    op.alter_column("orders", "tax_rate", existing_type=sa.Float(), nullable=True)
    op.drop_constraint("ck_businesses_plan_valid", "businesses", type_="check")
    op.drop_constraint("ck_users_role_valid", "users", type_="check")
    for table, name, _columns in reversed(PHASE5_UNIQUE_GUARANTEES):
        op.drop_constraint(name, table, type_="unique")
