from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import and_, case, func
from backend.database import get_db
from backend.models import Order, Product, Expense, Customer, OrderItem, Business
from backend.schemas import StandardDashboardResponse, OrderResponse, ProductResponse
from backend.auth import get_current_business, require_manager_or_owner

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"], dependencies=[Depends(require_manager_or_owner)])

@router.get("/dashboard", response_model=StandardDashboardResponse)
def get_dashboard_data(
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    current_month_prefix = datetime.utcnow().strftime("%Y-%m")

    monthly_filter = Order.order_date.startswith(current_month_prefix)
    (
        today_sales,
        monthly_revenue,
        orders_this_month,
        active_orders_count,
        pending_payments,
        upcoming_deliveries_count,
    ) = db.query(
        func.coalesce(func.sum(case((Order.order_date == today_str, Order.total_amount), else_=0.0)), 0.0),
        func.coalesce(func.sum(case((monthly_filter, Order.total_amount), else_=0.0)), 0.0),
        func.sum(case((monthly_filter, 1), else_=0)),
        func.sum(case((Order.order_status != "delivered", 1), else_=0)),
        func.coalesce(func.sum(Order.balance_amount), 0.0),
        func.sum(case((Order.delivery_status.in_(["pending", "scheduled", "out_for_delivery"]), 1), else_=0)),
    ).filter(Order.business_id == business.id).one()

    low_stock_products_count, stock_valuation = db.query(
        func.sum(case((Product.current_stock <= Product.low_stock_level, 1), else_=0)),
        func.coalesce(func.sum(Product.current_stock * Product.selling_price), 0.0),
    ).filter(Product.business_id == business.id).one()
    low_stock_products = (
        db.query(Product)
        .filter(
            Product.business_id == business.id,
            Product.current_stock <= Product.low_stock_level,
        )
        .options(selectinload(Product.images))
        .limit(5)
        .all()
    )

    # Recent 5 Orders
    recent_orders_raw = (
        db.query(Order)
        .filter(Order.business_id == business.id)
        .options(selectinload(Order.items))
        .outerjoin(
            Customer,
            and_(Customer.id == Order.customer_id, Customer.business_id == business.id),
        )
        .with_entities(Order, Customer)
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )
    recent_orders = []
    for order, customer in recent_orders_raw:
        ord_res = OrderResponse.model_validate(order)
        if customer:
            ord_res.customer_name = customer.name
            ord_res.customer_phone = customer.phone
        recent_orders.append(ord_res)

    monthly_expenses = db.query(
        func.coalesce(func.sum(Expense.amount), 0.0)
    ).filter(
        Expense.business_id == business.id,
        Expense.date.startswith(current_month_prefix),
    ).scalar()

    cost_of_goods_sold = db.query(
        func.coalesce(func.sum(OrderItem.quantity * Product.cost_price), 0.0)
    ).join(
        Order,
        and_(Order.id == OrderItem.order_id, Order.business_id == business.id),
    ).join(
        Product,
        and_(Product.id == OrderItem.product_id, Product.business_id == business.id),
    ).filter(
        Order.business_id == business.id,
        Order.order_date.startswith(current_month_prefix),
    ).scalar()
    
    estimated_gross_profit = round(monthly_revenue - cost_of_goods_sold - monthly_expenses, 2)

    # Top selling items
    top_selling = []
    if business.plan == "standard":
        top_selling_rows = (
            db.query(OrderItem.product_name, func.sum(OrderItem.quantity).label("quantity_sold"))
            .join(
                Order,
                and_(Order.id == OrderItem.order_id, Order.business_id == business.id),
            )
            .filter(Order.business_id == business.id)
            .group_by(OrderItem.product_name)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(5)
            .all()
        )
        top_selling = [
            {"product_name": name, "quantity_sold": quantity_sold}
            for name, quantity_sold in top_selling_rows
        ]

    return {
        "today_sales": today_sales,
        "active_orders_count": active_orders_count or 0,
        "pending_payments": pending_payments,
        "upcoming_deliveries_count": upcoming_deliveries_count or 0,
        "low_stock_products_count": low_stock_products_count or 0,
        "recent_orders": recent_orders,
        "low_stock_products": [ProductResponse.model_validate(p) for p in low_stock_products],
        "monthly_revenue": monthly_revenue,
        "orders_this_month": orders_this_month or 0,
        "monthly_expenses": monthly_expenses,
        "estimated_gross_profit": estimated_gross_profit,
        "stock_valuation": stock_valuation,
        "top_selling_products": top_selling
    }
