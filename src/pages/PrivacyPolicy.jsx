import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import DefinitionTable from '@/components/legal/DefinitionTable';

const privacyContent = `# Privacy Policy

**Effective Date:** 21 February 2026
**Owner:** Tech & GUARD Pty Ltd (Registration Number: 2026/155090/09)
**Information Officer:** Anele Qamata — aneleq@techandguard.co.za

**Table of Contents**
1. Introduction
2. What Personal Information We Collect
3. How We Use Your Information
4. Sharing Your Information with Third Parties
5. Your Rights Under POPIA
6. Data Retention
7. Data Security
8. Data Breach Notification
9. Direct Marketing
10. Children's Privacy
11. Cookies
12. Changes to This Policy
13. Contact Us

---

## 1. Introduction

Tech & GUARD Pty Ltd ("EduConnect FET", "we", "us", "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information in accordance with the Protection of Personal Information Act (POPIA), Act No. 4 of 2013.

By using EduConnect FET, you consent to the practices described in this policy.

---

## 2. What Personal Information We Collect

### Students & Parents
- Full name
- Email address
- Grade (10, 11, or 12)
- Payment reference (for premium subscriptions)
- Learning preferences and resource bookmarks
- Quiz scores and progress data

### Tutors
- Full name
- Email address
- SACE registration number (for professional tutors)
- University and student number (for student tutors)
- Bank account details (for payouts)
- SAPS clearance certificate (where required)

### Technical Data
- IP address
- Browser type
- Session data
- Pages visited and time spent

---

## 3. How We Use Your Information

We process your personal information only for legitimate purposes:

---

## 4. Sharing Your Information with Third Parties

We share your personal information only when necessary:

We **never** sell your personal information to third parties.

---

## 5. Your Rights Under POPIA

You have the right to:

- **Access your data** — Email: aneleq@techandguard.co.za
- **Correct inaccurate data** — Update in your profile settings
- **Object to processing** — Email our Information Officer
- **Request deletion** — Email: aneleq@techandguard.co.za
- **Withdraw consent** — Unsubscribe from marketing emails

We respond to all requests within 30 days (POPIA Section 24).

---

## 6. Data Retention

- **Student profiles** — Until account deletion or 2 years of inactivity
- **Booking records** — 3 years (tax and dispute resolution)
- **Tutor financial records** — 5 years (SARS compliance)
- **Quiz results** — Until account deletion

After retention period, data is permanently deleted or anonymised.

---

## 7. Data Security

We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, loss, or damage, including:

- Encryption of data in transit (TLS 1.3)
- Secure database hosting
- Role-based access controls
- Regular security reviews

---

## 8. Data Breach Notification

If a data breach occurs that compromises your personal information:

- We will notify the Information Regulator within 72 hours (POPIA Section 22)
- We will notify affected users directly if there is a high risk to their rights
- Notification will include: nature of breach, categories of data affected, recommended steps for users

---

## 9. Direct Marketing

We send marketing emails (study tips, resource updates, special offers) **only if you have opted in**. Marketing emails include an unsubscribe link that works immediately.

You can update your marketing preferences at any time in your account Settings.

---

## 10. Children's Privacy (Under 18)

If you are under 18, your parent or legal guardian must provide consent before you use EduConnect FET. We collect parent/guardian email addresses during registration for this purpose.

We do not knowingly collect personal information from children under 13 without verified parental consent.

---

## 11. Cookies

We use essential cookies for:
- Authentication (keeping you logged in)
- Session management
- Security

We do not use tracking cookies for advertising.

---

## 12. Changes to This Policy

We may update this Privacy Policy from time to time. Material changes will be notified via email or a prominent notice on the platform.

---

## 13. Contact Us

**Information Officer:** Anele Qamata
**Email:** aneleq@techandguard.co.za
**Phone:** 0731127124
**Physical Address:** 6 Marais Road, Stellenbosch, 7600

Tech & GUARD Pty Ltd is an e-commerce company owned by a black student. The business is registered at the address above.

For data subject access requests, breach reports, or any privacy concerns — contact our Information Officer directly.`;

export default function PrivacyPolicy() {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Effective Date: 21 February 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Company Info */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold text-foreground">Owner:</span> <span className="text-foreground">Tech & GUARD Pty Ltd (Registration Number: 2026/155090/09)</span></p>
            <p><span className="font-semibold text-foreground">Information Officer:</span> <span className="text-foreground">Anele Qamata</span></p>
            <p><span className="font-semibold text-foreground">Email:</span> <a href="mailto:aneleq@techandguard.co.za" className="text-primary hover:underline">aneleq@techandguard.co.za</a></p>
          </div>
        </div>

        {/* Main Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => null,
              h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-10 mb-4 text-foreground pt-6 border-t" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-5 mb-3 text-foreground" {...props} />,
              p: ({ node, ...props }) => <p className="text-foreground mb-4 leading-relaxed text-base" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 text-foreground space-y-2" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 text-foreground space-y-2" {...props} />,
              li: ({ node, ...props }) => <li className="text-foreground text-base ml-2" {...props} />,
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto mb-6 border border-border rounded-lg">
                  <table className="w-full text-sm" {...props} />
                </div>
              ),
              th: ({ node, ...props }) => <th className="border-b border-border bg-muted px-4 py-3 text-left text-foreground font-semibold" {...props} />,
              td: ({ node, ...props }) => <td className="border-b border-border px-4 py-3 text-foreground" {...props} />,
              hr: ({ node, ...props }) => <hr className="my-10 border-border" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
              em: ({ node, ...props }) => <em className="italic text-foreground" {...props} />,
              blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary pl-4 py-2 italic text-muted-foreground mb-4" {...props} />,
            }}
          >
            {privacyContent}
          </ReactMarkdown>
        </div>

        {/* Contact Section */}
        <div className="bg-card border border-border rounded-lg p-6 mt-12">
          <h3 className="text-lg font-semibold text-foreground mb-4">Have Questions?</h3>
          <p className="text-foreground text-sm mb-4">
            If you have any questions about this Privacy Policy or how we handle your personal information, please contact our Information Officer.
          </p>
          <div className="space-y-2 text-sm text-foreground">
            <p><span className="font-semibold">Email:</span> <a href="mailto:aneleq@techandguard.co.za" className="text-primary hover:underline">aneleq@techandguard.co.za</a></p>
            <p><span className="font-semibold">Phone:</span> 0731127124</p>
            <p><span className="font-semibold">Address:</span> 6 Marais Road, Stellenbosch, 7600</p>
          </div>
        </div>
      </div>
    </div>
  );
}