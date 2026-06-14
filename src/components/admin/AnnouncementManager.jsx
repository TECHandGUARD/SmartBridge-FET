import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ToggleLeft, ToggleRight, Megaphone, Loader2, Info, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_CONFIG = {
  info:    { label: 'Info',    color: 'bg-blue-100 text-blue-700 border-blue-200',    icon: Info, bar: 'bg-blue-500' },
  warning: { label: 'Warning', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle, bar: 'bg-amber-500' },
  success: { label: 'Success', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, bar: 'bg-green-500' },
  urgent:  { label: 'Urgent',  color: 'bg-red-100 text-red-700 border-red-200',       icon: Zap, bar: 'bg-red-500' },
};

const AUDIENCE_OPTIONS = [
  { value: 'student', label: 'Students' },
  { value: 'tutor',   label: 'Tutors' },
  { value: 'parent',  label: 'Parents' },
  { value: 'all',     label: 'Everyone' },
];

const EMPTY_FORM = { title: '', message: '', type: 'info', audience: ['all'], expires_at: '' };

export default function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAudienceToggle = (val) => {
    setForm(p => {
      if (val === 'all') return { ...p, audience: ['all'] };
      const without = (p.audience || []).filter(a => a !== 'all' && a !== val);
      const next = p.audience.includes(val) ? without : [...without, val];
      return { ...p, audience: next.length ? next : ['all'] };
    });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_announcements')
        .insert({
          title: form.title,
          message: form.message,
          type: form.type,
          audience: form.audience,
          expires_at: form.expires_at || null,
          is_active: true,
        });
      
      if (error) throw error;
      
      toast.success('Announcement published!');
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      console.error('Failed to save announcement:', err);
      toast.error(`Failed to publish: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (announcement) => {
    try {
      const newStatus = !announcement.is_active;
      const { error } = await supabase
        .from('platform_announcements')
        .update({ is_active: newStatus })
        .eq('id', announcement.id);
      
      if (error) throw error;
      
      setAnnouncements(prev => prev.map(a => 
        a.id === announcement.id ? { ...a, is_active: newStatus } : a
      ));
      toast.success(newStatus ? 'Announcement activated' : 'Announcement deactivated');
    } catch (err) {
      console.error('Failed to toggle announcement:', err);
      toast.error(`Failed to update: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement permanently?')) return;
    try {
      const { error } = await supabase
        .from('platform_announcements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Announcement deleted.');
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {announcements.filter(a => a.is_active).length} active announcement
          {announcements.filter(a => a.is_active).length !== 1 ? 's' : ''} showing on dashboards.
        </p>
        <Button size="sm" className="bg-primary gap-1.5" onClick={() => setShowForm(s => !s)}>
          <Plus className="w-3.5 h-3.5" /> New Announcement
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm font-semibold text-primary flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> Create Announcement
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Title *</Label>
                <Input 
                  placeholder="e.g. Platform maintenance on Saturday" 
                  value={form.title} 
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} 
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Message *</Label>
                <Textarea 
                  placeholder="Full announcement text..." 
                  value={form.message} 
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))} 
                  className="resize-none h-24" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expires (optional)</Label>
                <Input 
                  type="date" 
                  value={form.expires_at} 
                  onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Show to</Label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCE_OPTIONS.map(({ value, label }) => {
                  const active = (form.audience || []).includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => handleAudienceToggle(value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            {form.title && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Preview</Label>
                <AnnouncementBanner announcement={{ ...form, is_active: true }} preview />
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" className="bg-primary gap-1.5" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
                {saving ? 'Publishing...' : 'Publish'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing announcements */}
      {announcements.length === 0 ? (
        <p className="text-center text-muted-foreground py-10 text-sm">No announcements yet. Create one above.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => {
            const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.info;
            const TypeIcon = cfg.icon;
            return (
              <Card key={a.id} className={`border transition-opacity ${!a.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                        {(a.audience || []).map(aud => (
                          <Badge key={aud} variant="outline" className="text-xs capitalize">{aud}</Badge>
                        ))}
                        {!a.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        {a.expires_at && <Badge variant="outline" className="text-xs">Expires {a.expires_at}</Badge>}
                      </div>
                      <p className="font-semibold text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.message}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 items-center">
                      <button 
                        onClick={() => handleToggle(a)} 
                        title={a.is_active ? 'Deactivate' : 'Activate'} 
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {a.is_active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button 
                        onClick={() => handleDelete(a.id)} 
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Exported for use in dashboards
export function AnnouncementBanner({ announcement: a, preview = false }) {
  const cfg = TYPE_CONFIG[a?.type] || TYPE_CONFIG.info;
  const TypeIcon = cfg.icon;
  if (!a) return null;
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg.color}`}>
      <TypeIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{a.title}</p>
        <p className="text-xs mt-0.5 opacity-80">{a.message}</p>
      </div>
    </div>
  );
}