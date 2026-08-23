"""Provision the administrator's Pro workspace entitlement."""

from alembic import op
import sqlalchemy as sa

revision = "0013_admin_bypass"
down_revision = "0012_chat_message_videos"
branch_labels = None
depends_on = None

ADMIN_EMAIL = "jim.amuto@strathmore.edu"
ADMIN_USER_ID = "admin-jim-amuto"
ADMIN_ORGANIZATION_ID = "admin-pro-workspace"


def upgrade() -> None:
    bind = op.get_bind()

    # If the account already exists, preserve its Better Auth ID. If it does
    # not, create an email-verified identity; the owner must set its password
    # through the normal reset flow before signing in.
    bind.execute(
        sa.text(
            'INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) '
            'VALUES (:id, :name, :email, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) '
            'ON CONFLICT (email) DO UPDATE SET email_verified = TRUE, updated_at = CURRENT_TIMESTAMP'
        ),
        {"id": ADMIN_USER_ID, "name": "Jim Amuto", "email": ADMIN_EMAIL},
    )

    bind.execute(
        sa.text(
            "INSERT INTO organizations (id, slug, name, plan, created_at, updated_at) "
            "VALUES (:id, :slug, :name, 'pro', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) "
            "ON CONFLICT (id) DO UPDATE SET plan = 'pro', updated_at = CURRENT_TIMESTAMP"
        ),
        {"id": ADMIN_ORGANIZATION_ID, "slug": "admin-pro", "name": "Vivadeo Pro"},
    )
    bind.execute(
        sa.text(
            'INSERT INTO organization (id, slug, name, created_at) '
            'VALUES (:id, :slug, :name, CURRENT_TIMESTAMP) '
            'ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug'
        ),
        {"id": ADMIN_ORGANIZATION_ID, "slug": "admin-pro", "name": "Vivadeo Pro"},
    )
    bind.execute(
        sa.text(
            'INSERT INTO member (id, organization_id, user_id, role, created_at) '
            'SELECT :member_id, :organization_id, id, \'admin\', CURRENT_TIMESTAMP FROM "user" '
            'WHERE lower(email) = :email AND NOT EXISTS ('
            '  SELECT 1 FROM member m WHERE m.organization_id = :organization_id AND m.user_id = "user".id'
            ')'
        ),
        {"member_id": "member-admin-jim", "organization_id": ADMIN_ORGANIZATION_ID, "email": ADMIN_EMAIL},
    )
    bind.execute(
        sa.text(
            'UPDATE member SET role = \'admin\' WHERE user_id = '
            '(SELECT id FROM "user" WHERE lower(email) = :email)'
        ),
        {"email": ADMIN_EMAIL},
    )
    bind.execute(
        sa.text(
            "UPDATE organizations SET plan = 'pro', updated_at = CURRENT_TIMESTAMP "
            "WHERE id IN (SELECT organization_id FROM member WHERE user_id = "
            "(SELECT id FROM \"user\" WHERE lower(email) = :email))"
        ),
        {"email": ADMIN_EMAIL},
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DELETE FROM member WHERE organization_id = :id"), {"id": ADMIN_ORGANIZATION_ID})
    bind.execute(sa.text('DELETE FROM organization WHERE id = :id'), {"id": ADMIN_ORGANIZATION_ID})
    bind.execute(sa.text("DELETE FROM organizations WHERE id = :id"), {"id": ADMIN_ORGANIZATION_ID})
    bind.execute(sa.text('DELETE FROM "user" WHERE id = :id'), {"id": ADMIN_USER_ID})
