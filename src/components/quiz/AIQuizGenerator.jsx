import ReleaseGate from '@/components/operations/ReleaseGate';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Save, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];
const QUESTION_COUNTS = [{
  value: '3',
  label: '3 questions'
}, {
  value: '5',
  label: '5 questions'
}, {
  value: '8',
  label: '8 questions'
}, {
  value: '10',
  label: '10 questions'
}];
function AIQuizGeneratorImplementation({
  user,
  onQuizSaved
}) {
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState('5');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const generate = async () => {
    if (!subject) {
      toast.error('Please select a subject.');
      return;
    }
    if (!grade) {
      toast.error('Please select a grade.');
      return;
    }
    if (!topic.trim()) {
      toast.error('Please enter a topic.');
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const {
        data,
        error: fnError
      } = await supabase.functions.invoke('generate-quiz', {
        body: {
          subject,
          grade,
          topic: topic.trim(),
          question_count: parseInt(questionCount) || 5,
          user_email: user?.email,
          user_id: user?.id
        }
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (!data?.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('No questions were generated. Please try a different topic.');
      }
      setResult(data);
      toast.success(`${data.questions.length} questions generated successfully!`);
      await Promise.resolve(supabase.from('activity_log').insert({
        event_type: 'quiz_generated',
        user_email: user?.email || 'system',
        user_id: user?.id || null,
        description: `AI generated ${data.questions.length} questions for ${subject} ${grade} on "${topic}"`,
        metadata: {
          subject,
          grade,
          topic,
          question_count: data.questions.length,
          resources_used: data.resources_used?.length || 0
        }
      })).catch(() => {});
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message);
      toast.error(`Generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  const saveQuiz = async () => {
    if (!result?.questions?.length) {
      toast.error('No questions to save. Generate a quiz first.');
      return;
    }
    if (!user?.email) {
      toast.error('You must be logged in to save quizzes.');
      return;
    }
    setSaving(true);
    try {
      const quizData = {
        title: `${subject} — ${topic} (AI Generated)`,
        subject,
        grade,
        questions: result.questions.map(q => ({
          question: q.question,
          options: q.options || [],
          correct: q.correct_index ?? 0,
          explanation: q.explanation || ''
        })),
        created_by: user?.email,
        created_by_id: user?.id,
        is_published: true,
        source: 'ai_generated',
        topic: topic.trim(),
        created_at: new Date().toISOString()
      };
      const {
        data,
        error: insertError
      } = await supabase.from('quizzes').insert(quizData).select().single();
      if (insertError) throw insertError;
      await Promise.resolve(supabase.from('activity_log').insert({
        event_type: 'quiz_saved',
        user_email: user?.email || 'system',
        user_id: user?.id || null,
        description: `Saved AI-generated quiz: ${subject} ${grade} on "${topic}"`,
        metadata: {
          quiz_id: data?.id,
          subject,
          grade,
          topic,
          question_count: result.questions.length
        }
      })).catch(() => {});
      toast.success('Quiz saved and published successfully!');
      setResult(null);
      setTopic('');
      if (onQuizSaved) onQuizSaved();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(`Failed to save quiz: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  return <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="font-playfair flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" /> AI Quiz Generator
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Generate CAPS-aligned quiz questions using AI. Questions are based on your uploaded educational resources.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Subject *</Label>
              <Select value={subject} onValueChange={setSubject} disabled={loading}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Grade *</Label>
              <Select value={grade} onValueChange={setGrade} disabled={loading}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Grade..." />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Questions</Label>
              <Select value={questionCount} onValueChange={setQuestionCount} disabled={loading}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_COUNTS.map(n => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Topic / CAPS Unit *</Label>
            <Input className="text-xs h-8" placeholder="e.g. Differentiation, Photosynthesis, The Great Trek..." value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} disabled={loading} />
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>}

          <Button onClick={generate} disabled={loading || !subject || !grade || !topic.trim()} className="w-full bg-primary gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating questions...' : 'Generate Quiz with AI'}
          </Button>
        </CardContent>
      </Card>

      {result && <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="font-playfair text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                {result.questions?.length || 0} Questions Generated
              </CardTitle>
              <Button size="sm" onClick={saveQuiz} disabled={saving} className="bg-primary gap-1.5 text-xs h-8">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving...' : 'Save & Publish'}
              </Button>
            </div>

            {result.topic_summary && <p className="text-xs text-muted-foreground mt-1">{result.topic_summary}</p>}

            {result.resources_used?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-xs text-muted-foreground">Sources:</span>
                {result.resources_used.map((r, i) => <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    <ExternalLink className="w-3 h-3" /> {r.title}
                  </a>)}
              </div>}
          </CardHeader>

          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {result.questions?.map((q, i) => <div key={i} className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
                <p className="font-semibold text-sm">{i + 1}. {q.question}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {q.options?.map((opt, j) => {
              const isCorrect = j === q.correct_index;
              return <div key={j} className={`text-xs px-2 py-1.5 rounded-lg border ${isCorrect ? 'border-green-400 bg-green-50 text-green-800 font-semibold' : 'border-border bg-background'}`}>
                        {String.fromCharCode(65 + j)}. {opt}
                        {isCorrect && ' ✓'}
                      </div>;
            })}
                </div>
                {q.explanation && <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded p-2">
                    💡 {q.explanation}
                  </p>}
              </div>)}
          </CardContent>
        </Card>}
    </div>;
}

export default function AIQuizGenerator(props) {
 return <ReleaseGate feature="externalAi"><AIQuizGeneratorImplementation {...props} /></ReleaseGate>;
}
