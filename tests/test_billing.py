from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from vivadeo.billing import AllowanceExceeded, consume_processing_allowance, refund_processing_allowance
from vivadeo.db import CreditGrant, CreditTransaction, Organization


def _session():
    engine = create_engine("sqlite:///:memory:")
    Organization.__table__.create(engine)
    CreditGrant.__table__.create(engine)
    CreditTransaction.__table__.create(engine)
    with engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE billing_subscriptions (organization_id VARCHAR(64) PRIMARY KEY)")
    session = Session(engine)
    session.add(Organization(id="workspace", slug="workspace", name="Workspace", plan="free"))
    session.commit()
    return session


def test_processing_allowance_is_idempotent_and_refundable():
    session = _session()
    consume_processing_allowance(session, "workspace", 61.2, "job-1")
    consume_processing_allowance(session, "workspace", 61.2, "job-1")
    session.commit()

    grant = session.scalar(select(CreditGrant).where(CreditGrant.credit_type == "processing_seconds"))
    assert grant is not None
    assert grant.remaining == 3_538
    assert len(session.scalars(select(CreditTransaction)).all()) == 1

    refund_processing_allowance(session, "workspace", "job-1")
    refund_processing_allowance(session, "workspace", "job-1")
    session.commit()
    session.refresh(grant)
    assert grant.remaining == 3_600
    assert len(session.scalars(select(CreditTransaction)).all()) == 2


def test_processing_allowance_rejects_oversized_source():
    session = _session()
    try:
        consume_processing_allowance(session, "workspace", 3_601, "job-too-large")
    except AllowanceExceeded as exc:
        assert "enough video processing allowance" in str(exc)
    else:
        raise AssertionError("Expected the allowance check to reject the source")
