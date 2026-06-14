import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, BookOpen, CheckCircle2, Circle, ChevronDown, ChevronUp, ExternalLink, Zap, Clock, FileText, Globe, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// 4-week study plan template keyed by week number (1–4 before the test)
const WEEK_TEMPLATES = [
  {
    week: 4,
    label: 'Week 1 — Foundation',
    theme: 'Understand the format & baseline yourself',
    sessions: [
      { day: 'Monday',    topic: 'AL: Reading Comprehension Basics',       type: 'AL', resource: 'nbt_al' },
      { day: 'Wednesday', topic: 'QL: Number Sense & Estimation',           type: 'QL', resource: 'nbt_ql' },
      { day: 'Friday',    topic: 'MAT: Algebra Review',                     type: 'MAT', resource: 'nbt_mat' },
      { day: 'Saturday',  topic: 'Full Practice Test (timed)',               type: 'Practice', resource: 'practice' },
    ],
  },
  {
    week: 3,
    label: 'Week 2 — Skill Building',
    theme: 'Deepen understanding per section',
    sessions: [
      { day: 'Monday',    topic: 'AL: Vocabulary & Text Inference',         type: 'AL', resource: 'nbt_al' },
      { day: 'Tuesday',   topic: 'QL: Data Handling & Graphs',              type: 'QL', resource: 'nbt_ql' },
      { day: 'Thursday',  topic: 'MAT: Functions & Graphs',                 type: 'MAT', resource: 'nbt_mat' },
      { day: 'Saturday',  topic: 'AL + QL Practice Paper',                  type: 'Practice', resource: 'practice' },
    ],
  },
  {
    week: 2,
    label: 'Week 3 — Intensive Practice',
    theme: 'Work through past papers under exam conditions',
    sessions: [
      { day: 'Monday',    topic: 'MAT: Calculus & Trigonometry',            type: 'MAT', resource: 'nbt_mat' },
      { day: 'Wednesday', topic: 'AL: Critical Thinking & Argument',        type: 'AL', resource: 'nbt_al' },
      { day: 'Thursday',  topic: 'QL: Financial & Spatial Reasoning',       type: 'QL', resource: 'nbt_ql' },
      { day: 'Saturday',  topic: 'Full Timed Past Paper — all 3 sections',  type: 'Practice', resource: 'practice' },
    ],
  },
  {
    week: 1,
    label: 'Week 4 — Final Revision',
    theme: 'Review weak areas & consolidate',
    sessions: [
      { day: 'Monday',    topic: 'Revisit weakest section (choose one)',    type: 'Review', resource: null },
      { day: 'Tuesday',   topic: 'Light AL + QL warm-up',                  type: 'AL', resource: 'nbt_al' },
      { day: 'Wednesday', topic: 'MAT: Quick formula & problem review',     type: 'MAT', resource: 'nbt_mat' },
      { day: 'Friday',    topic: '🎯 Final light revision — rest well!',    type: 'Review', resource: null },
    ],
  },
];

const RESOURCES = {
  nbt_al:    { label: 'NBT AL Study Guide',      url: 'https://www.nbt.ac.za/content/academic-literacy',    icon: BookOpen },
  nbt_ql:    { label: 'NBT QL Study Guide',      url: 'https://www.nbt.ac.za/content/quantitative-literacy', icon: BookOpen },
  nbt_mat:   { label: 'NBT Mathematics Guide',   url: 'https://www.nbt.ac.za/content/mathematics',          icon: BookOpen },
  practice:  { label: 'Official Practice Tests', url: 'https://www.nbt.ac.za/content/practice-tests',       icon: FileText },
  official:  { label: 'NBT Registration',        url: 'https://www.nbt.ac.za',                              icon: Globe },
};

const TYPE_COLORS = {
  AL:       'bg-blue-100 text-blue-700',
  QL:       'bg-purple-100 text-purple-700',
  MAT:      'bg-green-100 text-green-700',
  Practice: 'bg-amber-100 text-amber-800',
  Review:   'bg-gray-100 text-gray-700',
};

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getDatesForWeekTemplate(testDate, weeksBeforeTest) {
  const ms = testDate - weeksBeforeTest * 7 * 24 * 60 * 60 * 1000;
  const monday = new Date(ms);
  const dow = monday.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + diff);
  return monday;
}

const DAY_OFFSETS = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

function SessionCard({ session, weekStart, completed, onToggle, libraryResources }) {
  const [showRes, setShowRes] = useState(false);
  const sessionDate = addDays(weekStart, DAY_OFFSETS[session.day] || 0);
  const dateStr = sessionDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });

  const linkedLibrary = libraryResources.filter(r => {
    if (session.type === 'MAT') return r.subject === 'Mathematics' || r.subject?.toLowerCase().includes('math');
    if (session.type === 'AL' || session.type === 'QL') return r.subject?.toLowerCase().includes('english') || r.subject?.toLowerCase().includes('literacy');
    return false;
  }).slice(0, 3);

  const builtInRes = session.resource ? RESOURCES[session.resource] : null;

  return (
    <div className={`rounded-lg border p-3 transition-all ${completed ? 'bg-green-50 border-green-200 opacity-75' : 'bg-card border-border hover:shadow-sm'}`}>
      <div className="flex items-start gap-3">
        <button onClick={() => onToggle(session.day)} className="mt-0.5 flex-shrink-0">
          {completed
            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
            : <Circle className="w-5 h-5 text-muted-foreground" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground font-medium">{session.day} · {dateStr}</span>
            <Badge className={`text-xs px-1.5 py-0 ${TYPE_COLORS[session.type]}`}>{session.type}</Badge>
          </div>
          <p className={`text-sm font-medium leading-snug ${completed ? 'line-through text-muted-foreground' : ''}`}>
            {session.topic}
          </p>

          {(builtInRes || linkedLibrary.length > 0) && (
            <div className="mt-2">
              <button
                onClick={() => setShowRes(v => !v)}
                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <Clock className="w-3 h-3" />
                Study Resources {showRes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showRes && (
                <div className="mt-2 space-y-1.5 pl-1">
                  {builtInRes && (
                    <a href={builtInRes.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <builtInRes.icon className="w-3 h-3" />
                      {builtInRes.label} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {linkedLibrary.map(r => (
                    <a key={r.id} href={r.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                      <FileText className="w-3 h-3" />
                      {r.title} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WeekBlock({ template, testDate, completedSessions, onToggle, libraryResources }) {
  const [open, setOpen] = useState(template.week >= 3);
  const weekStart = getDatesForWeekTemplate(testDate, template.week);
  const total = template.sessions.length;
  const done = template.sessions.filter(s => completedSessions[`${template.week}_${s.day}`]).length;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2 pt-4 px-4">
        <button onClick={() => setOpen(v => !v)} className="flex items-center justify-between w-full text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              W{5 - template.week}
            </div>
            <div>
              <p className="font-semibold text-sm">{template.label}</p>
              <p className="text-xs text-muted-foreground">{template.theme}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{done}/{total}</span>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
      </CardHeader>
      {open && (
        <CardContent className="px-4 pb-4 space-y-2">
          {template.sessions.map(session => (
            <SessionCard
              key={session.day}
              session={session}
              weekStart={weekStart}
              completed={!!completedSessions[`${template.week}_${session.day}`]}
              onToggle={(day) => onToggle(`${template.week}_${day}`)}
              libraryResources={libraryResources}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export default function NBTPrepPlanner({ userEmail }) {
  const [nbtDeadlines, setNbtDeadlines] = useState([]);
  const [selectedDeadline, setSelectedDeadline] = useState(null);
  const [completedSessions, setCompletedSessions] = useState({});
  const [libraryResources, setLibraryResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Load NBT deadlines from Supabase
      const { data: deadlines, error: deadlinesError } = await supabase
        .from('application_deadlines')
        .select('*')
        .eq('category', 'NBT')
        .eq('is_approved', true)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      if (deadlinesError) throw deadlinesError;
      
      // Load approved resources from Supabase
      const { data: resources, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .eq('is_approved', true)
        .limit(50);
      
      if (resourcesError) throw resourcesError;
      
      setNbtDeadlines(deadlines || []);
      if (deadlines && deadlines.length > 0) setSelectedDeadline(deadlines[0]);
      setLibraryResources(resources || []);
      
      // Load saved progress from Supabase
      const { data: progress, error: progressError } = await supabase
        .from('nbt_planner_progress')
        .select('completed_sessions')
        .eq('user_email', userEmail)
        .maybeSingle();
      
      if (!progressError && progress) {
        setCompletedSessions(progress.completed_sessions || {});
      }
    } catch (err) {
      console.error('Error loading NBT planner data:', err);
      toast.error('Failed to load planner data');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveProgress = async (updatedSessions) => {
    if (!userEmail) return;
    
    try {
      const { error } = await supabase
        .from('nbt_planner_progress')
        .upsert({
          user_email: userEmail,
          completed_sessions: updatedSessions,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_email'
        });
      
      if (error) throw error;
    } catch (err) {
      console.error('Error saving progress:', err);
      toast.error('Failed to save progress');
    }
  };

  const handleToggle = async (key) => {
    const updated = { ...completedSessions, [key]: !completedSessions[key] };
    // Remove false values to keep storage clean
    Object.keys(updated).forEach(k => !updated[k] && delete updated[k]);
    setCompletedSessions(updated);
    await saveProgress(updated);
  };

  const totalSessions = WEEK_TEMPLATES.reduce((sum, w) => sum + w.sessions.length, 0);
  const completedCount = Object.values(completedSessions).filter(Boolean).length;
  const progressPct = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="text-center py-10 bg-muted/40 rounded-xl">
        <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="font-medium">Please sign in to use the NBT Prep Planner</p>
        <p className="text-sm text-muted-foreground">Sign in to track your NBT study progress.</p>
      </div>
    );
  }

  const testDate = selectedDeadline ? new Date(selectedDeadline.date + 'T08:00:00') : null;
  const daysUntil = testDate ? Math.ceil((testDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Smart NBT Prep Planner</h3>
      </div>

      {/* No NBT deadlines */}
      {nbtDeadlines.length === 0 && (
        <div className="text-center py-10 bg-muted/40 rounded-xl">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="font-medium">No upcoming NBT dates found</p>
          <p className="text-sm text-muted-foreground">NBT test dates will appear here once added to the Deadlines calendar.</p>
          <a href="https://www.nbt.ac.za" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline font-medium">
            Check NBT website <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {nbtDeadlines.length > 0 && (
        <>
          {/* Test date selector */}
          {nbtDeadlines.length > 1 && (
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Select your NBT test date</label>
              <div className="flex flex-wrap gap-2">
                {nbtDeadlines.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDeadline(d)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      selectedDeadline?.id === d.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border hover:border-primary/50'
                    }`}
                  >
                    {d.event_name} · {new Date(d.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Countdown & progress */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-primary/8 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{daysUntil ?? '—'}</p>
              <p className="text-xs text-muted-foreground">days until test</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{progressPct}%</p>
              <p className="text-xs text-muted-foreground">plan completed</p>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Study progress</span>
              <span>{completedCount} / {totalSessions} sessions</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* Info banner */}
          {daysUntil !== null && daysUntil < 28 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
              <strong>⚡ Quick tip:</strong> Your test is {daysUntil < 8 ? 'very soon' : `in ${Math.ceil(daysUntil / 7)} weeks`}. 
              Focus on your weakest section first. {daysUntil > 7 ? 'Use the week blocks below to stay on track.' : 'Do a final light review and rest well the night before!'}
            </div>
          )}

          {/* 4-week plan */}
          {testDate && WEEK_TEMPLATES.map(template => (
            <WeekBlock
              key={template.week}
              template={template}
              testDate={testDate}
              completedSessions={completedSessions}
              onToggle={handleToggle}
              libraryResources={libraryResources}
            />
          ))}

          {/* Register CTA */}
          <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl text-center">
            <p className="text-sm font-medium mb-1">Haven't registered for the NBT yet?</p>
            <a href="https://www.nbt.ac.za" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Register on NBT Website
              </Button>
            </a>
          </div>
        </>
      )}
    </div>
  );
}