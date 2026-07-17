# Core / Cloud boundary

E-Office is self-hosted Open Source Core. It has no public signup, email-verification or SaaS workspace lifecycle routes.

For controlled service-to-service provisioning, Cloud calls:

`POST /api/v1/internal/provisioning/workspaces`

The request requires `x-internal-provisioning-key` matching `INTERNAL_PROVISIONING_KEY` and contains a pre-hashed owner password. The Core bootstraps standard `Admin` and `User` roles through `TenantBootstrapService`.

Deployments must keep this route on a private network and should replace the shared secret with workload identity/mTLS where available. Self-hosted deployments create their first administrator through their initial setup/seed process, never through a public registration endpoint.
