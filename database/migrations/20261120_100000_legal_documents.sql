-- Editable legal pages (Privacy Policy, Terms & Conditions) — Markdown, draft → publish,
-- full version history, and shared company details used as {{placeholders}}.

CREATE TABLE IF NOT EXISTS legal_company_details (
  tenant_id           INT          NOT NULL,
  company_name        VARCHAR(200) NOT NULL,
  company_short_name  VARCHAR(200) NOT NULL,
  nmls                VARCHAR(40)  NULL,
  address_line1       VARCHAR(200) NULL,
  address_line2       VARCHAR(200) NULL,
  phone               VARCHAR(40)  NULL COMMENT 'Also quoted in the SMS HELP auto-reply',
  email               VARCHAR(200) NULL,
  website             VARCHAR(300) NULL,
  updated_by          INT          NULL,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Company details substituted into legal pages ({{company_name}}, {{phone}}, …)';

CREATE TABLE IF NOT EXISTS legal_documents (
  id                  INT          NOT NULL AUTO_INCREMENT,
  tenant_id           INT          NOT NULL,
  doc_key             VARCHAR(20)  NOT NULL COMMENT 'privacy | terms',
  draft_markdown      MEDIUMTEXT   NULL COMMENT 'Unpublished edits; NULL = no draft',
  draft_updated_at    DATETIME     NULL,
  draft_updated_by    INT          NULL,
  published_version   INT          NULL COMMENT 'legal_document_versions.version currently live',
  PRIMARY KEY (id),
  UNIQUE KEY uq_legal_doc (tenant_id, doc_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legal_document_versions (
  id                  INT          NOT NULL AUTO_INCREMENT,
  tenant_id           INT          NOT NULL,
  doc_key             VARCHAR(20)  NOT NULL,
  version             INT          NOT NULL,
  markdown            MEDIUMTEXT   NOT NULL COMMENT 'Source with {{placeholders}} (rendered at read time)',
  effective_date      DATE         NOT NULL,
  change_note         VARCHAR(300) NULL,
  published_by        INT          NULL,
  published_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_legal_doc_version (tenant_id, doc_key, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable published versions of legal pages';

ALTER TABLE sms_consents
  ADD COLUMN IF NOT EXISTS privacy_version INT NULL COMMENT 'Privacy Policy version live when consent was given',
  ADD COLUMN IF NOT EXISTS terms_version INT NULL COMMENT 'Terms & Conditions version live when consent was given';

-- Seed: details and v1 text from the Nov 19, 2026 Privacy Policy / Terms PDF.
INSERT IGNORE INTO legal_company_details
  (tenant_id, company_name, company_short_name, nmls, address_line1, address_line2, phone, email, website)
VALUES
  (2, 'The Mortgage Professionals, Inc.', 'The Mortgage Professionals', '2302276',
   '16901 Bellflower Blvd.', 'Bellflower, CA 90706', '(562) 665-4132',
   'raul@theosegueragroup.com', 'https://www.themortgageprofessionals.net/');

INSERT IGNORE INTO legal_document_versions (tenant_id, doc_key, version, markdown, effective_date, change_note)
VALUES
  (2, 'privacy', 1, '# Privacy Policy

**{{company_name}}**

**Effective Date: {{effective_date}}**

{{company_name}} ("{{company_short_name}}," "Company," "we," "us," or "our") respects your privacy and is committed to protecting the personal information you share with us.

This Privacy Policy explains how we collect, use, disclose, and protect personal information when you visit {{website}}, complete our online forms, inquire about mortgage services, or communicate with our representatives.

## 1. Information We Collect

Depending on your interactions with us, we may collect the following categories of information:

- **Personal Information:** Full name, email address, telephone number, mailing address, and other contact information.
- **Mortgage and Financial Information:** Information voluntarily provided in connection with mortgage inquiries, loan applications, prequalification, refinancing, or related services, including employment, income, assets, and credit-related information where applicable.
- **Communication Information:** Messages, inquiries, appointment requests, customer service communications, and SMS consent preferences.
- **Technical Information:** IP address, browser type, device information, website interactions, cookies, and similar information collected through our website or authorized service providers.

We collect information directly from you and, where permitted by law, from authorized third parties involved in providing or evaluating mortgage-related services.

## 2. How We Use Your Information

We may use personal information to:

- Respond to mortgage inquiries and provide information about loan programs.
- Evaluate requests for mortgage financing and facilitate application-related activities.
- Schedule consultations and send appointment confirmations or reminders.
- Communicate about mortgage applications, document requests, and service updates.
- Provide customer support and respond to questions.
- Send promotional communications when permitted by applicable law and supported by the necessary consent.
- Maintain, improve, and secure our website and services.
- Comply with applicable legal, regulatory, and recordkeeping obligations.

## 3. SMS Communications and Consent

{{company_short_name}} may offer SMS communications to individuals who expressly opt in.

Depending on the consent provided, messages may include:

**Non-Marketing Messages:**

- Mortgage inquiry follow-ups.
- Appointment confirmations and reminders.
- Loan application status updates.
- Document requests and processing notifications.
- Customer service communications.

**Marketing and Promotional Messages:**

- Information about mortgage programs and services.
- Home financing and refinancing opportunities.
- Promotional offers and mortgage-related announcements.

Consent to receive marketing messages is separate from consent to receive non-marketing messages.

**SMS Consent Terms:**

- SMS consent is voluntary and is not a condition of obtaining a loan, purchasing a service, or receiving mortgage assistance.
- Message frequency varies based on your interactions with us and the program selected.
- Message and data rates may apply.
- You may opt out of SMS communications at any time by replying **STOP** to a message.
- For assistance, reply **HELP** or contact us at {{phone}}.
- Opting out of marketing communications does not automatically prevent necessary non-marketing communications through other legally permitted channels.

### SMS Privacy and Information Sharing

**We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.**

Mobile phone numbers, SMS opt-in records, and messaging consent information will not be sold, rented, or shared with third parties or affiliates for their own marketing or promotional purposes.

We may use authorized service providers solely to facilitate communications and other business operations on our behalf, subject to appropriate confidentiality and data protection obligations.

## 4. Information Sharing and Disclosure

We may disclose personal information when reasonably necessary to provide requested mortgage services, support business operations, comply with legal obligations, or protect against fraud.

Depending on the circumstances and applicable law, recipients may include authorized mortgage service providers, lenders, loan processing partners, technology vendors, and regulatory authorities.

Any sharing of nonpublic personal financial information is subject to applicable privacy laws, contractual obligations, and required consumer notices.

We do not sell or share SMS opt-in consent information for third-party marketing or promotional purposes.

## 5. Cookies and Website Technologies

Our website may use cookies and similar technologies to support website functionality, understand website performance, maintain security, and improve user experience.

You may manage certain cookie settings through your browser. Disabling cookies may affect some website features.

Where required by applicable law, we will provide additional notices or choices concerning tracking technologies.

## 6. Data Security

We maintain reasonable administrative, technical, and physical safeguards designed to protect personal information against unauthorized access, disclosure, alteration, or destruction.

No electronic transmission or storage system is completely secure. We therefore cannot guarantee absolute security.

## 7. Data Retention

We retain personal information for as long as reasonably necessary to provide our services, fulfill legitimate business purposes, comply with applicable laws and regulations, resolve disputes, and maintain required records.

Retention periods may vary based on the type of information and applicable legal requirements.

## 8. Your Privacy Choices and Rights

Depending on applicable law, you may have rights to request information about personal data we maintain, request corrections, or request deletion of eligible information.

Certain information may need to be retained for legal, regulatory, mortgage servicing, fraud prevention, or recordkeeping purposes.

You may also withdraw SMS consent at any time by replying **STOP**.

To submit a privacy inquiry, contact us using the information below.

## 9. Third-Party Websites and Services

Our website may contain links to third-party websites, mortgage application systems, or other external services.

These third parties may maintain their own privacy policies and data processing practices. We encourage you to review those policies before submitting information.

## 10. Children''s Privacy

Our website and mortgage services are intended for adults and are not directed to children under 13 years of age.

We do not knowingly collect personal information from children under 13 through our website.

## 11. Changes to This Privacy Policy

We may update this Privacy Policy periodically to reflect changes in our services, business practices, or applicable legal requirements.

Updates will be published on this page with a revised effective date.

## 12. Contact Information

For questions regarding this Privacy Policy, your personal information, or SMS communications, please contact:

**{{company_name}}**
NMLS #{{nmls}}
{{address_line1}}
{{address_line2}}

Phone: {{phone}}
Email: {{email}}
Website: {{website}}
', '2026-11-19', 'Initial version from the Nov 19, 2026 legal PDF'),
  (2, 'terms', 1, '# Terms & Conditions

**{{company_name}}**

**Effective Date: {{effective_date}}**

Welcome to {{company_name}}

These Terms & Conditions govern your use of {{website}}, your interactions with our online services, and your participation in our SMS messaging programs.

By accessing or using this website, you agree to these Terms & Conditions. Participation in SMS messaging programs requires separate, express consent.

## 1. Company Information

{{company_name}} provides mortgage-related information and services, including assistance with home purchases, refinancing, loan programs, and mortgage inquiries.

Company: {{company_name}}
NMLS: #{{nmls}}
Website: {{website}}

## 2. Website Use

You agree to use our website for lawful purposes and to provide accurate information when submitting inquiries or requesting services.

You may not misuse the website, attempt unauthorized access to its systems, or interfere with its operation.

We reserve the right to modify, suspend, or discontinue website functionality when reasonably necessary.

## 3. Mortgage Information Disclaimer

Information provided on this website is for general informational purposes and does not constitute a guarantee of loan approval, interest rates, loan terms, or financing eligibility.

Mortgage programs, rates, terms, and qualification requirements may vary based on borrower qualifications, lender requirements, property details, market conditions, and applicable laws.

Submitting an inquiry does not constitute a loan approval or create a lending obligation.

Any formal loan terms and disclosures will be provided separately as required by applicable law.

## 4. SMS Messaging Program

{{company_short_name}} offers optional SMS messaging programs to assist customers and prospective borrowers with mortgage-related communications.

### Non-Marketing SMS Messages

With your express consent, we may send text messages concerning:

- Mortgage inquiries and follow-up communications.
- Appointment confirmations and reminders.
- Loan application updates.
- Document requests and processing notifications.
- Customer support and service-related communications.

### Marketing and Promotional SMS Messages

If you separately consent to marketing communications, we may send messages concerning:

- Mortgage products and financing options.
- Refinancing opportunities.
- Promotional offers and announcements.
- Information about mortgage-related services.

Marketing and non-marketing SMS consent are collected separately.

## 5. SMS Consent and Participation

By voluntarily selecting the applicable SMS consent checkbox on our website, you authorize {{company_name}} to send text messages to the mobile number provided for the selected messaging purpose.

Consent is not a condition of purchasing services, submitting a mortgage application, or obtaining mortgage financing.

SMS consent checkboxes are optional and must be actively selected by the user.

## 6. Message Frequency and Charges

Message frequency varies depending on your mortgage inquiry, application status, communication preferences, and the SMS program in which you participate.

**Message and data rates may apply.**

Your mobile carrier may charge fees according to your wireless service plan. {{company_short_name}} is not responsible for charges assessed by your mobile carrier.

## 7. SMS Opt-Out Instructions

You may cancel SMS communications at any time.

**Reply STOP to any text message from {{company_short_name}} to opt out.**

After submitting your opt-out request, you may receive a final confirmation message. No further messages will be sent under the applicable SMS program unless you subsequently provide new consent or another lawful basis applies.

## 8. SMS Help and Customer Support

**Reply HELP to any text message for assistance.**

You may also contact {{company_short_name}} directly:

Phone: {{phone}}
Email: {{email}}

Our team can assist with questions about our SMS messaging programs and communication preferences.

## 9. Carrier Disclaimer

Mobile carriers are not liable for delayed or undelivered messages.

Message delivery depends on carrier availability, network conditions, device compatibility, and other factors outside our reasonable control.

## 10. Privacy and Data Protection

We respect your privacy and handle personal information in accordance with our Privacy Policy.

**We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.**

Mobile information and SMS consent records will not be shared with third parties or affiliates for their own promotional or marketing activities.

For additional information, please review our Privacy Policy:

{{privacy_url}}

## 11. Third-Party Services

Our website may contain links to third-party services, including online mortgage application platforms.

Those services may be governed by their own terms and privacy policies.

We are not responsible for the independent practices of third-party services outside our control.

## 12. Intellectual Property

Website content, including text, graphics, branding, and other original materials owned by {{company_short_name}}, is protected by applicable intellectual property laws.

Unauthorized reproduction, modification, or distribution of protected materials is prohibited without prior written authorization.

## 13. Limitation of Liability

To the extent permitted by applicable law, {{company_short_name}} is not responsible for interruptions, technical errors, or inaccuracies in general website information.

Nothing in these Terms limits consumer rights or remedies that cannot lawfully be waived, including rights under applicable mortgage lending and consumer protection laws.

## 14. Updates to These Terms

We may revise these Terms & Conditions periodically.

The updated version will be posted on this website with its effective date. Material changes to SMS programs will be communicated when required by applicable law.

## 15. Governing Law

These Terms & Conditions are governed by applicable United States federal law and the laws of the State of California, except where other mandatory laws apply.

## 16. Contact Us

**{{company_name}}**
NMLS #{{nmls}}
{{address_line1}}
{{address_line2}}

Phone: {{phone}}
Email: {{email}}
Website: {{website}}
', '2026-11-19', 'Initial version from the Nov 19, 2026 legal PDF');

INSERT IGNORE INTO legal_documents (tenant_id, doc_key, published_version)
VALUES (2, 'privacy', 1), (2, 'terms', 1);
