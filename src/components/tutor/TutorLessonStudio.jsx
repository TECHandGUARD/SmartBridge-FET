import { useEffect, useMemo, useState } from 'react';
import { Download, Printer, RotateCcw, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import LessonDesignSheet, { LESSON_THEMES } from './LessonDesignSheet';

const STORAGE_KEY = 'smartbridge:tutor-lesson-studio:v1';
const METHODS = {
  'Worked example': { prompt: 'Model one example, think aloud, then ask the learner to complete a similar one.', visual: 'steps' },
  'Concept map': { prompt: 'Draw the main concept and connect key ideas with labelled arrows.', visual: 'map' },
  'Compare and contrast': { prompt: 'Use a two-column comparison and ask the learner to justify each difference.', visual: 'compare' },
  'Number line': { prompt: 'Mark key values on a number line and show each step with arrows.', visual: 'number' },
  'Diagram and labels': { prompt: 'Show a simple labelled diagram; hide labels and ask the learner to explain them.', visual: 'diagram' },
  'Real-world scenario': { prompt: 'Start with a familiar South African context, sketch the situation, then solve together.', visual: 'scenario' }
};
const TEMPLATES = {
  'Explain → practise → check': [
    { title: 'Connect & diagnose', minutes: 5, detail: 'Ask one question to identify prior knowledge and misconceptions.' },
    { title: 'Explain with a visual', minutes: 12, detail: 'Model the idea using the visual method selected below.' },
    { title: 'Guided practice', minutes: 15, detail: 'Solve a problem together and ask the learner to explain each step.' },
    { title: 'Independent practice', minutes: 15, detail: 'Give two to four increasingly challenging questions.' },
    { title: 'Exit ticket & feedback', minutes: 8, detail: 'Ask one independent question, give feedback and agree on next steps.' }
  ],
  'Exam preparation': [
    { title: 'Recall warm-up', minutes: 5, detail: 'Ask two retrieval questions without notes.' },
    { title: 'Worked past-paper example', minutes: 15, detail: 'Model how to interpret the question and mark allocation.' },
    { title: 'Timed practice', minutes: 20, detail: 'Learner attempts a comparable question independently.' },
    { title: 'Marking & error analysis', minutes: 10, detail: 'Compare against a verified memo; identify one misconception.' },
    { title: 'Revision plan', minutes: 5, detail: 'Choose a targeted revision task and re-test date.' }
  ],
  'Investigate & discover': [
    { title: 'Prediction', minutes: 5, detail: 'Learner predicts an outcome and gives a reason.' },
    { title: 'Explore a model', minutes: 15, detail: 'Use a diagram, simulation or safe hands-on model.' },
    { title: 'Discuss evidence', minutes: 12, detail: 'Compare observations with the prediction.' },
    { title: 'Apply understanding', minutes: 15, detail: 'Solve a new problem using the evidence.' },
    { title: 'Reflect & assess', minutes: 8, detail: 'Ask the learner to explain what changed in their thinking.' }
  ]
};
const initial = () => ({
  subject: 'Mathematics', grade: 'Grade 11', topic: '', duration: 55,
  template: 'Explain → practise → check', method: 'Worked example', designTheme: 'ocean',
  objective: '', misconception: '', success: '', resources: '',
  support: 'Use shorter questions, an annotated example and a visual scaffold.',
  stretch: 'Ask the learner to create and explain a harder example.',
  assessment: 'One independent exit-ticket question, marked against the learning objective.',
  followup: '', stages: TEMPLATES['Explain → practise → check'].map(s => ({ ...s }))
});
export function lessonPlanText(plan) {
  const lines = [
    'SMARTBRIDGE FET — TUTOR LESSON PLAN',
    `Subject: ${plan.subject} | ${plan.grade} | Topic: ${plan.topic || 'To be completed'}`,
    `Duration: ${plan.duration} minutes | Structure: ${plan.template}`,
    '',
    `Learning objective: ${plan.objective || 'To be completed'}`,
    `Success criteria: ${plan.success || 'To be completed'}`,
    `Prior misconception to check: ${plan.misconception || 'To be completed'}`,
    '',
    `Visual learning strategy: ${plan.method}`,
    METHODS[plan.method]?.prompt || '',
    '',
    'LESSON SEQUENCE',
    ...plan.stages.map((s, i) => `${i + 1}. ${s.title} (${s.minutes} min): ${s.detail}`),
    '',
    `Resources: ${plan.resources || 'To be completed'}`,
    `Additional support: ${plan.support}`,
    `Extension: ${plan.stretch}`,
    `Assessment for learning: ${plan.assessment}`,
    `Follow-up: ${plan.followup || 'To be completed'}`,
    '',
    'Tutor review: Check content, timing, curriculum alignment, learner needs and source accuracy before teaching.'
  ];
  return lines.join('\n');
}
function VisualPreview({ method }) {
  const common = 'rounded-lg border border-primary/20 bg-primary/5 p-3 text-center text-sm';
  if (method === 'Concept map') return <div className="flex flex-col items-center gap-2"><div className={common}>Main concept</div><div className="h-4 border-l-2 border-primary" /><div className="grid grid-cols-3 gap-2 w-full"><div className={common}>Idea A</div><div className={common}>Idea B</div><div className={common}>Idea C</div></div></div>;
  if (method === 'Compare and contrast') return <div className="grid grid-cols-2 gap-2"><div className={common}>Concept A<hr className="my-2"/>Features & examples</div><div className={common}>Concept B<hr className="my-2"/>Features & examples</div></div>;
  if (method === 'Number line') return <div className="px-3 py-6"><div className="flex justify-between text-sm"><span>−2</span><span>−1</span><span>0</span><span>1</span><span>2</span></div><div className="border-t-2 border-primary mt-2" /></div>;
  if (method === 'Diagram and labels') return <div className="flex items-center justify-center gap-3"><div className="h-20 w-20 rounded-full border-4 border-primary/60 grid place-items-center">Model</div><div className="text-sm">→ Label 1<br/>→ Label 2<br/>→ Explain why</div></div>;
  if (method === 'Real-world scenario') return <div className={common}>Everyday situation → Sketch or model → Solve → Explain</div>;
  return <div className="grid grid-cols-3 gap-2"><div className={common}>1. I do</div><div className={common}>2. We do</div><div className={common}>3. You do</div></div>;
}
export default function TutorLessonStudio() {
  const [plan, setPlan] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return;
      const p = JSON.parse(data);
      if (p && Array.isArray(p.stages) && TEMPLATES[p.template] && METHODS[p.method]) {
        setPlan({ ...initial(), ...p, designTheme: LESSON_THEMES[p.designTheme] ? p.designTheme : 'ocean' });
        setSaved(true);
      }
    } catch { /* corrupted local draft is ignored */ }
  }, []);
  const set = (key, value) => { setPlan(p => ({ ...p, [key]: value })); setSaved(false); };
  const minutes = useMemo(() => plan.stages.reduce((n, s) => n + (Number(s.minutes) || 0), 0), [plan.stages]);
  const updateStage = (index, key, value) => {
    setPlan(p => ({ ...p, stages: p.stages.map((s, i) => i === index ? { ...s, [key]: value } : s) }));
    setSaved(false);
  };
  const applyTemplate = value => { setPlan(p => ({ ...p, template: value, stages: TEMPLATES[value].map(s => ({ ...s })), duration: 55 })); setSaved(false); };
  const saveDraft = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      setSaved(true);
      toast.success('Draft saved on this device');
    } catch { toast.error('Could not save on this device. Export a copy instead.'); }
  };
  const exportText = () => {
    const blob = new Blob([lessonPlanText(plan)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'smartbridge-lesson-plan.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const reset = () => { localStorage.removeItem(STORAGE_KEY); setPlan(initial()); setSaved(false); setConfirmReset(false); };
  const field = (key, title, hint, rows = 2) => <label className="block space-y-1 text-sm font-medium">{title}<textarea rows={rows} value={plan[key]} onChange={e => set(key, e.target.value)} placeholder={hint} maxLength={2000} className="block w-full rounded-lg border bg-background p-3 text-sm font-normal" /></label>;
  return <section className="space-y-5 rounded-xl border bg-card p-4 sm:p-6" aria-label="Tutor Lesson Studio">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/>Tutor Lesson Studio</h2><p className="text-sm text-muted-foreground">Create, style and print a colorful lesson plan with editable activities and visual teaching ideas — no AI credits required.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={saveDraft} className="rounded-lg border px-3 py-2 text-sm inline-flex items-center gap-1"><Save size={15}/> {saved ? 'Saved locally' : 'Save draft'}</button>
        <button type="button" onClick={exportText} className="rounded-lg border px-3 py-2 text-sm inline-flex items-center gap-1"><Download size={15}/> Export</button>
        <button type="button" onClick={() => setPreview(v => !v)} className="rounded-lg border px-3 py-2 text-sm">{preview ? 'Edit' : 'Preview'}</button>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">Privacy: This studio does not collect learner names. Saved drafts remain in this browser, not in your SmartBridge account. Avoid entering personal learner information on shared devices.</p>
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4 sm:p-5">
      <div><h3 className="font-bold text-base">Choose your lesson plan design</h3><p className="text-xs text-muted-foreground">Four original colorful layouts. Switch designs without losing lesson content. Your selection is saved with your draft.</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Lesson plan color theme">
        {Object.entries(LESSON_THEMES).map(([key, theme]) => <button type="button" key={key} aria-pressed={plan.designTheme === key} onClick={() => set('designTheme', key)} className={`overflow-hidden rounded-xl border-2 bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${plan.designTheme === key ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
          <div className="h-16 p-2" style={{ background: `linear-gradient(125deg, ${theme.accent}, ${theme.secondary})` }}><div className="h-2 w-2/3 rounded-full bg-white/85"/><div className="mt-2 h-1.5 w-1/2 rounded-full bg-white/50"/><div className="mt-2 flex gap-1"><span className="h-3 w-7 rounded bg-white/70"/><span className="h-3 w-7 rounded bg-white/35"/></div></div>
          <div className="p-2.5"><span className="block text-sm font-bold">{theme.name}</span><span className="block text-xs text-muted-foreground">{theme.description}</span>{plan.designTheme === key && <span className="mt-1 block text-xs font-semibold text-primary">Selected ✓</span>}</div>
        </button>)}
      </div>
    </div>
    {preview ? <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3">
        <p className="text-sm text-muted-foreground">Your designed lesson plan is ready to print or save as PDF. Choose another color theme below at any time.</p>
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground inline-flex items-center gap-2"><Printer size={16}/> Print / Save PDF</button>
      </div>
      <LessonDesignSheet plan={plan} theme={plan.designTheme} />
    </div> : <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium">Subject<input className="mt-1 w-full rounded-lg border bg-background p-2" maxLength={80} value={plan.subject} onChange={e => set('subject',e.target.value)}/></label>
        <label className="text-sm font-medium">Grade<select className="mt-1 w-full rounded-lg border bg-background p-2" value={plan.grade} onChange={e => set('grade',e.target.value)}>{[10,11,12].map(n=><option key={n}>Grade {n}</option>)}</select></label>
        <label className="text-sm font-medium">Topic<input className="mt-1 w-full rounded-lg border bg-background p-2" maxLength={160} value={plan.topic} onChange={e => set('topic',e.target.value)} placeholder="e.g. Linear equations"/></label>
        <label className="text-sm font-medium">Session length (minutes)<input type="number" min="15" max="180" className="mt-1 w-full rounded-lg border bg-background p-2" value={plan.duration} onChange={e => set('duration',Math.min(180,Math.max(15,Number(e.target.value)||15)))}/></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {field('objective','Learning objective','By the end, the learner should be able to…')}
        {field('success','Success criteria','What would demonstrate understanding?')}
        {field('misconception','Prior knowledge / misconception','What common mistake should you diagnose?')}
        {field('resources','Materials and resources','Worksheet, textbook pages, approved diagram or simulation')}
      </div>
      <div className="space-y-3 rounded-xl border p-4">
        <h3 className="font-semibold">Visual teaching strategy</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Choose a visual method<select className="mt-1 w-full rounded-lg border bg-background p-2" value={plan.method} onChange={e => set('method',e.target.value)}>{Object.keys(METHODS).map(k=><option key={k}>{k}</option>)}</select></label>
          <p className="text-sm text-muted-foreground">{METHODS[plan.method].prompt}</p>
        </div>
        <VisualPreview method={plan.method}/>
        <p className="text-xs text-muted-foreground">Illustrations are teaching prompts, not subject-specific verified diagrams. Check all scientific and mathematical representations before teaching.</p>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3"><h3 className="font-semibold">Lesson sequence</h3><label className="text-sm">Teaching structure<select className="ml-2 rounded-lg border bg-background p-2" value={plan.template} onChange={e => applyTemplate(e.target.value)}>{Object.keys(TEMPLATES).map(k=><option key={k}>{k}</option>)}</select></label></div>
        <p className={`text-sm ${minutes > plan.duration ? 'text-destructive font-semibold' : 'text-muted-foreground'}`} role="status">Planned: {minutes} / {plan.duration} minutes {minutes > plan.duration ? '— reduce activities or increase session length.' : ''}</p>
        {plan.stages.map((stage,i)=><div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_90px]"><label className="text-sm font-medium">Step {i+1}<input className="mt-1 w-full rounded border bg-background p-2" maxLength={120} value={stage.title} onChange={e => updateStage(i,'title',e.target.value)}/></label><label className="text-sm font-medium">Minutes<input type="number" min="1" max="180" className="mt-1 w-full rounded border bg-background p-2" value={stage.minutes} onChange={e => updateStage(i,'minutes',Math.min(180,Math.max(1,Number(e.target.value)||1)))}/></label><label className="text-sm font-medium sm:col-span-2">Activity / tutor instructions<textarea rows={2} maxLength={1200} className="mt-1 w-full rounded border bg-background p-2" value={stage.detail} onChange={e => updateStage(i,'detail',e.target.value)}/></label></div>)}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {field('support','Support for a learner who is struggling','Simplify, model, provide a scaffold')}
        {field('stretch','Extension for a confident learner','Challenge, explain, transfer to new context')}
        {field('assessment','Check understanding / exit ticket','Ask, observe, mark, give actionable feedback')}
        {field('followup','After-session action','Homework, revision, next lesson focus')}
      </div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={saveDraft} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save this draft</button><button type="button" onClick={exportText} className="rounded-lg border px-4 py-2 text-sm">Export lesson plan</button><button type="button" onClick={()=>setConfirmReset(true)} className="rounded-lg border px-4 py-2 text-sm inline-flex items-center gap-1"><RotateCcw size={14}/> Start over</button></div>
      {confirmReset && <div className="rounded-lg border border-destructive/50 p-3 text-sm" role="alert">Discard your current draft? <button type="button" className="ml-2 underline font-semibold" onClick={reset}>Yes, discard</button><button type="button" className="ml-3 underline" onClick={()=>setConfirmReset(false)}>Cancel</button></div>}
    </>}
    <p className="text-xs text-muted-foreground">Built for planning tutoring sessions; not an automatically verified CAPS lesson plan. Review curriculum requirements and adapt to each learner.</p>
  </section>;
}
