import React, {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';
import ExecutiveTrainingLab from '@/components/admin/ExecutiveTrainingLab';
import ExecutiveTrainingRecords from '@/components/admin/ExecutiveTrainingRecords';

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
  const [preview,setPreview]=useState(null);
  const [testing,setTesting]=useState(false);
  useEffect(()=>{let active=true; if(!supabase){setReportError('Database connection unavailable');return;} supabase.functions.invoke('coo-board-report',{body:{}}).then(({data,error})=>{if(!active)return;if(error)setReportError('COO report unavailable until the reporting function and database are deployed');else setReport(data);});return()=>{active=false;};},[]);
  const runPreview=async()=>{setTesting(true);setReportError('');try{
    const {data,error}=await supabase.functions.invoke('coo-board-report',{body:{preview:true}});
    if(error)throw error;
    setPreview(data?.preview||null);setReport(data);
  }catch{setReportError('Could not complete safe COO preview.');}finally{setTesting(false);}};
  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8" aria-label="AI Executive Boardroom">
    <header className="rounded-2xl border bg-card p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tech & GUARD / SmartBridge FET</p>
      <h1 className="mt-2 text-3xl font-bold">AI Executive Boardroom</h1>
      <p className="mt-2 text-muted-foreground">Executive integration preview · Check COO live status below</p>
    </header>
    <section className="rounded-xl border p-5 space-y-2" role="status" aria-label="Outstanding AI provider setup">\n      <h2 className="font-semibold">Action required — COO AI provider setup is not complete</h2>\n      <p className="text-sm">The COO AI scenario test still needs a working provider connection. In Supabase Edge Function Secrets, configure OPENAI_API_KEY and an available OPENAI_MODEL, then run and verify an actual COO response. This notice stays visible across deployments until setup and testing have been confirmed and this outstanding item is explicitly closed.</p>\n      <p className="text-xs text-muted-foreground">Do not paste API keys into this website, chat, or source code. Approved training instructions remain saved; automatic tutor emails remain paused.</p>\n    </section>\n    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Executive portfolios">
      {executives.map(([title,department,description])=><article key={title} className="rounded-xl border bg-card p-5">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 font-medium">{department}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <p className="mt-4 text-xs font-medium">Configuration preview · Not connected</p>
      </article>)}
    </section>
    <ExecutiveTrainingLab runCooPreview={runPreview} testing={testing} preview={preview}/>
    <ExecutiveTrainingRecords/>
    <section className="rounded-xl border bg-card p-5" aria-label="COO activity reporting">
      <h2 className="text-xl font-semibold">COO — daily accountability</h2>
      <div className="mt-3 rounded-xl border p-4">
        <h3 className="font-semibold">Test the COO now</h3>
        <p className="mt-1 text-sm text-muted-foreground">Run a safe simulation against current tutor profiles. It checks eligibility and email preferences without sending email or changing accounts.</p>
        <button type="button" onClick={runPreview} disabled={testing} className="mt-3 rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{testing?'Running test…':'Run safe COO test'}</button>
        {preview && <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3" role="status">
          <p>Checked: <strong>{preview.checked}</strong></p>
          <p>Eligible: <strong>{preview.eligible}</strong></p>
          <p>No permission: <strong>{preview.no_consent}</strong></p>
          <p>Too new: <strong>{preview.too_new}</strong></p>
          <p>Profiles complete: <strong>{preview.complete}</strong></p>
          <p>Emails sent: <strong>{preview.send_count}</strong></p>
          <p className="sm:col-span-3 text-muted-foreground">Simulation only. No messages were sent.</p>
        </div>}
      </div>
      {report ? <div className="mt-3 grid gap-3 sm:grid-cols-3"><p>Sending: <strong>{report.email_enabled ? 'Enabled' : 'Disabled'}</strong></p><p>Today: <strong>{report.used_today} / {report.daily_limit}</strong></p><p>Report day: <strong>{report.report_date}</strong></p><p className="sm:col-span-3 text-sm">Last 7 days: {Object.entries(report.last_7_days || {}).map(([status,count])=>`${status}: ${count}`).join(' · ') || 'No activity recorded'}</p></div> : <p className="mt-3 text-sm text-muted-foreground">{reportError || 'Loading protected COO activity report…'}</p>}
      {report?.daily_reports?.length > 0 && <div className="mt-4 overflow-x-auto">
        <h3 className="font-semibold mb-2">Recorded daily executive reports</h3>
        <table className="w-full text-sm text-left"><thead><tr className="border-b"><th className="py-2 pr-4">Date (SAST)</th><th className="pr-4">Attempts</th><th className="pr-4">Accepted</th><th className="pr-4">Delivered</th><th className="pr-4">Failed</th><th className="pr-4">Bounced</th><th>Suppressed</th></tr></thead>
        <tbody>{report.daily_reports.map(day=><tr className="border-b" key={day.report_date}><td className="py-2 pr-4">{day.report_date}</td><td>{day.attempted}</td><td>{day.accepted}</td><td>{day.delivered}</td><td>{day.failed}</td><td>{day.bounced}</td><td>{day.suppressed}</td></tr>)}</tbody></table>
      </div>}
      <p className="mt-2 text-xs text-muted-foreground">Provider accepted is not the same as delivered. Sending remains subject to server-side permission rules.</p>
    </section>
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-xl font-semibold">Account review workflow</h2>
      <p className="mt-2 text-sm">Existing accounts: baseline review. Incoming accounts: automated follow-up checks after 48 hours. The COO only sends when the server-side switch is enabled and the tutor has opted into profile reminder emails.</p>
      <p className="mt-3 text-sm">Email attempts are limited to 25 per South African day, with a 72-hour cooldown, signed delivery webhooks and recorded outcomes. Other executive portfolios remain in configuration preview.</p>
      <Link to="/admin" className="mt-4 inline-block underline">Return to admin dashboard</Link>
    </section>
  </main>;
}
