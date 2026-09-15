"""Atomic workspace allowance accounting independent of the payment provider."""

from datetime import datetime, timezone
from math import ceil

from sqlalchemy import func, select, text

from .db import CreditGrant, CreditTransaction, Organization, new_id


PLAN_ALLOWANCES = {
    "free": {"answers": 25, "processing_seconds": 3_600},
    "starter": {"answers": 200, "processing_seconds": 18_000},
    "pro": {"answers": 1_000, "processing_seconds": 72_000},
    "team": {"answers": 4_000, "processing_seconds": 216_000},
    "business": {"answers": 15_000, "processing_seconds": 648_000},
}


class AllowanceExceeded(RuntimeError):
    pass


def _calendar_period(now: datetime) -> tuple[datetime, datetime, str]:
    start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    if now.month == 12:
        end = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    return start, end, start.strftime("%Y-%m")


def ensure_calendar_allowances(session, organization_id: str) -> None:
    organization = session.get(Organization, organization_id)
    plan = organization.plan if organization else "free"
    allowances = PLAN_ALLOWANCES.get(plan)
    if not allowances:
        return
    subscribed = session.execute(text("SELECT 1 FROM billing_subscriptions WHERE organization_id = :organization_id LIMIT 1"), {"organization_id": organization_id}).first()
    if subscribed:
        return
    start, end, period = _calendar_period(datetime.now(timezone.utc))
    for credit_type, amount in allowances.items():
        active = session.scalar(select(CreditGrant.id).where(
            CreditGrant.organization_id == organization_id,
            CreditGrant.credit_type == credit_type,
            CreditGrant.effective_at <= datetime.now(timezone.utc),
            (CreditGrant.expires_at.is_(None) | (CreditGrant.expires_at > datetime.now(timezone.utc))),
        ).limit(1))
        if active:
            continue
        source_id = f"{plan}:{period}"
        existing = session.scalar(select(CreditGrant.id).where(
            CreditGrant.organization_id == organization_id,
            CreditGrant.credit_type == credit_type,
            CreditGrant.source == "plan_period",
            CreditGrant.source_id == source_id,
        ))
        if not existing:
            session.add(CreditGrant(id=new_id(), organization_id=organization_id, credit_type=credit_type, amount=amount, remaining=amount, source="plan_period", source_id=source_id, effective_at=start, expires_at=end))
    session.flush()


def consume_processing_allowance(session, organization_id: str, duration: float, operation_id: str) -> None:
    amount = max(1, ceil(duration))
    duplicate = session.scalar(select(CreditTransaction.id).where(
        CreditTransaction.organization_id == organization_id,
        CreditTransaction.operation_id == operation_id,
        CreditTransaction.kind == "debit",
    ))
    if duplicate:
        return
    ensure_calendar_allowances(session, organization_id)
    grant = session.scalar(select(CreditGrant).where(
        CreditGrant.organization_id == organization_id,
        CreditGrant.credit_type == "processing_seconds",
        CreditGrant.remaining >= amount,
        CreditGrant.effective_at <= datetime.now(timezone.utc),
        (CreditGrant.expires_at.is_(None) | (CreditGrant.expires_at > datetime.now(timezone.utc))),
    ).order_by(CreditGrant.expires_at.asc().nullslast(), CreditGrant.created_at.asc()).with_for_update())
    if not grant:
        raise AllowanceExceeded("This workspace does not have enough video processing allowance for this source.")
    grant.remaining -= amount
    session.add(CreditTransaction(id=new_id(), organization_id=organization_id, grant_id=grant.id, credit_type="processing_seconds", amount=-amount, kind="debit", operation_id=operation_id, transaction_metadata={"duration_seconds": duration}))
    session.flush()


def refund_processing_allowance(session, organization_id: str, operation_id: str) -> None:
    debit = session.scalar(select(CreditTransaction).where(
        CreditTransaction.organization_id == organization_id,
        CreditTransaction.operation_id == operation_id,
        CreditTransaction.kind == "debit",
    ).with_for_update())
    if not debit:
        return
    refunded = session.scalar(select(CreditTransaction.id).where(
        CreditTransaction.organization_id == organization_id,
        CreditTransaction.operation_id == operation_id,
        CreditTransaction.kind == "refund",
    ))
    if refunded:
        return
    grant = session.get(CreditGrant, debit.grant_id)
    amount = abs(debit.amount)
    if grant:
        grant.remaining += amount
    session.add(CreditTransaction(id=new_id(), organization_id=organization_id, grant_id=debit.grant_id, credit_type=debit.credit_type, amount=amount, kind="refund", operation_id=operation_id, transaction_metadata={}))


def enforce_storage_allowance(session, organization_id: str) -> None:
    organization = session.get(Organization, organization_id)
    limits = {"free": 18_000, "starter": 72_000, "pro": 360_000, "team": 1_440_000, "business": 5_400_000}
    limit = limits.get(organization.plan if organization else "free")
    if limit is None:
        return
    from .db import Video
    used = float(session.scalar(select(func.coalesce(func.sum(Video.duration), 0.0)).where(Video.organization_id == organization_id)) or 0.0)
    if used > limit:
        raise AllowanceExceeded("This video would exceed the workspace video storage allowance.")
