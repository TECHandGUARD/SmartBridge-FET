import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, XCircle, Clock, ExternalLink, Shield,
  GraduationCap, RefreshCw, AlertTriangle, UserPlus, User
} from 'lucide-react';
import { toast } from 'sonner';

const ADMIN_EMAILS = ['aneleq@techandguard.co.za', 'aneleqamata95@gmail.com'];

function timeSince(dateStr) {
  if (!dateStr) return 'Just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// Send approval email to tutor
const sendTutorApprovalEmail = async (tutor) => {
  const isSACE = !!tutor.sace_number;
  const tutorType = isSACE ? 'SACE Registered Tutor' : 'Student Tutor';
  
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: tutor.user_email,
        subject: `✅ Your EduConnect Tutor Profile is Verified!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0F766E;">🎉 Welcome to the Tutor Network!</h2>
            <p>Dear <strong>${tutor.full_name}</strong>,</p>
            <p>Great news! Your tutor profile on EduConnect FET has been <strong style="color: #16a34a;">verified and approved</strong> by our admin team.</p>
            
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 10px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #166534;">✅ Verification Details</h3>
              <p>• Account Type: <strong>${tutorType}</strong></p>
              ${isSACE ? `<p>• SACE Number: <strong>${tutor.sace_number}</strong></p>` : ''}
              <p>• Verification Date: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <h3>🎓 What You Can Do Now:</h3>
            <ul style="padding-left: 20px;">
              <li>Accept booking requests from students</li>
              <li>Upload study resources to share with learners</li>
              <li>Set your availability calendar</li>
              <li>Earn through tutoring sessions</li>
              <li>Get featured in the tutor directory</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${window.location.origin}/tutor-dashboard" 
                 style="background-color: #0F766E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                🚀 Go to Your Dashboard
              </a>
            </div>
            
            <hr style="margin: 20px 0; border-color: #e5e7eb;">
            
            <p style="font-size: 11px; color: #999; text-align: center;">
              — EduConnect FET / Tech &amp; GUARD Pty Ltd<br>
              <a href="${window.location.origin}" style="color: #0F766E;">${window.location.origin}</a>
            </p>
          </div>
        `,
      },
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to send tutor approval email:', error);
    return { success: false, error };
  }
};

export default function TutorVerificationHub() {
  const [pendingProfiles, setPendingProfiles] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualCreds, setManualCreds] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all tutor profiles
      const { data: allProfiles, error: profilesError } = await supabase
        .from('tutor_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user profiles
      const { data: allUsers, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Filter unverified profiles
      const unverifiedProfiles = (allProfiles || []).filter(t => !t.is_verified);
      
      // Get emails that have tutor profiles
      const profileEmails = new Set((allProfiles || []).map(p => p.user_email));
      
      // Find users stuck as tutor_pending without a profile
      const orphanedPending = (allUsers || []).filter(
        u => u.role === 'tutor_pending' && !profileEmails.has(u.email)
      );

      setPendingProfiles(unverifiedProfiles);
      setPendingUsers(orphanedPending);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading tutor data:', error);
      toast.error('Failed to load pending tutors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleVerify = async (tutor) => {
    setProcessing(tutor.id);
    try {
      // Update tutor profile to verified
      const { error: updateError } = await supabase
        .from('tutor_profiles')
        .update({ is_verified: true })
        .eq('id', tutor.id);
      
      if (updateError) throw updateError;

      // Determine tutor type
      const tutorType = tutor.sace_number ? 'sace_tutor' : 'student_tutor';
      
      // Update user profile role
      const { error: userError } = await supabase
        .from('user_profiles')
        .update({ role: tutorType })
        .eq('email', tutor.user_email);
      
      if (userError) console.error('Error updating user role:', userError);

      // Log activity
      await supabase.from('activity_logs').insert({
        event_type: 'tutor_verified',
        user_email: tutor.user_email,
        description: `Admin verified tutor: ${tutor.full_name}`,
      }).catch(() => {});

      // Send approval email to tutor
      const emailResult = await sendTutorApprovalEmail(tutor);
      
      if (emailResult.success) {
        toast.success(`✅ ${tutor.full_name} verified. Approval email sent.`);
      } else {
        toast.success(`✅ ${tutor.full_name} verified. Email failed to send.`);
      }
      
      // Remove from pending list
      setPendingProfiles(prev => prev.filter(t => t.id !== tutor.id));
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify tutor');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (tutor) => {
    setProcessing(tutor.id);
    try {
      // Log rejection
      await supabase.from('activity_logs').insert({
        event_type: 'tutor_rejected',
        user_email: tutor.user_email,
        description: `Admin rejected tutor: ${tutor.full_name}`,
      }).catch(() => {});

      setPendingProfiles(prev => prev.filter(t => t.id !== tutor.id));
      toast.success(`❌ ${tutor.full_name} rejected.`);
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject tutor');
    } finally {
      setProcessing(null);
    }
  };

  const handleManualCreate = async () => {
    if (!manualEmail.trim()) { toast.error('Email is required'); return; }
    setCreating(true);
    try {
      const { data: existing, error: checkError } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_email', manualEmail.trim())
        .maybeSingle();
      
      if (existing) {
        toast.info('Profile already exists — click Refresh to see it.');
        setCreating(false);
        return;
      }

      const { error: createError } = await supabase
        .from('tutor_profiles')
        .insert({
          user_email: manualEmail.trim(),
          full_name: manualName.trim() || manualEmail.trim(),
          qualifications: manualCreds.trim() || 'Manually added by admin',
          sace_number: null,
          university: null,
          student_number: null,
          is_verified: false,
          is_premium: false,
          hourly_rate: 0,
        });
      
      if (createError) throw createError;
      
      setManualEmail(''); setManualName(''); setManualCreds('');
      toast.success('Profile created — refreshing queue…');
      loadData();
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    } finally {
      setCreating(false);
    }
  };

  const totalPending = pendingProfiles.length + pendingUsers.length;

  return (
    <div className="space-y-4">

      {/* Summary banner */}
      <div className={`rounded-xl p-4 border-2 flex items-center gap-4 ${totalPending > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${totalPending > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
          {totalPending > 0
            ? <AlertTriangle className="w-6 h-6 text-red-600" />
            : <CheckCircle className="w-6 h-6 text-green-600" />
          }
        </div>
        <div className="flex-1">
          <p className={`font-semibold ${totalPending > 0 ? 'text-red-800' : 'text-green-800'}`}>
            {totalPending > 0 ? `${totalPending} tutor${totalPending > 1 ? 's' : ''} awaiting review` : 'All tutors reviewed — queue is clear!'}
          </p>
          <div className="flex gap-3 mt-1 flex-wrap text-xs">
            {pendingProfiles.length > 0 && <span className="text-red-700">• {pendingProfiles.length} profile{pendingProfiles.length > 1 ? 's' : ''} pending verification</span>}
            {pendingUsers.length > 0 && <span className="text-orange-700">• {pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''} stuck as tutor_pending (no profile yet)</span>}
            {totalPending === 0 && <span className="text-green-700">Last checked: {lastRefresh.toLocaleTimeString('en-ZA')}</span>}
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-shrink-0" onClick={loadData}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Orphaned tutor_pending users (no profile) */}
      {pendingUsers.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="font-playfair text-base flex items-center gap-2">
              <User className="w-4 h-4 text-orange-600" />
              Stuck Accounts — No Profile Submitted
              <Badge className="bg-orange-100 text-orange-700 text-xs">{pendingUsers.length}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">These users have role <code className="bg-muted px-1 rounded">tutor_pending</code> but haven't completed their profile form. Use the manual entry panel below to create a profile for them and move them into the verification queue.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-orange-200 bg-orange-50/40">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-base flex-shrink-0">
                    {u.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{u.full_name || '(No name)'}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">tutor_pending</Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeSince(u.created_at)}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7 px-2 flex-shrink-0"
                    onClick={() => { setManualEmail(u.email); setManualName(u.full_name || ''); }}>
                    Pre-fill ↓
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main pending profiles queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="font-playfair flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Pending Tutor Verification
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={pendingProfiles.length > 0 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'}>
                {pendingProfiles.length} pending
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Auto-refreshes every 30s · Last: {lastRefresh.toLocaleTimeString('en-ZA')}
          </p>
        </CardHeader>
        <CardContent>

          {/* Emergency manual entry */}
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Add / Fix Missing Tutor Profile
            </p>
            <p className="text-xs text-amber-700 mb-3">Use this if a tutor is stuck and doesn't appear in the queue, or pre-fill from a stuck account above.</p>
            <div className="grid sm:grid-cols-3 gap-2 mb-2">
              <Input placeholder="Tutor email *" value={manualEmail} onChange={e => setManualEmail(e.target.value)} className="text-xs h-8" />
              <Input placeholder="Full name" value={manualName} onChange={e => setManualName(e.target.value)} className="text-xs h-8" />
              <Input placeholder="Credentials (SACE / Uni + student no)" value={manualCreds} onChange={e => setManualCreds(e.target.value)} className="text-xs h-8" />
            </div>
            <Button size="sm" onClick={handleManualCreate} disabled={creating} className="gap-1.5 text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white">
              <UserPlus className="w-3.5 h-3.5" /> {creating ? 'Creating…' : 'Create Profile & Add to Queue'}
            </Button>
          </div>

          {loading && pendingProfiles.length === 0 ? (
            <div className="py-10 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : pendingProfiles.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-sm">No profiles awaiting verification.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingProfiles.map(tutor => {
                const isSACE = !!tutor.sace_number;
                const isLoading = processing === tutor.id;
                return (
                  <div key={tutor.id} className="border-2 border-amber-200 bg-amber-50/40 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                        {tutor.full_name?.[0] || 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{tutor.full_name || '(No name)'}</p>
                          <Badge variant="outline" className={`text-xs ${isSACE ? 'border-primary/30 text-primary bg-primary/5' : 'border-purple-300 text-purple-700 bg-purple-50'}`}>
                            {isSACE
                              ? <><Shield className="w-3 h-3 mr-1 inline" />SACE Tutor</>
                              : <><GraduationCap className="w-3 h-3 mr-1 inline" />Student Tutor</>}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{tutor.user_email}</p>
                        <div className="mt-2 space-y-1.5">
                          {isSACE && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium">SACE No:</span>
                              <span className="text-xs font-mono bg-white border border-border px-2 py-0.5 rounded">{tutor.sace_number}</span>
                              <a href="https://www.sace.org.za/find-an-educator" target="_blank" rel="noopener noreferrer"
                                className="text-xs text-primary underline flex items-center gap-0.5 hover:text-primary/80">
                                Verify on SACE <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                          {tutor.qualifications && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium flex-shrink-0">Credentials:</span>
                              <span className="text-xs text-muted-foreground">{tutor.qualifications}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Registered: {timeSince(tutor.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline"
                        className="flex-1 text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50"
                        disabled={!!processing}
                        onClick={() => handleReject(tutor)}>
                        {isLoading ? <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Reject
                      </Button>
                      <Button size="sm"
                        className="flex-1 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={!!processing}
                        onClick={() => handleVerify(tutor)}>
                        {isLoading ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Verify &amp; Notify
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}