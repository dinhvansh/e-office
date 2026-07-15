# Internal Legal-Style Review

Status: publication draft for maintainer review.

This review is not external legal counsel, does not provide legal advice, and
must not be described as legal approval. Its purpose is to make the licensing
and policy package internally consistent with the current business intent.

## Business Intent

Classification: READY AS DRAFT

FlowDocker E-Office source code is publicly visible under a source-available,
fair-code style Community Source License. Copyright © 2026 Nguyễn Đình Vân. All
rights reserved. Internal self-hosting, internal modification, evaluation,
learning, development/testing, non-commercial personal use, and contribution
are allowed. Commercial resale models that substantially monetize the software
itself require a separate Commercial License.

The draft intentionally does not use an OSI-approved open-source license.
README language has been aligned to avoid calling the project "open source" in
a way that conflicts with commercial restrictions.

## Definitions

Classification: READY AS DRAFT

The licensing package defines these terms consistently across LICENSE and
COMMERCIAL-LICENSING.md:

- Internal Business Use
- Commercial Hosting
- Managed Service
- White-Label
- OEM / Embedded Distribution
- Redistribution
- Commercial License

Internal Business Use is defined as use for an organization's own internal
operations and users, and expressly excludes hosted resale, managed service,
white-label, OEM, and commercial redistribution models.

## Allowed Uses

Classification: READY AS DRAFT

Allowed without a Commercial License:

- internal self-hosting;
- internal modification;
- evaluation and learning;
- development and testing;
- non-commercial personal use;
- contribution;
- consulting, implementation, training, migration, integration, and support
  services around FlowDocker E-Office, provided they do not effectively resell the
  software itself as hosted access, a managed service, a white-label product,
  OEM distribution, or commercial redistribution.

## Restricted Uses

Classification: READY AS DRAFT

Requires a Commercial License:

- paid hosted access to FlowDocker E-Office;
- SaaS or service-bureau offerings where substantial value comes from FlowDocker E-Office;
- managed hosting where FlowDocker E-Office is the product or a substantial part of the
  product delivered to third parties;
- white-label or rebranded resale;
- OEM or embedded distribution;
- commercial redistribution of modified or unmodified versions as a competing
  product;
- sublicensing or granting broader downstream rights.

## Trademark Treatment

Classification: READY AS DRAFT

FlowDocker™ and FlowDocker E-Office™ are trademarks of Nguyễn Đình Vân.
TRADEMARK.md states that trademark, logo, trade dress, domain, product
naming, and brand rights are not granted automatically by the source license or
by commercial licensing unless expressly granted in writing.

Truthful nominative references are allowed for compatibility, support,
consulting, training, integration, and credit. Uses that imply endorsement,
official status, affiliation, or origin require written permission.

## Terms and Privacy Consistency

Classification: READY AS DRAFT

The Terms of Service and Privacy Notice are aligned with the Community Source
License:

- self-hosted operators remain responsible for configuration, security,
  retention, compliance, and user administration;
- hosted-user terms do not expand source-license rights;
- no GDPR, HIPAA, eIDAS, SOC 2, ISO 27001, PAdES, qualified-signature, PKI, or
  trust-service compliance claim is made;
- warranty disclaimer and limitation of liability language are present;
- commercial, privacy, and security contacts are vanqn95@gmail.com;
- governing law and contracting legal entity remain explicit maintainer
  placeholders.

The registration acceptance language links the current Terms and Privacy Notice
versions and clarifies that accepting them does not grant commercial resale,
hosted resale, white-label, OEM, or trademark rights.

## Security Policy Consistency

Classification: READY AS DRAFT

SECURITY.md now separates vulnerability reporting from self-hosted deployment
responsibilities and avoids creating an SLA, managed security commitment, or
compliance representation under the Community Source License.

## Contradictions Fixed

Classification: READY AS DRAFT

- LICENSE, COMMERCIAL-LICENSING.md, README, Terms, and registration acceptance
  now use the same commercial-license triggers.
- README now says source-available fair-code software, not OSI open source.
- Terms no longer imply that self-hosted deployments receive broader rights
  than the Community Source License.
- Trademark rights are expressly excluded from automatic license grants.
- Consulting/support is allowed when it does not amount to software resale.
- Internal Business Use is defined and bounded.
- Warranty disclaimer and limitation of liability appear in LICENSE and Terms.
- Privacy Notice avoids regulatory compliance claims that the implementation
  and policies do not yet support.

## Unresolved Legal Decisions

Classification: NEEDS MAINTAINER DECISION

- contracting legal entity;
- approved logo and brand asset rules;
- supported versions and vulnerability disclosure timeline;
- governing law and venue;
- contribution license mechanics if the project will accept external
  contributions at scale.

## External Counsel Items

Classification: NEEDS EXTERNAL LEGAL COUNSEL

External counsel should review before relying on the draft for commercial
enforcement or broad publication:

- enforceability of the source-available commercial restrictions in target
  jurisdictions;
- whether the warranty disclaimer and liability limitation are sufficient for
  the intended market;
- privacy notice adequacy for actual deployment roles and data processing;
- trademark protection and brand usage policy;
- commercial license template and order form;
- contribution terms and copyright assignment / inbound licensing model;
- any e-signature, document-retention, sector-specific, or cross-border data
  obligations for production deployments.

## Publication Risks

Classification: NEEDS MAINTAINER DECISION

- The package is coherent as a draft. Governing law, venue, and contracting
  legal entity remain unresolved before final public publication.
- If the project markets commercial hosting or managed services, the Terms and
  Privacy Notice must be updated for the actual operator, subprocessors,
  support commitments, billing terms, and incident process.
- If the project accepts external contributions, contribution licensing should
  be formalized before significant public contribution intake.
- If the signing workflow is marketed beyond internal workflow convenience,
  e-signature and document-law claims need jurisdiction-specific legal review.

## Final Classification

- LICENSE: READY AS DRAFT; NEEDS MAINTAINER DECISION for entity and
  governing law; NEEDS EXTERNAL LEGAL COUNSEL before enforcement reliance.
- COMMERCIAL-LICENSING.md: READY AS DRAFT; NEEDS MAINTAINER DECISION for
  entity and commercial process; NEEDS EXTERNAL LEGAL COUNSEL for
  commercial agreement templates.
- TRADEMARK.md: READY AS DRAFT; NEEDS MAINTAINER DECISION for brand asset
  rules; NEEDS EXTERNAL LEGAL COUNSEL for formal trademark strategy.
- README licensing/legal sections: READY AS DRAFT.
- SECURITY.md: READY AS DRAFT; NEEDS MAINTAINER DECISION for supported versions.
- Terms of Service: READY AS DRAFT; NEEDS MAINTAINER DECISION for entity and
  governing law; NEEDS EXTERNAL LEGAL COUNSEL for public hosted
  service use.
- Privacy Notice: READY AS DRAFT; NEEDS MAINTAINER DECISION for operator
  identity, retention, and subprocessors; NEEDS EXTERNAL
  LEGAL COUNSEL for production privacy compliance.
- policy-metadata.ts: READY AS DRAFT; NEEDS MAINTAINER DECISION for governing
  law and legal-entity placeholders.
- registration acceptance language: READY AS DRAFT.

Overall draft publication readiness: READY AS DRAFT, subject to maintainer
approval and placeholder resolution. Not legally approved.
