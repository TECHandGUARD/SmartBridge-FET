import React from 'react';
import { Link } from 'react-router-dom';

// This is a route visibility checklist, not a deployment-status service.
// A successful HTTP response cannot establish role permissions or feature health.
const features = [
  ['AI Executive Boardroom', '/admin/ai-boardroom', 'Admin only · preview'],
  ['Communication Hub', '/communication', 'Role-dependent'],
  ['Learning Hub', '/learning-hub', 'Role-dependent'],
  ['Practice & Assessments', '/practice-hub', 'Role-dependent'],
  ['Career Opportunities', '/career-hub', 'Role-dependent'],
];
export default function FeatureVisibility() {
  return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
    <header className="rounded-2xl border bg-card p-6">
      <h1 className="text-3xl font-bold">Feature Visibility</h1>
      <p className="mt-2 text-muted-foreground">Admin route checklist · Not a live deployment monitor</p>
      <p className="mt-2 text-sm">Open each feature while signed in to verify its visibility. A feature may exist in the code but remain hidden by navigation, role permissions, onboarding requirements, or deployment configuration.</p>
    </header>
    <section className="space-y-3" aria-label="Feature routes">
      {features.map(([name,path,access]) => <article key={path} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div><h2 className="font-semibold">{name}</h2><p className="text-sm text-muted-foreground">{access} · {path}</p></div>
        <Link className="underline" to={path}>Open feature</Link>
      </article>)}
    </section>
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">Release verification</h2>
      <p className="mt-2 text-sm">GitHub checks, AWS Amplify deployment status, browser access, and role-by-role tests must be verified separately. This page does not automatically deploy, enable, disable, or roll back features.</p>
      <Link className="mt-3 inline-block underline" to="/admin">Return to admin dashboard</Link>
    </section>
  </main>;
}
