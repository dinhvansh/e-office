import { PolicyPage } from '@/components/legal/policy-page';
import { policyMetadata } from '@/lib/policy-metadata';

export default function PrivacyPage() {
  return <PolicyPage title="Privacy Notice" version={policyMetadata.privacyVersion} sections={[
    { heading: 'Draft status', content: 'This privacy notice is an alpha publication draft for maintainer review. It describes the expected product data flows and does not claim GDPR, HIPAA, eIDAS, SOC 2, ISO 27001, or other regulatory compliance.' },
    { heading: 'Deployment roles', content: 'For self-hosted deployments, the organization operating the deployment controls workspace configuration, user access, retention, backup, security controls, and compliance decisions. FlowDocker E-Office does not operate those self-hosted environments.' },
    { heading: 'Data processed', content: 'Depending on configuration, FlowDocker E-Office may process account details, workspace and tenant details, roles and permissions, uploaded documents, signature and approval workflow data, audit events, email delivery metadata, object-storage metadata, and technical logs.' },
    { heading: 'Purpose of processing', content: 'Data is used to authenticate users, operate workspaces, route documents, record approval and signing activity, enforce access controls, deliver notifications, troubleshoot issues, and maintain security and auditability.' },
    { heading: 'Storage and processors', content: 'Self-hosted operators choose their database, object storage, SMTP provider, infrastructure, backup location, and monitoring tools. Optional S3-compatible storage and email delivery may involve third-party providers selected by the operator.' },
    { heading: 'Retention', content: 'Retention periods are controlled by deployment configuration and organizational policy. Operators should define document retention, audit-log retention, backup retention, and deletion procedures before production use.' },
    { heading: 'Access control', content: 'Workspace administrators manage users, roles, permissions, tenants, and document access. Operators should review tenant isolation and access control before enabling multi-tenant production use.' },
    { heading: 'Security', content: 'The project provides security-oriented defaults and guidance, but operators remain responsible for secrets, TLS, network controls, monitoring, incident response, backups, and compliance review.' },
    { heading: 'User requests', content: 'Users should direct access, correction, deletion, export, or retention questions to their workspace administrator or the organization operating the deployment. Self-hosted operators are responsible for responding under their applicable policies and laws.' },
    { heading: 'Contact', content: `Privacy contact: ${policyMetadata.privacyEmail}. Commercial licensing contact: ${policyMetadata.commercialEmail}. The legal entity, governing law, venue, retention schedule, and subprocessor list remain ${policyMetadata.governingLaw} until the maintainer confirms them.` },
  ]} />;
}
