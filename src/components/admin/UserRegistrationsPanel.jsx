import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, AlertTriangle, Search, RefreshCw, Users, GraduationCap, Shield, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

const ROLE_LABELS = {
  user: { label: 'Unregistered', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  student: { label: 'Student', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: GraduationCap },
  parent: { label: 'Parent', color: 'bg-green-100 text-green-700 border-green-200', icon: Users },
  tutor_pending: { label: 'Tutor — Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
  sace_tutor: { label: 'SACE Tutor', color: 'bg-primary/10 text-primary border-primary/20', icon: Shield },
  student_tutor: { label: 'Student Tutor', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: UserCheck },
  admin: { label: 'Admin', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Shield },
};

function roleMeta(role) {
  return ROLE_LABELS[role] || { label: role, color: 'bg-muted text-muted-foreground', icon: Users };
}

export default function UserRegistrationsPanel() {
  const [users, setUsers] = useState([]);
  const [tutorProfiles, setTutorProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [processingId, setProcessingId] = useState(null);
  const [rejectingUserId, setRejectingUserId] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load users from Supabase
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (usersError) throw usersError;
      
      // Load tutor profiles from Supabase
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutor_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (tutorError) throw tutorError;
      
      setUsers(usersData || []);
      setTutorProfiles(tutorData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Approve a user by setting their role properly (for 'user' role stuck users)
  const approveAsRole = async (u, role) => {
    setProcessingId(u.id + role);
    try {
      // Update user role in Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          role, 
          onboarding_complete: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', u.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role, onboarding_complete: true } : x));
      
      // Send approval email via Supabase Edge Function
      const { error: fnError } = await supabase.functions.invoke('notify-user-approved', {
        body: { email: u.email, full_name: u.full_name, role }
      });
      
      if (fnError) console.error('Email notification error:', fnError);
      
      toast.success(`${u.full_name || u.email} approved as ${role}. Approval email sent.`);
    } catch (err) {
      console.error('Approve error:', err);
      toast.error(`Failed to approve: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Verify a pending tutor
  const verifyTutor = async (u) => {
    setProcessingId(u.id + 'verify');
    try {
      const profile = tutorProfiles.find(p => p.user_email === u.email);
      
      if (profile) {
        // Update tutor profile verification status
        const { error: profileError } = await supabase
          .from('tutor_profiles')
          .update({ 
            is_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);
        
        if (profileError) throw profileError;
        
        setTutorProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, is_verified: true } : p));
      }
      
      // Determine new role based on qualifications
      const newRole = profile?.qualifications?.includes('SACE') ? 'sace_tutor' : 'student_tutor';
      
      // Update user role
      const { error: userError } = await supabase
        .from('user_profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', u.id);
      
      if (userError) throw userError;
      
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
      
      // Send approval email via Supabase Edge Function
      const { error: fnError } = await supabase.functions.invoke('notify-user-approved', {
        body: { email: u.email, full_name: u.full_name, role: newRole }
      });
      
      if (fnError) console.error('Email notification error:', fnError);
      
      toast.success(`${u.full_name || u.email} verified as tutor! Approval email sent.`);
    } catch (err) {
      console.error('Verify error:', err);
      toast.error(`Failed to verify tutor: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Reject / remove a stuck user (reset to user role) and send rejection email
  const rejectUser = async (u) => {
    const reason = rejectionReasons[u.id]?.trim() || '';
    setProcessingId(u.id + 'reject');
    try {
      // Reset user role to 'user' and onboarding to false
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          role: 'user', 
          onboarding_complete: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', u.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: 'user', onboarding_complete: false } : x));
      
      // Send rejection email with reason via Supabase Edge Function
      const { error: fnError } = await supabase.functions.invoke('notify-user-rejected', {
        body: { email: u.email, full_name: u.full_name, reason }
      });
      
      if (fnError) console.error('Email notification error:', fnError);
      
      setRejectingUserId(null);
      setRejectionReasons(prev => { const n = { ...prev }; delete n[u.id]; return n; });
      toast.error(`${u.full_name || u.email} rejected. Rejection email sent.`);
    } catch (err) {
      console.error('Reject error:', err);
      toast.error(`Failed to reject: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (filter === 'stuck') return u.role === 'user';
    if (filter === 'pending_tutor') return u.role === 'tutor_pending';
    if (filter === 'student') return u.role === 'student';
    if (filter === 'parent') return u.role === 'parent';
    if (filter === 'tutor') return ['sace_tutor', 'student_tutor'].includes(u.role);
    return true;
  });

  const counts = {
    stuck: users.filter(u => u.role === 'user').length,
    pending_tutor: users.filter(u => u.role === 'tutor_pending').length,
    student: users.filter(u => u.role === 'student').length,
    parent: users.filter(u => u.role === 'parent').length,
    tutor: users.filter(u => ['sace_tutor', 'student_tutor'].includes(u.role)).length,
  };

  const FILTERS = [
    { key: 'all', label: `All (${users.length})` },
    { key: 'stuck', label: `⚠️ Stuck / No Role (${counts.stuck})` },
    { key: 'pending_tutor', label: `🕐 Pending Tutors (${counts.pending_tutor})` },
    { key: 'student', label: `Students (${counts.student})` },
    { key: 'parent', label: `Parents (${counts.parent})` },
    { key: 'tutor', label: `Tutors (${counts.tutor})` },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert banner for stuck users */}
      {counts.stuck > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">{counts.stuck} user(s) stuck with no role</p>
            <p className="text-xs text-red-700 mt-0.5">These users registered but never completed onboarding. You can manually assign them a role below or reset them so they see the onboarding form again on next login.</p>
          </div>
        </div>
      )}
      {counts.pending_tutor > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">{counts.pending_tutor} tutor(s) awaiting verification</p>
            <p className="text-xs text-amber-700 mt-0.5">Review their credentials below and click Verify to activate their tutor profile.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-playfair">User Registrations</CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={load} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 text-sm"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filter === f.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-10 text-sm">No users match this filter.</p>
            )}
            {filtered.map(u => {
              const meta = roleMeta(u.role);
              const Icon = meta.icon;
              const profile = tutorProfiles.find(p => p.user_email === u.email);
              const isVerifiedTutor = profile?.is_verified === true;
              const isPendingTutor = u.role === 'tutor_pending';
              const isStuck = u.role === 'user';

              return (
                <div key={u.id} className={`rounded-xl border p-4 ${isStuck ? 'border-red-200 bg-red-50/30' : isPendingTutor ? 'border-amber-200 bg-amber-50/30' : 'border-border bg-card'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Avatar + info */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                      {(u.full_name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <p className="font-semibold text-sm">{u.full_name || '(No name)'}</p>
                        <Badge variant="outline" className={`text-xs ${meta.color}`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {meta.label}
                        </Badge>
                        {isVerifiedTutor && (
                          <Badge className="bg-green-100 text-green-700 text-xs">✓ Verified</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString('en-ZA') : '—'}
                        {' '} · Onboarding: {u.onboarding_complete ? '✅ Complete' : '❌ Incomplete'}
                      </p>
                      {/* Tutor credentials */}
                      {profile && (
                        <div className="mt-1.5 text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-1.5 space-y-0.5">
                          {profile.sace_number && <p>SACE #: <span className="font-mono font-medium text-foreground">{profile.sace_number}</span></p>}
                          {profile.qualifications && <p>Qualifications: <span className="font-medium text-foreground">{profile.qualifications}</span></p>}
                          {profile.subjects?.length > 0 && <p>Subjects: {profile.subjects.join(', ')}</p>}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      {/* Stuck user — manual role assignment */}
                      {isStuck && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                            disabled={!!processingId} onClick={() => approveAsRole(u, 'student')}>
                            Set Student
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-green-700 border-green-200 hover:bg-green-50"
                            disabled={!!processingId} onClick={() => approveAsRole(u, 'parent')}>
                            Set Parent
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                            disabled={!!processingId} onClick={() => approveAsRole(u, 'tutor_pending')}>
                            Set Tutor
                          </Button>
                        </>
                      )}
                      {/* Pending tutor — verify or reject */}
                      {isPendingTutor && !isVerifiedTutor && (
                        <Button size="sm" className="h-7 px-3 text-xs bg-primary gap-1"
                          disabled={processingId === u.id + 'verify'} onClick={() => verifyTutor(u)}>
                          <CheckCircle className="w-3 h-3" />
                          {processingId === u.id + 'verify' ? 'Verifying…' : 'Verify & Activate'}
                        </Button>
                      )}
                      {/* Reject / Reset any non-admin user */}
                      {u.role !== 'admin' && rejectingUserId !== u.id && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-700 border-red-200 hover:bg-red-50"
                          disabled={!!processingId} onClick={() => setRejectingUserId(u.id)}>
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Inline rejection reason form */}
                  {rejectingUserId === u.id && (
                    <div className="mt-3 pt-3 border-t border-red-200 space-y-2">
                      <p className="text-xs font-medium text-red-700">Reason for rejection (will be emailed to the user):</p>
                      <Textarea
                        className="text-xs min-h-[70px] border-red-200 focus-visible:ring-red-300"
                        placeholder="e.g. We could not verify your SACE registration number. Please re-register with a valid number."
                        value={rejectionReasons[u.id] || ''}
                        onChange={e => setRejectionReasons(prev => ({ ...prev, [u.id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 px-3 text-xs bg-red-600 hover:bg-red-700 gap-1"
                          disabled={processingId === u.id + 'reject'} onClick={() => rejectUser(u)}>
                          <XCircle className="w-3 h-3" />
                          {processingId === u.id + 'reject' ? 'Rejecting…' : 'Confirm Rejection & Send Email'}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-3 text-xs"
                          onClick={() => { setRejectingUserId(null); setRejectionReasons(prev => { const n = { ...prev }; delete n[u.id]; return n; }); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}