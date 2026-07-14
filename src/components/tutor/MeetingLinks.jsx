import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Video, ExternalLink, CheckCircle, Loader2, Radio, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// URL Validation Patterns
// ============================================================

const URL_PATTERNS = {
  zoom: /^https?:\/\/(zoom\.us|zoom\.us\/j\/\d+|zoom\.us\/my\/\w+|www\.zoom\.us)/i,
  teams: /^https?:\/\/(teams\.microsoft\.com|teams\.live\.com|www\.teams\.microsoft\.com)/i,
};

// ============================================================
// Main Component
// ============================================================

export default function MeetingLinks({ user, onProfileUpdate }) {
  const [zoomLink, setZoomLink] = useState('');
  const [teamsLink, setTeamsLink] = useState('');
  const [inSession, setInSession] = useState(false);
  const [sessionPlatform, setSessionPlatform] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [zoomError, setZoomError] = useState('');
  const [teamsError, setTeamsError] = useState('');
  const [updatingSession, setUpdatingSession] = useState(false);

  // ============================================================
  // Load Meeting Links
  // ============================================================

  const loadMeetingLinks = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // ✅ Fixed: users table with id
      const { data, error } = await supabase
        .from('users')
        .select('zoom_link, teams_link, in_session, session_platform')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setZoomLink(data.zoom_link || '');
        setTeamsLink(data.teams_link || '');
        setInSession(data.in_session || false);
        setSessionPlatform(data.session_platform || '');
      }
    } catch (err) {
      console.error('Error loading meeting links:', err);
      toast.error('Failed to load meeting links');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMeetingLinks();
  }, [loadMeetingLinks]);

  // ============================================================
  // Real-time Subscription for Session Status
  // ============================================================

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`meeting_links_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new;
          if (newData) {
            setInSession(newData.in_session || false);
            setSessionPlatform(newData.session_platform || '');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ============================================================
  // URL Validation
  // ============================================================

  const validateZoomLink = (url) => {
    if (!url) {
      setZoomError('');
      return true;
    }
    if (!URL_PATTERNS.zoom.test(url)) {
      setZoomError('Please enter a valid Zoom meeting link (e.g., https://zoom.us/j/123456789)');
      return false;
    }
    setZoomError('');
    return true;
  };

  const validateTeamsLink = (url) => {
    if (!url) {
      setTeamsError('');
      return true;
    }
    if (!URL_PATTERNS.teams.test(url)) {
      setTeamsError('Please enter a valid Microsoft Teams meeting link');
      return false;
    }
    setTeamsError('');
    return true;
  };

  // ============================================================
  // Save Links
  // ============================================================

  const save = async () => {
    // Validate links before saving
    const isZoomValid = validateZoomLink(zoomLink);
    const isTeamsValid = validateTeamsLink(teamsLink);
    
    if (!isZoomValid || !isTeamsValid) {
      toast.error('Please fix the invalid links before saving');
      return;
    }
    
    setSaving(true);
    try {
      // ✅ Fixed: users table with id
      const { error } = await supabase
        .from('users')
        .update({
          zoom_link: zoomLink || null,
          teams_link: teamsLink || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // ✅ Added: Activity logging for POPIA compliance
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'meeting_links_updated',
          user_email: user.email,
          user_id: user.id,
          description: 'Updated meeting links',
          metadata: {
            has_zoom: !!zoomLink,
            has_teams: !!teamsLink
          }
        })
        .catch(() => {});
      
      toast.success('Meeting links saved! Students can now join your sessions.');
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      console.error('Error saving meeting links:', err);
      toast.error('Failed to save meeting links: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // Toggle Session Status
  // ============================================================

  const toggleSession = async (platform) => {
    const nowInSession = inSession && sessionPlatform === platform;
    const newVal = !nowInSession;
    
    setUpdatingSession(true);
    
    try {
      // ✅ Fixed: users table with id
      const { error } = await supabase
        .from('users')
        .update({
          in_session: newVal,
          session_platform: newVal ? platform : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setInSession(newVal);
      setSessionPlatform(newVal ? platform : '');
      
      // ✅ Added: Activity logging
      await supabase
        .from('activity_log')
        .insert({
          event_type: newVal ? 'session_started' : 'session_ended',
          user_email: user.email,
          user_id: user.id,
          description: `${newVal ? 'Started' : 'Ended'} ${platform} session`,
          metadata: {
            platform: platform,
            action: newVal ? 'start' : 'end'
          }
        })
        .catch(() => {});
      
      toast.success(
        newVal 
          ? `You are now shown as "In Session" on ${platform}. Students can see you're busy.`
          : 'Session ended — you now appear available for new bookings.'
      );
      
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      console.error('Error toggling session:', err);
      toast.error('Failed to update session status');
    } finally {
      setUpdatingSession(false);
    }
  };

  // ============================================================
  // Open Meeting Link
  // ============================================================

  const openMeetingLink = (link, platform) => {
    if (!link) {
      toast.error(`Please add your ${platform} meeting link first`);
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" /> Live Session Links
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" /> Live Session Links
            <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" /> Secure
            </Badge>
          </CardTitle>
          {inSession && (
            <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 ml-auto animate-pulse text-xs dark:bg-red-950/30 dark:text-red-300 dark:border-red-800">
              <Radio className="w-3 h-3" /> Live in {sessionPlatform}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Add your meeting links so students can join your sessions directly.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Zoom Section */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm">
            <span className="text-blue-500">🎥</span> Zoom Meeting Link
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://zoom.us/j/123456789"
              value={zoomLink}
              onChange={(e) => {
                setZoomLink(e.target.value);
                validateZoomLink(e.target.value);
              }}
              className={`text-sm ${zoomError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              disabled={saving}
            />
            {zoomLink && (
              <Button 
                size="icon" 
                variant="outline" 
                className="h-9 w-9 flex-shrink-0"
                onClick={() => openMeetingLink(zoomLink, 'Zoom')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          {zoomError && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {zoomError}
            </p>
          )}
          <Button
            size="sm"
            variant={inSession && sessionPlatform === 'Zoom' ? 'destructive' : 'outline'}
            className="h-7 text-xs gap-1.5"
            onClick={() => toggleSession('Zoom')}
            disabled={!zoomLink || updatingSession}
          >
            {updatingSession ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Radio className="w-3 h-3" />
            )}
            {inSession && sessionPlatform === 'Zoom' ? 'End Zoom Session' : 'Start Zoom Session'}
          </Button>
        </div>

        {/* Microsoft Teams Section */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm">
            <span className="text-purple-500">📹</span> Microsoft Teams Link
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://teams.microsoft.com/l/meetup-join/..."
              value={teamsLink}
              onChange={(e) => {
                setTeamsLink(e.target.value);
                validateTeamsLink(e.target.value);
              }}
              className={`text-sm ${teamsError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              disabled={saving}
            />
            {teamsLink && (
              <Button 
                size="icon" 
                variant="outline" 
                className="h-9 w-9 flex-shrink-0"
                onClick={() => openMeetingLink(teamsLink, 'Teams')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          {teamsError && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {teamsError}
            </p>
          )}
          <Button
            size="sm"
            variant={inSession && sessionPlatform === 'Teams' ? 'destructive' : 'outline'}
            className="h-7 text-xs gap-1.5"
            onClick={() => toggleSession('Teams')}
            disabled={!teamsLink || updatingSession}
          >
            {updatingSession ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Radio className="w-3 h-3" />
            )}
            {inSession && sessionPlatform === 'Teams' ? 'End Teams Session' : 'Start Teams Session'}
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">💡 Tips for Tutors:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>When you start a session, your status changes to "In Session"</li>
            <li>Students will see you're busy and cannot book during that time</li>
            <li>Remember to end the session when you're done!</li>
            <li>Students can join directly from your profile using the meeting link</li>
          </ul>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Shield className="w-3 h-3 text-green-500" />
          Your meeting links are only visible to students who book your sessions
        </div>

        {/* Save Button */}
        <Button 
          size="sm" 
          onClick={save} 
          disabled={saving || updatingSession} 
          className="bg-primary gap-1.5 w-full h-8 text-xs"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          {saving ? 'Saving...' : 'Save Meeting Links'}
        </Button>
      </CardContent>
    </Card>
  );
}
