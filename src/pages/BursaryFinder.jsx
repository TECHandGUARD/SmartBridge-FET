import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, CalendarDays, ExternalLink, Search } from 'lucide-react';
import { formatOpportunityDate, opportunityStatus } from '@/lib/opportunity-dates';

export default function BursaryFinder() {
  const [bursaries, setBursaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const load = async () => {
    setLoading(true); setError('');
    const { data, error: failure } = await supabase.from('bursaries').select('*').eq('is_active', true).order('deadline');
    if (failure) setError('We could not load funding opportunities. Please try again.');
    else setBursaries(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const filtered = bursaries.filter(b => (status === 'all' || opportunityStatus(b) === status) && `${b.name} ${b.provider} ${(b.fields_of_study || []).join(' ')} ${b.description || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="min-h-screen bg-[#f7f8f4] pb-16">
    <header className="bg-[#103c34] text-white px-5 py-10"><div className="max-w-5xl mx-auto">
      <BookOpen className="mb-4 text-amber-200" /><p className="text-xs uppercase tracking-widest text-amber-200">SmartBridge FET · Your next chapter</p>
      <h1 className="font-playfair text-3xl sm:text-4xl mt-3">Find funding for your future.</h1>
      <p className="max-w-xl text-sm leading-6 mt-4 text-emerald-50">Explore real bursaries, compare closing dates and apply directly with the funder. Keep closed rounds visible to plan ahead.</p>
    </div></header>
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <p className="text-sm text-muted-foreground">Dates use South African time. “Open” means within the published application window; funding and eligibility are decided by the provider. Check its notice before applying.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input aria-label="Search bursaries" className="pl-10 bg-white" placeholder="Search a subject, funder or bursary" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <select aria-label="Application status" className="rounded-md border bg-white p-2 text-sm" value={status} onChange={e => setStatus(e.target.value)}>{['all','Open','Closed','Opening soon','Dates unconfirmed'].map(s => <option key={s} value={s}>{s === 'all' ? 'All application windows' : s}</option>)}</select>
      </div>
      {loading && <p role="status">Loading opportunities…</p>}
      {error && <div role="alert">{error} <Button variant="outline" onClick={load}>Retry</Button></div>}
      {!loading && !error && <p role="status" className="text-sm text-muted-foreground">{filtered.length} funding opportunities</p>}
      {!loading && !error && filtered.length === 0 && <p>No opportunities match these filters. Try another subject or application status.</p>}
      <div className="grid md:grid-cols-2 gap-4">{filtered.map(b => {
        const state = opportunityStatus(b);
        return <Card key={b.id} className="rounded-2xl border-emerald-900/10 bg-white shadow-sm"><CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-muted-foreground">{b.provider} · {b.academic_year || 'See provider'} intake</p><Badge variant={state === 'Open' ? 'default' : 'secondary'}>{state}</Badge></div>
          <h2 className="font-playfair text-xl">{b.name}</h2><p className="text-sm leading-6">{b.description}</p>
          <div className="bg-emerald-50 rounded-xl p-3 text-sm space-y-1"><p className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Opens: {formatOpportunityDate(b.metadata?.opens_on)}</p><p className="font-semibold">Closes: {formatOpportunityDate(b.deadline)}</p>{b.metadata?.returning_deadline && <p>Returning bursars: {formatOpportunityDate(b.metadata.returning_deadline)}</p>}</div>
          <div className="flex flex-wrap gap-1">{(b.fields_of_study || []).map(f => <Badge key={f} variant="outline" className="whitespace-normal">{f}</Badge>)}</div>
          {b.covers && <p className="text-sm"><strong>Support:</strong> {b.covers}</p>}
          <p className="text-xs text-muted-foreground">Source checked {formatOpportunityDate(b.metadata?.verified_on)}. {b.metadata?.eligibility_note}</p>
          <a className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4" href={b.metadata?.source_url || b.apply_link} target="_blank" rel="noopener noreferrer">Read official notice <ExternalLink className="w-4 h-4" /></a>
          {state === 'Open' && <a className="block" href={b.apply_link} target="_blank" rel="noopener noreferrer"><Button className="w-full">Apply on the official site <ExternalLink className="ml-2 w-4 h-4" /></Button></a>}
          {state === 'Closed' && <p className="text-xs text-muted-foreground">This application round has closed. Future dates will be listed once officially published.</p>}
        </CardContent></Card>;
      })}</div>
    </div>
  </main>;
}
