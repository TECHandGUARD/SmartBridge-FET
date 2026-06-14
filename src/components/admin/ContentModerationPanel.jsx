import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Pencil, Check, X, ExternalLink, Loader2, BookOpen, FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const SUBJECTS = ['Mathematics', 'Mathematical Literacy', 'Physical Sciences', 'Life Sciences', 'Geography', 'History', 'Accounting', 'Business Studies', 'Economics', 'English Home Language', 'Life Orientation'];
const GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];
const RESOURCE_TYPES = ['Notes', 'Past Paper', 'Study Guide', 'Worksheet', 'Video', 'Other'];

function EditableField({ label, value, onChange, type = 'text', options }) {
  if (options) return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  if (type === 'textarea') return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Textarea value={value || ''} onChange={e => onChange(e.target.value)} className="text-xs resize-none h-20" />
    </div>
  );
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value || ''} onChange={e => onChange(e.target.value)} className="h-8 text-xs" />
    </div>
  );
}

function ResourceCard({ resource, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(resource);
  const [saving, setSaving] = useState(false);

  const field = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('resources')
        .update({
          title: form.title,
          description: form.description,
          subject: form.subject,
          grade: form.grade,
          type: form.type,
          file_url: form.file_url,
        })
        .eq('id', resource.id);
      
      if (error) throw error;
      
      toast.success('Resource updated successfully');
      setEditing(false);
      onSave({ ...resource, ...form });
    } catch (err) {
      console.error('Failed to update resource:', err);
      toast.error(`Failed to update: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(resource);
    setEditing(false);
  };

  return (
    <Card className={`border transition-colors ${editing ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
      <CardContent className="p-4">
        {!editing ? (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                <Badge variant="outline" className="text-xs">{resource.subject}</Badge>
                <Badge variant="secondary" className="text-xs">{resource.grade}</Badge>
                <Badge variant="outline" className="text-xs">{resource.type}</Badge>
                {resource.is_approved && <Badge className="bg-green-100 text-green-700 text-xs">Approved</Badge>}
                {resource.is_rejected && <Badge className="bg-red-100 text-red-700 text-xs">Rejected</Badge>}
                {!resource.is_approved && !resource.is_rejected && <Badge variant="outline" className="text-xs">Pending</Badge>}
              </div>
              <p className="font-semibold text-sm">{resource.title}</p>
              {resource.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{resource.description}</p>}
              {resource.file_url && (
                <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mt-1.5">
                  <ExternalLink className="w-3 h-3" /> View File
                </a>
              )}
              <p className="text-xs text-muted-foreground mt-1">By: {resource.tutor_email || resource.created_by_id || '—'}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs" onClick={() => setEditing(true)}>
                <Pencil className="w-3 h-3" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => onDelete(resource.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Editing Resource</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><EditableField label="Title" value={form.title} onChange={field('title')} /></div>
              <EditableField label="Subject" value={form.subject} onChange={field('subject')} options={SUBJECTS} />
              <EditableField label="Grade" value={form.grade} onChange={field('grade')} options={GRADES} />
              <EditableField label="Type" value={form.type} onChange={field('type')} options={RESOURCE_TYPES} />
              <EditableField label="File URL" value={form.file_url} onChange={field('file_url')} />
              <div className="sm:col-span-2"><EditableField label="Description" value={form.description} onChange={field('description')} type="textarea" /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-primary gap-1.5 h-8" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleCancel}>
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StudyGuideCard({ guide, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(guide);
  const [saving, setSaving] = useState(false);

  const field = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('opportunity_guides')
        .update({
          title: form.title,
          description: form.description,
          category: form.category,
          external_link: form.external_link,
          source: form.source,
        })
        .eq('id', guide.id);
      
      if (error) throw error;
      
      toast.success('Guide updated successfully');
      setEditing(false);
      onSave({ ...guide, ...form });
    } catch (err) {
      console.error('Failed to update guide:', err);
      toast.error(`Failed to update: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(guide);
    setEditing(false);
  };

  const CATEGORIES = ['NBT Prep', 'University Requirements', 'Bursaries', 'Career Guidance', 'General'];

  return (
    <Card className={`border transition-colors ${editing ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
      <CardContent className="p-4">
        {!editing ? (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                <Badge variant="outline" className="text-xs">{guide.category}</Badge>
                {guide.source && <Badge variant="secondary" className="text-xs">{guide.source}</Badge>}
              </div>
              <p className="font-semibold text-sm">{guide.title}</p>
              {guide.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{guide.description}</p>}
              {guide.external_link && (
                <a href={guide.external_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mt-1.5">
                  <ExternalLink className="w-3 h-3" /> View Resource
                </a>
              )}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs" onClick={() => setEditing(true)}>
                <Pencil className="w-3 h-3" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => onDelete(guide.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Editing Study Guide</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><EditableField label="Title" value={form.title} onChange={field('title')} /></div>
              <EditableField label="Category" value={form.category} onChange={field('category')} options={CATEGORIES} />
              <EditableField label="Source" value={form.source} onChange={field('source')} />
              <div className="sm:col-span-2"><EditableField label="Resource URL" value={form.external_link} onChange={field('external_link')} /></div>
              <div className="sm:col-span-2"><EditableField label="Description" value={form.description} onChange={field('description')} type="textarea" /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-primary gap-1.5 h-8" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleCancel}>
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ContentModerationPanel() {
  const [resources, setResources] = useState([]);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resourcesRes, guidesRes] = await Promise.all([
        supabase.from('resources').select('*').order('created_at', { ascending: false }),
        supabase.from('opportunity_guides').select('*').order('created_at', { ascending: false }),
      ]);
      
      if (resourcesRes.error) throw resourcesRes.error;
      if (guidesRes.error) throw guidesRes.error;
      
      setResources(resourcesRes.data || []);
      setGuides(guidesRes.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResource = async (id) => {
    if (!confirm('Delete this resource permanently?')) return;
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Resource deleted.');
    } catch (err) {
      console.error('Failed to delete resource:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const handleDeleteGuide = async (id) => {
    if (!confirm('Delete this guide permanently?')) return;
    try {
      const { error } = await supabase
        .from('opportunity_guides')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setGuides(prev => prev.filter(g => g.id !== id));
      toast.success('Guide deleted.');
    } catch (err) {
      console.error('Failed to delete guide:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const filteredResources = resources.filter(r => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    const matchSubject = filterSubject === 'all' || r.subject === filterSubject;
    const matchGrade = filterGrade === 'all' || r.grade === filterGrade;
    return matchSearch && matchSubject && matchGrade;
  });

  const filteredGuides = guides.filter(g => {
    const matchSearch = !search || g.title?.toLowerCase().includes(search.toLowerCase()) || g.description?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search title or description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Grades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="resources">
        <TabsList>
          <TabsTrigger value="resources" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Resources
            <Badge className="ml-1 h-5 min-w-5 text-xs">{filteredResources.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="guides" className="gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Study Guides
            <Badge className="ml-1 h-5 min-w-5 text-xs">{filteredGuides.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-2 mt-4">
          {filteredResources.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">No resources found.</p>
          ) : filteredResources.map(r => (
            <ResourceCard
              key={r.id}
              resource={r}
              onSave={updated => setResources(prev => prev.map(x => x.id === updated.id ? updated : x))}
              onDelete={handleDeleteResource}
            />
          ))}
        </TabsContent>

        <TabsContent value="guides" className="space-y-2 mt-4">
          {filteredGuides.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">No guides found.</p>
          ) : filteredGuides.map(g => (
            <StudyGuideCard
              key={g.id}
              guide={g}
              onSave={updated => setGuides(prev => prev.map(x => x.id === updated.id ? updated : x))}
              onDelete={handleDeleteGuide}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}