import { useState } from 'react';
import useParentLinks from '@/hooks/useParentLinks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Shared by the parent dashboard, reports and the learner's consent screen.
export default function ParentChildLink({ user }) {
  const [email, setEmail] = useState('');
  const { links, loading, error, refresh, request, respond, busy } = useParentLinks(user);
  const parent = user?.role === 'parent';
  const act = async (id, decision) => {
    try { await respond(id, decision); toast.success(decision === 'approved' ? 'Report access approved.' : 'Report access removed.'); }
    catch (failure) { toast.error(failure.message); }
  };
  const invite = async event => {
    event.preventDefault();
    try { await request(email.trim()); setEmail(''); toast.success('If the learner account is eligible, the request will appear on their dashboard.'); }
    catch (failure) { toast.error(failure.message); }
  };
  return <Card className="mb-4">
    <CardHeader><CardTitle className="text-base">{parent ? 'Learner report access' : 'Parent report requests'}</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">The learner must approve access to study progress, quiz results and booking reports. Either person can remove access.</p>
      {parent && <form onSubmit={invite} className="space-y-2">
        <Label htmlFor="link-learner-email">Learner's email</Label>
        <Input id="link-learner-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} />
        <Button type="submit" disabled={busy || !email.trim()}>Request report access</Button>
      </form>}
      {loading && <p>Loading requests…</p>}
      {error && <div role="alert">Requests could not load. <Button variant="outline" onClick={() => refresh()}>Retry</Button></div>}
      {!loading && !error && links.length === 0 && <p className="text-sm">No report requests.</p>}
      {links.map(link => <div key={link.id} className="border rounded-lg p-3 space-y-2">
        <p>{parent ? link.student_email : link.parent_email} <Badge variant="outline">{link.status}</Badge></p>
        {!parent && link.status === 'pending' && <Button disabled={busy} onClick={() => act(link.id, 'approved')}>Approve report access</Button>}
        {link.status !== 'revoked' && <Button variant="outline" disabled={busy} onClick={() => act(link.id, 'revoked')}>{link.status === 'pending' ? 'Decline request' : 'Remove report access'}</Button>}
      </div>)}
    </CardContent>
  </Card>;
}
