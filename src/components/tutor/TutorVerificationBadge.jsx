import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, Clock, AlertCircle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import PropTypes from 'prop-types';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const DEFAULT_SACE_REGEX = /^\d{10,12}$/;
const useVerificationConfig = () => {
  const [config, setConfig] = useState({
    saceRegex: DEFAULT_SACE_REGEX,
    autoVerifyStudentTutors: false,
    verificationHours: 48
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('system_configuration').select('value').eq('key', 'tutor_verification_config').single();
        if (!error && data?.value) {
          setConfig(prev => ({
            ...prev,
            ...data.value
          }));
        }
      } catch (err) {
        console.warn('Using default verification config:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);
  return {
    config,
    loading
  };
};
const propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string,
    email: PropTypes.string.isRequired,
    full_name: PropTypes.string,
    role: PropTypes.string
  }).isRequired,
  profile: PropTypes.shape({
    id: PropTypes.string,
    sace_number: PropTypes.string,
    is_verified: PropTypes.bool,
    updated_at: PropTypes.string
  }),
  onProfileUpdate: PropTypes.func
};
const cleanRegexPattern = pattern => {
  if (!pattern || typeof pattern !== 'string') return pattern;
  return pattern.replace(/^\/|\/$/g, '');
};
export default function TutorVerificationBadge({
  user,
  profile,
  onProfileUpdate
}) {
  const {
    config,
    loading: configLoading
  } = useVerificationConfig();
  const [saceInput, setSaceInput] = useState(profile?.sace_number || '');
  const [saving, setSaving] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [saceRegex, setSaceRegex] = useState(DEFAULT_SACE_REGEX);
  useEffect(() => {
    if (config?.saceRegex && typeof config.saceRegex === 'string') {
      try {
        const cleanPattern = cleanRegexPattern(config.saceRegex);
        setSaceRegex(new RegExp(cleanPattern));
      } catch (e) {
        console.warn('Invalid regex in config, using default');
        setSaceRegex(DEFAULT_SACE_REGEX);
      }
    }
  }, [config?.saceRegex]);
  const checkApplicationStatus = useCallback(async () => {
    if (!user?.email) return;
    setCheckingStatus(true);
    try {
      const {
        data,
        error
      } = await supabase.from('tutor_verification_requests').select('status, created_at, reviewed_at, admin_notes').eq('tutor_email', user.email).order('created_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setApplicationStatus(data);
      }
    } catch (err) {
      console.error('Error checking verification status:', err);
    } finally {
      setCheckingStatus(false);
    }
  }, [user?.email]);
  useEffect(() => {
    if (profile?.sace_number && !profile?.is_verified) {
      checkApplicationStatus();
    }
  }, [profile?.sace_number, profile?.is_verified, checkApplicationStatus]);
  const submitVerification = async () => {
    const trimmedSace = saceInput.trim();
    if (!trimmedSace) {
      toast.error('Enter your SACE number.');
      return;
    }
    if (!saceRegex.test(trimmedSace)) {
      toast.error('Please enter a valid SACE number (10-12 digits).');
      return;
    }
    setSaving(true);
    try {
      let tutorProfile = profile;
      if (!tutorProfile) {
        const {
          data,
          error
        } = await supabase.from('tutor_profiles').insert({
          user_email: user.email,
          user_id: user.id,
          full_name: user.full_name || user.email,
          sace_number: trimmedSace,
          is_verified: false,
          qualifications: ['Verification requested'],
          subjects: [],
          hourly_rate: 0,
          is_premium: false,
          rating: 0,
          bio: '',
          created_at: new Date().toISOString()
        }).select().single();
        if (error) throw error;
        tutorProfile = data;
        toast.success('Profile created! Verification request submitted.');
      } else {
        const {
          error
        } = await supabase.from('tutor_profiles').update({
          sace_number: trimmedSace,
          is_verified: false,
          updated_at: new Date().toISOString()
        }).eq('id', profile.id);
        if (error) throw error;
        tutorProfile = {
          ...profile,
          sace_number: trimmedSace,
          is_verified: false
        };
        toast.success('Verification request updated.');
      }
      const {
        error: requestError
      } = await supabase.from('tutor_verification_requests').insert({
        tutor_email: user.email,
        sace_number: trimmedSace,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      if (requestError) console.error('Request log error:', requestError);
      const {
        data: currentUser
      } = await supabase.auth.getUser();
      if (currentUser?.user?.role !== 'tutor_pending') {
        await supabase.from('users').update({
          role: 'tutor_pending',
          updated_at: new Date().toISOString()
        }).eq('id', user.id);
      }
      const {
        error: emailError
      } = await supabase.functions.invoke('send-email', {
        body: {
          kind: 'verification-status'
        }
      });
      if (emailError) console.error('Email error:', emailError);
      await supabase.from('activity_log').insert({
        event_type: 'tutor_verification_requested',
        user_email: user.email,
        user_id: user.id,
        description: `Tutor verification requested - SACE: ${trimmedSace}`,
        metadata: {
          sace_number: trimmedSace,
          profile_id: tutorProfile?.id
        },
        created_at: new Date().toISOString()
      });
      onProfileUpdate?.(tutorProfile);
      checkApplicationStatus();
    } catch (error) {
      console.error('Verification submission failed:', error);
      toast.error('Failed to submit verification: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  if (configLoading) {
    return <Card className="border-border">
        <CardContent className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>;
  }
  if (profile?.is_verified) {
    return <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl dark:bg-green-950/20 dark:border-green-800">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 dark:text-green-400" />
        <div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            {profile?.sace_number ? 'SACE Verified Tutor' : 'Verified Tutor'}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">
            {profile?.sace_number ? `Your SACE number ${profile.sace_number} has been verified.` : 'Your tutor profile has been verified by admin.'}
          </p>
        </div>
        <Badge className="bg-green-100 text-green-700 ml-auto dark:bg-green-950/30 dark:text-green-300">✓ Verified</Badge>
      </div>;
  }
  if ((profile?.sace_number || applicationStatus?.status === 'pending') && !profile?.is_verified) {
    const createdAt = applicationStatus?.created_at || profile?.updated_at;
    const isPending = applicationStatus?.status === 'pending' || profile?.sace_number && !profile?.is_verified;
    return <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-950/20 dark:border-amber-800">
        <div className="flex items-center gap-2 mb-1">
          {checkingStatus ? <Loader2 className="w-4 h-4 animate-spin text-amber-600" /> : <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {checkingStatus ? 'Checking status...' : 'Verification Pending'}
          </p>
        </div>
        {!checkingStatus && <>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              SACE No. {profile?.sace_number || saceInput} — Admin review in progress.
              {createdAt && ` Submitted: ${new Date(createdAt).toLocaleDateString('en-ZA')}`}
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
              You'll receive an email once verified. This typically takes {config?.verificationHours || 24}-{config?.verificationHours ? config.verificationHours + 24 : 48} hours.
            </p>
          </>}
      </div>;
  }
  if (applicationStatus?.status === 'rejected') {
    return <div className="p-3 bg-red-50 border border-red-200 rounded-xl dark:bg-red-950/20 dark:border-red-800">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">Verification Rejected</p>
        </div>
        <p className="text-xs text-red-700 dark:text-red-400">
          Your SACE verification was not approved.
          {applicationStatus.admin_notes && ` Reason: ${applicationStatus.admin_notes}`}
        </p>
        <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">
          Please check your SACE number and submit again, or contact support.
        </p>
      </div>;
  }
  return <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-playfair flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Get SACE Verified
          </CardTitle>
          <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3 text-green-500" /> Secure
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Verified tutors get a verification badge and higher placement in search results.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">SACE Registration Number *</Label>
          <Input placeholder="e.g. 20012345678" value={saceInput} onChange={e => setSaceInput(e.target.value)} className="font-mono text-sm" />
          <p className="text-[10px] text-muted-foreground">Enter 10-12 digit SACE number</p>
        </div>
        <Button type="button" size="sm" onClick={submitVerification} disabled={saving || !saceInput.trim()} className="bg-primary gap-1.5 w-full h-8 text-xs">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          {saving ? 'Submitting...' : 'Request Verification'}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          Verification typically takes {config?.verificationHours || 24}-{config?.verificationHours ? config.verificationHours + 24 : 48} hours.
          You'll receive an email confirmation.
        </p>
      </CardContent>
    </Card>;
}
TutorVerificationBadge.propTypes = propTypes;
