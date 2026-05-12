import { useState } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Video, ExternalLink, CheckCircle, Loader2, Radio } from 'lucide-react';
import { toast } from 'sonner';

export default function MeetingLinks({ user, userProfile, onProfileUpdate }) {
  const [zoomLink, setZoomLink] = useState(userProfile?.zoom_link || user?.zoom_link || '');
  const [teamsLink, setTeamsLink] = useState(userProfile?.teams_link || user?.teams_link || '');
  const [inSession, setInSession] = useState(userProfile?.in_session || user?.in_session || false);
  const [sessionPlatform, setSessionPlatform] = useState(userProfile?.session_platform || user?.session_platform || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          zoom_link: zoomLink, 
          teams_link: teamsLink 
        })
        .eq('email', user.email);
      
      if (error) throw error;
      
      toast.success('Meeting links saved!');
      if (onProfileUpdate) onProfileUpdate();
    } catch (error) {
      console.error('Error saving meeting links:', error);
      toast.error('Failed to save meeting links');
    } finally {
      setSaving(false);
    }
  };

  const toggleSession = async (platform) => {
    const nowInSession = inSession && sessionPlatform === platform;
    const newInSession = !nowInSession;
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          in_session: newInSession, 
          session_platform: newInSession ? platform : null 
        })
        .eq('email', user.email);
      
      if (error) throw error;
      
      setInSession(newInSession);
      setSessionPlatform(newInSession ? platform : '');
      toast.success(newInSession ? `You are now shown as busy in a ${platform} session.` : 'Session ended — you appear available.');
      if (onProfileUpdate) onProfileUpdate();
    } catch (error) {
      console.error('Error toggling session status:', error);
      toast.error('Failed to update session status');
    }
  };

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
        <p className="text-xs text-muted-foreground">Add your Zoom and Microsoft Teams meeting links. Students can join directly from your profile.</p>

        <div className="space-y-3">
          {/* Zoom */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <span className="text-blue-500">🎥</span> Zoom Meeting Link
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://zoom.us/j/your-meeting-id"
                value={zoomLink}
                onChange={e => setZoomLink(e.target.value)}
                className="text-sm"
              />
              {zoomLink && (
                <a href={zoomLink} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              )}
            </div>
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

          {/* Teams */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <span className="text-purple-500">📹</span> Microsoft Teams Link
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://teams.microsoft.com/l/meetup-join/..."
                value={teamsLink}
                onChange={e => setTeamsLink(e.target.value)}
                className="text-sm"
              />
              {teamsLink && (
                <a href={teamsLink} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              )}
            </div>
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

        <Button size="sm" onClick={save} disabled={saving} className="bg-primary gap-1.5 w-full h-8 text-xs">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          {saving ? 'Saving...' : 'Save Meeting Links'}
        </Button>
      </CardContent>
    </Card>
  );
}