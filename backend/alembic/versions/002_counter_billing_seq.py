"""Create business_sequences, checkout_idempotencies, held_bills, add snapshot columns and billing settings

Revision ID: 002_counter_billing_seq
Revises: 001_categories_prod_images
Create Date: 2026-08-21 01:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision: str = '002_counter_billing_seq'
down_revision: Union[str, None] = '001_categories_prod_images'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    insp = Inspector.from_engine(bind)
    existing_tables = insp.get_table_names()

    # 1. Create business_sequences
    if 'business_sequences' not in existing_tables:
        op.create_table(
            'business_sequences',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('business_id', sa.String(), sa.ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False),
            sa.Column('sequence_type', sa.String(), nullable=False),
            sa.Column('year', sa.Integer(), nullable=False, server_default='2026'),
            sa.Column('current_val', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index('ix_business_sequences_business_id', 'business_sequences', ['business_id'])
        op.create_index('ix_business_seq_lookup', 'business_sequences', ['business_id', 'sequence_type', 'year'])
        op.create_unique_constraint('uq_business_seq_type_year', 'business_sequences', ['business_id', 'sequence_type', 'year'])

    # 2. Create checkout_idempotencies
    if 'checkout_idempotencies' not in existing_tables:
        op.create_table(
            'checkout_idempotencies',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('business_id', sa.String(), sa.ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False),
            sa.Column('idempotency_key', sa.String(), nullable=False),
            sa.Column('order_id', sa.String(), nullable=True),
            sa.Column('invoice_id', sa.String(), nullable=True),
            sa.Column('response_data', sa.JSON(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index('ix_checkout_idempotencies_business_id', 'checkout_idempotencies', ['business_id'])
        op.create_index('ix_idempotency_business_key', 'checkout_idempotencies', ['business_id', 'idempotency_key'])
        op.create_unique_constraint('uq_idempotency_business_key', 'checkout_idempotencies', ['business_id', 'idempotency_key'])

    # 3. Create held_bills
    if 'held_bills' not in existing_tables:
        op.create_table(
            'held_bills',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('business_id', sa.String(), sa.ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False),
            sa.Column('hold_label', sa.String(), nullable=False, server_default='Held Bill'),
            sa.Column('bill_data', sa.JSON(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index('ix_held_bills_business_id', 'held_bills', ['business_id'])

    # 4. Alter businesses
    if 'businesses' in existing_tables:
        biz_cols = [c['name'] for c in insp.get_columns('businesses')]
        if 'invoice_prefix' not in biz_cols:
            op.add_column('businesses', sa.Column('invoice_prefix', sa.String(), nullable=True, server_default='INV-'))
        if 'order_prefix' not in biz_cols:
            op.add_column('businesses', sa.Column('order_prefix', sa.String(), nullable=True, server_default='ORD-'))
        if 'default_tax_rate' not in biz_cols:
            op.add_column('businesses', sa.Column('default_tax_rate', sa.Float(), nullable=True, server_default='18.0'))
        if 'tax_inclusive' not in biz_cols:
            op.add_column('businesses', sa.Column('tax_inclusive', sa.Boolean(), nullable=True, server_default='false'))
        if 'invoice_footer' not in biz_cols:
            op.add_column('businesses', sa.Column('invoice_footer', sa.Text(), nullable=True))
        if 'allow_negative_stock' not in biz_cols:
            op.add_column('businesses', sa.Column('allow_negative_stock', sa.Boolean(), nullable=True, server_default='false'))

    # 5. Alter customers
    if 'customers' in existing_tables:
        cust_cols = [c['name'] for c in insp.get_columns('customers')]
        if 'gstin' not in cust_cols:
            op.add_column('customers', sa.Column('gstin', sa.String(), nullable=True))
        cust_indexes = [i['name'] for i in insp.get_indexes('customers')]
        if 'ix_customers_business_phone' not in cust_indexes:
            op.create_index('ix_customers_business_phone', 'customers', ['business_id', 'phone'])
        if 'ix_customers_business_name' not in cust_indexes:
            op.create_index('ix_customers_business_name', 'customers', ['business_id', 'name'])

    # 6. Alter orders and order_items
    if 'orders' in existing_tables:
        ord_cols = [c['name'] for c in insp.get_columns('orders')]
        if 'tax_rate' not in ord_cols:
            op.add_column('orders', sa.Column('tax_rate', sa.Float(), nullable=True, server_default='18.0'))
        if 'tax_inclusive' not in ord_cols:
            op.add_column('orders', sa.Column('tax_inclusive', sa.Boolean(), nullable=True, server_default='false'))
        ord_indexes = [i['name'] for i in insp.get_indexes('orders')]
        if 'ix_orders_business_order_number' not in ord_indexes:
            op.create_index('ix_orders_business_order_number', 'orders', ['business_id', 'order_number'])

    if 'order_items' in existing_tables:
        oi_cols = [c['name'] for c in insp.get_columns('order_items')]
        if 'sku' not in oi_cols:
            op.add_column('order_items', sa.Column('sku', sa.String(), nullable=True))

    # 7. Alter invoices
    if 'invoices' in existing_tables:
        inv_cols = [c['name'] for c in insp.get_columns('invoices')]
        if 'customer_name' not in inv_cols:
            op.add_column('invoices', sa.Column('customer_name', sa.String(), nullable=True))
        if 'customer_phone' not in inv_cols:
            op.add_column('invoices', sa.Column('customer_phone', sa.String(), nullable=True))
        if 'customer_address' not in inv_cols:
            op.add_column('invoices', sa.Column('customer_address', sa.Text(), nullable=True))
        if 'customer_gstin' not in inv_cols:
            op.add_column('invoices', sa.Column('customer_gstin', sa.String(), nullable=True))
        if 'business_name' not in inv_cols:
            op.add_column('invoices', sa.Column('business_name', sa.String(), nullable=True))
        if 'business_address' not in inv_cols:
            op.add_column('invoices', sa.Column('business_address', sa.Text(), nullable=True))
        if 'business_phone' not in inv_cols:
            op.add_column('invoices', sa.Column('business_phone', sa.String(), nullable=True))
        if 'business_gstin' not in inv_cols:
            op.add_column('invoices', sa.Column('business_gstin', sa.String(), nullable=True))
        if 'staff_name' not in inv_cols:
            op.add_column('invoices', sa.Column('staff_name', sa.String(), nullable=True))
        if 'tax_rate' not in inv_cols:
            op.add_column('invoices', sa.Column('tax_rate', sa.Float(), nullable=True, server_default='18.0'))
        if 'tax_inclusive' not in inv_cols:
            op.add_column('invoices', sa.Column('tax_inclusive', sa.Boolean(), nullable=True, server_default='false'))

        inv_indexes = [i['name'] for i in insp.get_indexes('invoices')]
        if 'ix_invoices_business_invoice_number' not in inv_indexes:
            op.create_index('ix_invoices_business_invoice_number', 'invoices', ['business_id', 'invoice_number'])

    # 8. Alter invoice_items
    if 'invoice_items' in existing_tables:
        inv_item_cols = [c['name'] for c in insp.get_columns('invoice_items')]
        if 'product_id' not in inv_item_cols:
            op.add_column('invoice_items', sa.Column('product_id', sa.String(), sa.ForeignKey('products.id'), nullable=True))
        if 'sku' not in inv_item_cols:
            op.add_column('invoice_items', sa.Column('sku', sa.String(), nullable=True))
        if 'discount' not in inv_item_cols:
            op.add_column('invoice_items', sa.Column('discount', sa.Float(), nullable=True, server_default='0.0'))
        if 'tax_rate' not in inv_item_cols:
            op.add_column('invoice_items', sa.Column('tax_rate', sa.Float(), nullable=True, server_default='18.0'))
        if 'tax_amount' not in inv_item_cols:
            op.add_column('invoice_items', sa.Column('tax_amount', sa.Float(), nullable=True, server_default='0.0'))


def downgrade() -> None:
    pass
