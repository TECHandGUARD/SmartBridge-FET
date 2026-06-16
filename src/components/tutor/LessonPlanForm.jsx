import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2, Save, ArrowLeft, Sparkles, Copy, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-muted text-muted-foreground' },
  { value: 'planned', label: 'Planned', color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
];

// Quick templates
const QUICK_TEMPLATES = {
  'Mathematics': {
    'Algebra - Linear Equations': {
      objectives: ['Understand linear equations', 'Solve for x in one-step equations', 'Solve for x in two-step equations'],
      resources: ['Textbook Chapter 4', 'Linear equations worksheet', 'Khan Academy video'],
      homework: 'Complete exercises 1-15. Practice 5 word problems.'
    },
    'Calculus - Differentiation': {
      objectives: ['Understand the concept of limits', 'Apply the power rule', 'Differentiate basic functions'],
      resources: ['Derivative rules cheat sheet', 'PhET Calculus simulation', 'Practice problem set'],
      homework: 'Derivative practice problems (20 questions). Watch derivative video.'
    },
    'Trigonometry - Basics': {
      objectives: ['Understand sine, cosine, tangent', 'Apply SOH CAH TOA', 'Solve right triangle problems'],
      resources: ['Unit circle diagram', 'Trigonometry formula sheet', 'Interactive GeoGebra'],
      homework: 'Trig ratios worksheet. Memorize unit circle values.'
    }
  },
  'Physical Sciences': {
    "Newton's Laws of Motion": {
      objectives: ['State Newton\'s 3 laws', 'Apply F = ma to real-world problems', 'Calculate net force'],
      resources: ['PhET Forces simulation', 'Formula sheet', 'Physics textbook Ch.5'],
      homework: 'Force diagram worksheet. 10 calculation problems.'
    },
    'Chemical Bonding': {
      objectives: ['Differentiate ionic and covalent bonds', 'Draw Lewis structures', 'Understand electronegativity'],
      resources: ['Molecular model kit', 'Bonding simulation', 'Periodic table'],
      homework: 'Lewis structure practice. Bond type identification.'
    }
  },
  'Life Sciences': {
    'Cell Structure': {
      objectives: ['Identify organelles', 'Explain functions of each organelle', 'Differentiate plant and animal cells'],
      resources: ['Cell diagram worksheet', 'Microscope slides', 'Interactive cell model'],
      homework: 'Label cell diagram. Organelle function matching.'
    },
    'Genetics': {
      objectives: ['Understand Punnett squares', 'Differentiate dominant/recessive traits', 'Calculate probability'],
      resources: ['Genetics simulation', 'Mendel\'s pea plants video', 'Punnett square worksheet'],
      homework: 'Punnett square practice (10 problems). Genetics vocabulary matching.'
    }
  }
};

// Auto-save key
const getDraftKey = (email) => `lesson_plan_draft_${email}`;

export default function LessonPlanForm({ user, plan, students, upcomingBookings = [], onSaved, onCancel }) {
  const isEditing = !!plan?.id;
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [objectiveInput, setObjectiveInput] = useState('');
  const [resourceInput, setResourceInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [form, setForm] = useState({
    session_title: plan?.session_title || '',
    student_email: plan?.student_email || '',
    student_name: plan?.student_name || '',
    session_date: plan?.session_date || new Date().toISOString().split('T')[0],
    subject: plan?.subject || '',
    grade: plan?.grade || 'Grade 12',
    objectives: plan?.objectives || [],
    resources_used: plan?.resources_used || [],
    homework_assigned: plan?.homework_assigned || '',
    notes: plan?.notes || '',
    status: plan?.status || 'draft',
    booking_id: plan?.booking_id || '',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Load draft on mount (only for new plans)
  useEffect(() => {
    if (!isEditing) {
      const draftKey = getDraftKey(user?.email);
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (window.confirm('You have an unsaved draft from your last session. Load it?')) {
          setForm(draft);
          toast.info('Draft loaded');
        }
      }
    }
  }, [isEditing, user?.email]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!form.session_title && form.objectives.length === 0) return;
    if (saving) return;

    const autoSaveInterval = setInterval(() => {
      const draftKey = getDraftKey(user?.email);
      localStorage.setItem(draftKey, JSON.stringify(form));
      console.log('Draft auto-saved');
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [form, saving, user?.email]);

  const addObjective = () => {
    if (!objectiveInput.trim()) return;
    set('objectives', [...form.objectives, objectiveInput.trim()]);
    setObjectiveInput('');
  };

  const removeObjective = (i) => set('objectives', form.objectives.filter((_, idx) => idx !== i));

  const addResource = () => {
    if (!resourceInput.trim()) return;
    set('resources_used', [...form.resources_used, resourceInput.trim()]);
    setResourceInput('');
  };

  const removeResource = (i) => set('resources_used', form.resources_used.filter((_, idx) => idx !== i));

  const selectStudent = (email) => {
    const stu = students.find(s => s.email === email);
    set('student_email', email);
    set('student_name', stu?.name || email);
  };

  const selectBooking = (bookingId) => {
    const booking = upcomingBookings.find(b => b.id === bookingId);
    if (booking) {
      set('booking_id', bookingId);
      set('student_email', booking.student_email);
      set('student_name', booking.student_name || booking.student_email);
      set('subject', booking.subject);
      set('session_date', booking.date);
      toast.success('Linked to booking! You can now edit details if needed.');
    }
  };

  const applyTemplate = () => {
    if (!selectedTemplate || !form.subject) return;
    
    const [subject, topic] = selectedTemplate.split('|');
    const template = QUICK_TEMPLATES[subject]?.[topic];
    
    if (template) {
      set('subject', subject);
      set('session_title', `${subject} - ${topic}`);
      set('objectives', template.objectives);
      set('resources_used', template.resources);
      set('homework_assigned', template.homework);
      toast.success(`Template "${topic}" loaded! Review and adjust as needed.`);
      setSelectedTemplate('');
    }
  };

  const generateWithAI = async () => {
    if (!form.subject || !form.session_title) {
      toast.error('Please enter a title and select subject first');
      return;
    }
    
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lesson-plan', {
        body: {
          subject: form.subject,
          topic: form.session_title,
          grade: form.grade,
          curriculum: 'CAPS'
        }
      });
      
      if (error) throw error;
      
      if (data) {
        if (data.objectives?.length) set('objectives', data.objectives);
        if (data.resources?.length) set('resources_used', data.resources);
        if (data.homework) set('homework_assigned', data.homework);
        if (data.notes) set('notes', data.notes);
        toast.success('AI-generated content added! Review and adjust as needed.');
      }
    } catch (err) {
      console.error('Error generating AI content:', err);
      toast.error('Failed to generate AI content');
    } finally {
      setGeneratingAI(false);
    }
  };

  const duplicatePlan = () => {
    const duplicated = {
      ...form,
      session_title: `${form.session_title} (Copy)`,
      status: 'draft',
      booking_id: null,
    };
    setForm(duplicated);
    toast.info('Plan duplicated. Edit and save as new.');
  };

  const clearDraft = () => {
    const draftKey = getDraftKey(user?.email);
    localStorage.removeItem(draftKey);
    toast.info('Draft cleared');
  };

  const handleSave = async () => {
    if (!form.session_title || !form.student_email || !form.subject) {
      toast.error('Please fill in title, student, and subject.');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        tutor_email: user.email,
        session_title: form.session_title,
        student_email: form.student_email,
        student_name: form.student_name,
        session_date: form.session_date || null,
        subject: form.subject,
        grade: form.grade,
        objectives: form.objectives,
        resources_used: form.resources_used,
        homework_assigned: form.homework_assigned,
        notes: form.notes,
        status: form.status,
        booking_id: form.booking_id || null,
        updated_at: new Date().toISOString()
      };

      // Link to StudentProgress if exists
      const { data: progRecords } = await supabase
        .from('student_progress')
        .select('id')
        .eq('user_email', form.student_email)
        .eq('subject', form.subject)
        .maybeSingle();
      
      if (progRecords) {
        payload.student_progress_id = progRecords.id;
      }

      if (isEditing) {
        const { error } = await supabase
          .from('lesson_plans')
          .update(payload)
          .eq('id', plan.id);
        
        if (error) throw error;
        toast.success('Lesson plan updated.');
      } else {
        const { error } = await supabase
          .from('lesson_plans')
          .insert(payload);
        
        if (error) throw error;
        
        // Clear draft after successful save
        clearDraft();
        toast.success('Lesson plan created!');
      }
      
      onSaved?.();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Validation
  const validation = {
    title: form.session_title.trim().length > 0,
    student: !!form.student_email,
    subject: !!form.subject,
    objectives: form.objectives.length > 0
  };
  const isValid = validation.title && validation.student && validation.subject;

  // Available templates for selected subject
  const availableTemplates = form.subject ? Object.keys(QUICK_TEMPLATES[form.subject] || {}) : [];

  // Preview Mode
  if (previewMode) {
    return (
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewMode(false)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-base font-playfair">Lesson Plan Preview</CardTitle>
            </div>
            {!isEditing && (
              <Button size="sm" variant="outline" onClick={clearDraft} className="text-xs">
                Clear Draft
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="prose prose-sm max-w-none">
            <div className="bg-muted/30 rounded-lg p-4 mb-4">
              <h2 className="text-lg font-semibold mb-2">{form.session_title || 'Untitled Lesson'}</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><strong>Student:</strong> {form.student_name || form.student_email || 'Not selected'}</p>
                <p><strong>Subject:</strong> {form.subject || 'Not selected'} | <strong>Grade:</strong> {form.grade}</p>
                <p><strong>Date:</strong> {form.session_date || 'TBD'}</p>
                <p><strong>Status:</strong> {STATUS_OPTIONS.find(s => s.value === form.status)?.label}</p>
              </div>
            </div>

            <h3 className="text-md font-semibold mt-4 mb-2">🎯 Learning Objectives</h3>
            {form.objectives.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {form.objectives.map((obj, i) => <li key={i}>{obj}</li>)}
              </ul>
            ) : <p className="text-muted-foreground italic">No objectives added yet.</p>}

            <h3 className="text-md font-semibold mt-4 mb-2">📚 Resources / Materials</h3>
            {form.resources_used.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {form.resources_used.map((res, i) => <li key={i}>{res}</li>)}
              </ul>
            ) : <p className="text-muted-foreground italic">No resources listed.</p>}

            <h3 className="text-md font-semibold mt-4 mb-2">✏️ Homework</h3>
            <p>{form.homework_assigned || 'No homework assigned'}</p>

            {form.notes && (
              <>
                <h3 className="text-md font-semibold mt-4 mb-2">📝 Private Notes</h3>
                <p className="text-muted-foreground">{form.notes}</p>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={() => setPreviewMode(false)} variant="outline" className="flex-1">
              Back to Edit
            </Button>
            <Button onClick={handleSave} disabled={saving || !isValid} className="bg-primary gap-2 flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : isEditing ? 'Update Plan' : 'Save Plan'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="text-base font-playfair">
              {isEditing ? 'Edit Lesson Plan' : 'New Lesson Plan'}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={duplicatePlan}>
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setPreviewMode(true)}>
              <Eye className="w-3.5 h-3.5" /> Preview
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1.5 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={generateWithAI}
              disabled={generatingAI || !form.session_title}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generatingAI ? 'Generating...' : 'AI Generate'}
            </Button>
          </div>
        </div>
        
        {/* Validation Progress Indicators */}
        <div className="flex gap-2 mt-2">
          <Badge variant={validation.title ? "default" : "outline"} className="text-[10px]">
            {validation.title ? "✅" : "⬚"} Title
          </Badge>
          <Badge variant={validation.student ? "default" : "outline"} className="text-[10px]">
            {validation.student ? "✅" : "⬚"} Student
          </Badge>
          <Badge variant={validation.subject ? "default" : "outline"} className="text-[10px]">
            {validation.subject ? "✅" : "⬚"} Subject
          </Badge>
          <Badge variant={validation.objectives ? "default" : "outline"} className="text-[10px]">
            {validation.objectives ? "✅" : "⬚"} Objectives
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
        
        {/* Link to Booking (if available) */}
        {upcomingBookings.length > 0 && !isEditing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 mb-2">📅 Link to an Upcoming Booking</p>
            <Select value={form.booking_id} onValueChange={selectBooking}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a booking to auto-fill details..." />
              </SelectTrigger>
              <SelectContent>
                {upcomingBookings.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.date} - {b.subject} with {b.student_name || b.student_email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Quick Template Selector */}
        {availableTemplates.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-purple-700 mb-2">📋 Quick Templates</p>
            <div className="flex gap-2">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Choose a topic template..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map(t => (
                    <SelectItem key={t} value={`${form.subject}|${t}`}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={applyTemplate} disabled={!selectedTemplate}>
                Apply
              </Button>
            </div>
          </div>
        )}

        {/* Title & Student */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Session Title *</Label>
            <Input 
              placeholder="e.g. Intro to Trigonometry" 
              value={form.session_title} 
              onChange={e => set('session_title', e.target.value)} 
            />
          </div>
          <div className="space-y-1.5">
            <Label>Student *</Label>
            <Select value={form.student_email} onValueChange={selectStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.email} value={s.email}>{s.name || s.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Subject, Grade, Date, Status */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Subject *</Label>
            <Select value={form.subject} onValueChange={v => set('subject', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Grade</Label>
            <Select value={form.grade} onValueChange={v => set('grade', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Grade 10', 'Grade 11', 'Grade 12'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Session Date</Label>
            <Input type="date" value={form.session_date} onChange={e => set('session_date', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Objectives */}
        <div className="space-y-1.5">
          <Label>Learning Objectives</Label>
          <div className="flex gap-2">
            <Input 
              placeholder="e.g. Solve quadratic equations using the formula" 
              value={objectiveInput} 
              onChange={e => setObjectiveInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addObjective())} 
            />
            <Button type="button" size="sm" variant="outline" onClick={addObjective}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {form.objectives.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.objectives.map((obj, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1 text-xs">
                  {obj}
                  <button onClick={() => removeObjective(i)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Resources Used */}
        <div className="space-y-1.5">
          <Label>Resources / Materials</Label>
          <div className="flex gap-2">
            <Input 
              placeholder="e.g. CAPS Textbook Ch.5, Practice Worksheet" 
              value={resourceInput} 
              onChange={e => setResourceInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addResource())} 
            />
            <Button type="button" size="sm" variant="outline" onClick={addResource}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {form.resources_used.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.resources_used.map((res, i) => (
                <Badge key={i} variant="outline" className="gap-1 pr-1 text-xs">
                  {res}
                  <button onClick={() => removeResource(i)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Homework */}
        <div className="space-y-1.5">
          <Label>Homework Assigned</Label>
          <Textarea 
            placeholder="e.g. Complete exercises 5.1–5.6. Revise trig identities." 
            value={form.homework_assigned} 
            onChange={e => set('homework_assigned', e.target.value)} 
            rows={2} 
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label>Session Notes (private)</Label>
          <Textarea 
            placeholder="e.g. Student struggled with sin/cos graphs — revisit next session." 
            value={form.notes} 
            onChange={e => set('notes', e.target.value)} 
            rows={2} 
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving || !isValid} className="bg-primary gap-2 flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : isEditing ? 'Update Plan' : 'Save Lesson Plan'}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}