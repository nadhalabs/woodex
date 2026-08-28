from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import BusinessSequence, Business

def get_next_sequence_number(db: Session, business_id: str, sequence_type: str, custom_prefix: str = None) -> str:
    """
    Concurrency-safe sequence number generator using database row-level locking (with_for_update).
    Produces format e.g.: ORD-2026-000001, INV-2026-000001
    """
    year = datetime.utcnow().year
    
    seq = (
        db.query(BusinessSequence)
        .filter(
            BusinessSequence.business_id == business_id,
            BusinessSequence.sequence_type == sequence_type,
            BusinessSequence.year == year
        )
        .with_for_update()
        .first()
    )
    
    if not seq:
        seq = BusinessSequence(
            business_id=business_id,
            sequence_type=sequence_type,
            year=year,
            current_val=1
        )
        db.add(seq)
        db.flush()
        val = 1
    else:
        seq.current_val += 1
        seq.updated_at = datetime.utcnow()
        val = seq.current_val

    prefix = custom_prefix
    if prefix is None:
        biz = db.query(Business).filter(Business.id == business_id).first()
        if sequence_type == "order":
            prefix = biz.order_prefix if (biz and biz.order_prefix) else "ORD-"
        elif sequence_type == "invoice":
            prefix = biz.invoice_prefix if (biz and biz.invoice_prefix) else "INV-"
        elif sequence_type == "quotation":
            prefix = "QT-"
        else:
            prefix = f"{sequence_type.upper()}-"

    clean_prefix = prefix.rstrip("-")
    return f"{clean_prefix}-{year}-{val:06d}"
