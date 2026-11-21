import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';

/** @typedef {{awaiting_payout: number, payouts_recorded: number, eligible_sessions: number}} Earnings */

const rand = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

export default function TutorEarningsDashboard({ user }) {
  const earnings = useQuery({
    queryKey: ['tutor-earnings', user.id],
    refetchOnWindowFocus: true,
    async queryFn({ signal }) {
      const { data, error } = await supabase.rpc('my_tutor_earnings').abortSignal(signal).maybeSingle();
      if (error) throw error;
      return /** @type {Earnings | null} */ (data);
    },
  });

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Wallet className="size-5 text-primary" aria-hidden="true" />
        Earnings and payouts
      </CardTitle>
      <CardDescription>Net earnings from completed sessions with a confirmed live payment.</CardDescription>
    </CardHeader>
    <CardContent>
      {earnings.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">Loading earnings…</p>
      ) : earnings.isError ? (
        <div className="space-y-3">
          <p role="alert">Unable to load your earnings.</p>
          <Button variant="outline" onClick={() => earnings.refetch()}>Try again</Button>
        </div>
      ) : !earnings.data ? (
        <p className="text-sm text-muted-foreground">This summary is available to verified tutors.</p>
      ) : (
        <div className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/60 p-4">
              <dt className="text-sm text-muted-foreground">Awaiting payout</dt>
              <dd className="mt-2 text-2xl font-semibold tabular-nums">{rand.format(earnings.data.awaiting_payout)}</dd>
            </div>
            <div className="rounded-xl bg-muted/60 p-4">
              <dt className="text-sm text-muted-foreground">Payouts recorded</dt>
              <dd className="mt-2 text-2xl font-semibold tabular-nums">{rand.format(earnings.data.payouts_recorded)}</dd>
            </div>
          </dl>
          {Number(earnings.data.eligible_sessions) === 0 && (
            <p className="text-sm text-muted-foreground">Your eligible sessions will appear here after completion.</p>
          )}
        </div>
      )}
    </CardContent>
  </Card>;
}
