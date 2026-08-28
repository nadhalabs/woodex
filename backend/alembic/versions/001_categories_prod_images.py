"""Create categories and product_images tables, add category_id and indexes, and backfill existing product categories

Revision ID: 001_categories_prod_images
Revises: 
Create Date: 2026-08-21 00:50:00.000000

"""
import re
import uuid
from typing import Sequence, Union
from datetime import datetime
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision: str = '001_categories_prod_images'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text or "category"

def upgrade() -> None:
    bind = op.get_bind()
    insp = Inspector.from_engine(bind)
    existing_tables = insp.get_table_names()

    # 1. Create categories table if not exists
    if 'categories' not in existing_tables:
        op.create_table(
            'categories',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('business_id', sa.String(), sa.ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('slug', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('image_url', sa.String(), nullable=True),
            sa.Column('image_public_id', sa.String(), nullable=True),
            sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index('ix_categories_business_id', 'categories', ['business_id'])
        op.create_index('ix_categories_business_name', 'categories', ['business_id', 'name'])
        op.create_index('ix_categories_business_slug', 'categories', ['business_id', 'slug'])
        op.create_unique_constraint('uq_categories_business_slug', 'categories', ['business_id', 'slug'])

    # 2. Create product_images table if not exists
    if 'product_images' not in existing_tables:
        op.create_table(
            'product_images',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('business_id', sa.String(), sa.ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False),
            sa.Column('product_id', sa.String(), sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
            sa.Column('url', sa.String(), nullable=False),
            sa.Column('public_id', sa.String(), nullable=True),
            sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index('ix_product_images_business_id', 'product_images', ['business_id'])
        op.create_index('ix_product_images_product_id', 'product_images', ['product_id'])
        op.create_index('ix_product_images_product_display_order', 'product_images', ['product_id', 'display_order'])

    # 3. Alter products table if needed
    if 'products' in existing_tables:
        product_cols = [c['name'] for c in insp.get_columns('products')]
        if 'category_id' not in product_cols:
            op.add_column('products', sa.Column('category_id', sa.String(), sa.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True))
            op.create_index('ix_products_category_id', 'products', ['category_id'])
        if 'description' not in product_cols:
            op.add_column('products', sa.Column('description', sa.Text(), nullable=True))
        if 'image_public_id' not in product_cols:
            op.add_column('products', sa.Column('image_public_id', sa.String(), nullable=True))
        if 'is_active' not in product_cols:
            op.add_column('products', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))

        # Composite indexes on products
        product_indexes = [i['name'] for i in insp.get_indexes('products')]
        if 'ix_products_business_name' not in product_indexes:
            op.create_index('ix_products_business_name', 'products', ['business_id', 'name'])
        if 'ix_products_business_category_id' not in product_indexes:
            op.create_index('ix_products_business_category_id', 'products', ['business_id', 'category_id'])

    # 4. Data Migration & Backfill
    businesses = bind.execute(sa.text("SELECT id FROM businesses")).fetchall()
    
    standard_categories = [
        "Sofa", "Bed", "Dining Table", "Chair", "Wardrobe",
        "Mattress", "Office Furniture", "Custom Furniture", "Timber / Wood"
    ]

    for biz_row in businesses:
        biz_id = biz_row[0]
        prod_rows = bind.execute(
            sa.text("SELECT id, category, name, image_url FROM products WHERE business_id = :biz_id"),
            {"biz_id": biz_id}
        ).fetchall()

        # Seed categories for this business
        cat_name_to_id = {}
        for idx, cat_name in enumerate(standard_categories):
            cat_slug = slugify(cat_name)
            cat_id = str(uuid.uuid4())
            bind.execute(
                sa.text("""
                    INSERT INTO categories (id, business_id, name, slug, description, display_order, is_active, created_at, updated_at)
                    VALUES (:id, :business_id, :name, :slug, :desc, :display_order, true, NOW(), NOW())
                    ON CONFLICT (business_id, slug) DO NOTHING
                """),
                {
                    "id": cat_id,
                    "business_id": biz_id,
                    "name": cat_name,
                    "slug": cat_slug,
                    "desc": f"{cat_name} collection",
                    "display_order": idx,
                }
            )
            existing_cat = bind.execute(
                sa.text("SELECT id FROM categories WHERE business_id = :biz_id AND slug = :slug"),
                {"biz_id": biz_id, "slug": cat_slug}
            ).fetchone()
            if existing_cat:
                cat_name_to_id[cat_name.lower()] = existing_cat[0]
                cat_name_to_id[cat_slug] = existing_cat[0]

        # Backfill products category_id
        for p in prod_rows:
            p_id, p_cat, p_name, p_img = p[0], p[1], p[2], p[3]
            matched_cat_id = None
            if p_cat:
                p_cat_clean = p_cat.strip().lower()
                matched_cat_id = cat_name_to_id.get(p_cat_clean) or cat_name_to_id.get(slugify(p_cat))
                if not matched_cat_id:
                    cat_id = str(uuid.uuid4())
                    cat_slug = slugify(p_cat)
                    bind.execute(
                        sa.text("""
                            INSERT INTO categories (id, business_id, name, slug, display_order, is_active, created_at, updated_at)
                            VALUES (:id, :business_id, :name, :slug, 99, true, NOW(), NOW())
                            ON CONFLICT (business_id, slug) DO NOTHING
                        """),
                        {"id": cat_id, "business_id": biz_id, "name": p_cat, "slug": cat_slug}
                    )
                    existing_cat = bind.execute(
                        sa.text("SELECT id FROM categories WHERE business_id = :biz_id AND slug = :slug"),
                        {"biz_id": biz_id, "slug": cat_slug}
                    ).fetchone()
                    if existing_cat:
                        matched_cat_id = existing_cat[0]
                        cat_name_to_id[p_cat_clean] = matched_cat_id

            if matched_cat_id:
                bind.execute(
                    sa.text("UPDATE products SET category_id = :cat_id WHERE id = :p_id"),
                    {"cat_id": matched_cat_id, "p_id": p_id}
                )

            # If product has an image_url, backfill into product_images
            if p_img:
                existing_img = bind.execute(
                    sa.text("SELECT id FROM product_images WHERE product_id = :p_id AND url = :url"),
                    {"p_id": p_id, "url": p_img}
                ).fetchone()
                if not existing_img:
                    img_id = str(uuid.uuid4())
                    bind.execute(
                        sa.text("""
                            INSERT INTO product_images (id, business_id, product_id, url, display_order, is_primary, created_at)
                            VALUES (:id, :business_id, :product_id, :url, 0, true, NOW())
                        """),
                        {"id": img_id, "business_id": biz_id, "product_id": p_id, "url": p_img}
                    )


def downgrade() -> None:
    op.drop_index('ix_products_business_category_id', table_name='products')
    op.drop_index('ix_products_business_name', table_name='products')
    op.drop_index('ix_products_category_id', table_name='products')
    op.drop_column('products', 'is_active')
    op.drop_column('products', 'image_public_id')
    op.drop_column('products', 'description')
    op.drop_column('products', 'category_id')

    op.drop_table('product_images')
    op.drop_table('categories')
