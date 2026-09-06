// src/pages/PracticeQuiz.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, XCircle, BookOpen, Trophy, ArrowRight, 
  RotateCcw, Clock, TrendingUp, ChevronRight, Loader2,
  Sparkles, Zap, Award, BarChart3, Calendar, Star,
  Brain, Target, Timer, AlertCircle, RefreshCw, Share2,
  Home, ChevronLeft, Flag, Volume2, VolumeX
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Subjects
  SUBJECTS: (import.meta.env.VITE_QUIZ_SUBJECTS || 
    'Mathematics,Mathematical Literacy,Physical Sciences,Life Sciences,Accounting,Business Studies,Economics,English HL,isiXhosa HL,Afrikaans HL,History,Geography,Life Orientation'
  ).split(',').map(s => s.trim()),

  // Grades
  GRADES: (import.meta.env.VITE_QUIZ_GRADES || 'Grade 10,Grade 11,Grade 12')
    .split(',').map(g => g.trim()),

  // Default sample questions per subject
  SAMPLE_QUESTIONS_PER_SUBJECT: Number(import.meta.env.VITE_QUIZ_SAMPLE_QUESTIONS) || 5,

  // Time limits
  SECONDS_PER_QUESTION: Number(import.meta.env.VITE_QUIZ_SECONDS_PER_QUESTION) || 30,
  MAX_QUESTIONS: Number(import.meta.env.VITE_QUIZ_MAX_QUESTIONS) || 20,

  // Feature flags
  ENABLE_TIMER: import.meta.env.VITE_QUIZ_ENABLE_TIMER !== 'false',
  ENABLE_SOUNDS: import.meta.env.VITE_QUIZ_ENABLE_SOUNDS !== 'false',
  ENABLE_SHARE: import.meta.env.VITE_QUIZ_ENABLE_SHARE !== 'false',

  // Grade thresholds
  THRESHOLDS: {
    EXCELLENT: Number(import.meta.env.VITE_QUIZ_THRESHOLD_EXCELLENT) || 80,
    GOOD: Number(import.meta.env.VITE_QUIZ_THRESHOLD_GOOD) || 60,
    FAIR: Number(import.meta.env.VITE_QUIZ_THRESHOLD_FAIR) || 40,
  },

  // Messages
  MESSAGES: {
    SELECT_SUBJECT: import.meta.env.VITE_QUIZ_SELECT_SUBJECT_MSG || 'Please select a subject',
    START_FAILED: import.meta.env.VITE_QUIZ_START_FAILED_MSG || 'Failed to start quiz. Please try again.',
    SAVE_FAILED: import.meta.env.VITE_QUIZ_SAVE_FAILED_MSG || 'Failed to save your results.',
    NO_QUESTIONS: import.meta.env.VITE_QUIZ_NO_QUESTIONS_MSG || 'No questions available for this subject.',
    TIME_UP: import.meta.env.VITE_QUIZ_TIME_UP_MSG || '⏰ Time\'s up! Auto-submitting your answers...',
  },

  // Grade labels
  GRADE_LABELS: {
    EXCELLENT: import.meta.env.VITE_QUIZ_GRADE_EXCELLENT || '🏆 Excellent!',
    GOOD: import.meta.env.VITE_QUIZ_GRADE_GOOD || '👍 Good job!',
    FAIR: import.meta.env.VITE_QUIZ_GRADE_FAIR || '📚 Keep practising!',
    POOR: import.meta.env.VITE_QUIZ_GRADE_POOR || '💪 Don\'t give up!',
  },
};

// ============================================================
// Sample Questions (Built-in fallback)
// ============================================================

const SAMPLE_QUESTIONS = {
  'Mathematics': [
    { question: 'What is the derivative of x²?', options: ['x', '2x', 'x²', '2'], correct_index: 1, explanation: 'Using the power rule: d/dx(xⁿ) = nxⁿ⁻¹, so d/dx(x²) = 2x.' },
    { question: 'Solve: 2x + 6 = 14', options: ['x = 3', 'x = 4', 'x = 5', 'x = 10'], correct_index: 1, explanation: '2x = 14 - 6 = 8, so x = 4.' },
    { question: 'What is sin(90°)?', options: ['0', '0.5', '1', '√2/2'], correct_index: 2, explanation: 'sin(90°) = 1 by definition of the unit circle.' },
    { question: 'Simplify: 3(2x - 4) + 6', options: ['6x - 6', '6x + 6', '6x - 18', '6x - 10'], correct_index: 0, explanation: '3(2x - 4) + 6 = 6x - 12 + 6 = 6x - 6.' },
    { question: 'The area of a circle with radius 5 is:', options: ['10π', '25π', '5π', '50π'], correct_index: 1, explanation: 'Area = πr² = π × 5² = 25π.' },
  ],
  'Physical Sciences': [
    { question: 'What is Newton\'s Second Law of Motion?', options: ['F = ma', 'E = mc²', 'v = d/t', 'P = mv'], correct_index: 0, explanation: 'F = ma: Force equals mass times acceleration.' },
    { question: 'What is the chemical symbol for Gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correct_index: 2, explanation: 'Gold\'s symbol Au comes from the Latin word "Aurum".' },
    { question: 'The unit of electric current is:', options: ['Volt', 'Ohm', 'Watt', 'Ampere'], correct_index: 3, explanation: 'Electric current is measured in Amperes (A).' },
    { question: 'Which of the following is NOT a vector quantity?', options: ['Force', 'Velocity', 'Mass', 'Acceleration'], correct_index: 2, explanation: 'Mass is a scalar quantity — it has magnitude but no direction.' },
    { question: 'What is the speed of light in a vacuum?', options: ['3×10⁶ m/s', '3×10⁸ m/s', '3×10¹⁰ m/s', '3×10⁴ m/s'], correct_index: 1, explanation: 'c ≈ 3×10⁸ m/s (approximately 300,000 km/s).' },
  ],
  'Life Sciences': [
    { question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi Apparatus'], correct_index: 2, explanation: 'Mitochondria produce ATP through cellular respiration.' },
    { question: 'DNA stands for:', options: ['Deoxyribose Nucleic Acid', 'Deoxyribonucleic Acid', 'Double Nucleic Acid', 'Dinitrogen Acid'], correct_index: 1, explanation: 'DNA = Deoxyribonucleic Acid, the molecule carrying genetic information.' },
    { question: 'Which process do plants use to make food?', options: ['Respiration', 'Fermentation', 'Photosynthesis', 'Digestion'], correct_index: 2, explanation: 'Photosynthesis converts CO₂ + H₂O + light energy into glucose + O₂.' },
    { question: 'How many chromosomes do humans have?', options: ['23', '44', '46', '48'], correct_index: 2, explanation: 'Humans have 46 chromosomes (23 pairs) in somatic cells.' },
    { question: 'Blood type is determined by:', options: ['White blood cells', 'Antigens on red blood cells', 'Plasma proteins', 'Haemoglobin'], correct_index: 1, explanation: 'ABO blood type is determined by antigens (A and/or B) on red blood cells.' },
  ],
  'Accounting': [
    { question: 'The accounting equation is:', options: ['Assets = Liabilities + Equity', 'Assets + Liabilities = Equity', 'Revenue - Expenses = Profit', 'Cash = Assets - Liabilities'], correct_index: 0, explanation: 'A = L + E: Assets must always equal Liabilities plus Equity.' },
    { question: 'A debit entry in accounts means:', options: ['Money leaving the bank', 'Increase in assets or expenses', 'Increase in liabilities', 'Decrease in equity'], correct_index: 1, explanation: 'Debit increases assets and expenses; credit increases liabilities, equity, and income.' },
    { question: 'Depreciation is:', options: ['An income', 'A liability', 'An expense', 'An asset'], correct_index: 2, explanation: 'Depreciation is a non-cash expense reflecting the reduction in asset value.' },
    { question: 'VAT in South Africa is currently:', options: ['10%', '14%', '15%', '20%'], correct_index: 2, explanation: 'South Africa\'s standard VAT rate is 15% (raised from 14% in 2018).' },
    { question: 'A Trial Balance checks:', options: ['Profitability', 'That debits equal credits', 'Cash flow', 'Net asset value'], correct_index: 1, explanation: 'A Trial Balance verifies that total debits = total credits in the ledger.' },
  ],
};

function getQuestionsForQuiz(subject) {
  return SAMPLE_QUESTIONS[subject] || SAMPLE_QUESTIONS['Mathematics'];
}

// ============================================================
// Sub-Components
// ============================================================

function TimerDisplay({ seconds, totalSeconds, isRunning, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isRunning) return;
    
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [seconds, isRunning, onTimeUp]);

  const percentage = (timeLeft / totalSeconds) * 100;
  const isUrgent = percentage < 20;

  return (
    <div className="flex items-center gap-2">
      <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
      <span className={`font-mono font-bold text-sm ${isUrgent ? 'text-red-500' : 'text-foreground'}`}>
        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
      </span>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-primary'}`}
          style={{ width: `${Math.max(percentage, 0)}%` }}
        />
      </div>
    </div>
  );
}

function ProgressStats({ current, total, correct, incorrect }) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Target className="w-3 h-3" />
        {current + 1}/{total}
      </span>
      {correct > 0 && (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="w-3 h-3" />
          {correct}
        </span>
      )}
      {incorrect > 0 && (
        <span className="flex items-center gap-1 text-red-600">
          <XCircle className="w-3 h-3" />
          {incorrect}
        </span>
      )}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function PracticeQuiz() {
  // ✅ FIXED: Use useAuth() instead of useOutletContext()
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stage, setStage] = useState('select');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
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
  const [timeUp, setTimeUp] = useState(false);

  // Track correct/incorrect count
  const correctCount = answers.filter(a => a.selected === a.correct).length;
  const incorrectCount = answers.filter(a => a.selected !== a.correct && a.selected !== undefined).length;

  // ============================================================
  // Load Past Results
  // ============================================================

  const loadPastResults = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('student_email', user.email)
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

  // ============================================================
  // Start Quiz
  // ============================================================

  const startQuiz = async () => {
    if (!subject) { 
      toast.error(CONFIG.MESSAGES.SELECT_SUBJECT); 
      return; 
    }
    
    setLoading(true);
    setTimeUp(false);
    
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('subject', subject)
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
        qs = getQuestionsForQuiz(subject);
        title = `${subject} Practice Quiz`;
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
      toast.error(CONFIG.MESSAGES.START_FAILED);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Quiz Handlers
  // ============================================================

  const handleAnswer = (idx) => {
    if (selected !== null || timeUp) return;
    setSelected(idx);
    setShowExplanation(true);
  };

  const handleNext = () => {
    const newAnswers = [...answers, { selected, correct: questions[currentQ].correct_index }];
    setAnswers(newAnswers);
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      finishQuiz(newAnswers);
    }
  };

  const handleTimeUp = () => {
    setTimeUp(true);
    toast.warning(CONFIG.MESSAGES.TIME_UP);
    // Auto-submit with current answers
    const finalAnswers = [...answers];
    // If current question has no answer, mark as incorrect
    if (selected === null) {
      finalAnswers.push({ selected: -1, correct: questions[currentQ].correct_index });
    } else {
      finalAnswers.push({ selected, correct: questions[currentQ].correct_index });
    }
    finishQuiz(finalAnswers);
  };

  // ============================================================
  // Finish Quiz
  // ============================================================

  const finishQuiz = async (finalAnswers) => {
    const score = finalAnswers.filter(a => a.selected === a.correct).length;
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    const timeTaken = Math.round((Date.now() - startTime) / 1000);

    if (user?.email) {
      try {
        const { data, error } = await supabase
          .from('quiz_results')
          .insert({
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
        toast.error(CONFIG.MESSAGES.SAVE_FAILED);
      }
    }
    setAnswers(finalAnswers);
    setStage('result');
  };

  // ============================================================
  // Reset
  // ============================================================

  const resetQuiz = () => {
    setStage('select');
    setSubject('');
    setGrade('');
    setQuestions([]);
    setAnswers([]);
    setSelected(null);
    setTimeUp(false);
  };

  // ============================================================
  // Render: Select Stage
  // ============================================================

  if (stage === 'select') {
    return (
      <SelectStage 
        subject={subject} 
        setSubject={setSubject} 
        grade={grade} 
        setGrade={setGrade} 
        onStart={startQuiz} 
        pastResults={pastResults} 
        loading={loading} 
      />
    );
  }

  // ============================================================
  // Render: Quiz Stage
  // ============================================================

  if (stage === 'quiz') {
    return (
      <QuizStage 
        questions={questions} 
        currentQ={currentQ} 
        selected={selected} 
        showExplanation={showExplanation} 
        quizTitle={quizTitle} 
        subject={subject} 
        onAnswer={handleAnswer} 
        onNext={handleNext}
        onTimeUp={handleTimeUp}
        answers={answers}
        totalQuestions={questions.length}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        timeUp={timeUp}
      />
    );
  }

  // ============================================================
  // Render: Result Stage
  // ============================================================

  if (stage === 'result') {
    return (
      <ResultStage 
        answers={answers} 
        questions={questions} 
        quizTitle={quizTitle} 
        subject={subject} 
        onReset={resetQuiz} 
        pastResults={pastResults}
        timeTaken={Math.round((Date.now() - startTime) / 1000)}
      />
    );
  }

  return null;
}

// ============================================================
// SelectStage Component
// ============================================================

function SelectStage({ subject, setSubject, grade, setGrade, onStart, pastResults, loading }) {
  const bySubject = pastResults.reduce((acc, r) => {
    if (!acc[r.subject]) acc[r.subject] = [];
    acc[r.subject].push(r.percentage);
    return acc;
  }, {});

  const totalQuizzes = pastResults.length;
  const averageScore = totalQuizzes > 0 
    ? Math.round(pastResults.reduce((sum, r) => sum + r.percentage, 0) / totalQuizzes) 
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Brain className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="font-playfair text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Practice Quiz
        </h1>
        <p className="text-muted-foreground mt-1">Test your knowledge and track your progress over time.</p>
      </div>

      {/* Stats Summary */}
      {totalQuizzes > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <Card className="border-border bg-muted/20">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{totalQuizzes}</p>
              <p className="text-[10px] text-muted-foreground">Quizzes Taken</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-muted/20">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-primary">{averageScore}%</p>
              <p className="text-[10px] text-muted-foreground">Average Score</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-muted/20 sm:col-span-1 col-span-2">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{Object.keys(bySubject).length}</p>
              <p className="text-[10px] text-muted-foreground">Subjects Practiced</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-6 border-border shadow-md">
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-primary" /> Subject *
            </label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Choose a subject…" /></SelectTrigger>
              <SelectContent>
                {CONFIG.SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" /> Grade (optional)
            </label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger><SelectValue placeholder="Any grade" /></SelectTrigger>
              <SelectContent>
                {CONFIG.GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={onStart} 
            className="w-full gap-2 mt-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
            size="lg" 
            disabled={loading || !subject}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Loading...' : 'Start Quiz'}
            {!loading && <ChevronRight className="w-4 h-4" />}
          </Button>
        </CardContent>
      </Card>

      {/* Past Results */}
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
                <Card key={subj} className="p-4 border-border hover:shadow-md transition-shadow">
                  <p className="font-medium text-sm">{subj}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={latest} className="flex-1 h-2" />
                    <span className="text-xs font-semibold text-primary">{latest}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {scores.length} attempt{scores.length > 1 ? 's' : ''} · avg {avg}%
                  </p>
                </Card>
              );
            })}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Recent attempts</p>
            {pastResults.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2 hover:bg-muted/60 transition-colors">
                <span className="font-medium">{r.quiz_title || r.subject}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={r.percentage >= CONFIG.THRESHOLDS.EXCELLENT ? 'default' : r.percentage >= CONFIG.THRESHOLDS.GOOD ? 'secondary' : 'destructive'} className="text-xs">
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

// ============================================================
// QuizStage Component
// ============================================================

function QuizStage({ 
  questions, currentQ, selected, showExplanation, quizTitle, subject, 
  onAnswer, onNext, onTimeUp, answers, totalQuestions, correctCount, incorrectCount, timeUp 
}) {
  const q = questions[currentQ];
  const isCorrect = selected === q.correct_index;
  const progress = ((currentQ) / questions.length) * 100;
  const totalSeconds = questions.length * CONFIG.SECONDS_PER_QUESTION;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{subject}</Badge>
            <span className="text-xs text-muted-foreground">{quizTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            {CONFIG.ENABLE_TIMER && (
              <TimerDisplay 
                seconds={totalSeconds - (answers.length * CONFIG.SECONDS_PER_QUESTION)} 
                totalSeconds={totalSeconds}
                isRunning={!timeUp}
                onTimeUp={onTimeUp}
              />
            )}
            <ProgressStats 
              current={currentQ} 
              total={totalQuestions} 
              correct={correctCount} 
              incorrect={incorrectCount} 
            />
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <Card className="border-border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs font-medium">
              Question {currentQ + 1} of {totalQuestions}
            </Badge>
            {timeUp && (
              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                <Clock className="w-3 h-3 mr-1" /> Time's Up
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg font-semibold leading-snug mt-2">
            {q.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.options.map((opt, i) => {
            let cls = 'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ';
            
            if (selected === null && !timeUp) {
              cls += 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer hover:scale-[1.01]';
            } else if (i === q.correct_index) {
              cls += 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400';
            } else if (i === selected && selected !== q.correct_index) {
              cls += 'border-red-400 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400';
            } else if (i === selected && selected === q.correct_index) {
              cls += 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400';
            } else {
              cls += 'border-border opacity-60';
            }
            
            return (
              <button 
                key={i} 
                className={cls} 
                onClick={() => onAnswer(i)} 
                disabled={selected !== null || timeUp}
              >
                <span className="inline-flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                  {selected !== null && i === q.correct_index && (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 ml-auto" />
                  )}
                  {selected !== null && i === selected && selected !== q.correct_index && (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 ml-auto" />
                  )}
                </span>
              </button>
            );
          })}

          {showExplanation && q.explanation && (
            <div className={`rounded-xl p-4 text-sm mt-2 ${
              isCorrect 
                ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400' 
                : 'bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400'
            }`}>
              <p className="font-semibold mb-0.5 flex items-center gap-1.5">
                {isCorrect ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {isCorrect ? '✅ Correct!' : '❌ Not quite.'}
              </p>
              <p className="text-sm leading-relaxed">{q.explanation}</p>
            </div>
          )}

          {(selected !== null || timeUp) && (
            <Button 
              onClick={onNext} 
              className="w-full gap-2 mt-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              disabled={!selected && !timeUp}
            >
              {currentQ + 1 < questions.length ? (
                <>Next Question <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>See Results <Trophy className="w-4 h-4" /></>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// ResultStage Component
// ============================================================

function ResultStage({ answers, questions, quizTitle, subject, onReset, pastResults, timeTaken }) {
  const score = answers.filter(a => a.selected === a.correct).length;
  const total = questions.length;
  const pct = Math.round((score / total) * 100);
  
  const getGrade = () => {
    if (pct >= CONFIG.THRESHOLDS.EXCELLENT) return CONFIG.GRADE_LABELS.EXCELLENT;
    if (pct >= CONFIG.THRESHOLDS.GOOD) return CONFIG.GRADE_LABELS.GOOD;
    if (pct >= CONFIG.THRESHOLDS.FAIR) return CONFIG.GRADE_LABELS.FAIR;
    return CONFIG.GRADE_LABELS.POOR;
  };

  const grade = getGrade();
  const isExcellent = pct >= CONFIG.THRESHOLDS.EXCELLENT;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Card className="text-center mb-6 border-border shadow-lg overflow-hidden">
        <div className={`p-6 ${isExcellent ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20' : 'bg-primary/5'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isExcellent ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-primary/10 text-primary'
          }`}>
            <Trophy className={`w-8 h-8 ${isExcellent ? 'fill-amber-500' : ''}`} />
          </div>
          <h2 className="font-playfair text-2xl font-bold mb-1">{grade}</h2>
          <p className="text-muted-foreground text-sm mb-4">{quizTitle}</p>
          <div className="flex items-center justify-center gap-4">
            <div className="text-5xl font-bold text-primary">{pct}%</div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">{score} out of {total} correct</p>
              {timeTaken && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {Math.floor(timeTaken / 60)}m {timeTaken % 60}s
                </p>
              )}
            </div>
          </div>
          <Progress value={pct} className={`h-2 mt-4 ${isExcellent ? 'bg-amber-200' : ''}`} />
        </div>
      </Card>

      {/* Answer Review */}
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" /> Answer Review
      </h3>
      <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto pr-1">
        {questions.map((q, i) => {
          const a = answers[i];
          const isCorrect = a?.selected === q.correct_index;
          const answered = a?.selected !== undefined && a?.selected !== -1;
          
          return (
            <div key={i} className={`rounded-xl border p-3 text-sm ${
              isCorrect ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800' : 
              answered ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800' :
              'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800'
            }`}>
              <p className="font-medium text-xs mb-0.5 flex items-center gap-1.5">
                <span className="text-muted-foreground">{i + 1}.</span>
                {isCorrect && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                {!isCorrect && answered && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                {!answered && <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />}
                {q.question}
              </p>
              <div className="flex flex-wrap gap-2 text-xs mt-0.5">
                <span className={isCorrect ? 'text-green-700' : answered ? 'text-red-700' : 'text-yellow-700'}>
                  {isCorrect ? '✅ Correct' : answered ? `❌ Your answer: ${q.options[a.selected]}` : '⏰ Not answered'}
                </span>
                {!isCorrect && answered && (
                  <span className="text-green-600">Correct: <strong>{q.options[q.correct_index]}</strong></span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onReset} variant="outline" className="flex-1 gap-2">
          <RotateCcw className="w-4 h-4" /> Try Another
        </Button>
        <Button onClick={onReset} className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
          <Home className="w-4 h-4" /> Back to Quiz Hub
        </Button>
      </div>
    </div>
  );
}
