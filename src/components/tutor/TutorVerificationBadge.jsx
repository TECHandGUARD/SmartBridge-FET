import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, Clock, AlertCircle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

// SACE validation regex (10-12 digits) - can be soft-coded via config
const DEFAULT_SACE_REGEX = /^\d{10,12}$/;

// Load config from Supabase
const useVerificationConfig = () => {
  const [config, setConfig] = useState({
    saceRegex: DEFAULT_SACE_REGEX,
    autoVerifyStudentTutors: false,
    verificationHours: 48,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('system_configurations')
          .select('config_value')
          .eq('config_key', 'tutor_verification_config')
          .single();
        
        if (!error && data?.config_value) {
          setConfig(prev => ({ ...prev, ...data.config_value }));
        }
      } catch (err) {
        console.warn('Using default verification config:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  return { config, loading: configLoading };
};

export default function TutorVerificationBadge({ user, profile, onProfileUpdate }) {
  const { config, loading: configLoading } = useVerificationConfig();
  const [saceInput, setSaceInput] = useState(profile?.sace_number || '');
  const [saving, setSaving] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [saceRegex, setSaceRegex] = useState(DEFAULT_SACE_REGEX);

  // Update regex when config loads
  useEffect(() => {
    if (config?.saceRegex && typeof config.saceRegex === 'string') {
      try {
        setSaceRegex(new RegExp(config.saceRegex));
      } catch (e) {
        console.warn('Invalid regex in config, using default');
      }
    }
  }, [config?.saceRegex]);

  const checkApplicationStatus = useCallback(async () => {
    if (!user?.email) return;
    
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase
        .from('tutor_verification_requests')
        .select('status, created_at, reviewed_at, admin_notes')
        .eq('tutor_email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
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
      
      // Create or update tutor profile with SACE number
      if (!tutorProfile) {
        const { data, error } = await supabase
          .from('tutor_profiles')
          .insert({
            user_email: user.email,
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
          })
          .select()
          .single();
        
        if (error) throw error;
        tutorProfile = data;
        toast.success('Profile created! Verification request submitted.');
      } else {
        const { error } = await supabase
          .from('tutor_profiles')
          .update({ 
            sace_number: trimmedSace, 
            is_verified: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);
        
        if (error) throw error;
        tutorProfile = { ...profile, sace_number: trimmedSace, is_verified: false };
        toast.success('Verification request updated.');
      }
      
      // Create verification request record
      const { error: requestError } = await supabase
        .from('tutor_verification_requests')
        .insert({
          tutor_email: user.email,
          sace_number: trimmedSace,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      
      if (requestError) console.error('Request log error:', requestError);
      
      // Update user role to tutor_pending if not already
      const { data: currentUser } = await supabase.auth.getUser();
      if (currentUser?.user?.role !== 'tutor_pending') {
        await supabase
          .from('user_profiles')
          .update({ role: 'tutor_pending', updated_at: new Date().toISOString() })
          .eq('email', user.email);
      }
      
      // Send confirmation email via Edge Function
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: user.email,
          subject: '📋 Tutor Verification Request Received',
          body: `
Hi ${user.full_name || 'there'},

We've received your SACE verification request (${trimmedSace}).

An admin will review it within ${config?.verificationHours || 48} hours.

You'll receive an email once verified.

— SmartBridge FET
          `,
          from_name: 'SmartBridge FET'
        }
      });
      
      if (emailError) console.error('Email error:', emailError);
      
      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          event_type: 'tutor_verification_requested',
          user_email: user.email,
          description: `Tutor verification requested - SACE: ${trimmedSace}`,
          created_at: new Date().toISOString()
        })
        .catch(err => console.error('Activity log error:', err));
      
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
    return (
      <Card className="border-border">
        <CardContent className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Already verified
  if (profile?.is_verified) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">
            {profile?.sace_number ? 'SACE Verified Tutor' : 'Verified Tutor'}
          </p>
          <p className="text-xs text-green-600">
            {profile?.sace_number 
              ? `Your SACE number ${profile.sace_number} has been verified.`
              : 'Your tutor profile has been verified by admin.'}
          </p>
        </div>
        <Badge className="bg-green-100 text-green-700 ml-auto">✓ Verified</Badge>
      </div>
    );
  }

  // Pending verification
  if ((profile?.sace_number || applicationStatus?.status === 'pending') && !profile?.is_verified) {
    const isPending = applicationStatus?.status === 'pending' || (profile?.sace_number && !profile?.is_verified);
    const createdAt = applicationStatus?.created_at || profile?.updated_at;
    
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-amber-600" />
          <p className="text-sm font-semibold text-amber-800">Verification Pending</p>
        </div>
        <p className="text-xs text-amber-700">
          SACE No. {profile?.sace_number || saceInput} — Admin review in progress.
          {createdAt && ` Submitted: ${new Date(createdAt).toLocaleDateString('en-ZA')}`}
        </p>
        <p className="text-[10px] text-amber-600 mt-1">
          You'll receive an email once verified. This typically takes {config?.verificationHours || 24}-{config?.verificationHours ? config.verificationHours + 24 : 48} hours.
        </p>
      </div>
    );
  }

  // Rejected application
  if (applicationStatus?.status === 'rejected') {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm font-semibold text-red-800">Verification Rejected</p>
        </div>
        <p className="text-xs text-red-700">
          Your SACE verification was not approved.
          {applicationStatus.admin_notes && ` Reason: ${applicationStatus.admin_notes}`}
        </p>
        <p className="text-[10px] text-red-600 mt-1">
          Please check your SACE number and submit again, or contact support.
        </p>
      </div>
    );
  }

  // Not verified - show submission form
  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-playfair flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Get SACE Verified
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Verified tutors get a verification badge and higher placement in search results.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">SACE Registration Number *</Label>
          <Input 
            placeholder="e.g. 20012345678" 
            value={saceInput} 
            onChange={e => setSaceInput(e.target.value)} 
            className="font-mono text-sm" 
          />
          <p className="text-[10px] text-muted-foreground">Enter 10-12 digit SACE number</p>
        </div>
        <Button 
          size="sm" 
          onClick={submitVerification} 
          disabled={saving || !saceInput.trim()} 
          className="bg-primary gap-1.5 w-full h-8 text-xs"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          {saving ? 'Submitting...' : 'Request Verification'}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          Verification typically takes {config?.verificationHours || 24}-{config?.verificationHours ? config.verificationHours + 24 : 48} hours.
          You'll receive an email confirmation.
        </p>
      </CardContent>
    </Card>
  );
}