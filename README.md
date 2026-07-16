# FlowDocker E-Office

Self-hosted document workflow, approval, and application-level PDF e-signing for teams that need tenant-scoped control, auditable process state, and portable storage.

![FlowDocker E-Office business process](docs/assets/readme/diagrams/business-process.png)

## Overview

FlowDocker E-Office takes a request from document setup through assigned approval, internal or external signing, asynchronous artifact generation, and authorized final PDF download. The verified runtime flow is **Request → Approval → Signing → Artifact → Completed**.

## Key Features

- Multi-tenant workspaces with backend-enforced isolation.
- RBAC, document ACL/ownership, and assigned approver/signer boundaries.
- Configurable document workflows and Document Type → Workflow mapping.
- Multi-step sequential approval with atomic activation of the next waiting step.
- Sequential internal signing and signing-field ownership enforcement.
- External invitation signing protected by OTP-verified sessions.
- My Tasks, notifications, audit history, email/webhook/outbox delivery, and deduplicated retries.
- Local filesystem and S3-compatible/MinIO artifact storage with persisted hash and metadata.

## Product Screenshots

| Dashboard | My Tasks & notifications |
|---|---|
| ![Authenticated dashboard](docs/assets/readme/screenshots/dashboard.png) | ![Notifications view](docs/assets/readme/screenshots/notifications.png) |

| Workflow configuration | Document Type mapping |
|---|---|
| ![Workflow configuration](docs/assets/readme/screenshots/workflow-configuration.png) | ![Document Type mapping](docs/assets/readme/screenshots/document-type-mapping.png) |

## How It Works

![Verified request-to-completion process](docs/assets/readme/diagrams/business-process.png)

Create a request, select its Document Type, and submit it. The mapped workflow resolves assigned actors. Sequential approval records are materialized up front: only step one is active; later steps wait until the preceding approval completes. After all required approvals and signatures, the outbox worker generates and stores the signed artifact before marking the request completed.

| Request setup | Assigned approval |
|---|---|
| ![Create request](docs/assets/readme/screenshots/create-request.png) | ![Approval task](docs/assets/readme/screenshots/approval-task.png) |

| Internal signing | Workflow status |
|---|---|
| ![Internal signing](docs/assets/readme/screenshots/internal-signing.png) | ![Document status timeline](docs/assets/readme/screenshots/status-timeline.png) |

## System Setup

![System setup](docs/assets/readme/diagrams/system-setup.png)

Tenant administrators configure master data, users and roles, workflows, document types, and the Document Type → Workflow mapping.

## Approval & E-Signing

Internal signing is constrained by signer order and assigned fields. External signing uses invitation and OTP session verification.

| Internal signing workspace | External signing workspace |
|---|---|
| ![Internal signing interface](docs/assets/readme/screenshots/internal-signing.png) | ![External signing interface](docs/assets/readme/screenshots/external-signing.png) |

This project provides application-level visual PDF signing workflows. It is not represented as qualified PKI signing, PAdES compliance, or a regulatory certification.

## Permission & Authorization

![Permission model](docs/assets/readme/diagrams/permission-model.png)

Tenant isolation, RBAC, ACL/ownership, workflow assignment, assigned approvers/signers, signing-field ownership, external OTP sessions, and backend authorization are the enforcement boundaries. Hidden UI controls are not security boundaries.

## Signing & Artifact Architecture

![Signing and artifact architecture](docs/assets/readme/diagrams/signing-artifact-architecture.png)

Signing completion writes an outbox event. The worker generates the PDF artifact, writes it to local or S3-compatible storage, persists hash/metadata, and only then completes the request. Artifact failures remain retryable failures rather than completed requests.

## Demo

[![Watch FlowDocker E-Office Demo](docs/assets/readme/demo/demo-thumbnail.png)](docs/assets/readme/demo/flowdocker-eoffice-demo.mp4)

## Architecture / Technology

Browser → Next.js frontend → Express/TypeScript API → PostgreSQL and Redis. The outbox worker processes notification, webhook, and artifact side effects. Storage is local by default and can be configured for S3-compatible services including MinIO.

## Quick Start

1. Copy `.env.compose.example` to `.env` and set unique secrets and URLs.
2. Start the stack:

   ```bash
   docker compose up -d --build
   ```

3. Open `http://localhost:3000`; the API is available at `http://localhost:4000`.

For a demo-only database, set `AUTO_INIT_DB=true` explicitly before starting the backend. It runs destructive schema initialization and seed data, so never use it with retained data.

## Storage

Local filesystem storage is the default. S3-compatible storage, including MinIO, is supported for source documents and final artifacts. Artifact metadata and hashes are persisted with the completed request.

## Project Status

`v0.1.0-alpha` is ready for evaluation in an isolated environment. Final UAT verified Golden Paths for internal approval/signing, sequential approval/signing, external OTP signing, artifact generation, local storage, and S3/MinIO. Production deployments still require their own operational, key-management, and compliance controls.

## Security

Never commit production secrets or SMTP credentials. See [SECURITY.md](SECURITY.md) and the deployment documentation before any production deployment. PDF annotations use Noto Sans for Vietnamese Unicode; configure approved fonts through `PDF_UNICODE_FONT_PATH` where required.

## License / Commercial Licensing

FlowDocker E-Office is source-available fair-code software, not OSI open source. The [Community Source License](LICENSE) permits internal self-hosting, internal modification, evaluation, learning, non-commercial personal use, development, testing, and contribution. Commercial hosted resale, managed-service resale, white-label resale, OEM/embedded distribution, and commercial redistribution as a competing product require a separate commercial license.

Trademark and logo rights are not granted automatically. See [COMMERCIAL-LICENSING.md](COMMERCIAL-LICENSING.md), [TRADEMARK.md](TRADEMARK.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md). FlowDocker™ and FlowDocker E-Office™ are trademarks of Nguyễn Đình Văn. Copyright © 2026 Nguyễn Đình Văn. All rights reserved.
