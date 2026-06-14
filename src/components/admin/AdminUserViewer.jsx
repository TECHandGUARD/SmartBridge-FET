import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ExternalLink, Star, Clock, Gift, Shield, X, User, Mail, Calendar, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const ROLE_DASHBOARD_PATHS = {
  student: '/student-dashboard',
  parent: '/parent-dashboard',
  sace_tutor: '/tutor-dashboard',
  student_tutor: '/tutor-dashboard',
  school_counselor: '/counselor',
  admin: '/admin',
};

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

function getTrialStatus(user) {
  const trialStart = user.trial_started_at
    ? new Date(user.trial_started_at)
    : user.created_at
      ? new Date(user.created_at)
      : null;
  if (!trialStart) return null;
  const msLeft = TRIAL_MS - (Date.now() - trialStart.getTime());
  if (msLeft <= 0) return { active: false, daysLeft: 0 };
  return { active: true, daysLeft: Math.ceil(msLeft / (24 * 60 * 60 * 1000)) };
}

export default function AdminUserViewer({ users, subscriptions }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [updatingTrial, setUpdatingTrial] = useState(false);
  const [updatingSub, setUpdatingSub] = useState(false);

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const getUserSub = (email) => subscriptions.find(s => s.user_email === email && s.status === 'active');

  const handleGrantTrial = async (selectedUser) => {
    setUpdatingTrial(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ trial_started_at: new Date().toISOString() })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      setSelected(prev => ({ ...prev, trial_started_at: new Date().toISOString() }));
      toast.success(`3-day trial granted to ${selectedUser.full_name || selectedUser.email}`);
    } catch (err) {
      console.error('Failed to grant trial:', err);
      toast.error('Failed to grant trial: ' + err.message);
    } finally {
      setUpdatingTrial(false);
    }
  };

  const handleRevokeTrial = async (selectedUser) => {
    setUpdatingTrial(true);
    try {
      const pastDate = new Date(Date.now() - TRIAL_MS - 1000).toISOString();
      const { error } = await supabase
        .from('user_profiles')
        .update({ trial_started_at: pastDate })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      setSelected(prev => ({ ...prev, trial_started_at: pastDate }));
      toast.success(`Trial revoked for ${selectedUser.full_name || selectedUser.email}`);
    } catch (err) {
      console.error('Failed to revoke trial:', err);
      toast.error('Failed to revoke trial: ' + err.message);
    } finally {
      setUpdatingTrial(false);
    }
  };

  const handleGrantPremium = async (selectedUser) => {
    setUpdatingSub(true);
    try {
      const existing = getUserSub(selectedUser.email);
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      
      if (existing) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            end_date: end.toISOString().split('T')[0],
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            user_email: selectedUser.email,
            plan_type: 'premium',
            status: 'active',
            amount_paid: 0,
            start_date: new Date().toISOString().split('T')[0],
            end_date: end.toISOString().split('T')[0],
          });
        
        if (error) throw error;
      }
      
      toast.success(`Premium activated for ${selectedUser.full_name || selectedUser.email}`);
    } catch (err) {
      console.error('Failed to activate premium:', err);
      toast.error('Failed to activate premium: ' + err.message);
    } finally {
      setUpdatingSub(false);
    }
  };

  const handleRevokePremium = async (selectedUser) => {
    setUpdatingSub(true);
    try {
      const existing = getUserSub(selectedUser.email);
      if (existing) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', existing.id);
        
        if (error) throw error;
      }
      toast.success(`Premium revoked for ${selectedUser.full_name || selectedUser.email}`);
    } catch (err) {
      console.error('Failed to revoke premium:', err);
      toast.error('Failed to revoke premium: ' + err.message);
    } finally {
      setUpdatingSub(false);
    }
  };

  const selectedSub = selected ? getUserSub(selected.email) : null;
  const selectedTrial = selected ? getTrialStatus(selected) : null;
  const hasPremiumSub = !!selectedSub;
  const isOnTrial = !hasPremiumSub && selectedTrial?.active;
  const dashPath = selected ? (ROLE_DASHBOARD_PATHS[selected.role] || '/student-dashboard') : null;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* User list */}
        <div className="lg:col-span-2 space-y-1 max-h-[600px] overflow-y-auto pr-1">
          {filtered.map(u => {
            const sub = getUserSub(u.email);
            const trial = getTrialStatus(u);
            return (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-muted/50 ${selected?.id === u.id ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0 text-sm">
                  {u.full_name?.[0] || u.email?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name || '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge variant="outline" className="text-[10px] capitalize">{u.role || 'user'}</Badge>
                  {sub?.plan_type === 'premium' && sub?.status === 'active' && (
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">Premium</Badge>
                  )}
                  {!sub && trial?.active && <Badge className="bg-blue-100 text-blue-700 text-[10px]">Trial</Badge>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No users found.</p>
          )}
        </div>

        {/* User detail panel */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="h-full flex items-center justify-center border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground">
              <div>
                <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select a user to view their details</p>
              </div>
            </div>
          ) : (
            <Card className="h-full">
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {selected.full_name?.[0] || selected.email?.[0] || '?'}
                  </div>
                  <div>
                    <CardTitle className="font-playfair text-lg">{selected.full_name || '—'}</CardTitle>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-xs capitalize">{selected.role || 'user'}</Badge>
                      {hasPremiumSub && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                          <Star className="w-3 h-3 mr-1" />Premium
                        </Badge>
                      )}
                      {isOnTrial && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          <Clock className="w-3 h-3 mr-1" />Trial ({selectedTrial.daysLeft}d left)
                        </Badge>
                      )}
                      {selected.role === 'admin' && (
                        <Badge className="bg-slate-100 text-slate-700 text-xs">
                          <Shield className="w-3 h-3 mr-1" />Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate text-xs">{selected.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">
                      Joined {selected.created_at ? new Date(selected.created_at).toLocaleDateString('en-ZA') : '—'}
                    </span>
                  </div>
                  {selectedSub && (
                    <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                      <span className="font-semibold text-amber-800">Active Premium Sub:</span>
                      <span className="text-amber-700 ml-1">
                        R{selectedSub.amount_paid || 0} • Expires {selectedSub.end_date || '—'}
                      </span>
                    </div>
                  )}
                  {selected.trial_started_at && (
                    <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                      <span className="font-semibold text-blue-800">Trial started:</span>
                      <span className="text-blue-700 ml-1">
                        {new Date(selected.trial_started_at).toLocaleString('en-ZA')}
                      </span>
                      {selectedTrial && !selectedTrial.active && <span className="text-red-600 ml-2">(Expired)</span>}
                    </div>
                  )}
                </div>

                {/* Dashboard link */}
                <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">View Their Dashboard</p>
                    <p className="text-xs text-muted-foreground">Opens their role-based dashboard</p>
                  </div>
                  <Link to={dashPath}>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                      <ExternalLink className="w-3.5 h-3.5" /> Open
                    </Button>
                  </Link>
                </div>

                {/* Quick page links */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Quick Links</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Student Dashboard', path: '/student-dashboard' },
                      { label: 'Tutor Dashboard', path: '/tutor-dashboard' },
                      { label: 'Parent Dashboard', path: '/parent-dashboard' },
                      { label: 'Opportunities', path: '/opportunities' },
                      { label: 'Bookings', path: '/bookings' },
                      { label: 'Videos', path: '/videos' },
                      { label: 'Resources', path: '/search' },
                    ].map(({ label, path }) => (
                      <Link key={path} to={path}>
                        <Badge variant="outline" className="text-xs hover:bg-primary/10 cursor-pointer transition-colors">
                          {label}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Trial management */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-blue-600" /> Trial Management
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => handleGrantTrial(selected)}
                      disabled={updatingTrial}
                    >
                      <Clock className="w-3.5 h-3.5" /> Grant / Reset 3-Day Trial
                    </Button>
                    {selectedTrial?.active && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => handleRevokeTrial(selected)}
                        disabled={updatingTrial}
                      >
                        <X className="w-3.5 h-3.5" /> Revoke Trial
                      </Button>
                    )}
                  </div>
                </div>

                {/* Premium management */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" /> Premium Management
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {!hasPremiumSub && (
                      <Button
                        size="sm"
                        className="text-xs gap-1.5 bg-amber-500 hover:bg-amber-600"
                        onClick={() => handleGrantPremium(selected)}
                        disabled={updatingSub}
                      >
                        <Star className="w-3.5 h-3.5" /> Grant Premium (1 month)
                      </Button>
                    )}
                    {hasPremiumSub && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => handleRevokePremium(selected)}
                        disabled={updatingSub}
                      >
                        <X className="w-3.5 h-3.5" /> Revoke Premium
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}