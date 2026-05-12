import { useState } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentChildLink({ user, userProfile, onUpdate }) {
  const [childEmail, setChildEmail] = useState(userProfile?.linked_student_email || '');
  const [saving, setSaving] = useState(false);
  const linked = userProfile?.linked_student_email;

  const saveLink = async () => {
    if (!childEmail.trim()) { toast.error('Enter your child\'s email.'); return; }
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ linked_student_email: childEmail.trim() })
        .eq('email', user.email);
      
      if (error) throw error;
      
      toast.success('Child account linked! Progress reports will now auto-populate.');
      
      // Call onUpdate callback if provided to refresh parent component
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Error linking child account:', error);
      toast.error('Failed to link child account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-playfair flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" /> Linked Student Account
          {linked && <Badge className="bg-green-100 text-green-700 text-xs ml-auto gap-1"><CheckCircle className="w-3 h-3" /> Linked</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {linked ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-sm text-green-800 font-medium">Currently linked to:</p>
            <p className="text-sm text-green-700 font-mono mt-0.5">{linked}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Link your child's account to auto-load their progress in weekly reports.</p>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">Child's EduConnect Email</Label>
          <Input
            type="email"
            placeholder="child@example.com"
            value={childEmail}
            onChange={e => setChildEmail(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={saveLink} disabled={saving} className="bg-primary gap-1.5 w-full h-8 text-xs">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
          {saving ? 'Saving...' : linked ? 'Update Linked Account' : 'Link Account'}
        </Button>
      </CardContent>
    </Card>
  );
}