import { BookOpen, CalendarDays, CheckCircle2, Clock3, Lightbulb, Target, Zap } from 'lucide-react';

export const LESSON_THEMES = Object.freeze({
  ocean: { name: 'Ocean Blue', description: 'Clean and professional', accent: '#155eef', secondary: '#06b6d4', ink: '#12305c', soft: '#eaf5ff', paper: '#ffffff', border: '#b8d8f7', dark: false },
  sunrise: { name: 'Sunrise Pop', description: 'Warm and energetic', accent: '#b43b18', secondary: '#e99b12', ink: '#612e22', soft: '#fff0d9', paper: '#fffefa', border: '#f7d4b3', dark: false },
  botanical: { name: 'Botanical', description: 'Calm and balanced', accent: '#176b53', secondary: '#9fba4b', ink: '#204b40', soft: '#eaf6eb', paper: '#fffefa', border: '#b7d9c1', dark: false },
  midnight: { name: 'Midnight Violet', description: 'Bold and modern', accent: '#5b39bf', secondary: '#d36cae', ink: '#30235e', soft: '#f0eafd', paper: '#ffffff', border: '#d3c5f4', dark: false }
});

const show = value => String(value || '').trim() || 'Add your details here';
const visuals = {
  'Worked example': ['I do', 'We do', 'You do'],
  'Concept map': ['Main idea', 'Connection', 'Example'],
  'Compare and contrast': ['Concept A', 'Similarities', 'Concept B'],
  'Number line': ['Start', 'Change', 'Result'],
  'Diagram and labels': ['Observe', 'Label', 'Explain'],
  'Real-world scenario': ['Situation', 'Model', 'Solution']
};

function InfoBlock({ title, children, accent }) {
  return <div className="lesson-design-block" style={{ borderColor: 'var(--lesson-border)' }}>
    <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider" style={{ color: accent || 'var(--lesson-accent)' }}>{title}</h3>
    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed" style={{ color: 'var(--lesson-ink)' }}>{children}</div>
  </div>;
}

export default function LessonDesignSheet({ plan, theme = 'ocean' }) {
  const palette = LESSON_THEMES[theme] || LESSON_THEMES.ocean;
  const cssVars = {
    '--lesson-accent': palette.accent,
    '--lesson-secondary': palette.secondary,
    '--lesson-ink': palette.ink,
    '--lesson-soft': palette.soft,
    '--lesson-paper': palette.paper,
    '--lesson-border': palette.border
  };
  const stages = Array.isArray(plan.stages) ? plan.stages : [];
  const totalMinutes = stages.reduce((sum, stage) => sum + (Number(stage.minutes) || 0), 0);
  const diagram = visuals[plan.method] || visuals['Worked example'];
  return <article className="lesson-design-sheet mx-auto w-full max-w-[800px] overflow-hidden rounded-2xl border shadow-sm" style={{ ...cssVars, backgroundColor: 'var(--lesson-paper)', borderColor: 'var(--lesson-border)', color: 'var(--lesson-ink)' }} aria-label={`${palette.name} lesson plan preview`}>
    <style>{`
      .lesson-design-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .lesson-design-sheet .lesson-design-block { padding: 14px 16px; border: 1px solid; border-radius: 14px; background: var(--lesson-paper); break-inside: avoid; }
      .lesson-design-sheet .lesson-design-stage { break-inside: avoid; }
      @media print {
        @page { size: A4; margin: 11mm; }
        body * { visibility: hidden !important; }
        .lesson-design-sheet, .lesson-design-sheet * { visibility: visible !important; }
        .lesson-design-sheet { position: absolute !important; top: 0; left: 0; width: 100% !important; max-width: none !important; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; }
        .lesson-design-sheet header, .lesson-design-sheet section, .lesson-design-sheet footer { break-inside: avoid; }
      }
    `}</style>
    <header className="relative overflow-hidden px-5 py-7 sm:px-8 sm:py-9" style={{ background: `linear-gradient(125deg, ${palette.accent} 0%, ${palette.secondary} 100%)`, color: '#ffffff' }}>
      <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full border-[24px] border-white/15" aria-hidden="true" />
      <div className="absolute -bottom-20 right-24 h-36 w-36 rounded-full bg-white/10" aria-hidden="true" />
      <p className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"><BookOpen size={13}/> SmartBridge FET · Tutor Studio</p>
      <h2 className="relative max-w-[560px] break-words text-2xl font-extrabold leading-tight sm:text-4xl">{show(plan.topic) === 'Add your details here' ? 'My Lesson Plan' : plan.topic}</h2>
      <p className="relative mt-2 text-sm font-medium text-white/90">{show(plan.subject)} · {show(plan.grade)}</p>
      <div className="relative mt-5 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5"><Clock3 size={13}/>{plan.duration} min session</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5"><CalendarDays size={13}/>{show(plan.template)}</span>
      </div>
    </header>
    <div className="space-y-5 px-4 py-6 sm:px-8 sm:py-8">
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--lesson-soft)' }}>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--lesson-accent)' }}><Target size={17}/> Learning objective</h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{show(plan.objective)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--lesson-soft)' }}>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--lesson-accent)' }}><CheckCircle2 size={17}/> Success criteria</h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{show(plan.success)}</p>
        </div>
      </section>
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-extrabold"><span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: 'var(--lesson-secondary)' }}/> Teaching journey</h3>
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: 'var(--lesson-soft)', color: 'var(--lesson-accent)' }}>{totalMinutes} minutes planned</span>
        </div>
        <div className="space-y-2.5">
          {stages.map((stage, i) => <div className="lesson-design-stage flex gap-3 rounded-xl border p-3 sm:p-4" key={i} style={{ borderColor: 'var(--lesson-border)' }}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold" style={{ backgroundColor: 'var(--lesson-soft)', color: 'var(--lesson-accent)' }}>{String(i + 1).padStart(2, '0')}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-1"><h4 className="font-bold text-sm">{show(stage.title)}</h4><span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: 'var(--lesson-soft)', color: 'var(--lesson-accent)' }}>{stage.minutes} min</span></div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{show(stage.detail)}</p>
            </div>
          </div>)}
        </div>
      </section>
      <section className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--lesson-soft)' }}>
        <h3 className="mb-1 flex items-center gap-2 text-base font-extrabold"><Lightbulb size={19} style={{ color: 'var(--lesson-accent)' }}/> Visual learning strategy</h3>
        <p className="text-sm font-semibold" style={{ color: 'var(--lesson-accent)' }}>{show(plan.method)}</p>
        <div className="mt-4 grid grid-cols-3 items-center gap-1.5 sm:gap-3">
          {diagram.map((item, i) => <div key={item} className="relative rounded-xl border bg-white px-2 py-4 text-center text-xs font-bold sm:text-sm" style={{ borderColor: 'var(--lesson-border)', color: 'var(--lesson-ink)' }}>{item}{i < 2 && <span aria-hidden="true" className="absolute -right-2.5 top-1/2 z-10 -translate-y-1/2 text-lg" style={{ color: 'var(--lesson-accent)' }}>→</span>}</div>)}
        </div>
        <p className="mt-3 text-xs">Illustrative teaching scaffold; adapt diagrams and examples to the actual topic.</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <InfoBlock title="Prior knowledge & misconceptions">{show(plan.misconception)}</InfoBlock>
        <InfoBlock title="Materials & resources">{show(plan.resources)}</InfoBlock>
        <InfoBlock title="Extra support">{show(plan.support)}</InfoBlock>
        <InfoBlock title="Extension challenge">{show(plan.stretch)}</InfoBlock>
        <InfoBlock title="Assessment / exit ticket">{show(plan.assessment)}</InfoBlock>
        <InfoBlock title="After-session follow-up">{show(plan.followup)}</InfoBlock>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-[11px]" style={{ borderColor: 'var(--lesson-border)', color: 'var(--lesson-ink)' }}>
        <span className="inline-flex items-center gap-1.5 font-extrabold"><Zap size={14} style={{ color: 'var(--lesson-accent)' }}/> Designed with SmartBridge FET</span>
        <span>Review CAPS alignment, timing and content accuracy before teaching.</span>
      </footer>
    </div>
  </article>;
}
