import React, {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
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
  const [report,setReport]=useState(null);
  const [reportError,setReportError]=useState('');
  useEffect(()=>{let active=true; if(!supabase){setReportError('Database connection unavailable');return;} supabase.functions.invoke('coo-board-report',{body:{}}).then(({data,error})=>{if(!active)return;if(error)setReportError('COO report unavailable until the reporting function and database are deployed');else setReport(data);});return()=>{active=false;};},[]);
  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8" aria-label="AI Executive Boardroom">
    <header className="rounded-2xl border bg-card p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tech & GUARD / SmartBridge FET</p>
      <h1 className="mt-2 text-3xl font-bold">AI Executive Boardroom</h1>
      <p className="mt-2 text-muted-foreground">Executive integration preview · Check COO live status below</p>
    </header>
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Executive portfolios">
      {executives.map(([title,department,description])=><article key={title} className="rounded-xl border bg-card p-5">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 font-medium">{department}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <p className="mt-4 text-xs font-medium">Configuration preview · Not connected</p>
      </article>)}
    </section>
    <section className="rounded-xl border bg-card p-5" aria-label="COO activity reporting">
      <h2 className="text-xl font-semibold">COO — daily accountability</h2>
      {report ? <div className="mt-3 grid gap-3 sm:grid-cols-3"><p>Sending: <strong>{report.email_enabled ? 'Enabled' : 'Disabled'}</strong></p><p>Today: <strong>{report.used_today} / {report.daily_limit}</strong></p><p>Report day: <strong>{report.report_date}</strong></p><p className="sm:col-span-3 text-sm">Last 7 days: {Object.entries(report.last_7_days || {}).map(([status,count])=>`${status}: ${count}`).join(' · ') || 'No activity recorded'}</p></div> : <p className="mt-3 text-sm text-muted-foreground">{reportError || 'Loading protected COO activity report…'}</p>}
      <p className="mt-2 text-xs text-muted-foreground">Provider accepted is not the same as delivered. Sending remains subject to server-side permission rules.</p>
    </section>
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-xl font-semibold">Account review workflow</h2>
      <p className="mt-2 text-sm">Existing accounts: one-time baseline review. Incoming accounts: event-based onboarding. Account records are not loaded into this preview, and no emails are sent.</p>
      <p className="mt-3 text-sm">Next integration: admin-authorized account summaries, consent-aware message templates, auditable task queue, and a delivery provider.</p>
      <Link to="/admin" className="mt-4 inline-block underline">Return to admin dashboard</Link>
    </section>
  </main>;
}
