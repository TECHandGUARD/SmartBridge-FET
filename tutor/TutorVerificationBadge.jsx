import { useState } from 'react';
import { supabase } from '@/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TutorVerificationBadge({ user, profile, onProfileUpdate }) {
  const [saceInput, setSaceInput] = useState(profile?.sace_number || user?.sace_number || '');
  const [saving, setSaving] = useState(false);

  const submitVerification = async () => {
    if (!saceInput.trim()) { toast.error('Enter your SACE number.'); return; }
    setSaving(true);
    try {
      if (profile) {
        // Update tutor profile with SACE number and set is_verified to false
        const { error: profileError } = await supabase
          .from('tutor_profiles')
          .update({ sace_number: saceInput, is_verified: false })
          .eq('id', profile.id);
        
        if (profileError) throw profileError;
        
        // Update user profile with SACE number
        const { error: userError } = await supabase
          .from('user_profiles')
          .update({ sace_number: saceInput })
          .eq('email', user.email);
        
        if (userError) throw userError;
        
        // Log activity
        await supabase.from('activity_logs').insert({
          event_type: 'tutor_verification_request',
          user_email: user.email,
          description: `Tutor verification request submitted — SACE: ${saceInput}`,
        }).catch(() => {});
        
        // Refresh profile data
        if (onProfileUpdate) {
          const { data: updatedProfile } = await supabase
            .from('tutor_profiles')
            .select('*')
            .eq('user_email', user.email)
            .maybeSingle();
          onProfileUpdate(updatedProfile);
        }
      }
      
      toast.success('Verification request submitted! Admin will review within 24 hours.');
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Failed to submit verification request');
    } finally {
      setSaving(false);
    }
  };

  if (profile?.is_verified) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">SACE Verified Tutor</p>
          <p className="text-xs text-green-600">Your SACE number {profile.sace_number} has been verified.</p>
        </div>
        <Badge className="bg-green-100 text-green-700 ml-auto">✓ Verified</Badge>
      </div>
    );
  }

  if (profile?.sace_number && !profile?.is_verified) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-amber-600" />
          <p className="text-sm font-semibold text-amber-800">Verification Pending</p>
        </div>
        <p className="text-xs text-amber-700">SACE No. {profile.sace_number} — Admin review in progress. You'll receive an email once verified.</p>
      </div>
    );
  }

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-playfair flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" /> Get SACE Verified
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Verified tutors get a ✓ badge and higher placement in search results.</p>
        <div className="space-y-1.5">
          <Label className="text-xs">SACE Registration Number</Label>
          <Input placeholder="e.g. 20012345678" value={saceInput} onChange={e => setSaceInput(e.target.value)} className="font-mono text-sm" />
        </div>
        <Button size="sm" onClick={submitVerification} disabled={saving} className="bg-primary gap-1.5 w-full h-8 text-xs">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
          {saving ? 'Submitting...' : 'Request Verification'}
        </Button>
      </CardContent>
    </Card>
  );
}