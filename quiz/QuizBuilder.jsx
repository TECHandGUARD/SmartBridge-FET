import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle, Brain, Save, Play } from 'lucide-react';
import { toast } from 'sonner';
import { SUBJECTS } from '@/lib/subjects';

const GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];

function QuizTaker({ quiz, onClose }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const score = submitted
    ? quiz.questions.filter((q, i) => answers[i] === q.correct).length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-playfair text-lg font-bold">{quiz.title}</h3>
        <Badge className="bg-primary/10 text-primary">{quiz.subject} · {quiz.grade}</Badge>
      </div>
      {quiz.questions.map((q, i) => (
        <Card key={i} className={submitted ? (answers[i] === q.correct ? 'border-green-300' : 'border-red-300') : 'border-border'}>
          <CardContent className="pt-4 pb-4">
            <p className="font-medium text-sm mb-3">{i + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, j) => (
                <label key={j} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors
                  ${answers[i] === j ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}
                  ${submitted && j === q.correct ? 'border-green-500 bg-green-50' : ''}
                  ${submitted && answers[i] === j && j !== q.correct ? 'border-red-400 bg-red-50' : ''}
                `}>
                  <input
                    type="radio"
                    name={`q${i}`}
                    disabled={submitted}
                    checked={answers[i] === j}
                    onChange={() => setAnswers(prev => ({ ...prev, [i]: j }))}
                    className="accent-primary"
                  />
                  {opt}
                </label>
              ))}
            </div>
            {submitted && answers[i] !== q.correct && q.explanation && (
              <p className="text-xs text-muted-foreground mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                💡 {q.explanation}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
      {!submitted ? (
        <Button onClick={() => setSubmitted(true)} className="w-full bg-primary gap-2" disabled={Object.keys(answers).length < quiz.questions.length}>
          <CheckCircle className="w-4 h-4" /> Submit Quiz
        </Button>
      ) : (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="font-playfair text-3xl font-bold text-primary">{score}/{quiz.questions.length}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {score === quiz.questions.length ? '🎉 Perfect score!' : score >= quiz.questions.length / 2 ? '👏 Good effort!' : '📚 Keep studying!'}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onClose}>Close Quiz</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function QuizBuilder({ user, userProfile }) {
  const [quizzes, setQuizzes] = useState([]);
  const [mode, setMode] = useState('list'); // 'list' | 'build' | 'take'
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correct: 0, explanation: '' }]);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuizzes(); }, []);

  const addQuestion = () => {
    setQuestions(prev => [...prev, { question: '', options: ['', '', '', ''], correct: 0, explanation: '' }]);
  };

  const removeQuestion = (i) => {
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateQuestion = (i, field, value) => {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  };

  const updateOption = (qi, oi, value) => {
    setQuestions(prev => prev.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? value : o) } : q));
  };

  const saveQuiz = async () => {
    if (!title || !subject || !grade) { toast.error('Please fill in quiz title, subject and grade.'); return; }
    if (questions.some(q => !q.question || q.options.some(o => !o))) { toast.error('All questions and options must be filled.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('quizzes')
        .insert({
          title,
          subject,
          grade,
          questions: questions,
          created_by: userProfile?.id,
          is_published: true,
        });
      
      if (error) throw error;
      
      toast.success('Quiz saved and published!');
      setMode('list');
      setTitle(''); setSubject(''); setGrade('');
      setQuestions([{ question: '', options: ['', '', '', ''], correct: 0, explanation: '' }]);
      await loadQuizzes();
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error('Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const userRole = userProfile?.role || user?.role;
  const canCreateQuiz = userRole === 'sace_tutor' || userRole === 'student_tutor' || userRole === 'admin';

  if (mode === 'take' && activeQuiz) {
    const parsed = { ...activeQuiz, questions: activeQuiz.questions };
    return (
      <Card>
        <CardHeader className="pb-3">
          <Button variant="ghost" size="sm" className="w-fit text-xs mb-1" onClick={() => setMode('list')}>← Back</Button>
        </CardHeader>
        <CardContent><QuizTaker quiz={parsed} onClose={() => setMode('list')} /></CardContent>
      </Card>
    );
  }

  if (mode === 'build') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-playfair flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> Build a Quiz</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setMode('list')}>← Back</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1"><Label>Quiz Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Algebra Basics" /></div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Subject..." /></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Grade..." /></SelectTrigger>
                <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <Card key={i} className="border-border bg-muted/20">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Question {i + 1}</Label>
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(i)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
                          className="accent-green-600 flex-shrink-0"
                        />
                        <Input
                          value={opt}
                          onChange={e => updateOption(i, j, e.target.value)}
                          placeholder={`Option ${j + 1}${q.correct === j ? ' ✓ correct' : ''}`}
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
            <Button variant="outline" onClick={addQuestion} className="gap-2 text-sm"><Plus className="w-4 h-4" /> Add Question</Button>
            <Button onClick={saveQuiz} disabled={saving} className="gap-2 text-sm bg-primary">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Publish Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-playfair flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> Interactive Quiz Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-playfair flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> Interactive Quiz Builder</CardTitle>
          {canCreateQuiz && (
            <Button size="sm" onClick={() => setMode('build')} className="gap-2 text-xs bg-primary"><Plus className="w-3.5 h-3.5" /> Create Quiz</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {quizzes.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No quizzes published yet. Tutors can create quizzes above.</p>
        ) : (
          <div className="space-y-2">
            {quizzes.map(quiz => {
              const qCount = quiz.questions?.length || 0;
              return (
                <div key={quiz.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{quiz.title}</p>
                    <p className="text-xs text-muted-foreground">{quiz.subject} · {quiz.grade} · {qCount} questions</p>
                  </div>
                  <Button size="sm" onClick={() => { setActiveQuiz(quiz); setMode('take'); }} className="gap-1 text-xs bg-primary h-7 px-2">
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