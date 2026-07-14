import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Shield, GraduationCap, X, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

function timeSince(dateStr) {
  if (!dateStr) return 'just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminAlertBell() {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('edu_dismissed_alerts') || '[]'); }
    catch { return []; }
  });
  const panelRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Initial load — fetch unverified profiles
  useEffect(() => {
    loadUnverifiedProfiles();
  }, []);

  const loadUnverifiedProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('is_verified', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading unverified profiles:', error);
    }
  };

  // Real-time subscription
  useEffect(() => {
    // Set up real-time subscription for tutor_profiles
    const channel = supabase
      .channel('admin-alerts-tutor-profiles')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tutor_profiles',
        },
        (payload) => {
          const newProfile = payload.new;
          if (!newProfile.is_verified) {
            setAlerts(prev => [newProfile, ...prev]);
            
            // Pop a toast immediately
            toast.warning(
              `🆕 New tutor application — ${newProfile.full_name || 'Unknown'}`,
              {
                description: `${newProfile.sace_number ? 'SACE Tutor' : 'Student Tutor'} · ${newProfile.user_email}`,
                duration: 8000,
                action: {
                  label: 'Review',
                  onClick: () => { window.location.href = '/admin'; },
                },
              }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tutor_profiles',
        },
        (payload) => {
          const updatedProfile = payload.new;
          if (updatedProfile.is_verified) {
            // Remove from alerts once verified
            setAlerts(prev => prev.filter(t => t.id !== updatedProfile.id));
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const saveDismissed = (ids) => {
    setDismissed(ids);
    localStorage.setItem('edu_dismissed_alerts', JSON.stringify(ids));
  };

  const dismissAlert = (id, e) => {
    e.stopPropagation();
    saveDismissed([...dismissed, id]);
  };

  const dismissAll = () => saveDismissed(alerts.map(a => a.id));

  const visibleAlerts = alerts.filter(a => !dismissed.includes(a.id));
  const count = visibleAlerts.length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-muted transition-colors"
        aria-label="Tutor alerts"
      >
        <Bell className={`w-5 h-5 ${count > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Pending Tutor Applications</span>
              {count > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{count}</Badge>}
            </div>
            {count > 0 && (
              <button onClick={dismissAll} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Clear all
              </button>
            )}
          </div>

          {/* Alert list */}
          <div className="max-h-80 overflow-y-auto">
            {visibleAlerts.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pending applications</p>
              </div>
            ) : (
              visibleAlerts.map(alert => {
                const isSACE = !!alert.sace_number;
                return (
                  <div key={alert.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm flex-shrink-0 mt-0.5">
                      {alert.full_name?.[0] || 'T'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.full_name || '(No name)'}</p>
                      <p className="text-xs text-muted-foreground truncate">{alert.user_email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isSACE ? 'border-primary/30 text-primary' : 'border-purple-300 text-purple-700'}`}>
                          {isSACE ? <><Shield className="w-2.5 h-2.5 mr-0.5 inline" />SACE</> : <><GraduationCap className="w-2.5 h-2.5 mr-0.5 inline" />Student</>}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{timeSince(alert.created_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => dismissAlert(alert.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {visibleAlerts.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <Link to="/admin" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full bg-primary text-xs gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Go to Verification Dashboard
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
