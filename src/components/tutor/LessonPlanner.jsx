import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import usePremiumAccess from '@/hooks/usePremiumAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ClipboardList, Plus, Pencil, Trash2, Lock, Crown, Calendar, BookOpen, 
  Loader2, AlertCircle, Search, Filter, CheckCircle, Share2, Sparkles, 
  Repeat, TrendingUp, FileText, Mail, LinkIcon, Clock, Download, Lightbulb,
  X, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import LessonPlanForm from './LessonPlanForm';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLORS = {
  draft: 'bg-muted text-muted-foreground',
  planned: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

// Pre-defined lesson plan templates
const TEMPLATES = {
  'Mathematics': {
    'Algebra - Linear Equations': {
      objectives: ['Understand linear equations', 'Solve for x in one-step equations', 'Solve for x in two-step equations'],
      resources: ['Textbook Chapter 4', 'Linear equations worksheet', 'Khan Academy video'],
      homework: ['Complete exercises 1-15', 'Practice 5 word problems'],
      assessment: ['Quick quiz on linear equations']
    },
    'Calculus - Differentiation': {
      objectives: ['Understand the concept of limits', 'Apply the power rule', 'Differentiate basic functions'],
      resources: ['Derivative rules cheat sheet', 'PhET Calculus simulation', 'Practice problem set'],
      homework: ['Derivative practice problems (20 questions)', 'Watch derivative video'],
      assessment: ['10-question differentiation test']
    },
    'Trigonometry - Basics': {
      objectives: ['Understand sine, cosine, tangent', 'Apply SOH CAH TOA', 'Solve right triangle problems'],
      resources: ['Unit circle diagram', 'Trigonometry formula sheet', 'Interactive GeoGebra'],
      homework: ['Trig ratios worksheet', 'Memorize unit circle values'],
      assessment: ['Trigonometry quiz']
    }
  },
  'Physical Sciences': {
    "Newton's Laws of Motion": {
      objectives: ['State Newton\'s 3 laws', 'Apply F = ma to real-world problems', 'Calculate net force'],
      resources: ['PhET Forces simulation', 'Formula sheet', 'Physics textbook Ch.5'],
      homework: ['Force diagram worksheet', '10 calculation problems'],
      assessment: ['Newton\'s Laws test']
    },
    'Chemical Bonding': {
      objectives: ['Differentiate ionic and covalent bonds', 'Draw Lewis structures', 'Understand electronegativity'],
      resources: ['Molecular model kit', 'Bonding simulation', 'Periodic table'],
      homework: ['Lewis structure practice', 'Bond type identification'],
      assessment: ['Bonding quiz']
    }
  },
  'Life Sciences': {
    'Cell Structure': {
      objectives: ['Identify organelles', 'Explain functions of each organelle', 'Differentiate plant and animal cells'],
      resources: ['Cell diagram worksheet', 'Microscope slides', 'Interactive cell model'],
      homework: ['Label cell diagram', 'Organelle function matching'],
      assessment: ['Cell structure test']
    },
    'Genetics': {
      objectives: ['Understand Punnett squares', 'Differentiate dominant/recessive traits', 'Calculate probability'],
      resources: ['Genetics simulation', 'Mendel\'s pea plants video', 'Punnett square worksheet'],
      homework: ['Punnett square practice (10 problems)', 'Genetics vocabulary matching'],
      assessment: ['Genetics quiz']
    }
  }
};

export default function LessonPlanner({ user, onLessonUpdate }) {
  const { isPremium, loading: premLoading } = usePremiumAccess(user);
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, planned: 0, draft: 0 });

  const loadData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Load lesson plans
      const { data: plansData, error: plansError } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('tutor_email', user.email)
        .order('session_date', { ascending: false });
      
      if (plansError) throw plansError;
      
      // Load students from bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('student_email, student_name, id, date, subject')
        .eq('tutor_email', user.email)
        .eq('status', 'confirmed')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      if (bookingsError) throw bookingsError;
      
      // Build unique student list
      const studentMap = {};
      (bookingsData || []).forEach(b => {
        if (b.student_email && !studentMap[b.student_email]) {
          studentMap[b.student_email] = { 
            email: b.student_email, 
            name: b.student_name || b.student_email 
          };
        }
      });
      
      setPlans(plansData || []);
      setStudents(Object.values(studentMap));
      setUpcomingBookings(bookingsData || []);
      
      // Calculate stats
      const total = plansData?.length || 0;
      const completed = plansData?.filter(p => p.status === 'completed').length || 0;
      const planned = plansData?.filter(p => p.status === 'planned').length || 0;
      const draft = plansData?.filter(p => p.status === 'draft').length || 0;
      setStats({ total, completed, planned, draft });
      
    } catch (err) {
      console.error('Error loading lesson plans:', err);
      setError('Failed to load lesson plans');
      toast.error('Failed to load lesson plans');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.email) return;
    
    const channel = supabase
      .channel('tutor_lesson_plans')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_plans',
          filter: `tutor_email=eq.${user.email}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPlans(prev => [payload.new, ...prev]);
            toast.success('New lesson plan created');
          } else if (payload.eventType === 'UPDATE') {
            setPlans(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
          } else if (payload.eventType === 'DELETE') {
            setPlans(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  const toggleSelect = (id) => {
    const newSet = new Set(selectedPlans);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedPlans(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedPlans.size === filtered.length) {
      setSelectedPlans(new Set());
    } else {
      setSelectedPlans(new Set(filtered.map(p => p.id)));
    }
  };

  const batchComplete = async () => {
    const pendingPlans = Array.from(selectedPlans).filter(id => {
      const plan = plans.find(p => p.id === id);
      return plan && plan.status !== 'completed';
    });
    
    let completedCount = 0;
    for (const id of pendingPlans) {
      const plan = plans.find(p => p.id === id);
      if (plan) {
        await markPlanCompleted(plan);
        completedCount++;
      }
    }
    
    setSelectedPlans(new Set());
    setBatchMode(false);
    toast.success(`${completedCount} plans completed`);
  };

  const batchDelete = async () => {
    if (!confirm(`Delete ${selectedPlans.size} lesson plans? This cannot be undone.`)) return;
    
    let deletedCount = 0;
    for (const id of selectedPlans) {
      const { error } = await supabase
        .from('lesson_plans')
        .delete()
        .eq('id', id);
      
      if (!error) deletedCount++;
    }
    
    setPlans(prev => prev.filter(p => !selectedPlans.has(p.id)));
    setSelectedPlans(new Set());
    setBatchMode(false);
    toast.success(`${deletedCount} plans deleted`);
  };

  const exportPlans = () => {
    const headers = ['Title', 'Subject', 'Grade', 'Student', 'Status', 'Date', 'Objectives', 'Resources'];
    const rows = filtered.map(p => [
      p.session_title,
      p.subject,
      p.grade,
      p.student_name || p.student_email || 'Not assigned',
      p.status,
      p.session_date || 'TBD',
      p.objectives?.join('; ') || '',
      p.resources_used?.join('; ') || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lesson-plans-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete!');
  };

  const markPlanCompleted = async (plan) => {
    try {
      const { error: updateError } = await supabase
        .from('lesson_plans')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', plan.id);
      
      if (updateError) throw updateError;
      
      // Update student progress
      if (plan.student_email) {
        const { data: existing } = await supabase
          .from('student_progress')
          .select('*')
          .eq('user_email', plan.student_email)
          .eq('subject', plan.subject)
          .maybeSingle();
        
        if (existing) {
          await supabase
            .from('student_progress')
            .update({ 
              study_sessions: (existing.study_sessions || 0) + 1,
              last_access: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('student_progress')
            .insert({
              user_email: plan.student_email,
              subject: plan.subject,
              grade: plan.grade,
              study_sessions: 1,
              last_access: new Date().toISOString().split('T')[0]
            });
        }
      }
      
      setPlans(prev => prev.map(p => 
        p.id === plan.id ? { ...p, status: 'completed' } : p
      ));
      
      toast.success('Plan marked complete! Student progress updated.');
      if (onLessonUpdate) onLessonUpdate();
    } catch (err) {
      console.error('Error completing plan:', err);
      toast.error('Failed to mark plan as complete');
    }
  };

  const shareWithStudent = async (plan) => {
    if (!plan.student_email) {
      toast.error('No student linked to this plan');
      return;
    }
    
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: plan.student_email,
          subject: `📚 Lesson Plan: ${plan.session_title}`,
          body: `
Hi ${plan.student_name || 'Student'},

Here's the lesson plan for our session on ${plan.session_date ? format(parseISO(plan.session_date), 'dd MMM yyyy') : 'our upcoming session'}:

📖 Topic: ${plan.session_title}
🎯 Objectives:
${plan.objectives?.map(o => `• ${o}`).join('\n')}

📚 Resources to review:
${plan.resources_used?.map(r => `• ${r}`).join('\n')}

✏️ Homework:
${plan.homework_assigned || 'No homework assigned'}

See you in the session!

${user.full_name}
`,
          from_name: user.full_name
        }
      });
      
      if (error) throw error;
      
      toast.success('Lesson plan shared with student');
    } catch (err) {
      console.error('Error sharing plan:', err);
      toast.error('Failed to share lesson plan');
    }
  };

  const generateAIPlan = async (subject, topic, grade) => {
    if (!subject || !topic) {
      toast.error('Please select subject and enter topic first');
      return;
    }
    
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lesson-plan', {
        body: { 
          subject, 
          topic, 
          grade, 
          curriculum: 'CAPS',
          school_level: 'FET'
        }
      });
      
      if (error) throw error;
      
      if (data) {
        setEditing({
          session_title: `${subject} - ${topic}`,
          subject,
          grade,
          objectives: data.objectives || [],
          resources_used: data.resources || [],
          homework_assigned: data.homework || '',
          notes: data.notes || '',
          status: 'draft'
        });
        setShowForm(true);
        toast.success('AI-generated plan loaded! Review and adjust as needed.');
      }
    } catch (err) {
      console.error('Error generating AI plan:', err);
      toast.error('Failed to generate AI plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lesson plan? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('lesson_plans')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setPlans(prev => prev.filter(p => p.id !== id));
      toast.success('Lesson plan deleted');
      if (onLessonUpdate) onLessonUpdate();
    } catch (err) {
      console.error('Error deleting lesson plan:', err);
      toast.error('Failed to delete lesson plan');
    }
  };

  const filtered = useMemo(() => {
    let filtered = plans;
    
    if (filter !== 'all') {
      filtered = filtered.filter(p => p.status === filter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.session_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.student_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [plans, filter, searchTerm]);

  const getCompletionRate = () => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  // Premium gate
  if (!premLoading && !isPremium) {
    return (
      <Card className="border-border">
        <CardContent className="py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-amber-600" />
          </div>
          <h3 className="font-playfair text-lg font-bold mb-1">Lesson Planner — Premium</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
            Draft objectives, resources, and homework for each session. Linked directly to student progress tracking.
          </p>
          <Link to="/premium">
            <Button className="bg-primary gap-2"><Crown className="w-4 h-4" /> Upgrade to Premium</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> Lesson Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> Lesson Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadData}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (showForm || editing) {
    return (
      <LessonPlanForm
        user={user}
        plan={editing}
        students={students}
        upcomingBookings={upcomingBookings}
        onSaved={() => {
          loadData();
          setShowForm(false);
          setEditing(null);
          if (onLessonUpdate) onLessonUpdate();
        }}
        onCancel={() => { setShowForm(false); setEditing(null); }}
      />
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> Lesson Planner
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] gap-1">
              <Crown className="w-3 h-3" /> Premium
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            {selectedPlans.size > 0 && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setBatchMode(true)}>
                  <Check className="w-3.5 h-3.5" /> {selectedPlans.size} selected
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs text-green-600" onClick={batchComplete}>
                  <CheckCircle className="w-3.5 h-3.5" /> Complete
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs text-red-600" onClick={batchDelete}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={exportPlans}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> New Plan
            </Button>
          </div>
        </div>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="bg-muted/40 rounded-lg p-2 text-center">
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-blue-600">{stats.planned}</p>
            <p className="text-[10px] text-muted-foreground">Planned</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-amber-600">{stats.draft}</p>
            <p className="text-[10px] text-muted-foreground">Draft</p>
          </div>
        </div>
        
        {/* Completion progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Completion Rate</span>
            <span>{getCompletionRate()}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${getCompletionRate()}%` }}
            />
          </div>
        </div>
        
        {/* AI Generate Quick Action */}
        <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs font-semibold text-purple-700">🤖 AI Lesson Plan Generator</p>
              <p className="text-[10px] text-purple-600">Describe your topic and get AI-generated lesson plan</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1.5 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={() => {
                const topic = prompt('Enter the topic (e.g., "Quadratic Equations"):');
                if (topic) {
                  const subject = prompt('Enter the subject (e.g., "Mathematics"):');
                  if (subject) {
                    generateAIPlan(subject, topic, 'Grade 11');
                  }
                }
              }}
              disabled={generating}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generating ? 'Generating...' : 'Generate with AI'}
            </Button>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search by title, student, or subject..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          {selectedPlans.size > 0 && (
            <Button size="sm" variant="ghost" className="h-8 w-8" onClick={() => setSelectedPlans(new Set())}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        
        {/* Batch Mode Select All */}
        {selectedPlans.size > 0 && (
          <div className="flex items-center justify-between mt-2 px-2 py-1 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground">{selectedPlans.size} selected</span>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={toggleSelectAll}>
              {selectedPlans.size === filtered.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            {plans.length === 0
              ? 'No lesson plans yet — create your first one!'
              : searchTerm 
                ? 'No lesson plans match your search.'
                : `No ${filter} lesson plans found.`
            }
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filtered.map(p => {
              const isPast = p.session_date && new Date(p.session_date) < new Date();
              const isToday = p.session_date && new Date(p.session_date).toDateString() === new Date().toDateString();
              const student = students.find(s => s.email === p.student_email);
              const linkedBooking = upcomingBookings.find(b => 
                b.student_email === p.student_email && 
                b.subject === p.subject &&
                new Date(b.date).toDateString() === new Date(p.session_date).toDateString()
              );
              const isSelected = selectedPlans.has(p.id);
              
              return (
                <div 
                  key={p.id} 
                  className={`flex items-start gap-3 p-3 rounded-xl transition-colors group ${
                    isSelected ? 'bg-primary/10 border border-primary/30' : 'bg-muted/40 hover:bg-muted'
                  }`}
                >
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(p.id)}
                    className="mt-1 w-4 h-4 rounded border-gray-300"
                  />
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{p.session_title}</p>
                      <Badge className={`${STATUS_COLORS[p.status]} text-[10px]`}>{p.status}</Badge>
                      {isToday && p.status === 'planned' && (
                        <Badge className="bg-green-100 text-green-700 text-[10px] animate-pulse">Today</Badge>
                      )}
                      {isPast && p.status === 'planned' && (
                        <Badge className="bg-amber-100 text-amber-700 text-[10px]">Overdue</Badge>
                      )}
                      {linkedBooking && (
                        <Badge className="bg-purple-100 text-purple-700 text-[10px] gap-1">
                          <LinkIcon className="w-2.5 h-2.5" /> Linked to Booking
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {student?.name || p.student_name || p.student_email || 'No student assigned'} · {p.subject} · {p.grade}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {p.session_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> 
                          {format(parseISO(p.session_date), 'dd MMM yyyy')}
                        </span>
                      )}
                      {p.objectives?.length > 0 && (
                        <span>{p.objectives.length} objective{p.objectives.length !== 1 ? 's' : ''}</span>
                      )}
                      {p.resources_used?.length > 0 && (
                        <span>{p.resources_used.length} resource{p.resources_used.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.status !== 'completed' && p.student_email && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Share with student" onClick={() => shareWithStudent(p)}>
                        <Mail className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {p.status !== 'completed' && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" title="Mark complete" onClick={() => markPlanCompleted(p)}>
                        <CheckCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing(p)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Tips section */}
        {plans.length > 0 && filtered.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-[10px] text-blue-700 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              💡 Tip: Use the AI generator to quickly create lesson plans. Completed plans automatically update student progress tracking.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}