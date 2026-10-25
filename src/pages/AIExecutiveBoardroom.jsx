import React from 'react';
import { Link } from 'react-router-dom';

const executives = [
  ['CEO','Strategy & coordination','Prioritize growth, reconcile executive recommendations and escalate founder decisions.'],
  ['COO','Tutor onboarding & operations','Review profile readiness, availability, bookings and onboarding follow-ups.'],
  ['CFO','Finance & sustainability','Monitor revenue, commissions and costs; no authority to transfer funds.'],
  ['CMO','Marketing & communication','Manage approved welcome journeys, campaigns and communication preferences.'],
  ['CIO','Technology & security','Review system reliability, technical incidents and security findings.'],
  ['General Manager','Service quality','Coordinate support requests, user feedback and unresolved service issues.'],
];
export default function AIExecutiveBoardroom(){
  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8" aria-label="AI Executive Boardroom">
    <header className="rounded-2xl border bg-card p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tech & GUARD / SmartBridge FET</p>
      <h1 className="mt-2 text-3xl font-bold">AI Executive Boardroom</h1>
      <p className="mt-2 text-muted-foreground">Phase 1 preview · No autonomous actions or email delivery enabled</p>
    </header>
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Executive portfolios">
      {executives.map(([title,department,description])=><article key={title} className="rounded-xl border bg-card p-5">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 font-medium">{department}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <p className="mt-4 text-xs font-medium">Configuration preview · Not connected</p>
      </article>)}
    </section>
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-xl font-semibold">Account review workflow</h2>
      <p className="mt-2 text-sm">Existing accounts: one-time baseline review. Incoming accounts: event-based onboarding. Account records are not loaded into this preview, and no emails are sent.</p>
      <p className="mt-3 text-sm">Next integration: admin-authorized account summaries, consent-aware message templates, auditable task queue, and a delivery provider.</p>
      <div className="mt-4 flex flex-wrap gap-4"><Link to="/admin/ai-training" className="underline">Open AI Executive Training Centre</Link><Link to="/admin" className="underline">Return to admin dashboard</Link></div>
    </section>
  </main>;
}
