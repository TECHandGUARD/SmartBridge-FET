import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UserProps {
  email: string;
}

interface DBQuizResult {
  id: string;
  subject: string;
  percentage: number;
  caps_topic_id: string;
}

interface CAPSTopicItem {
  id: string;
  topic_code: string;
  title: string;
}

interface SubjectItem {
  code: string;
  name: string;
  icon: string;
}

const SUBJECTS: SubjectItem[] = [
  { code: 'Mathematics', name: 'Mathematics', icon: '📐' },
  { code: 'Physical Sciences', name: 'Physical Sciences', icon: '⚗️' },
  { code: 'Life Sciences', name: 'Life Sciences', icon: '🧬' },
  { code: 'Accounting', name: 'Accounting', icon: '📊' },
  { code: 'Economics', name: 'Economics', icon: '📈' },
  { code: 'History', name: 'History', icon: '⏳' },
  { code: 'Geography', name: 'Geography', icon: '🌍' },
  { code: 'Business Studies', name: 'Business Studies', icon: '💼' },
];

const MASTERY_THRESHOLD = 70;

function TopicBadge({ mastered, score, topicTitle }: { mastered: boolean; score: number | null; topicTitle: string }) {
  return (
    <div className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
      mastered
        ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900 shadow-sm'
        : 'bg-slate-50 border-slate-100 text-slate-500'
    }`}>
      {mastered ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-slate-300 shrink-0" />
      )}
      <span className="text-[11px] font-bold flex-1 truncate">{topicTitle}</span>
      {score !== null && (
        <span className={`text-xs font-black ${mastered ? 'text-emerald-700' : 'text-slate-400'}`}>
          {score}%
        </span>
      )}
    </div>
  );
}

function SubjectBlock({ subject, quizResults }: { subject: SubjectItem; quizResults: DBQuizResult[] }) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [topics, setTopics] = useState<CAPSTopicItem[]>([]);
  const [loadingTopics, setLoadingTopics] = useState<boolean>(false);

  useEffect(() => {
    if (expanded && topics.length === 0) {
      fetchSubjectSyllabus();
    }
  }, [expanded]);

  const fetchSubjectSyllabus = async () => {
    try {
      setLoadingTopics(true);
      const { data, error } = await supabase
        .from('caps_syllabus_topics')
        .select('id, topic_code, title')
        .eq('subject', subject.name);

      if (error) throw error;
      setTopics(data || []);
    } catch (err) {
      console.error('Failed compiling subject metadata:', err);
      toast.error('Failed to load syllabus topics');
    } finally {
      setLoadingTopics(false);
    }
  };

  const topicScores: Record<string, number> = {};
  topics.forEach(topic => {
    const relevantQuizScores = quizResults
      .filter(r => r.caps_topic_id === topic.id)
      .map(r => r.percentage);

    if (relevantQuizScores.length > 0) {
      topicScores[topic.id] = Math.max(...relevantQuizScores);
    }
  });

  const masteredCount = topics.filter(t => (topicScores[t.id] ?? 0) >= MASTERY_THRESHOLD).length;
  const masteryPercent = topics.length > 0 ? Math.round((masteredCount / topics.length) * 100) : 0;
  const attemptedCount = Object.keys(topicScores).length;

  return (
    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4 cursor-pointer select-none" onClick={() => setExpanded(prev => !prev)}>
        <div className="flex items-center gap-3">
          <span className="text-2xl shrink-0 select-none">{subject.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wide truncate">{subject.name}</h4>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className="text-[10px] font-bold px-2 h-5">
                  {masteredCount}/{topics.length || '—'} Mastered
                </Badge>
                {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-2">
              <Progress value={masteryPercent} className="h-2 flex-1" />
              <span className="text-xs font-black text-primary w-8 text-right leading-none">{masteryPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-2 border-t border-border bg-muted/20">
          {loadingTopics ? (
            <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground font-bold text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Loading syllabus topics...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {topics.map(t => (
                  <TopicBadge
                    key={t.id}
                    topicTitle={t.title}
                    mastered={(topicScores[t.id] ?? 0) >= MASTERY_THRESHOLD}
                    score={topicScores[t.id] ?? null}
                  />
                ))}
              </div>
              
              {topics.length === 0 && (
                <p className="text-center py-4 text-[11px] font-medium text-muted-foreground italic">
                  No syllabus topics configured for this subject yet.
                </p>
              )}
              
              {attemptedCount > 0 && (
                <p className="text-[10px] text-muted-foreground mt-3 text-center font-medium">
                  * Mastery threshold: {MASTERY_THRESHOLD}% or higher on topic quizzes
                </p>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function SyllabusTopicTracker({ user }: { user: UserProps }) {
  const [quizResults, setQuizResults] = useState<DBQuizResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.email) { 
      setLoading(false); 
      return; 
    }
    fetchStudentQuizPerformance();
  }, [user]);

  const fetchStudentQuizPerformance = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('quiz_results')
        .select('id, subject, percentage, caps_topic_id')
        .eq('student_email', user.email);

      if (dbError) throw dbError;
      setQuizResults(data || []);
    } catch (err: any) {
      console.error('Mastery pipeline failure:', err);
      setError(err.message || 'Failed to load mastery data');
      toast.error('Failed to load mastery data');
    } finally {
      setLoading(false);
    }
  };

  const displayedSubjects = showAll ? SUBJECTS : SUBJECTS.slice(0, 4);

  if (loading) {
    return (
      <Card className="border-border shadow-md max-w-4xl mx-auto bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading mastery data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-md max-w-4xl mx-auto bg-card">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary shrink-0" /> CAPS Syllabus Tracker
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 px-2.5 h-6">
            DBE Aligned
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Track your mastery of CAPS curriculum topics based on quiz performance.
        </p>
      </CardHeader>
      
      <CardContent className="pt-5">
        {error && (
          <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedSubjects.map(subject => (
            <SubjectBlock key={subject.code} subject={subject} quizResults={quizResults} />
          ))}
        </div>
        
        {SUBJECTS.length > 4 && (
          <button
            type="button"
            onClick={() => setShowAll(prev => !prev)}
            className="mt-4 text-xs font-bold text-primary hover:text-primary/80 hover:underline w-full text-center block transition-all"
          >
            {showAll ? 'Show Fewer Subjects' : `Show All ${SUBJECTS.length} Subjects`}
          </button>
        )}
        
        {quizResults.length === 0 && !error && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No quiz results yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Complete some quizzes to start tracking your CAPS mastery!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
