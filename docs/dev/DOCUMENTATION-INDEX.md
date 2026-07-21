# Documentation Index

This is the current documentation map for E-Office development and product readiness.

## Product and Usage

- [BUSINESS-PROCESS.md](BUSINESS-PROCESS.md): business roles, document lifecycle, document type rules, workflow states, and MVP readiness criteria.
- [USER-GUIDE.md](USER-GUIDE.md): login, navigation, document creation, approval, signing, admin setup, and troubleshooting.
- [DOCUMENT-FLOW-UX-WIZARD.md](DOCUMENT-FLOW-UX-WIZARD.md): target Create -> Editor -> Configure -> Submit flow.

## Engineering

- [DEVELOPMENT-RULES.md](DEVELOPMENT-RULES.md): development conventions and implementation rules.
- [API-RESPONSE-GUIDELINE.md](API-RESPONSE-GUIDELINE.md): standard backend API response envelope.
- [ERROR-HANDLING-GUIDE.md](ERROR-HANDLING-GUIDE.md): error handling patterns.
- [ENVIRONMENT-VARIABLES-REQUIRED.md](ENVIRONMENT-VARIABLES-REQUIRED.md): required environment variables.

## Security and Permissions

- [AUTHORIZATION-MODEL.md](AUTHORIZATION-MODEL.md): full authorization precedence, tenant isolation, resource access, policy JSON examples, and audit decision API.

## Testing

- [E2E-TEST-MATRIX.md](E2E-TEST-MATRIX.md): test commands by area and expected results.
- [WORKFLOW-REFACTOR-E2E-REPORT.md](WORKFLOW-REFACTOR-E2E-REPORT.md): latest workflow E2E verification report.
- [WORKFLOW-REFACTOR-PLAN-CHECKLIST.md](WORKFLOW-REFACTOR-PLAN-CHECKLIST.md): workflow refactor checklist.

## Cleanup

- [PROJECT-CLEANUP.md](PROJECT-CLEANUP.md): cleanup policy for generated outputs and historical scripts.

## Verification Commands

```bash
npm run ci:build
npm run e2e:auth
npm run e2e:workflow
npm run e2e:smoke
```
