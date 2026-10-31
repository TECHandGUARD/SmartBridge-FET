# 🎓 SmartBridge FET

> CAPS-aligned learning platform for South African Grades 10–12.

SmartBridge FET is an EdTech platform built for South African learners, parents, and tutors. It provides study resources, video lessons, tutor bookings, AI-powered tools, and university application tracking — all aligned with the CAPS curriculum and compliant with POPIA and SACE requirements.

---

## Repository visibility and intellectual property

This repository is **publicly viewable by founder decision** to support development, review and collaboration. Public visibility does not grant permission to reuse, redistribute, rebrand or commercially exploit the code, designs, content or documentation. No open-source licence is granted by this notice; all rights remain with Tech & GUARD Pty Ltd unless a separate written licence says otherwise.

- Do not commit API keys, passwords, access tokens, signing secrets, service-role credentials or populated environment files.
- Do not commit learner, parent, tutor or staff personal information, identity documents, private messages, payment records or production exports.
- Keep production credentials in the relevant provider's server-side secret manager. All `VITE_*` variables are public and become visible in the browser bundle.
- Write access remains limited to people explicitly authorised by the repository owner.
- Report suspected secret or personal-data exposure immediately so credentials can be rotated and affected history remediated.


---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Backend** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (Email/Password) |
| **Realtime** | Supabase Realtime |
| **Storage** | Supabase Storage |
| **Payments** | Yoco (South Africa) |
| **Hosting** | AWS Amplify |

---

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account (team access only)
- Git (private repository access)

---

## 🔧 Environment Setup (For Authorized Developers Only)

### 1. Access the Repository

```bash
# You MUST be added as a collaborator first
# Contact: aneleq@techandguard.co.za

git clone [repository-url-provided-securely]
cd smartbridge-fet

## Reconciled repairs

See [transfer report](docs/repository-transfer.md), [activation guide](docs/operational-integrations.md) and [environment settings](docs/environment-configuration.md). Backend sources are under `supabase/functions` and `supabase/shared`; deployment bundles use `supabase/deployment-map.json`. Repairs are staged for review, with live backend activation still outstanding.
