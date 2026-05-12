import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { CAPS_TOPICS } from '@/lib/capsTopics';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const MASTERY_THRESHOLD = 70; // % to consider a topic mastered

function TopicBadge({ mastered, score, topic }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
      mastered
        ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
        : 'bg-muted/40 border-border'
    }`}>
      {mastered
        ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
        : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      <span className={`text-xs font-medium flex-1 ${mastered ? 'text-green-800 dark:text-green-300' : 'text-muted-foreground'}`}>
        {topic}
      </span>
      {score != null && (
        <span className={`text-xs font-bold ${mastered ? 'text-green-700' : 'text-muted-foreground'}`}>
          {score}%
        </span>
      )}
    </div>
  );
}

function SubjectBlock({ subject, quizResults }) {
  const [expanded, setExpanded] = useState(false);
  const topics = CAPS_TOPICS[subject.name] || [];

  // Build a map: topic keyword → best quiz score
  const topicScores = {};
  topics.forEach(topic => {
    const keyword = topic.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const relevant = quizResults.filter(r =>
      r.subject === subject.name &&
      (r.quiz_title?.toLowerCase().includes(keyword) || r.quiz_title?.toLowerCase().includes(topic.toLowerCase().split(' ').slice(-1)[0]))
    );
    if (relevant.length > 0) {
      const percentages = relevant.map(r => {
        if (r.percentage) return r.percentage;
        if (r.score && r.total_questions) return Math.round((r.score / r.total_questions) * 100);
        return 0;
      });
      topicScores[topic] = Math.max(...percentages);
    }
  });

  const masteredCount = topics.filter(t => (topicScores[t] ?? 0) >= MASTERY_THRESHOLD).length;
  const masteryPercent = topics.length > 0 ? Math.round((masteredCount / topics.length) * 100) : 0;
  const attempted = Object.keys(topicScores).length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{subject.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold truncate">{subject.name}</CardTitle>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-xs">
                  {masteredCount}/{topics.length} mastered
                </Badge>
                {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={masteryPercent} className="h-2 flex-1" />
              <span className="text-xs font-bold text-primary w-8 text-right">{masteryPercent}%</span>
            </div>
            {attempted === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No quizzes taken yet — complete quizzes to track mastery.</p>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="grid sm:grid-cols-2 gap-1.5">
            {topics.map(topic => (
              <TopicBadge
                key={topic}
                topic={topic}
                mastered={(topicScores[topic] ?? 0) >= MASTERY_THRESHOLD}
                score={topicScores[topic] ?? null}
              />
            ))}
          </div>
          {attempted > 0 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Topics are marked as mastered when quiz score ≥ {MASTERY_THRESHOLD}%
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function SyllabusTopicTracker({ user }) {
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!user?.email) { 
      setLoading(false); 
      return; 
    }
    
    const fetchQuizResults = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('user_email', user.email)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setQuizResults(data || []);
      } catch (error) {
        console.error('Error fetching quiz results:', error);
        toast.error('Failed to load quiz results');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuizResults();
  }, [user]);

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> CAPS Topic Mastery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedSubjects = showAll ? SUBJECTS : SUBJECTS.slice(0, 6);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> CAPS Topic Mastery
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Based on quiz performance
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Track which CAPS syllabus topics you've mastered across all subjects.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {displayedSubjects.map(subject => (
            <SubjectBlock key={subject.code} subject={subject} quizResults={quizResults} />
          ))}
        </div>
        {SUBJECTS.length > 6 && (
          <button
            onClick={() => setShowAll(s => !s)}
            className="mt-4 text-sm text-primary hover:underline w-full text-center"
          >
            {showAll ? 'Show less' : `Show all ${SUBJECTS.length} subjects`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}