# README Diagram Design Prompt

Create four clean, professional GitHub README diagrams for **FlowDocker E-Office**, a document-workflow, approval, and e-signing platform. Use `BUSINESS-PROCESS-DIAGRAM-SPEC.md` as the sole source of truth; do not invent qualified PKI/PAdES, actors, or features.

Style: modern open-source enterprise SaaS; white/light background; blue and teal palette; rounded cards; subtle shadows; minimal readable labels; clear directional arrows; desktop-readable; 16:9 landscape for process and architecture diagrams.

Deliver: (1) setup flow: Tenant → Master Data → Users/Roles → Workflow → Document Type → Workflow Mapping; (2) end-to-end flow: Request → sequential approval → internal/external signing → outbox worker → signed artifact → Completed/download, including reject/resubmit and artifact-failed/retry branches; (3) permission model: tenant isolation, RBAC, ACL/ownership, workflow assignment, signer/field ownership, backend enforcement; (4) signing/artifact architecture: actors → frontend → backend API/PostgreSQL → outbox/worker/PDF engine → local storage or S3/MinIO → hash/metadata/final artifact. Clearly show that sequential approval materializes later steps as waiting and atomically activates the next assigned approver.
