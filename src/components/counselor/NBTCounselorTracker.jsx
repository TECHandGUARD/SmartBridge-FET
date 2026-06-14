import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ClipboardList, CheckCircle2, Clock, XCircle, Trophy,
  RefreshCw, FileText, AlertCircle, Send, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  registered:  { label: 'Registered',  color: 'bg-blue-100 text-blue-700',   icon: <Clock className="w-3 h-3" /> },
  confirmed:   { label: 'Confirmed',   color: 'bg-primary/10 text-primary',  icon: <CheckCircle2 className="w-3 h-3" /> },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:   { label: 'Cancelled',   color: 'bg-red-100 text-red-700',     icon: <XCircle className="w-3 h-3" /> },
};

const BAND_COLORS = {
  Proficient: 'bg-green-100 text-green-700',
  Intermediate: 'bg-yellow-100 text-yellow-700',
  Basic: 'bg-red-100 text-red-700',
};

export default function NBTCounselorTracker({ studentEmails = [] }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('nbt_registrations')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filter by student emails if provided
      if (studentEmails.length > 0) {
        query = query.in('student_email', studentEmails);
      }
      
      const { data, error } = await query.limit(200);
      
      if (error) throw error;
      setRegistrations(data || []);
    } catch (err) {
      console.error('Failed to load NBT registrations:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [studentEmails]);

  useEffect(() => { 
    load(); 
  }, [load]);

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-nbt-reminders', {
        body: {}
      });
      
      if (error) throw error;
      
      toast.success(`Reminders sent: ${data?.reminders_sent || 0} students notified about upcoming tests.`);
      await load();
    } catch (err) {
      console.error('Failed to send reminders:', err);
      toast.error(`Failed to send reminders: ${err.message}`);
    } finally {
      setSendingReminders(false);
    }
  };

  // Stats
  const total = registrations.length;
  const completed = registrations.filter(r => r.status === 'completed').length;
  const withResults = registrations.filter(r => r.results_uploaded).length;
  const upcoming = registrations.filter(r => {
    const d = Math.ceil((new Date(r.test_date) - new Date()) / 86400000);
    return d >= 0 && d <= 7 && r.status !== 'cancelled';
  }).length;

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-playfair text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            NBT Registration Tracker
            {upcoming > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{upcoming} test{upcoming !== 1 ? 's' : ''} this week</Badge>}
          </CardTitle>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={load} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" disabled={sendingReminders} onClick={handleSendReminders}>
              {sendingReminders
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                : <><Send className="w-3.5 h-3.5" /> Send Reminders</>}
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[
            { label: 'Registered', value: total, color: 'text-blue-600' },
            { label: 'Completed', value: completed, color: 'text-green-600' },
            { label: 'Results In', value: withResults, color: 'text-primary' },
            { label: 'This Week', value: upcoming, color: 'text-amber-600' },
          ].map(k => (
            <div key={k.label} className="text-center bg-muted/40 rounded-lg py-2">
              <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
              <div className="text-[10px] text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {registrations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No NBT registrations found for your students.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {registrations.map(reg => {
              const cfg = STATUS_CONFIG[reg.status] || STATUS_CONFIG.registered;
              const daysUntil = Math.ceil((new Date(reg.test_date) - new Date()) / 86400000);
              const isPast = daysUntil < 0;

              return (
                <div key={reg.id} className="border rounded-xl p-3 bg-card">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold truncate">{reg.student_name || reg.student_email}</p>
                        <Badge className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0 ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </Badge>
                        {reg.results_uploaded && reg.overall_band && (
                          <Badge className={`text-[10px] px-1.5 py-0 ${BAND_COLORS[reg.overall_band] || 'bg-muted text-muted-foreground'}`}>
                            <Trophy className="w-2.5 h-2.5 mr-0.5" /> {reg.overall_band}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {new Date(reg.test_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} · {reg.venue}, {reg.city}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-1">
                        {(reg.tests_registered || []).map(t => (
                          <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                        ))}
                      </div>

                      {!isPast && daysUntil <= 7 && reg.status !== 'cancelled' && (
                        <p className="text-[11px] text-amber-600 font-medium mt-0.5 flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" /> Test in {daysUntil === 0 ? 'today' : `${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
                        </p>
                      )}

                      {reg.results_uploaded && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {reg.aql_score != null && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">AQL: {reg.aql_score}%</span>}
                          {reg.mat_score != null && <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">MAT: {reg.mat_score}%</span>}
                          {reg.ql_score != null && <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded">QL: {reg.ql_score}%</span>}
                          {reg.results_file_url && (
                            <a href={reg.results_file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                              <FileText className="w-2.5 h-2.5" /> Results PDF
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}