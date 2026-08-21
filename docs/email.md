# Vivadeo Email Delivery

Vivadeo sends transactional email through **Azure Communication Services Email**.
The setup uses an Azure-managed domain, so a custom domain is not required.

## Azure resources

- Resource group: `rg-vivadeo`
- Email Communication Services resource: `vivadeo-email`
- Communication Services resource: `vivadeo-communication`
- Domain: `AzureManagedDomain`
- Sender username: `vivadeo`
- Sender display name: `Vivadeo`

The effective sender address has this shape:

```text
Vivadeo <vivadeo@<azure-managed-domain>.azurecomm.net>
```

The generated Azure domain is intentionally used for now. A custom verified
domain can be added later if branding or higher sending limits become important.

## Product email flows

Better Auth calls the shared email helper in `web/lib/auth.ts` for:

- Email verification after sign-up
- Password reset links
- Account deletion confirmation links
- Manual verification-email resend from account settings

The sign-up route checks the same Azure configuration before redirecting the
user to `/sign-in?verify=sent`. If Azure email is not configured, sign-up does
not claim that a verification email was sent.

## Configuration

The web service reads these values from the root `.env` file:

```dotenv
EMAIL_FROM=vivadeo@<azure-managed-domain>.azurecomm.net
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://...;accesskey=...
```

The connection string is a secret. Keep it in the ignored local/deployment
`.env`, secret-manager storage, or an equivalent protected environment. Never
commit it, paste it into documentation, or include it in a Docker image.

Compose passes both variables to the web container. The Azure SDK dependency is
`@azure/communication-email`.

## Sending behavior

`web/lib/auth.ts` creates an `EmailClient`, starts an Azure email operation, and
polls until it completes. Failed operations throw an error instead of silently
falling back to console output or another provider.

Azure reports `Succeeded` when the message is accepted and queued for delivery.
Inbox placement and later delivery events are separate concerns and can be
observed through Azure Monitor or Event Grid if delivery tracking is needed.

## Provisioning and verification

Azure CLI is already authenticated with `az login`. The general provisioning
sequence is:

```powershell
az communication email create `
  --name vivadeo-email `
  --resource-group rg-vivadeo `
  --location Global `
  --data-location UnitedStates

az communication email domain create `
  --domain-name AzureManagedDomain `
  --email-service-name vivadeo-email `
  --location Global `
  --resource-group rg-vivadeo `
  --domain-management AzureManaged

az communication create `
  --name vivadeo-communication `
  --resource-group rg-vivadeo `
  --location Global `
  --data-location UnitedStates `
  --linked-domains <email-domain-resource-id>

az communication email domain sender-username create `
  --email-service-name vivadeo-email `
  --resource-group rg-vivadeo `
  --domain-name AzureManagedDomain `
  --sender-username vivadeo `
  --username vivadeo

az communication email domain sender-username update `
  --email-service-name vivadeo-email `
  --resource-group rg-vivadeo `
  --domain-name AzureManagedDomain `
  --sender-username vivadeo `
  --display-name Vivadeo
```

Do not put a connection string directly in shell history when avoidable. Fetch
it into a protected environment or secret store, then update the deployment
`.env` without printing the value.

## Safe send test

Run the existing web typecheck first:

```powershell
cd web
npm.cmd run typecheck
```

For a real delivery test, load the two values from the protected `.env` and use
the Azure SDK or Azure CLI to send a short message to a recipient you control.
A successful Azure result means `Succeeded` / queued for delivery; it does not
prove inbox placement.

Never use a real recipient address or connection string in committed scripts,
fixtures, tests, or documentation.
