from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend.models import Order, Product, Payment, Expense, Customer, OrderItem, Business
from backend.schemas import LiteDashboardResponse, StandardDashboardResponse, OrderResponse, ProductResponse
from backend.auth import get_current_business

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/dashboard", response_model=StandardDashboardResponse)
def get_dashboard_data(
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business)
):
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    current_month_prefix = datetime.utcnow().strftime("%Y-%m")

    # Fetch orders for this business
    all_orders = db.query(Order).filter(Order.business_id == business.id).all()
    
    # Today's Sales
    today_sales = sum(o.total_amount for o in all_orders if o.order_date == today_str)

    # Monthly Revenue
    monthly_orders = [o for o in all_orders if o.order_date.startswith(current_month_prefix)]
    monthly_revenue = sum(o.total_amount for o in monthly_orders)

    # Active Orders Count (not delivered)
    active_orders = [o for o in all_orders if o.order_status != "delivered"]
    active_orders_count = len(active_orders)

    # Pending Payments Total
    pending_payments = sum(o.balance_amount for o in all_orders)

    # Upcoming Deliveries Count
    upcoming_deliveries = [o for o in all_orders if o.delivery_status in ["pending", "scheduled", "out_for_delivery"]]
    upcoming_deliveries_count = len(upcoming_deliveries)

    # Products & Low stock
    all_products = db.query(Product).filter(Product.business_id == business.id).all()
    low_stock_products = [p for p in all_products if p.current_stock <= p.low_stock_level]

    # Recent 5 Orders
    recent_orders_raw = db.query(Order).filter(Order.business_id == business.id).order_by(Order.created_at.desc()).limit(5).all()
    recent_orders = []
    for o in recent_orders_raw:
        c = db.query(Customer).filter(Customer.id == o.customer_id).first()
        ord_res = OrderResponse.model_validate(o)
        if c:
            ord_res.customer_name = c.name
            ord_res.customer_phone = c.phone
        recent_orders.append(ord_res)

    # Expenses
    expenses = db.query(Expense).filter(Expense.business_id == business.id).all()
    monthly_expenses = sum(e.amount for e in expenses if e.date.startswith(current_month_prefix))

    # Gross Profit & Stock Valuation
    stock_valuation = sum(p.current_stock * p.selling_price for p in all_products)
    
    # Estimate cost of goods sold for monthly orders
    cost_of_goods_sold = 0.0
    for mo in monthly_orders:
        for item in mo.items:
            if item.product_id:
                prod = db.query(Product).filter(Product.id == item.product_id).first()
                if prod:
                    cost_of_goods_sold += (item.quantity * prod.cost_price)
    
    estimated_gross_profit = round(monthly_revenue - cost_of_goods_sold - monthly_expenses, 2)

    # Top selling items
    top_selling = []
    if business.plan == "standard":
        order_items = db.query(OrderItem).join(Order).filter(Order.business_id == business.id).all()
        counts: Dict[str, int] = {}
        for item in order_items:
            counts[item.product_name] = counts.get(item.product_name, 0) + item.quantity
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]
        top_selling = [{"product_name": name, "quantity_sold": qty} for name, qty in sorted_counts]

    return {
        "today_sales": today_sales,
        "active_orders_count": active_orders_count,
        "pending_payments": pending_payments,
        "upcoming_deliveries_count": upcoming_deliveries_count,
        "low_stock_products_count": len(low_stock_products),
        "recent_orders": recent_orders,
        "low_stock_products": [ProductResponse.model_validate(p) for p in low_stock_products[:5]],
        "monthly_revenue": monthly_revenue,
        "orders_this_month": len(monthly_orders),
        "monthly_expenses": monthly_expenses,
        "estimated_gross_profit": estimated_gross_profit,
        "stock_valuation": stock_valuation,
        "top_selling_products": top_selling
    }
