import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle, Brain, Save, Play, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SUBJECTS } from '@/lib/subjects';
import AIQuizGenerator from './AIQuizGenerator';

const GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];

function QuizTaker({ quiz, onClose }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);

  const questions = Array.isArray(quiz.questions) 
    ? quiz.questions 
    : (typeof quiz.questions === 'string' ? JSON.parse(quiz.questions) : []);

  const score = submitted
    ? questions.filter((q, i) => answers[i] === q.correct).length
    : 0;

  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const saveResult = async () => {
    if (resultSaved) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('quiz_results')
        .insert({
          quiz_id: quiz.id,
          student_email: quiz.currentUser?.email,
          score: score,
          percentage: percentage,
          total_questions: questions.length,
          answers: answers,
          completed_at: new Date().toISOString()
        });
      
      if (error) throw error;
      setResultSaved(true);
      toast.success('Quiz result saved!');
    } catch (err) {
      console.error('Error saving result:', err);
      toast.error('Failed to save quiz result');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    await saveResult();
  };

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-playfair text-lg font-bold">{quiz.title}</h3>
          <Badge className="bg-primary/10 text-primary">{quiz.subject} · {quiz.grade}</Badge>
        </div>
        
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="font-playfair text-3xl font-bold text-primary">{score}/{questions.length}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {percentage >= 80 ? '🎉 Excellent! Mastered this topic!' : 
               percentage >= 60 ? '👏 Good effort! A few more practices needed.' : 
               '📚 Keep studying! Review the explanations below.'}
            </p>
            <div className="w-full bg-muted rounded-full h-2 mt-3 mb-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${percentage}%` }} />
            </div>
            {submitting && <Loader2 className="w-4 h-4 animate-spin mx-auto mt-2" />}
            <Button variant="outline" size="sm" className="mt-3" onClick={onClose}>Close Quiz</Button>
          </CardContent>
        </Card>
        
        {questions.map((q, i) => (
          <Card key={i} className={answers[i] === q.correct ? 'border-green-300' : 'border-red-300'}>
            <CardContent className="pt-4 pb-4">
              <p className="font-medium text-sm mb-3">{i + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, j) => (
                  <div key={j} className={`flex items-center gap-2 p-2 rounded-lg border text-sm
                    ${j === q.correct ? 'border-green-500 bg-green-50' : ''}
                    ${answers[i] === j && j !== q.correct ? 'border-red-400 bg-red-50' : ''}
                  `}>
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                      j === q.correct ? 'bg-green-500' : 
                      answers[i] === j && j !== q.correct ? 'bg-red-500' : 'bg-muted'
                    }`} />
                    <span>{opt}</span>
                    {j === q.correct && <CheckCircle className="w-3.5 h-3.5 text-green-600 ml-auto" />}
                  </div>
                ))}
              </div>
              {answers[i] !== q.correct && q.explanation && (
                <p className="text-xs text-muted-foreground mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                  💡 {q.explanation}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-playfair text-lg font-bold">{quiz.title}</h3>
        <Badge className="bg-primary/10 text-primary">{quiz.subject} · {quiz.grade}</Badge>
      </div>
      {questions.map((q, i) => (
        <Card key={i} className="border-border">
          <CardContent className="pt-4 pb-4">
            <p className="font-medium text-sm mb-3">{i + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, j) => (
                <label key={j} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors
                  ${answers[i] === j ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}
                `}>
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={answers[i] === j}
                    onChange={() => setAnswers(prev => ({ ...prev, [i]: j }))}
                    className="accent-primary w-4 h-4"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      <Button 
        onClick={handleSubmit} 
        className="w-full bg-primary gap-2" 
        disabled={Object.keys(answers).length < questions.length}
      >
        <CheckCircle className="w-4 h-4" /> Submit Quiz
      </Button>
    </div>
  );
}

export default function QuizBuilder({ user }) {
  const [quizzes, setQuizzes] = useState([]);
  const [mode, setMode] = useState('list');
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correct: 0, explanation: '' }]);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setQuizzes(data || []);
    } catch (err) {
      console.error('Error loading quizzes:', err);
      setError('Failed to load quizzes');
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

  const addQuestion = () => {
    setQuestions(prev => [...prev, { question: '', options: ['', '', '', ''], correct: 0, explanation: '' }]);
  };

  const removeQuestion = (i) => {
    if (questions.length === 1) {
      toast.error('Quiz must have at least one question');
      return;
    }
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateQuestion = (i, field, value) => {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  };

  const updateOption = (qi, oi, value) => {
    setQuestions(prev => prev.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? value : o) } : q));
  };

  const saveQuiz = async () => {
    if (!title || !subject || !grade) { 
      toast.error('Please fill in quiz title, subject and grade.'); 
      return; 
    }
    if (questions.some(q => !q.question || q.options.some(o => !o))) { 
      toast.error('All questions and options must be filled.'); 
      return; 
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('quizzes')
        .insert({
          title,
          subject,
          grade,
          questions: questions,
          created_by: user?.email,
          is_published: true,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      toast.success('Quiz saved and published!');
      setMode('list');
      setTitle('');
      setSubject('');
      setGrade('');
      setQuestions([{ question: '', options: ['', '', '', ''], correct: 0, explanation: '' }]);
      loadQuizzes();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // AI Mode
  if (mode === 'ai') {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <Button variant="ghost" size="sm" className="w-fit text-xs mb-1" onClick={() => setMode('list')}>
            ← Back to Quizzes
          </Button>
        </CardHeader>
        <CardContent>
          <AIQuizGenerator user={user} onQuizSaved={() => { loadQuizzes(); setMode('list'); }} />
        </CardContent>
      </Card>
    );
  }

  // Take Quiz Mode
  if (mode === 'take' && activeQuiz) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <Button variant="ghost" size="sm" className="w-fit text-xs mb-1" onClick={() => setMode('list')}>
            ← Back
          </Button>
        </CardHeader>
        <CardContent>
          <QuizTaker quiz={{ ...activeQuiz, currentUser: user }} onClose={() => setMode('list')} />
        </CardContent>
      </Card>
    );
  }

  // Build Mode
  if (mode === 'build') {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-playfair flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> Build a Quiz
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setMode('list')}>
              ← Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Quiz Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Algebra Basics" />
            </div>
            <div className="space-y-1">
              <Label>Subject *</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Subject..." /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Grade *</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Grade..." /></SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <Card key={i} className="border-border bg-muted/20">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Question {i + 1}</Label>
                    <button onClick={() => removeQuestion(i)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <Input
                    value={q.question}
                    onChange={e => updateQuestion(i, 'question', e.target.value)}
                    placeholder="Enter your question..."
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${i}`}
                          checked={q.correct === j}
                          onChange={() => updateQuestion(i, 'correct', j)}
                          className="accent-green-600 flex-shrink-0 w-4 h-4"
                        />
                        <Input
                          value={opt}
                          onChange={e => updateOption(i, j, e.target.value)}
                          placeholder={`Option ${j + 1}`}
                          className="text-xs h-8"
                        />
                      </div>
                    ))}
                  </div>
                  <Input
                    value={q.explanation}
                    onChange={e => updateQuestion(i, 'explanation', e.target.value)}
                    placeholder="Optional: explanation for wrong answers..."
                    className="text-xs"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={addQuestion} className="gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Question
            </Button>
            <Button onClick={saveQuiz} disabled={saving} className="gap-2 text-sm bg-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save & Publish Quiz'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // List Mode
  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadQuizzes}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const canCreateQuiz = user?.role === 'sace_tutor' || user?.role === 'student_tutor' || user?.role === 'admin';

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-playfair flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" /> Interactive Quiz Builder
          </CardTitle>
          {canCreateQuiz && (
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => setMode('ai')} className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white">
                <Sparkles className="w-3.5 h-3.5" /> AI Generate
              </Button>
              <Button size="sm" onClick={() => setMode('build')} className="gap-1.5 text-xs bg-primary">
                <Plus className="w-3.5 h-3.5" /> Manual
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Test your knowledge with CAPS-aligned quizzes. {!canCreateQuiz && "Quizzes are created by tutors and teachers."}
        </p>
      </CardHeader>
      <CardContent>
        {quizzes.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted-foreground">No quizzes published yet.</p>
            {canCreateQuiz && (
              <p className="text-xs text-muted-foreground mt-1">
                Click "Manual" or "AI Generate" to create your first quiz!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {quizzes.map(quiz => {
              const qCount = Array.isArray(quiz.questions) 
                ? quiz.questions.length 
                : (typeof quiz.questions === 'string' ? JSON.parse(quiz.questions).length : 0);
              return (
                <div key={quiz.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{quiz.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {quiz.subject} · {quiz.grade} · {qCount} question{qCount !== 1 ? 's' : ''}
                      {quiz.created_by && <span className="ml-2">· By: {quiz.created_by.split('@')[0]}</span>}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => { setActiveQuiz(quiz); setMode('take'); }} 
                    className="gap-1 text-xs bg-primary h-7 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Play className="w-3 h-3" /> Take Quiz
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
