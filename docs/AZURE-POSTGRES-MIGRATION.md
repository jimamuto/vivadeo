# Azure PostgreSQL Migration

## Current target

Vivadeo's local PostgreSQL database has been replicated to:

- **Server:** `vivadeo-pg-uaenorth`
- **FQDN:** `vivadeo-pg-uaenorth.postgres.database.azure.com`
- **Region:** UAE North
- **Resource group:** `rg-vivadeo`
- **Database:** `vivadeo`
- **PostgreSQL:** 16
- **SKU:** `Standard_B1ms` / Burstable
- **Storage:** 32 GB Premium LRS
- **Backups:** 7 days, geo-redundant backup disabled
- **Vector extension:** enabled and installed
- **Alembic revision:** `0009_evidence_frames`

Central US passed the PostgreSQL capability check but Azure policy rejected provisioning there. UAE North is an allowed region for this subscription and provisioned successfully.

## What was migrated

A custom-format `pg_dump` was taken from the local `pgvector/pgvector:pg16` container and restored into the Azure server. The Azure database was then brought to the current Alembic head.

Verified row counts:

- `organizations`: 9
- `videos`: 3
- `video_chunks`: 21
- `chat_threads`: 1
- `chat_thread_messages`: 0
- `evidence_frames`: 0

The local PostgreSQL service remains unchanged and is still the active database.

## Environment configuration

The Azure connection details are stored in the local ignored `.env` as `AZURE_*` variables. These are migration-target variables only. `DATABASE_URL` and `AUTH_DATABASE_URL` were intentionally not changed, so Docker Compose continues using local PostgreSQL.

Do not commit `.env` or copy its password into documentation, logs, or source control.

## Future cutover

Before switching production workloads:

1. Take a final local `pg_dump` while writes are paused.
2. Restore the final dump to Azure.
3. Verify Alembic reports `0009_evidence_frames`.
4. Update the deployment secret values for `DATABASE_URL` and `AUTH_DATABASE_URL`.
5. Run API, worker, authentication, ingest, and search smoke tests.
6. Keep local PostgreSQL available until those checks pass.
7. Remove the temporary migration firewall rule or replace it with private networking before production use.

Container Apps were **not** changed as part of this migration.

## Repeating the migration

The migration target can be checked with the PostgreSQL client using SSL:

```powershell
docker run --rm -e PGPASSWORD="$env:AZURE_POSTGRES_PASSWORD" -e PGSSLMODE=require postgres:16 psql `
  -h $env:AZURE_POSTGRES_HOST -U $env:AZURE_POSTGRES_USER -d $env:AZURE_POSTGRES_DATABASE `
  -c "select version_num from alembic_version;"
```

Use a fresh firewall rule for the machine's current public IP before connecting from a new network. The current rule is named `local-migration`.
