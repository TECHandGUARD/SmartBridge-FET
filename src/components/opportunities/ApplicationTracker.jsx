import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GraduationCap, Plus, Trash2, ExternalLink, ChevronDown, ChevronUp, FileEdit, Calculator, BarChart2, Loader2
} from 'lucide-react';
import ApplicationDocumentVault from './ApplicationDocumentVault';
import APSCalculator from './APSCalculator';
import ApplicationAnalytics from './ApplicationAnalytics';
import { toast } from 'sonner';

const STAGES = ['Saved', 'Started', 'Submitted', 'Pending NBT', 'Accepted', 'Rejected', 'Waitlisted'];

const STAGE_STYLES = {
  Saved:       'bg-gray-100 text-gray-700 border-gray-200',
  Started:     'bg-blue-100 text-blue-700 border-blue-200',
  Submitted:   'bg-purple-100 text-purple-700 border-purple-200',
  'Pending NBT': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Accepted:    'bg-green-100 text-green-700 border-green-200',
  Rejected:    'bg-red-100 text-red-700 border-red-200',
  Waitlisted:  'bg-orange-100 text-orange-700 border-orange-200',
};

const STAGE_ORDER = { Saved: 0, Started: 1, Submitted: 2, 'Pending NBT': 3, Accepted: 4, Waitlisted: 4, Rejected: 4 };

function ProgressBar({ stage }) {
  const step = Math.min(STAGE_ORDER[stage] ?? 0, 3);
  return (
    <div className="flex items-center gap-1 mt-2">
      {['Started', 'Submitted', 'Pending NBT', 'Done'].map((s, i) => (
        <div key={s} className="flex-1 flex flex-col items-center gap-0.5">
          <div className={`h-1.5 w-full rounded-full ${i <= step - 1 ? 'bg-primary' : 'bg-muted'}`} />
          <span className="text-[9px] text-muted-foreground hidden sm:block">{s}</span>
        </div>
      ))}
    </div>
  );
}

function AddApplicationForm({ userEmail, onAdded }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [link, setLink] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error('University name is required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('university_applications')
        .insert({
          student_email: userEmail,
          university_name: name.trim(),
          course: course.trim() || null,
          application_link: link.trim() || null,
          deadline: deadline || null,
          stage: 'Saved',
        });
      
      if (error) throw error;
      
      toast.success(`${name.trim()} added to tracker`);
      setName(''); setCourse(''); setLink(''); setDeadline('');
      setOpen(false);
      onAdded();
    } catch (err) {
      console.error('Error adding application:', err);
      toast.error(`Failed to add: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {!open ? (
        <Button size="sm" className="gap-1.5 w-full" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> Track a University
        </Button>
      ) : (
        <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
          <p className="font-semibold text-sm">Add University to Track</p>
          <Input placeholder="University name *" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Course / programme (optional)" value={course} onChange={e => setCourse(e.target.value)} />
          <Input placeholder="Application link (optional)" value={link} onChange={e => setLink(e.target.value)} />
          <Input type="date" placeholder="Deadline (optional)" value={deadline} onChange={e => setDeadline(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={!name.trim() || saving} onClick={handleAdd}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {saving ? 'Adding...' : 'Add'}
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ app, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(app.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  const setStage = async (stage) => {
    try {
      const { error } = await supabase
        .from('university_applications')
        .update({ stage, updated_at: new Date().toISOString() })
        .eq('id', app.id);
      
      if (error) throw error;
      
      onUpdate({ ...app, stage });
      toast.success(`Stage updated to ${stage}`);
    } catch (err) {
      console.error('Error updating stage:', err);
      toast.error(`Failed to update: ${err.message}`);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('university_applications')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', app.id);
      
      if (error) throw error;
      
      onUpdate({ ...app, notes });
      toast.success('Notes saved');
    } catch (err) {
      console.error('Error saving notes:', err);
      toast.error(`Failed to save notes: ${err.message}`);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('university_applications')
        .delete()
        .eq('id', app.id);
      
      if (error) throw error;
      
      onDelete(app.id);
      toast.success(`${app.university_name} removed`);
    } catch (err) {
      console.error('Error deleting application:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{app.university_name}</p>
              <Badge className={`text-xs border ${STAGE_STYLES[app.stage]}`}>{app.stage}</Badge>
            </div>
            {app.course && <p className="text-xs text-muted-foreground mt-0.5">{app.course}</p>}
            {app.deadline && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Deadline: <span className="font-medium">{new Date(app.deadline).toLocaleDateString('en-ZA')}</span>
              </p>
            )}
            <ProgressBar stage={app.stage} />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {app.application_link && (
              <a href={app.application_link} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/20 p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Update Stage</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map(stage => (
                <button
                  key={stage}
                  onClick={() => setStage(stage)}
                  className={`px-2.5 py-1 rounded-full text-xs border font-medium transition-all ${
                    app.stage === stage
                      ? STAGE_STYLES[stage] + ' ring-2 ring-offset-1 ring-current'
                      : 'bg-background border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <FileEdit className="w-3 h-3" /> Notes
            </p>
            <textarea
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              placeholder="Add notes, reference numbers, etc..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <Button size="sm" variant="outline" className="mt-1.5 h-7 text-xs" disabled={savingNotes} onClick={saveNotes}>
              {savingNotes ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>
        </div>
      )}
      <ApplicationDocumentVault app={app} />
    </div>
  );
}

export default function ApplicationTracker({ userEmail }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('university_applications')
        .select('*')
        .eq('student_email', userEmail)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Error loading applications:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => { 
    if (userEmail) load(); 
  }, [userEmail, load]);

  const handleUpdate = (updated) => {
    setApplications(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const handleDelete = (id) => {
    setApplications(prev => prev.filter(a => a.id !== id));
  };

  const summary = {
    total: applications.length,
    submitted: applications.filter(a => ['Submitted', 'Pending NBT', 'Accepted', 'Waitlisted'].includes(a.stage)).length,
    accepted: applications.filter(a => a.stage === 'Accepted').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Analytics Panel */}
      {applications.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Application Analytics</h3>
          </div>
          <ApplicationAnalytics applications={applications} />
        </div>
      )}

      {/* Application Cards */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-playfair flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" /> My Application Tracker
          </CardTitle>
          {applications.length > 0 && (
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
              <span>{summary.total} universities tracked</span>
              <span>·</span>
              <span>{summary.submitted} submitted</span>
              {summary.accepted > 0 && <><span>·</span><span className="text-green-600 font-semibold">{summary.accepted} accepted 🎉</span></>}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <AddApplicationForm userEmail={userEmail} onAdded={load} />
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No universities tracked yet. Add one above to start tracking your applications.
            </p>
          ) : (
            applications.map(app => (
              <ApplicationCard key={app.id} app={app} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))
          )}
        </CardContent>
      </Card>

      {/* APS Calculator */}
      <APSCalculator />
    </div>
  );
}