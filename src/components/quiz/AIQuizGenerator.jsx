import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Save, ExternalLink, CheckCircle } from 'lucide-react';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

const GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];

export default function AIQuizGenerator({ user, onQuizSaved }) {
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState('5');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    if (!subject || !grade || !topic.trim()) {
      toast.error('Please select subject, grade, and enter a topic.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: {
          subject,
          grade,
          topic: topic.trim(),
          question_count: parseInt(questionCount) || 5
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success('Quiz generated successfully!');
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(`Generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveQuiz = async () => {
    if (!result?.questions?.length) {
      toast.error('No questions to save');
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('quizzes')
        .insert({
          title: `${subject} — ${topic} (AI Generated)`,
          subject,
          grade,
          questions: result.questions.map(q => ({
            question: q.question,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation
          })),
          created_by: user?.email,
          is_published: true,
        });
      
      if (error) throw error;
      
      toast.success('Quiz saved and published!');
      setResult(null);
      setTopic('');
      if (onQuizSaved) onQuizSaved();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="font-playfair flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" /> AI Quiz Generator
          </CardTitle>
          <p className="text-xs text-muted-foreground">Generate CAPS-aligned quiz questions from your Knowledge Base using AI.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Subject *</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Grade *</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Grade..." /></SelectTrigger>
                <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Questions</Label>
              <Select value={questionCount} onValueChange={setQuestionCount}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['3', '5', '8', '10'].map(n => <SelectItem key={n} value={n}>{n} questions</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Topic / CAPS Unit *</Label>
            <Input
              className="text-xs h-8"
              placeholder="e.g. Differentiation, Photosynthesis, The Great Trek..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
            />
          </div>
          <Button onClick={generate} disabled={loading} className="w-full bg-primary gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating questions from Knowledge Base...' : 'Generate Quiz with AI'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="font-playfair text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" /> {result.questions?.length || 0} Questions Generated
              </CardTitle>
              <Button size="sm" onClick={saveQuiz} disabled={saving} className="bg-primary gap-1.5 text-xs h-8">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save & Publish
              </Button>
            </div>
            {result.topic_summary && (
              <p className="text-xs text-muted-foreground">{result.topic_summary}</p>
            )}
            {result.resources_used?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-xs text-muted-foreground">Sources:</span>
                {result.resources_used.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    <ExternalLink className="w-3 h-3" /> {r.title}
                  </a>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {result.questions?.map((q, i) => (
              <div key={i} className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
                <p className="font-semibold text-sm">{i + 1}. {q.question}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {q.options?.map((opt, j) => (
                    <div key={j} className={`text-xs px-2 py-1.5 rounded-lg border ${j === q.correct_index ? 'border-green-400 bg-green-50 text-green-800 font-semibold' : 'border-border bg-background'}`}>
                      {String.fromCharCode(65 + j)}. {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded p-2">
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}