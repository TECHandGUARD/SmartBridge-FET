import { AlertCircle, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SUBJECTS } from '@/lib/subjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2, Save, ArrowLeft, Sparkles, Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const AUTO_SAVE_INTERVAL = 30000;
const STATUS_OPTIONS = [{
  value: 'draft',
  label: 'Draft',
  color: 'bg-muted text-muted-foreground dark:bg-muted/50'
}, {
  value: 'planned',
  label: 'Planned',
  color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
}, {
  value: 'completed',
  label: 'Completed',
  color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300'
}];
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
const getDraftKey = email => `lesson_plan_draft_${email}`;
export default function LessonPlanForm({
  user,
  plan,
  students,
  upcomingBookings = [],
  onSaved,
  onCancel
}) {
  const [savedPlanId, setSavedPlanId] = useState(plan?.id || null);
  const isEditing = !!savedPlanId;
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [objectiveInput, setObjectiveInput] = useState('');
  const [resourceInput, setResourceInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [error, setError] = useState(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [form, setForm] = useState({
    session_title: plan?.session_title || '',
    student_id: plan?.student_id || '',
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
    booking_id: plan?.booking_id || ''
  });
  const [reflection, setReflection] = useState({
    what_went_well: '',
    areas_for_improvement: '',
    next_session_goals: [],
    confidence_rating: ''
  });
  const [reflectionLoading, setReflectionLoading] = useState(!!plan?.id);
  const [reflectionLoadError, setReflectionLoadError] = useState(false);
  const set = (key, val) => setForm(prev => ({
    ...prev,
    [key]: val
  }));
  const setReflectionField = (key, value) => setReflection(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    let active = true;
    if (!plan?.id || !user?.id) {
      setReflectionLoading(false);
      return () => { active = false; };
    }
    setReflectionLoading(true);
    setReflectionLoadError(false);

    const loadPrivateReflection = async () => {
      try {
        const { data, error: reflectionError } = await supabase
          .from('tutor_lesson_reflections')
          .select('preparation_notes, what_went_well, areas_for_improvement, next_session_goals, confidence_rating')
          .eq('lesson_plan_id', plan.id)
          .eq('tutor_id', user.id)
          .maybeSingle();
        if (!active) return;
        if (reflectionError) {
          setReflectionLoadError(true);
          setError('Private reflection could not be loaded. Saving is disabled to protect your existing notes.');
          return;
        }
        if (data) {
          setReflection({
            what_went_well: data.what_went_well || '',
            areas_for_improvement: data.areas_for_improvement || '',
            next_session_goals: data.next_session_goals || [],
            confidence_rating: data.confidence_rating ? String(data.confidence_rating) : ''
          });
          set('notes', data.preparation_notes || '');
        } else {
          // Recover a local draft if the previous save created the plan but the
          // separate private-reflection write had to be retried.
          try {
            const draft = JSON.parse(localStorage.getItem(getDraftKey(user.email)) || 'null');
            const matchesPlan = draft?.student_id === plan.student_id && draft?.session_title === plan.session_title;
            if (matchesPlan && draft.privateReflection) {
              setReflection({
                what_went_well: draft.privateReflection.what_went_well || '',
                areas_for_improvement: draft.privateReflection.areas_for_improvement || '',
                next_session_goals: Array.isArray(draft.privateReflection.next_session_goals) ? draft.privateReflection.next_session_goals : [],
                confidence_rating: draft.privateReflection.confidence_rating ? String(draft.privateReflection.confidence_rating) : ''
              });
              set('notes', draft.notes || '');
            } else {
              setReflection({ what_went_well: '', areas_for_improvement: '', next_session_goals: [], confidence_rating: '' });
              set('notes', '');
            }
          } catch {
            setReflection({ what_went_well: '', areas_for_improvement: '', next_session_goals: [], confidence_rating: '' });
            set('notes', '');
          }
        }
      } catch (reflectionError) {
        if (!active) return;
        console.error('Could not load private tutor reflection:', reflectionError);
        setReflectionLoadError(true);
        setError('Private reflection could not be loaded. Saving is disabled to protect your existing notes.');
      } finally {
        if (active) setReflectionLoading(false);
      }
    };

    loadPrivateReflection();
    return () => { active = false; };
  }, [plan?.id, plan?.student_id, plan?.session_title, user?.id, user?.email]);
  useEffect(() => {
    if (!isEditing && !draftLoaded) {
      const draftKey = getDraftKey(user?.email);
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.session_title || draft.objectives?.length > 0) {
            if (window.confirm('You have an unsaved draft from your last session. Load it?')) {
              const { privateReflection, ...formDraft } = draft;
              setForm({ ...formDraft, student_id: formDraft.student_id || '', booking_id: formDraft.booking_id || '', notes: formDraft.notes || '' });
              if (privateReflection) setReflection({
                what_went_well: privateReflection.what_went_well || '',
                areas_for_improvement: privateReflection.areas_for_improvement || '',
                next_session_goals: Array.isArray(privateReflection.next_session_goals) ? privateReflection.next_session_goals : [],
                confidence_rating: privateReflection.confidence_rating ? String(privateReflection.confidence_rating) : ''
              });
              setDraftLoaded(true);
              toast.info('Draft loaded');
            }
          }
        } catch (e) {
          console.warn('Failed to parse draft:', e);
        }
      }
    }
  }, [isEditing, user?.email, draftLoaded]);
  useEffect(() => {
    if (!form.session_title && form.objectives.length === 0) return;
    if (saving) return;
    const autoSaveInterval = setInterval(() => {
      const draftKey = getDraftKey(user?.email);
      localStorage.setItem(draftKey, JSON.stringify({ ...form, privateReflection: reflection }));
      console.log('📝 Draft auto-saved');
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(autoSaveInterval);
  }, [form, reflection, saving, user?.email]);
  const addObjective = () => {
    if (!objectiveInput.trim()) return;
    set('objectives', [...form.objectives, objectiveInput.trim()]);
    setObjectiveInput('');
  };
  const removeObjective = i => set('objectives', form.objectives.filter((_, idx) => idx !== i));
  const addResource = () => {
    if (!resourceInput.trim()) return;
    set('resources_used', [...form.resources_used, resourceInput.trim()]);
    setResourceInput('');
  };
  const removeResource = i => set('resources_used', form.resources_used.filter((_, idx) => idx !== i));
  const selectStudent = studentId => {
    const student = students.find(item => item.id === studentId);
    if (!student) return;
    set('student_id', studentId);
    set('student_email', student.email);
    set('student_name', student.name || student.email || 'Learner');
    set('booking_id', '');
  };
  const selectBooking = bookingId => {
    const booking = upcomingBookings.find(b => b.id === bookingId);
    if (booking) {
      set('booking_id', bookingId);
      set('student_id', booking.student_id);
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
    setError(null);
    try {
      const {
        data,
        error: invokeError
      } = await supabase.functions.invoke('generate-lesson-plan', {
        body: {
          subject: form.subject,
          topic: form.session_title,
          grade: form.grade,
          curriculum: 'CAPS',
          user_email: user?.email
        }
      });
      if (invokeError) throw invokeError;
      if (data) {
        if (data.objectives?.length) set('objectives', data.objectives);
        if (data.resources?.length) set('resources_used', data.resources);
        if (data.homework) set('homework_assigned', data.homework);
        if (data.notes) set('notes', data.notes);
        toast.success('AI-generated content added! Review and adjust as needed.');
        await Promise.resolve(supabase.from('activity_log').insert({
          event_type: 'lesson_plan_ai_generated',
          user_email: user.email,
          user_id: user.id || null,
          description: `AI generated lesson plan for ${form.subject} - ${form.session_title}`,
          metadata: {
            subject: form.subject,
            topic: form.session_title,
            grade: form.grade
          }
        })).catch(() => {});
      }
    } catch (err) {
      console.error('Error generating AI content:', err);
      setError(err.message || 'Failed to generate AI content');
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
      booking_id: null
    };
    setForm(duplicated);
    toast.info('Plan duplicated. Edit and save as new.');
  };
  const clearDraft = () => {
    const draftKey = getDraftKey(user?.email);
    localStorage.removeItem(draftKey);
    toast.info('Draft cleared');
    setDraftLoaded(true);
  };
  const handleSave = async () => {
    if (!form.session_title || !form.student_id || !form.student_email || !form.subject) {
      toast.error('Please fill in title, student, and subject.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        tutor_email: user.email,
        tutor_id: user.id,
        session_title: form.session_title,
        student_id: form.student_id,
        student_email: form.student_email,
        student_name: form.student_name,
        session_date: form.session_date || null,
        subject: form.subject,
        grade: form.grade,
        objectives: form.objectives,
        resources_used: form.resources_used,
        homework_assigned: form.homework_assigned,
        notes: null,
        reflection_notes: null,
        status: form.status,
        booking_id: form.booking_id || null,
        updated_at: new Date().toISOString()
      };
      const { data: progressRecord, error: progressError } = await supabase
        .from('study_progress')
        .select('id')
        .eq('student_id', form.student_id)
        .eq('subject', form.subject)
        .maybeSingle();
      if (progressError) throw progressError;
      payload.student_progress_id = progressRecord?.id || null;

      let persistedPlanId = savedPlanId;
      const wasNewPlan = !plan?.id;
      if (isEditing) {
        const { data: updatedPlan, error: updateError } = await supabase
          .from('lesson_plans')
          .update(payload)
          .eq('id', savedPlanId)
          .eq('tutor_id', user.id)
          .select('id')
          .single();
        if (updateError) throw updateError;
        persistedPlanId = updatedPlan.id;
        toast.success('Lesson plan updated.');
      } else {
        const { data: createdPlan, error: insertError } = await supabase
          .from('lesson_plans')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select('id')
          .single();
        if (insertError) throw insertError;
        persistedPlanId = createdPlan.id;
        setSavedPlanId(createdPlan.id);
        toast.success('Lesson plan created!');
        await Promise.resolve(supabase.from('activity_log').insert({
          event_type: 'lesson_plan_created',
          user_email: user.email,
          user_id: user.id,
          description: `Created lesson plan for ${form.subject} - ${form.student_email}`,
          metadata: {
            plan_id: persistedPlanId,
            subject: form.subject,
            student: form.student_email,
            status: form.status
          }
        })).catch(() => {});
      }

      const reflectionPayload = {
        lesson_plan_id: persistedPlanId,
        tutor_id: user.id,
        preparation_notes: String(form.notes || '').trim() || null,
        what_went_well: String(reflection.what_went_well || '').trim() || null,
        areas_for_improvement: String(reflection.areas_for_improvement || '').trim() || null,
        next_session_goals: (Array.isArray(reflection.next_session_goals) ? reflection.next_session_goals : []).map(goal => String(goal).trim()).filter(Boolean),
        confidence_rating: reflection.confidence_rating ? Number(reflection.confidence_rating) : null,
        updated_at: new Date().toISOString()
      };
      const hasPrivateReflection = Boolean(
        reflectionPayload.preparation_notes ||
        reflectionPayload.what_went_well ||
        reflectionPayload.areas_for_improvement ||
        reflectionPayload.next_session_goals.length ||
        reflectionPayload.confidence_rating
      );
      const reflectionResult = hasPrivateReflection
        ? await supabase.from('tutor_lesson_reflections').upsert(reflectionPayload, { onConflict: 'lesson_plan_id,tutor_id' })
        : await supabase.from('tutor_lesson_reflections').delete().eq('lesson_plan_id', persistedPlanId).eq('tutor_id', user.id);
      if (reflectionResult.error) {
        setError('The lesson plan is saved, but the private reflection did not save. Your notes remain in this form; try saving again.');
        toast.error('Lesson plan saved, but the private reflection needs another save attempt.');
        return;
      }
      if (wasNewPlan) clearDraft();
      onSaved?.();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save');
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  const validation = {
    title: form.session_title.trim().length > 0,
    student: !!form.student_id && !!form.student_email,
    subject: !!form.subject,
    objectives: form.objectives.length > 0
  };
  const isValid = validation.title && validation.student && validation.subject;
  const availableTemplates = form.subject ? Object.keys(QUICK_TEMPLATES[form.subject] || {}) : [];
  if (previewMode) {
    return <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewMode(false)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-base font-playfair">Lesson Plan Preview</CardTitle>
            </div>
            <div className="flex gap-2">
              {!isEditing && <Button size="sm" variant="outline" onClick={clearDraft} className="text-xs">
                  Clear Draft
                </Button>}
              <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3 text-green-500" /> Tutor preview
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="bg-muted/30 rounded-lg p-4 mb-4 dark:bg-muted/10">
              <h2 className="text-lg font-semibold mb-2">{form.session_title || 'Untitled Lesson'}</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><strong>Student:</strong> {form.student_name || form.student_email || 'Not selected'}</p>
                <p><strong>Subject:</strong> {form.subject || 'Not selected'} | <strong>Grade:</strong> {form.grade}</p>
                <p><strong>Date:</strong> {form.session_date || 'TBD'}</p>
                <p><strong>Status:</strong> {STATUS_OPTIONS.find(s => s.value === form.status)?.label}</p>
              </div>
            </div>

            <h3 className="text-md font-semibold mt-4 mb-2">🎯 Learning Objectives</h3>
            {form.objectives.length > 0 ? <ul className="list-disc pl-5 space-y-1">
                {form.objectives.map((obj, i) => <li key={i}>{obj}</li>)}
              </ul> : <p className="text-muted-foreground italic">No objectives added yet.</p>}

            <h3 className="text-md font-semibold mt-4 mb-2">📚 Resources / Materials</h3>
            {form.resources_used.length > 0 ? <ul className="list-disc pl-5 space-y-1">
                {form.resources_used.map((res, i) => <li key={i}>{res}</li>)}
              </ul> : <p className="text-muted-foreground italic">No resources listed.</p>}

            <h3 className="text-md font-semibold mt-4 mb-2">✏️ Homework</h3>
            <p>{form.homework_assigned || 'No homework assigned'}</p>

            {(form.notes || reflection.what_went_well || reflection.areas_for_improvement || reflection.next_session_goals.length) && <>
                <h3 className="text-md font-semibold mt-4 mb-2">🔒 Tutor-only reflection</h3>
                {form.notes && <p className="text-muted-foreground whitespace-pre-wrap">{form.notes}</p>}
                {reflection.what_went_well && <p><strong>What went well:</strong> {reflection.what_went_well}</p>}
                {reflection.areas_for_improvement && <p><strong>To adjust:</strong> {reflection.areas_for_improvement}</p>}
                {reflection.next_session_goals.length > 0 && <p><strong>Next session goals:</strong> {reflection.next_session_goals.join('; ')}</p>}
                {reflection.confidence_rating && <p><strong>Tutor confidence:</strong> {reflection.confidence_rating}/5</p>}
              </>}
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={() => setPreviewMode(false)} variant="outline" className="flex-1">
              Back to Edit
            </Button>
            <Button onClick={handleSave} disabled={saving || !isValid || reflectionLoading || reflectionLoadError} className="bg-primary gap-2 flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : isEditing ? 'Update Plan' : 'Save Plan'}
            </Button>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="border-primary/20 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="text-base font-playfair">
              {isEditing ? 'Edit Lesson Plan' : 'New Lesson Plan'}
            </CardTitle>
            <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" /> Tutor workspace
            </Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={duplicatePlan}>
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setPreviewMode(true)}>
              <Eye className="w-3.5 h-3.5" /> Preview
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/20" onClick={generateWithAI} disabled={generatingAI || !form.session_title}>
              <Sparkles className="w-3.5 h-3.5" />
              {generatingAI ? 'Generating...' : 'AI Generate'}
            </Button>
          </div>
        </div>

        {}
        <div className="flex gap-2 mt-2 flex-wrap">
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

        {}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 dark:bg-red-950/20 dark:border-red-800">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>}

        {}
        {upcomingBookings.length > 0 && !isEditing && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-950/20 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">📅 Link to an Upcoming Booking</p>
            <Select value={form.booking_id} onValueChange={selectBooking}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a booking to auto-fill details..." />
              </SelectTrigger>
              <SelectContent>
                {upcomingBookings.map(b => <SelectItem key={b.id} value={b.id}>
                    {b.date} - {b.subject} with {b.student_name || b.student_email}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>}

        {}
        {availableTemplates.length > 0 && <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 dark:bg-purple-950/20 dark:border-purple-800">
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">📋 Quick Templates</p>
            <div className="flex gap-2">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Choose a topic template..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map(t => <SelectItem key={t} value={`${form.subject}|${t}`}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={applyTemplate} disabled={!selectedTemplate}>
                Apply
              </Button>
            </div>
          </div>}

        {}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Session Title *</Label>
            <Input placeholder="e.g. Intro to Trigonometry" value={form.session_title} onChange={e => set('session_title', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Student *</Label>
            <Select value={form.student_id} onValueChange={selectStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => <SelectItem key={student.id} value={student.id}>{student.name || student.email || 'Learner'}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {}
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

        {}
        <div className="rounded-lg border border-blue-200/70 bg-blue-50/40 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/10 dark:text-blue-100">
          When you share a plan, the learner receives its title, objectives, resources and homework. Your preparation notes and teaching reflection are stored separately and remain tutor-only.
        </div>

        <div className="space-y-1.5">
          <Label>Learning Objectives</Label>
          <div className="flex gap-2">
            <Input placeholder="e.g. Solve quadratic equations using the formula" value={objectiveInput} onChange={e => setObjectiveInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addObjective())} />
            <Button type="button" size="sm" variant="outline" onClick={addObjective}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {form.objectives.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">
              {form.objectives.map((obj, i) => <Badge key={i} variant="secondary" className="gap-1 pr-1 text-xs">
                  {obj}
                  <button onClick={() => removeObjective(i)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>)}
            </div>}
        </div>

        {}
        <div className="space-y-1.5">
          <Label>Resources / Materials</Label>
          <div className="flex gap-2">
            <Input placeholder="e.g. CAPS Textbook Ch.5, Practice Worksheet" value={resourceInput} onChange={e => setResourceInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addResource())} />
            <Button type="button" size="sm" variant="outline" onClick={addResource}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {form.resources_used.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">
              {form.resources_used.map((res, i) => <Badge key={i} variant="outline" className="gap-1 pr-1 text-xs">
                  {res}
                  <button onClick={() => removeResource(i)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>)}
            </div>}
        </div>

        {}
        <div className="space-y-1.5">
          <Label>Homework Assigned</Label>
          <Textarea placeholder="e.g. Complete exercises 5.1–5.6. Revise trig identities." value={form.homework_assigned} onChange={e => set('homework_assigned', e.target.value)} rows={2} />
        </div>

        {}
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3 space-y-3 dark:border-amber-900/50 dark:bg-amber-950/10">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-700 dark:text-amber-300" />
            <div>
              <p className="text-sm font-semibold">Tutor-only reflection</p>
              <p className="text-xs text-muted-foreground">Private to your tutor account. Learners cannot read these notes.</p>
            </div>
          </div>
          {reflectionLoading && <p className="text-xs text-muted-foreground">Loading saved reflection…</p>}
          {reflectionLoadError && <p className="text-xs text-destructive">Your saved reflection could not be loaded. Saving is disabled to protect it.</p>}
          <div className="space-y-1.5">
            <Label>Preparation and private session notes</Label>
            <Textarea placeholder="Teaching observations, preparation reminders and private notes…" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>What went well?</Label>
            <Textarea placeholder="Which explanations, activities or approaches worked?" value={reflection.what_went_well} onChange={e => setReflectionField('what_went_well', e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>What would you adjust next time?</Label>
            <Textarea placeholder="Identify concepts to revisit or teaching approaches to improve…" value={reflection.areas_for_improvement} onChange={e => setReflectionField('areas_for_improvement', e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Goals for the next session (one per line)</Label>
            <Textarea placeholder="Revisit the worked examples\nCheck understanding with a short exercise" value={reflection.next_session_goals.join('\n')} onChange={e => setReflectionField('next_session_goals', e.target.value.split('\n').map(goal => goal.trim()).filter(Boolean))} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Tutor confidence in lesson delivery</Label>
            <Select value={reflection.confidence_rating} onValueChange={value => setReflectionField('confidence_rating', value)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select a self-reflection rating" /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(value => <SelectItem key={value} value={String(value)}>{value} / 5</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">This is your reflection on the lesson, not a learner grade or assessment score.</p>
          </div>
        </div>

        {}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving || !isValid || reflectionLoading || reflectionLoadError} className="bg-primary gap-2 flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : isEditing ? 'Update Plan' : 'Save Lesson Plan'}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>;
}
