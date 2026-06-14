import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, ExternalLink, RefreshCw, Calendar, BookOpen, GraduationCap, Flag, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEADLINE_CATEGORIES = ["University Application", "NBT", "Bursary", "Other"];
const GUIDE_CATEGORIES = ["NBT Prep", "University Requirements", "Bursaries", "Career Guidance", "General"];

const categoryColor = {
  "University Application": "bg-blue-100 text-blue-700",
  "NBT": "bg-purple-100 text-purple-700",
  "Bursary": "bg-yellow-100 text-yellow-700",
  "Other": "bg-gray-100 text-gray-700",
  "NBT Prep": "bg-purple-100 text-purple-700",
  "University Requirements": "bg-blue-100 text-blue-700",
  "Bursaries": "bg-yellow-100 text-yellow-700",
  "Career Guidance": "bg-green-100 text-green-700",
  "General": "bg-gray-100 text-gray-700"
};

function ManualDeadlineForm({ onSaved, onCancel }) {
  const [form, setForm] = useState({ 
    event_name: '', 
    university: '', 
    date: '', 
    category: 'University Application', 
    description: '', 
    link: '' 
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.event_name || !form.date || !form.category) {
      toast.error('Event name, date and category are required.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('application_deadlines')
        .insert([{
          event_name: form.event_name,
          university: form.university || null,
          date: form.date,
          category: form.category,
          description: form.description || null,
          link: form.link || null,
          is_approved: true,
          status: 'approved'
        }]);
      
      if (error) throw error;
      
      toast.success('Deadline added and published!');
      onSaved();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Add Deadline Manually
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Event Name *</Label>
            <Input 
              placeholder="e.g. UCT Application Opens" 
              value={form.event_name} 
              onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">University (optional)</Label>
            <Input 
              placeholder="e.g. UCT" 
              value={form.university} 
              onChange={e => setForm(p => ({ ...p, university: e.target.value }))} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date *</Label>
            <Input 
              type="date" 
              value={form.date} 
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category *</Label>
            <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEADLINE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea 
              placeholder="Short description..." 
              value={form.description} 
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
              className="resize-none h-20" 
            />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Link (URL)</Label>
            <Input 
              placeholder="https://..." 
              value={form.link} 
              onChange={e => setForm(p => ({ ...p, link: e.target.value }))} 
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-primary gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Publish Deadline'}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ManualGuideForm({ onSaved, onCancel }) {
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    category: 'General', 
    external_link: '', 
    source: '' 
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title || !form.category) {
      toast.error('Title and category are required.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('opportunity_guides')
        .insert([{
          title: form.title,
          description: form.description || null,
          category: form.category,
          external_link: form.external_link || null,
          source: form.source || null,
          is_approved: true,
          status: 'approved'
        }]);
      
      if (error) throw error;
      
      toast.success('Guide added and published!');
      onSaved();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Add Guide Manually
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Title *</Label>
            <Input 
              placeholder="e.g. How to Apply for NSFAS" 
              value={form.title} 
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category *</Label>
            <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GUIDE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea 
              placeholder="Short description..." 
              value={form.description} 
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
              className="resize-none h-20" 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Resource Link (URL)</Label>
            <Input 
              placeholder="https://..." 
              value={form.external_link} 
              onChange={e => setForm(p => ({ ...p, external_link: e.target.value }))} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Source</Label>
            <Input 
              placeholder="e.g. NSFAS Website" 
              value={form.source} 
              onChange={e => setForm(p => ({ ...p, source: e.target.value }))} 
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-primary gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Publish Guide'}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ManualProspectusForm({ onSaved, onCancel }) {
  const [form, setForm] = useState({ 
    university_name: '', 
    year: new Date().getFullYear() + 1, 
    description: '', 
    file_url: '', 
    application_link: '' 
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.university_name || !form.year) {
      toast.error('University name and year are required.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('university_prospectuses')
        .insert([{
          university_name: form.university_name,
          year: Number(form.year),
          description: form.description || null,
          file_url: form.file_url || null,
          application_link: form.application_link || null,
          is_approved: true,
          status: 'approved'
        }]);
      
      if (error) throw error;
      
      toast.success('Prospectus added and published!');
      onSaved();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Add Prospectus Manually
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">University Name *</Label>
            <Input 
              placeholder="e.g. University of Cape Town" 
              value={form.university_name} 
              onChange={e => setForm(p => ({ ...p, university_name: e.target.value }))} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Year *</Label>
            <Input 
              type="number" 
              min="2024" 
              max="2030" 
              value={form.year} 
              onChange={e => setForm(p => ({ ...p, year: e.target.value }))} 
            />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea 
              placeholder="Brief description..." 
              value={form.description} 
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
              className="resize-none h-20" 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prospectus PDF URL</Label>
            <Input 
              placeholder="https://..." 
              value={form.file_url} 
              onChange={e => setForm(p => ({ ...p, file_url: e.target.value }))} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Application Link</Label>
            <Input 
              placeholder="https://..." 
              value={form.application_link} 
              onChange={e => setForm(p => ({ ...p, application_link: e.target.value }))} 
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-primary gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Publish Prospectus'}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OpportunitiesContentReview() {
  const [deadlines, setDeadlines] = useState([]);
  const [guides, setGuides] = useState([]);
  const [prospectuses, setProspectuses] = useState([]);
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [showForm, setShowForm] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: deadlinesData, error: deadlinesError } = await supabase
        .from('pending_application_deadlines')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (deadlinesError) throw deadlinesError;
      
      const { data: guidesData, error: guidesError } = await supabase
        .from('pending_opportunity_guides')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (guidesError) throw guidesError;
      
      const { data: prospectusesData, error: prospectusesError } = await supabase
        .from('pending_university_prospectuses')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (prospectusesError) throw prospectusesError;
      
      const { data: flaggedData, error: flaggedError } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('is_flagged', true)
        .eq('is_removed', false)
        .order('created_at', { ascending: false });
      
      if (flaggedError) throw flaggedError;
      
      setDeadlines(deadlinesData || []);
      setGuides(guidesData || []);
      setProspectuses(prospectusesData || []);
      setFlaggedPosts(flaggedData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadAll(); 
  }, [loadAll]);

  const runDiscovery = async (fnName, label) => {
    setRunning(label);
    try {
      const { error } = await supabase.functions.invoke(fnName, { body: {} });
      if (error) throw error;
      toast.success(`${label} discovery completed!`);
      await loadAll();
    } catch (err) {
      console.error('Discovery error:', err);
      toast.error(`Discovery failed: ${err.message}`);
    } finally {
      setRunning(null);
    }
  };

  const handleApprove = async (type, id) => {
    setProcessingId(id);
    try {
      const { error } = await supabase.functions.invoke('approve-opportunity-content', {
        body: { type, id, action: 'approve' }
      });
      if (error) throw error;
      toast.success(`${type} approved successfully!`);
      await loadAll();
    } catch (err) {
      console.error('Approve error:', err);
      toast.error(`Failed to approve: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (type, id) => {
    setProcessingId(id);
    try {
      const { error } = await supabase.functions.invoke('approve-opportunity-content', {
        body: { type, id, action: 'reject' }
      });
      if (error) throw error;
      toast.success(`${type} rejected successfully!`);
      await loadAll();
    } catch (err) {
      console.error('Reject error:', err);
      toast.error(`Failed to reject: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveFlaggedPost = async (postId) => {
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({ is_removed: true, updated_at: new Date().toISOString() })
        .eq('id', postId);
      if (error) throw error;
      setFlaggedPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post removed successfully');
    } catch (err) {
      console.error('Remove error:', err);
      toast.error(`Failed to remove post: ${err.message}`);
    }
  };

  const handleDismissFlag = async (postId) => {
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({ is_flagged: false, updated_at: new Date().toISOString() })
        .eq('id', postId);
      if (error) throw error;
      setFlaggedPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Flag dismissed');
    } catch (err) {
      console.error('Dismiss error:', err);
      toast.error(`Failed to dismiss flag: ${err.message}`);
    }
  };

  const ActionButtons = ({ type, id }) => (
    <div className="flex gap-2 mt-3">
      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" disabled={processingId === id} onClick={() => handleApprove(type, id)}>
        <CheckCircle className="w-3.5 h-3.5" />
        {processingId === id ? 'Processing...' : 'Approve'}
      </Button>
      <Button size="sm" variant="destructive" className="gap-1.5" disabled={processingId === id} onClick={() => handleReject(type, id)}>
        <XCircle className="w-3.5 h-3.5" /> Reject
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">Opportunities Content Review</h2>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5" disabled={!!running} onClick={() => runDiscovery('discover-application-deadlines', 'deadlines')}>
            <RefreshCw className={`w-3.5 h-3.5 ${running === 'deadlines' ? 'animate-spin' : ''}`} />
            {running === 'deadlines' ? 'Discovering...' : 'Discover Deadlines'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" disabled={!!running} onClick={() => runDiscovery('discover-opportunity-guides', 'guides')}>
            <RefreshCw className={`w-3.5 h-3.5 ${running === 'guides' ? 'animate-spin' : ''}`} />
            {running === 'guides' ? 'Discovering...' : 'Discover Guides'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" disabled={!!running} onClick={() => runDiscovery('discover-university-prospectuses', 'prospectuses')}>
            <RefreshCw className={`w-3.5 h-3.5 ${running === 'prospectuses' ? 'animate-spin' : ''}`} />
            {running === 'prospectuses' ? 'Discovering...' : 'Discover Prospectuses'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="deadlines">
        <TabsList className="w-full">
          <TabsTrigger value="deadlines" className="flex-1 gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Deadlines <Badge className="ml-1 h-5 min-w-5 text-xs">{deadlines.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="guides" className="flex-1 gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Guides <Badge className="ml-1 h-5 min-w-5 text-xs">{guides.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="prospectuses" className="flex-1 gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> Prospectuses <Badge className="ml-1 h-5 min-w-5 text-xs">{prospectuses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="forum" className="flex-1 gap-1.5">
            <Flag className="w-3.5 h-3.5" /> Flagged Posts <Badge className="ml-1 h-5 min-w-5 text-xs">{flaggedPosts.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deadlines" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" className="bg-primary gap-1.5" onClick={() => setShowForm(showForm === 'deadline' ? null : 'deadline')}>
              {showForm === 'deadline' ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showForm === 'deadline' ? 'Cancel' : 'Add Manually'}
            </Button>
          </div>
          {showForm === 'deadline' && <ManualDeadlineForm onSaved={() => { setShowForm(null); loadAll(); }} onCancel={() => setShowForm(null)} />}
          {deadlines.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending deadlines. Click "Discover Deadlines" to search, or add one manually above.</p>
          ) : (
            deadlines.map(d => (
              <div key={d.id} className="border rounded-xl p-4 bg-card">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge className={categoryColor[d.category] || ""}>{d.category}</Badge>
                  <Badge variant="outline">{d.date}</Badge>
                  {d.university && <Badge variant="outline">{d.university}</Badge>}
                </div>
                <p className="font-semibold">{d.event_name}</p>
                {d.description && <p className="text-sm text-muted-foreground mt-1">{d.description}</p>}
                {d.link && <a href={d.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"><ExternalLink className="w-3 h-3" /> {d.link}</a>}
                {d.source && <p className="text-xs text-muted-foreground mt-1">Source: {d.source}</p>}
                <ActionButtons type="deadline" id={d.id} />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="guides" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" className="bg-primary gap-1.5" onClick={() => setShowForm(showForm === 'guide' ? null : 'guide')}>
              {showForm === 'guide' ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showForm === 'guide' ? 'Cancel' : 'Add Manually'}
            </Button>
          </div>
          {showForm === 'guide' && <ManualGuideForm onSaved={() => { setShowForm(null); loadAll(); }} onCancel={() => setShowForm(null)} />}
          {guides.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending guides. Click "Discover Guides" to search, or add one manually above.</p>
          ) : (
            guides.map(g => (
              <div key={g.id} className="border rounded-xl p-4 bg-card">
                <div className="flex flex-wrap gap-2 mb-2"><Badge className={categoryColor[g.category] || ""}>{g.category}</Badge></div>
                <p className="font-semibold">{g.title}</p>
                {g.description && <p className="text-sm text-muted-foreground mt-1">{g.description}</p>}
                {g.external_link && <a href={g.external_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"><ExternalLink className="w-3 h-3" /> View Resource</a>}
                {g.source && <p className="text-xs text-muted-foreground mt-1">Source: {g.source}</p>}
                <ActionButtons type="guide" id={g.id} />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="prospectuses" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" className="bg-primary gap-1.5" onClick={() => setShowForm(showForm === 'prospectus' ? null : 'prospectus')}>
              {showForm === 'prospectus' ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showForm === 'prospectus' ? 'Cancel' : 'Add Manually'}
            </Button>
          </div>
          {showForm === 'prospectus' && <ManualProspectusForm onSaved={() => { setShowForm(null); loadAll(); }} onCancel={() => setShowForm(null)} />}
          {prospectuses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending prospectuses. Click "Discover Prospectuses" to search, or add one manually above.</p>
          ) : (
            prospectuses.map(p => (
              <div key={p.id} className="border rounded-xl p-4 bg-card">
                <div className="flex flex-wrap gap-2 mb-2"><Badge variant="outline">Year: {p.year}</Badge></div>
                <p className="font-semibold">{p.university_name}</p>
                {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                <div className="flex flex-wrap gap-3 mt-2">
                  {p.external_link && <a href={p.external_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="w-3 h-3" /> Prospectus PDF</a>}
                  {p.application_link && <a href={p.application_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="w-3 h-3" /> Apply Link</a>}
                </div>
                {p.source && <p className="text-xs text-muted-foreground mt-1">Source: {p.source}</p>}
                <ActionButtons type="prospectus" id={p.id} />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="forum" className="space-y-3 mt-4">
          {flaggedPosts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No flagged forum posts.</p>
          ) : (
            flaggedPosts.map(post => (
              <div key={post.id} className="border border-orange-200 rounded-xl p-4 bg-orange-50/30">
                <Badge className="bg-orange-100 text-orange-700 mb-2">Flagged</Badge>
                <p className="font-semibold">{post.title}</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{post.body}</p>
                <p className="text-xs text-muted-foreground mt-1">By: {post.author_name || 'Unknown'} · {post.category || 'General'}</p>
                {post.flag_reason && <p className="text-xs text-orange-600 mt-1">Reason: {post.flag_reason}</p>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => handleRemoveFlaggedPost(post.id)}><XCircle className="w-3.5 h-3.5" /> Remove Post</Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleDismissFlag(post.id)}><CheckCircle className="w-3.5 h-3.5" /> Dismiss Flag</Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}