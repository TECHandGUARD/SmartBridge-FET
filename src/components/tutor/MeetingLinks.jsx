import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Video, ExternalLink, CheckCircle, Loader2, Radio, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MeetingLinks({ user, onProfileUpdate }) {
  const [zoomLink, setZoomLink] = useState('');
  const [teamsLink, setTeamsLink] = useState('');
  const [inSession, setInSession] = useState(false);
  const [sessionPlatform, setSessionPlatform] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [zoomError, setZoomError] = useState('');
  const [teamsError, setTeamsError] = useState('');

  // Load user's meeting links from user_profiles
  useEffect(() => {
    const loadMeetingLinks = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('zoom_link, teams_link, in_session, session_platform')
          .eq('email', user.email)
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
    };
    
    loadMeetingLinks();
  }, [user?.email]);

  // Validate Zoom link format
  const validateZoomLink = (url) => {
    if (!url) return true;
    const zoomPattern = /^https?:\/\/(zoom\.us|zoom\.us\/j\/\d+|zoom\.us\/my\/\w+)/i;
    if (!zoomPattern.test(url)) {
      setZoomError('Please enter a valid Zoom meeting link (e.g., https://zoom.us/j/123456789)');
      return false;
    }
    setZoomError('');
    return true;
  };

  // Validate Teams link format
  const validateTeamsLink = (url) => {
    if (!url) return true;
    const teamsPattern = /^https?:\/\/(teams\.microsoft\.com|teams\.live\.com)/i;
    if (!teamsPattern.test(url)) {
      setTeamsError('Please enter a valid Microsoft Teams meeting link');
      return false;
    }
    setTeamsError('');
    return true;
  };

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
      const { error } = await supabase
        .from('user_profiles')
        .update({
          zoom_link: zoomLink || null,
          teams_link: teamsLink || null,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);
      
      if (error) throw error;
      
      toast.success('Meeting links saved! Students can now join your sessions.');
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      console.error('Error saving meeting links:', err);
      toast.error('Failed to save meeting links: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSession = async (platform) => {
    const nowInSession = inSession && sessionPlatform === platform;
    const newVal = !nowInSession;
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          in_session: newVal,
          session_platform: newVal ? platform : null,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);
      
      if (error) throw error;
      
      setInSession(newVal);
      setSessionPlatform(newVal ? platform : '');
      
      toast.success(
        newVal 
          ? `You are now shown as "In Session" on ${platform}. Students can see you're busy.`
          : 'Session ended — you now appear available for new bookings.'
      );
      
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      console.error('Error toggling session:', err);
      toast.error('Failed to update session status');
    }
  };

  const openMeetingLink = (link, platform) => {
    if (!link) {
      toast.error(`Please add your ${platform} meeting link first`);
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

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

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-playfair flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" /> Live Session Links
          {inSession && (
            <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 ml-auto animate-pulse text-xs">
              <Radio className="w-3 h-3" /> Live in {sessionPlatform}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Add your Zoom and Microsoft Teams meeting links. Students can join directly from your profile.
          When you start a session, toggle "Start Session" to show students you're currently busy.
        </p>

        <div className="space-y-4">
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
              disabled={!zoomLink}
            >
              <Radio className="w-3 h-3" />
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
              disabled={!teamsLink}
            >
              <Radio className="w-3 h-3" />
              {inSession && sessionPlatform === 'Teams' ? 'End Teams Session' : 'Start Teams Session'}
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">💡 Tip for Tutors:</p>
          <p>
            When you start a session, your status changes to "Live in Session" on your profile.
            Students will see you're busy and cannot book you during that time.
            Remember to end the session when you're done!
          </p>
        </div>

        <Button size="sm" onClick={save} disabled={saving} className="bg-primary gap-1.5 w-full h-8 text-xs">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          {saving ? 'Saving...' : 'Save Meeting Links'}
        </Button>
      </CardContent>
    </Card>
  );
}