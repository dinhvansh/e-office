import { PolicyPage } from '@/components/legal/policy-page';
import { policyMetadata } from '@/lib/policy-metadata';

export default function TermsPage() {
  return <PolicyPage title="Terms of Service" version={policyMetadata.termsVersion} sections={[
    { heading: 'Draft status', content: 'These terms are an alpha publication draft for maintainer review. They are not external legal approval and do not replace a signed commercial agreement or deployment-specific policy.' },
    { heading: 'Service use', content: 'You may use an authorized FlowDocker E-Office workspace only for lawful document workflow, approval, and signing-related operations approved by your organization or workspace administrator.' },
    { heading: 'Account responsibility', content: 'You are responsible for protecting your credentials, using only accounts and workspaces assigned to you, and promptly reporting suspected unauthorized access to your workspace administrator.' },
    { heading: 'Customer content', content: 'You must upload, share, approve, sign, or process documents only when you have appropriate authority. Your organization controls document retention, approval rules, signer authority, and legal effect of workflows in its deployment.' },
    { heading: 'Self-hosted deployments', content: 'For self-hosted installations, the operator is responsible for configuration, security controls, user administration, backup, retention, and compliance review. These hosted-user terms do not expand rights granted by the Community Source License.' },
    { heading: 'License restrictions', content: 'Source access is governed by the Community Source License. Internal self-hosting and internal modification are allowed. Commercial hosting, managed-service resale, white-label resale, OEM or embedded distribution, and commercial redistribution as a competing product require a Commercial License.' },
    { heading: 'Trademarks', content: 'FlowDocker™ and FlowDocker E-Office™ are trademarks of Nguyễn Đình Văn. Names, logos, and related marks are not licensed automatically. Use of marks must follow TRADEMARK.md or separate written permission.' },
    { heading: 'No regulated-signature claim', content: 'The alpha signing flow is not represented as a qualified electronic signature, certified trust service, PKI service, PAdES compliance solution, or substitute for organization-specific legal review.' },
    { heading: 'Warranty disclaimer', content: 'The service and software are provided as is and as available, without warranties of merchantability, fitness for a particular purpose, non-infringement, availability, accuracy, security, or regulatory compliance, to the maximum extent permitted by law.' },
    { heading: 'Limitation of liability', content: 'To the maximum extent permitted by law, the project maintainers and contributors are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, lost profits, lost data, business interruption, or similar losses arising from use of the software or service.' },
    { heading: 'Governing law', content: `Governing law, venue, legal entity, and contracting party are ${policyMetadata.governingLaw}. These items must be confirmed by the maintainer before final publication. Commercial licensing contact: ${policyMetadata.commercialEmail}.` },
  ]} />;
}
