import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, BookOpen, Trophy, ArrowRight, RotateCcw, TrendingUp, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SUBJECTS = [
  'Mathematics', 'Mathematical Literacy', 'Physical Sciences', 'Life Sciences',
  'Accounting', 'Business Studies', 'Economics',
  'English HL', 'isiXhosa HL', 'Afrikaans HL',
  'History', 'Geography', 'Life Orientation'
];
const GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];

export default function PracticeQuiz() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stage, setStage] = useState('select'); // select | quiz | result
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [pastResults, setPastResults] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizId, setQuizId] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadPastResults = useCallback(async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPastResults(data || []);
    } catch (err) {
      console.error('Error loading past results:', err);
    }
  }, [user?.email]);

  useEffect(() => {
    loadPastResults();
  }, [loadPastResults]);

  const startQuiz = async () => {
    if (!subject || !grade) {
      toast.error('Please select a subject and grade');
      return;
    }

    setLoading(true);
    try {
      // Try to find a published quiz for this subject
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('subject', subject)
        .eq('grade', grade)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let qs, title, qId = null;
      if (data && data.length > 0 && data[0].questions?.length > 0) {
        qs = data[0].questions;
        title = data[0].title;
        qId = data[0].id;
      } else {
        toast.info('No published quiz is available for this subject and grade yet.');
        return;
      }

      setQuestions(qs);
      setQuizTitle(title);
      setQuizId(qId);
      setCurrentQ(0);
      setAnswers([]);
      setSelected(null);
      setShowExplanation(false);
      setStartTime(Date.now());
      setStage('quiz');
    } catch (err) {
      console.error('Error starting quiz:', err);
      toast.error('Failed to start quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
  };

  const handleNext = () => {
    const newAnswers = [...answers, { selected, correct: questions[currentQ].correct_index }];
    if (currentQ + 1 < questions.length) {
      setAnswers(newAnswers);
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      // Done — save result
      finishQuiz(newAnswers);
    }
  };

  const finishQuiz = async (finalAnswers) => {
    if (loading) return;
    setLoading(true);
    const score = finalAnswers.filter(a => a.selected === a.correct).length;
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    const timeTaken = Math.round((Date.now() - startTime) / 1000);

    if (user?.email) {
      try {
        const { data, error } = await supabase
          .from('quiz_results')
          .insert({
            student_id: user.id,
            student_email: user.email,
            quiz_id: quizId || `builtin_${subject}`,
            quiz_title: quizTitle,
            subject: subject,
            grade: grade || '',
            score: score,
            total_questions: total,
            percentage: pct,
            time_taken_seconds: timeTaken,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        setPastResults(prev => [data, ...prev]);
      } catch (err) {
        console.error('Error saving quiz result:', err);
        toast.error('Your result could not be saved. Please retry.');
        setLoading(false);
        return;
      }
    }
    setAnswers(finalAnswers);
    setStage('result');
    setLoading(false);
  };

  const resetQuiz = () => {
    setStage('select');
    setSubject('');
    setGrade('');
    setQuestions([]);
    setAnswers([]);
    setSelected(null);
  };

  if (stage === 'select') return <SelectStage subject={subject} setSubject={setSubject} grade={grade} setGrade={setGrade} onStart={startQuiz} pastResults={pastResults} loading={loading} />;
  if (stage === 'quiz') return <QuizStage questions={questions} currentQ={currentQ} selected={selected} showExplanation={showExplanation} quizTitle={quizTitle} subject={subject} onAnswer={handleAnswer} onNext={handleNext} saving={loading} />;
  if (stage === 'result') return <ResultStage answers={answers} questions={questions} quizTitle={quizTitle} subject={subject} onReset={resetQuiz} pastResults={pastResults} />;
}

function SelectStage({ subject, setSubject, grade, setGrade, onStart, pastResults, loading }) {
  const bySubject = pastResults.reduce((acc, r) => {
    if (!acc[r.subject]) acc[r.subject] = [];
    acc[r.subject].push(r.percentage);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>
        <h1 className="font-playfair text-3xl font-bold mb-2">Practice Quiz</h1>
        <p className="text-muted-foreground">Test your knowledge and track your progress over time.</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Subject *</label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Choose a subject…" /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Grade *</label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger><SelectValue placeholder="Choose your grade" /></SelectTrigger>
              <SelectContent>
                {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onStart} className="w-full gap-2 mt-2" size="lg" disabled={loading || !subject || !grade}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            {loading ? 'Loading...' : 'Start Quiz'}
          </Button>
        </CardContent>
      </Card>

      {pastResults.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Your Progress
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            {Object.entries(bySubject).map(([subj, scores]) => {
              const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
              const latest = scores[0];
              return (
                <Card key={subj} className="p-4">
                  <p className="font-medium text-sm">{subj}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={latest} className="flex-1 h-2" />
                    <span className="text-xs font-semibold text-primary">{latest}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{scores.length} attempt{scores.length > 1 ? 's' : ''} · avg {avg}%</p>
                </Card>
              );
            })}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Recent attempts</p>
            {pastResults.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                <span className="font-medium">{r.quiz_title || r.subject}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={r.percentage >= 70 ? 'default' : r.percentage >= 50 ? 'secondary' : 'destructive'} className="text-xs">
                    {r.percentage}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">{r.score}/{r.total_questions}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuizStage({ questions, currentQ, selected, showExplanation, quizTitle, subject, onAnswer, onNext, saving }) {
  const q = questions[currentQ];
  const isCorrect = selected === q.correct_index;
  const progress = ((currentQ) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline">{subject}</Badge>
          <span className="text-sm text-muted-foreground">{currentQ + 1} / {questions.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold leading-snug">{q.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.options.map((opt, i) => {
            let cls = 'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ';
            if (selected === null) {
              cls += 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer';
            } else if (i === q.correct_index) {
              cls += 'border-green-500 bg-green-50 text-green-800';
            } else if (i === selected && selected !== q.correct_index) {
              cls += 'border-red-400 bg-red-50 text-red-700';
            } else {
              cls += 'border-border opacity-60';
            }
            return (
              <button key={i} className={cls} onClick={() => onAnswer(i)} disabled={selected !== null}>
                <span className="inline-flex items-center gap-2">
                  {selected !== null && i === q.correct_index && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                  {selected !== null && i === selected && selected !== q.correct_index && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  {opt}
                </span>
              </button>
            );
          })}

          {showExplanation && q.explanation && (
            <div className={`rounded-xl p-3 text-sm mt-2 ${isCorrect ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
              <p className="font-semibold mb-0.5">{isCorrect ? '✅ Correct!' : '❌ Not quite.'}</p>
              <p>{q.explanation}</p>
            </div>
          )}

          {selected !== null && (
            <Button onClick={onNext} disabled={saving} className="w-full gap-2 mt-2">
              {currentQ + 1 < questions.length ? 'Next Question' : 'See Results'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultStage({ answers, questions, quizTitle, subject, onReset, pastResults }) {
  const score = answers.filter(a => a.selected === a.correct).length;
  const pct = Math.round((score / questions.length) * 100);
  const grade = pct >= 80 ? '🏆 Excellent!' : pct >= 60 ? '👍 Good job!' : pct >= 40 ? '📚 Keep practising!' : '💪 Don\'t give up!';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Card className="text-center mb-6">
        <CardContent className="p-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-playfair text-2xl font-bold mb-1">{grade}</h2>
          <p className="text-muted-foreground text-sm mb-4">{quizTitle}</p>
          <div className="text-5xl font-bold text-primary mb-2">{pct}%</div>
          <p className="text-muted-foreground">{score} out of {questions.length} correct</p>
          <Progress value={pct} className="h-3 mt-4" />
        </CardContent>
      </Card>

      {/* Review answers */}
      <h3 className="font-semibold mb-3">Answer Review</h3>
      <div className="space-y-3 mb-6">
        {questions.map((q, i) => {
          const a = answers[i];
          const correct = a?.selected === q.correct_index;
          return (
            <div key={i} className={`rounded-xl border p-4 text-sm ${correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <p className="font-medium mb-1">{i + 1}. {q.question}</p>
              <p className={`text-xs ${correct ? 'text-green-700' : 'text-red-700'}`}>
                {correct ? '✅' : '❌'} Your answer: <strong>{q.options[a?.selected] ?? '—'}</strong>
                {!correct && <> · Correct: <strong>{q.options[q.correct_index]}</strong></>}
              </p>
              {q.explanation && <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button onClick={onReset} variant="outline" className="flex-1 gap-2">
          <RotateCcw className="w-4 h-4" /> Try Another
        </Button>
        <Button onClick={onReset} className="flex-1 gap-2">
          <BookOpen className="w-4 h-4" /> Back to Quiz Hub
        </Button>
      </div>
    </div>
  );
}
