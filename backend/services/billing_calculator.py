from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any

def round_money(val: Decimal) -> float:
    return float(val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def calculate_counter_bill(
    items: List[Any],
    bill_discount: float = 0.0,
    discount_type: str = "fixed",
    tax_rate: float = 18.0,
    tax_inclusive: bool = False,
    paid_amount: float = 0.0
) -> Dict[str, Any]:
    """
    Authoritative backend financial calculation using Decimal arithmetic.
    Calculates line totals, discounts, taxes (inclusive or exclusive), grand total, paid amount, balance, and payment status.
    """
    calculated_items = []
    subtotal_dec = Decimal('0.00')

    for item in items:
        qty = Decimal(str(getattr(item, 'quantity', 1) if hasattr(item, 'quantity') else item.get('quantity', 1)))
        unit_price = Decimal(str(getattr(item, 'unit_price', 0.0) if hasattr(item, 'unit_price') else item.get('unit_price', 0.0)))
        item_discount = Decimal(str(getattr(item, 'discount', 0.0) if hasattr(item, 'discount') else item.get('discount', 0.0) or 0.0))

        gross = qty * unit_price
        line_total = max(Decimal('0.00'), gross - item_discount)
        subtotal_dec += line_total

        prod_id = getattr(item, 'product_id', None) if hasattr(item, 'product_id') else item.get('product_id')
        prod_name = getattr(item, 'product_name', '') if hasattr(item, 'product_name') else item.get('product_name', '')
        sku = getattr(item, 'sku', None) if hasattr(item, 'sku') else item.get('sku')
        variant_name = getattr(item, 'variant_name', None) if hasattr(item, 'variant_name') else item.get('variant_name')

        calculated_items.append({
            "product_id": prod_id,
            "product_name": prod_name,
            "sku": sku,
            "variant_name": variant_name,
            "quantity": int(qty),
            "unit_price": round_money(unit_price),
            "discount": round_money(item_discount),
            "total_price": round_money(line_total),
        })

    # Bill-level discount
    bill_disc_in = Decimal(str(bill_discount or 0.0))
    if discount_type == "percentage":
        bill_discount_dec = (subtotal_dec * (bill_disc_in / Decimal('100.00'))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    else:
        bill_discount_dec = bill_disc_in.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    bill_discount_dec = min(subtotal_dec, max(Decimal('0.00'), bill_discount_dec))
    taxable_base = subtotal_dec - bill_discount_dec
    tax_rate_dec = Decimal(str(tax_rate or 0.0))

    if tax_inclusive and tax_rate_dec > Decimal('0.00'):
        divisor = Decimal('1.00') + (tax_rate_dec / Decimal('100.00'))
        net_taxable = (taxable_base / divisor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        tax_amount_dec = (taxable_base - net_taxable).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        grand_total_dec = taxable_base.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    else:
        tax_amount_dec = (taxable_base * (tax_rate_dec / Decimal('100.00'))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        grand_total_dec = (taxable_base + tax_amount_dec).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    paid_dec = Decimal(str(paid_amount or 0.0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    paid_dec = min(grand_total_dec, max(Decimal('0.00'), paid_dec))
    balance_dec = max(Decimal('0.00'), grand_total_dec - paid_dec).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    if grand_total_dec > Decimal('0.00') and paid_dec >= grand_total_dec:
        payment_status = "paid"
    elif paid_dec > Decimal('0.00'):
        payment_status = "partially_paid"
    else:
        payment_status = "unpaid"

    return {
        "items": calculated_items,
        "subtotal": round_money(subtotal_dec),
        "discount": round_money(bill_discount_dec),
        "tax_rate": round_money(tax_rate_dec),
        "tax_amount": round_money(tax_amount_dec),
        "tax_inclusive": bool(tax_inclusive),
        "total_amount": round_money(grand_total_dec),
        "paid_amount": round_money(paid_dec),
        "balance_amount": round_money(balance_dec),
        "payment_status": payment_status,
    }
