import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Download, ExternalLink, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReleaseGate from '@/components/operations/ReleaseGate';
import { STEM_ACTIVITIES, CAPS_PHYSICAL_SCIENCES_URL, PHET_LICENSE_URL, LAB_LIMITATION, filterStemActivities, buildLabWorksheet, isPilotSimulationUrl } from '@/lib/stem-lab';

function Activity({ activity, classroom }) {
  const [notes, setNotes] = useState('');
  const downloadWorksheet = () => {
    const blob = new Blob([buildLabWorksheet(activity, notes, classroom)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activity.id}-worksheet.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <article aria-labelledby="lab-activity-title" className="rounded-xl border bg-card p-4 sm:p-6 space-y-5 break-words">
    <div><p className="text-sm text-muted-foreground">Grade {activity.grade} · {activity.minutes} minutes · {activity.subject}</p>
      <h3 id="lab-activity-title" className="text-xl font-bold mt-1">{activity.title}</h3>
      <p className="text-sm mt-2">{activity.goal}</p>
      <p className="text-xs text-muted-foreground mt-2">CAPS topic: {activity.topic} · printed p. {activity.capsPage}</p></div>
    {classroom && <aside className="rounded-lg bg-muted p-4 text-sm"><strong>One screen, a whole class</strong><p className="mt-1">Ask learners to predict first. Rotate operator, recorder and reporter roles. Pause to compare explanations; no learner accounts or tutor registration are needed for the class.</p><p className="mt-2">{activity.context}</p></aside>}
    <div className="rounded-lg border p-4 space-y-3 text-sm">
      <p><strong>Simulation: {activity.simulation}</strong> · PhET Interactive Simulations, University of Colorado Boulder</p>
      <p>No simulation, video or external image loads automatically. Opening PhET uses data and opens another tab. A larger screen may be easier to use; device support varies.</p>
      {isPilotSimulationUrl(activity.url) && <a href={activity.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-primary-foreground font-semibold">Open PhET simulation <ExternalLink className="h-4 w-4" /></a>}
      <p>If the simulation will not open, use the paper activity below. Download the worksheet now to keep a text copy; this app itself is not an offline app.</p>
    </div>
    <section><h4 className="font-bold">Predict, investigate, explain</h4><ol className="list-decimal pl-5 mt-2 space-y-3 text-sm">{activity.steps.map(step => <li key={step}>{step}</li>)}</ol></section>
    <section><h4 className="font-bold">Record your evidence</h4><p className="text-sm mt-2">{activity.record}</p></section>
    <section><h4 className="font-bold">Check your understanding</h4><ol className="list-decimal pl-5 mt-2 space-y-2 text-sm">{activity.questions.map(question => <li key={question}>{question}</li>)}</ol>
      <details className="mt-3 rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-semibold">Show explanation after trying</summary><ol className="list-decimal pl-5 mt-3 space-y-2">{activity.answers.map(answer => <li key={answer}>{answer}</li>)}</ol></details></section>
    <section className="rounded-lg bg-muted p-4"><h4 className="font-bold">Low-data paper activity</h4><p className="text-sm mt-2">{activity.paper}</p></section>
    <label className="block text-sm font-semibold" htmlFor="lab-notes">My notes (this visit only)<textarea id="lab-notes" rows={5} maxLength={10000} value={notes} onChange={event => setNotes(event.target.value)} className="mt-2 block w-full rounded-lg border bg-background p-3 font-normal" placeholder="Write your predictions and observations. Avoid names or personal information." /></label>
    <p className="text-xs text-muted-foreground">Notes are not sent to a teacher or saved to your account. Switching activities or leaving this page clears them. Download your worksheet to keep them.</p>
    <Button type="button" onClick={downloadWorksheet} className="gap-2 whitespace-normal h-auto py-3"><Download className="h-4 w-4 shrink-0" /> Download text worksheet with my notes</Button>
  </article>;
}
Activity.propTypes = { activity: PropTypes.object.isRequired, classroom: PropTypes.bool.isRequired };

function SimulationLabImplementation() {
  const [grade, setGrade] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(STEM_ACTIVITIES[0].id);
  const [classroom, setClassroom] = useState(false);
  const activities = useMemo(() => filterStemActivities(grade, query), [grade, query]);
  const active = activities.find(activity => activity.id === selected) || activities[0];
  return <div className="w-full max-w-6xl mx-auto p-2 sm:p-5 space-y-5">
    <header className="space-y-3"><h2 className="flex items-center gap-2 text-2xl font-bold"><FlaskConical className="shrink-0 text-primary" /> Virtual STEM Lab</h2>
      <p className="text-sm">A small Physical Sciences pilot for Grades 10–12, mapped to selected CAPS topics. Explore with a class or study on your own. This is not the full curriculum.</p>
      <p className="text-sm rounded-lg bg-muted p-3">Teachers can use classroom mode through an existing learner or parent account without tutor registration. Approved tutors can use it too. No premium plan or access to learner records is needed.</p>
      <label className="flex gap-3 items-center text-sm font-semibold"><input type="checkbox" checked={classroom} onChange={event => setClassroom(event.target.checked)} /> Classroom mode (teacher-led)</label>
    </header>
    <div className="flex flex-wrap gap-4"><div><label className="text-sm font-semibold" htmlFor="lab-grade">Grade</label><select id="lab-grade" aria-label="Grade" value={grade} onChange={event => setGrade(event.target.value)} className="block mt-1 rounded-lg border bg-background p-2"><option value="all">All grades</option>{[10, 11, 12].map(value => <option key={value} value={value}>Grade {value}</option>)}</select></div>
      <label className="text-sm font-semibold flex-1 min-w-0" htmlFor="lab-search">Search topic<input id="lab-search" type="search" value={query} onChange={event => setQuery(event.target.value)} className="block w-full mt-1 rounded-lg border bg-background p-2" placeholder="Waves, circuits, acids…" /></label></div>
    <p role="status" className="text-sm text-muted-foreground">{activities.length} activit{activities.length === 1 ? 'y' : 'ies'} available</p>
    <div className="flex flex-wrap gap-2">{activities.map(activity => <Button key={activity.id} type="button" variant={active?.id === activity.id ? 'default' : 'outline'} aria-pressed={active?.id === activity.id} onClick={() => setSelected(activity.id)} className="h-auto whitespace-normal text-left py-3">Grade {activity.grade}: {activity.title}</Button>)}</div>
    {active ? <Activity key={active.id} activity={active} classroom={classroom} /> : <div className="border rounded-lg p-6"><p>No activities match these filters.</p><Button className="mt-3" variant="outline" onClick={() => { setGrade('all'); setQuery(''); }}>Clear filters</Button></div>}
    <footer className="text-xs text-muted-foreground space-y-3 border-t pt-4"><p>{LAB_LIMITATION}</p><p>Original SmartBridge worksheets. Simulation names and content belong to their providers. Linking does not imply DBE or PhET endorsement.</p>
      <div className="flex flex-wrap gap-4"><a className="underline" href={CAPS_PHYSICAL_SCIENCES_URL} target="_blank" rel="noopener noreferrer">DBE Physical Sciences CAPS (PDF)</a><a className="underline" href={PHET_LICENSE_URL} target="_blank" rel="noopener noreferrer">PhET licensing and attribution</a><a className="underline" href="https://phet.colorado.edu/en/help-center/running-sims" target="_blank" rel="noopener noreferrer">PhET device help</a></div></footer>
  </div>;
}

/** @param {{ isTutor?: boolean, user?: object }} _props */
export default function SimulationLab(_props = {}) {
  return <ReleaseGate feature="simulations"><SimulationLabImplementation /></ReleaseGate>;
}
