# Security Policy

FlowDocker E-Office is an alpha source-available project. This policy describes how to
report vulnerabilities and the baseline responsibilities for self-hosted
deployments. It is not a warranty, managed security commitment, or regulatory
compliance statement.

## Reporting vulnerabilities

Please do not report suspected vulnerabilities in public issues.

Send a private report to: vanqn95@gmail.com.

Include, when safe:

- affected version or commit;
- deployment mode and relevant configuration;
- minimal reproduction steps;
- impact assessment;
- logs or screenshots with secrets, personal data, and customer documents
  removed.

Do not include real credentials, production documents, private keys, access
tokens, or personal data in reports unless a secure intake process has been
confirmed by the maintainer.

## Self-hosted deployment responsibilities

Self-hosted operators are responsible for:

- strong unique secrets and key rotation;
- TLS termination and secure network boundaries;
- approved SMTP and object-storage credentials;
- database backups and restore testing;
- access control configuration;
- tenant isolation review before multi-tenant production use;
- monitoring, logging, and incident response;
- compliance review for the jurisdictions and industries where the deployment
  is used.

See `docs/SECURITY-POLICY.md` for the current engineering baseline.

## No compliance claim

The project does not currently claim GDPR, HIPAA, eIDAS, qualified electronic
signature, PAdES, SOC 2, ISO 27001, or other regulatory compliance. Operators
must perform their own legal, security, privacy, and compliance review before
production use.

## License and commercial support

Security support and commercial support may be offered under a separate
Commercial License or support agreement. The Community Source License does not
create a managed service, uptime SLA, patch SLA, or security support SLA.

Commercial / support contact: vanqn95@gmail.com.

## Status

Classification: READY AS DRAFT, subject to maintainer approval.

Required maintainer decisions:

- supported versions policy;
- disclosure timeline;
- commercial support contact.
