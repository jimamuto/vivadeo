# Azure Blob Storage Operations

Vivadeo can store private source videos and derived media in Azure Blob Storage while preserving the same object keys and workspace-authorized media routes used by the S3 backend.

## Provisioned testing resource

- Subscription: Azure for Students
- Resource group: `rg-vivadeo`
- Storage account: `vivadeoe5c8fb8e3e`
- Region: `centralindia` (the subscription policy rejected `eastus`)
- Container: `vivadeo`
- Tier and redundancy: Hot, Standard LRS
- Security: HTTPS only, TLS 1.2 minimum, public blob access disabled
- Recovery: seven-day blob soft delete

The account name and container are identifiers, not credentials. Never commit or print the connection string or account keys.

## Runtime configuration

Set these only in `.env` or the deployment secret store:

```dotenv
STORAGE_BACKEND=azure
STORAGE_PUBLIC_ENDPOINT_URL=http://localhost:3000/api/proxy/v1/media
AZURE_STORAGE_CONNECTION_STRING=<secret>
AZURE_STORAGE_CONTAINER=vivadeo
AZURE_STORAGE_TIMEOUT=300
```

`STORAGE_PUBLIC_ENDPOINT_URL` remains the authenticated Vivadeo media route. The browser never receives Azure credentials or a permanent blob URL.

Retrieve the connection string without placing it in shell history or documentation:

```powershell
$az = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
$connection = & $az storage account show-connection-string `
  --resource-group rg-vivadeo `
  --name vivadeoe5c8fb8e3e `
  --query connectionString -o tsv
# Put $connection into the deployment secret store, then clear the variable.
```

Restart API and worker processes after changing storage environment variables. A new Python dependency requires rebuilding the API image once; bind-mounted source-only edits still do not require rebuilds.

## Workflow alignment

| Vivadeo workflow | Azure behavior |
| --- | --- |
| Multipart ingest | `upload_fileobj` streams the upload into a private block blob. |
| URL/local ingest | `upload_file` stores the source under `videos/{video_id}/...`. |
| Worker processing | `download_file` materializes the private source in a worker temporary directory. |
| Transcript, keyframe, evidence-frame, and clip output | Derived objects retain their existing object-key prefixes. |
| Citation playback | `/v1/media/{object_key}` checks workspace ownership and forwards browser byte ranges to Blob Storage. |
| Usage statistics | `object_size` reads blob properties without downloading media. |
| Archive/delete | Database actions continue to call the provider-neutral `delete_object` contract. |
| Agentic API loop | The loop checks object size, Pro readiness, chat citations, and temporary-thread cleanup without provider-specific commands. |

The database stores provider-neutral object keys. Switching providers does not rewrite database rows, but every referenced object must exist at the same key in the selected backend.

## Patel agentic fixture

The testing fixture is stored at:

```text
videos/1dc589c5-ffd4-4975-ab3e-020b73b00d44/patel video english bad.mp4
```

Live verification confirmed:

- private upload: 13,930,234 bytes
- content type: `video/mp4`
- byte range: `0-65535` returned exactly 65,536 bytes with `206` metadata
- full download SHA-256 matched the local source
- temporary upload/read/delete lifecycle succeeded
- the running API container read the same object through the Azure backend

Do not commit the local fixture or its machine-specific source path.

## Agentic verification loop

1. Confirm `api`, `worker`, and Redis are healthy.
2. Confirm `ObjectStore().backend == "azure"` in both API and worker containers.
3. Resolve the fixture from the workspace video list; do not hardcode credentials or private URLs.
4. Confirm `object_size(video.object_key)` is non-zero.
5. Request a small byte range and require `Content-Range` plus the exact requested length.
6. Confirm transcript rows and embeddings exist; reindex only when required.
7. Create a temporary chat thread, run one grounded question scoped to the fixture, require a completed answer with citations, then delete the thread in `finally`.
8. Verify generated evidence objects can be read through `/v1/media/{object_key}`.

## Provisioning reference

The account was created with secure testing defaults equivalent to:

```powershell
& $az storage account create `
  --resource-group rg-vivadeo `
  --name <globally-unique-name> `
  --location centralindia `
  --sku Standard_LRS `
  --kind StorageV2 `
  --access-tier Hot `
  --https-only true `
  --min-tls-version TLS1_2 `
  --allow-blob-public-access false `
  --allow-shared-key-access true

& $az storage container create `
  --account-name <account-name> `
  --name vivadeo `
  --auth-mode key `
  --public-access off
```

Shared-key access is enabled only because the current Docker deployment uses a connection string. Move to managed identity and disable shared-key access when API and workers run on an Azure identity-capable host.

## Cost and cleanup

This is a testing account. Standard LRS and Hot tier avoid unnecessary redundancy and retrieval charges. Monitor storage, operation, and outbound bandwidth in Azure Cost Management.

To stop charges, first export or delete required blobs, then delete only this storage account:

```powershell
& $az storage account delete `
  --resource-group rg-vivadeo `
  --name vivadeoe5c8fb8e3e `
  --yes
```

Do not delete `rg-vivadeo`; it may contain unrelated resources.
