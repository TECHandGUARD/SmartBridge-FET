import { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, BookOpen, Trophy, ArrowRight, RotateCcw, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const SUBJECTS = [
  'Mathematics', 'Mathematical Literacy', 'Physical Sciences', 'Life Sciences',
  'Accounting', 'Business Studies', 'Economics',
  'English HL', 'isiXhosa HL', 'Afrikaans HL',
  'History', 'Geography', 'Life Orientation'
];
const GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];

// Built-in sample questions for quick starts
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

export default function PracticeQuiz() {
  const { user } = useOutletContext();
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetchPastResults();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPastResults = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setPastResults(data || []);
    } catch (error) {
      console.error('Error fetching past results:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    if (!subject) { toast.error('Please select a subject'); return; }
    
    setLoading(true);
    try {
      // Try to find a published quiz for this subject
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
    } catch (error) {
      console.error('Error starting quiz:', error);
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

  const handleNext = async () => {
    const newAnswers = [...answers, { selected, correct: questions[currentQ].correct_index }];
    setAnswers(newAnswers);
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      await finishQuiz(newAnswers);
    }
  };

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
            user_email: user.email,
            quiz_id: quizId,
            quiz_title: quizTitle,
            subject,
            grade: grade || '',
            score,
            total_questions: total,
            percentage: pct,
            time_taken_seconds: timeTaken,
          })
          .select()
          .single();
        
        if (error) throw error;
        setPastResults(prev => [data, ...prev]);
      } catch (error) {
        console.error('Error saving quiz result:', error);
        toast.error('Failed to save quiz result');
      }
    }
    setAnswers(finalAnswers);
    setStage('result');
  };

  const resetQuiz = () => {
    setStage('select');
    setSubject('');
    setGrade('');
    setQuestions([]);
    setAnswers([]);
    setSelected(null);
  };

  if (loading && stage === 'select') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (stage === 'select') return <SelectStage subject={subject} setSubject={setSubject} grade={grade} setGrade={setGrade} onStart={startQuiz} pastResults={pastResults} loading={loading} />;
  if (stage === 'quiz') return <QuizStage questions={questions} currentQ={currentQ} selected={selected} showExplanation={showExplanation} quizTitle={quizTitle} subject={subject} onAnswer={handleAnswer} onNext={handleNext} />;
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
            <label className="text-sm font-medium mb-1.5 block">Grade (optional)</label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger><SelectValue placeholder="Any grade" /></SelectTrigger>
              <SelectContent>
                {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onStart} className="w-full gap-2 mt-2" size="lg">
            Start Quiz <ChevronRight className="w-4 h-4" />
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

function QuizStage({ questions, currentQ, selected, showExplanation, quizTitle, subject, onAnswer, onNext }) {
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
            <Button onClick={onNext} className="w-full gap-2 mt-2">
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