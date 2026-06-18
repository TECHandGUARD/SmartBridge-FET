import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Loader2, AlertCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

// PropTypes definitions instead of TypeScript interfaces
const UserProps = {
  email: PropTypes.string.isRequired
};

// PropTypes for component props
const propTypes = {
  user: PropTypes.shape(UserProps).isRequired
};

// Syllabus topics by subject
const SYLLABUS_TOPICS = {
  'Mathematics': [
    { id: 'math_algebra', label: 'Algebra' },
    { id: 'math_calculus', label: 'Calculus' },
    { id: 'math_geometry', label: 'Geometry' },
    { id: 'math_trigonometry', label: 'Trigonometry' },
    { id: 'math_statistics', label: 'Statistics' },
  ],
  'Physical Sciences': [
    { id: 'phys_mechanics', label: 'Mechanics' },
    { id: 'phys_thermodynamics', label: 'Thermodynamics' },
    { id: 'phys_electricity', label: 'Electricity & Magnetism' },
    { id: 'phys_optics', label: 'Optics' },
    { id: 'phys_quantum', label: 'Quantum Physics' },
  ],
  'Life Sciences': [
    { id: 'bio_cell', label: 'Cell Biology' },
    { id: 'bio_genetics', label: 'Genetics' },
    { id: 'bio_ecology', label: 'Ecology' },
    { id: 'bio_evolution', label: 'Evolution' },
    { id: 'bio_human', label: 'Human Biology' },
  ],
  'Accounting': [
    { id: 'acc_financial', label: 'Financial Accounting' },
    { id: 'acc_management', label: 'Management Accounting' },
    { id: 'acc_taxation', label: 'Taxation' },
    { id: 'acc_auditing', label: 'Auditing' },
    { id: 'acc_costing', label: 'Costing' },
  ],
  'Economics': [
    { id: 'econ_micro', label: 'Microeconomics' },
    { id: 'econ_macro', label: 'Macroeconomics' },
    { id: 'econ_development', label: 'Development Economics' },
    { id: 'econ_international', label: 'International Economics' },
    { id: 'econ_behavioral', label: 'Behavioral Economics' },
  ],
  'History': [
    { id: 'hist_ancient', label: 'Ancient History' },
    { id: 'hist_medieval', label: 'Medieval History' },
    { id: 'hist_modern', label: 'Modern History' },
    { id: 'hist_south_africa', label: 'South African History' },
    { id: 'hist_world', label: 'World History' },
  ],
  'Geography': [
    { id: 'geo_physical', label: 'Physical Geography' },
    { id: 'geo_human', label: 'Human Geography' },
    { id: 'geo_climate', label: 'Climate & Weather' },
    { id: 'geo_population', label: 'Population Geography' },
    { id: 'geo_urban', label: 'Urban Geography' },
  ],
  'Business Studies': [
    { id: 'bus_management', label: 'Business Management' },
    { id: 'bus_marketing', label: 'Marketing' },
    { id: 'bus_finance', label: 'Business Finance' },
    { id: 'bus_entrepreneurship', label: 'Entrepreneurship' },
    { id: 'bus_operations', label: 'Operations Management' },
  ],
};

const SUBJECT_LIST = Object.keys(SYLLABUS_TOPICS);

export default function SyllabusTopicTracker({ user }) {
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [completedTopics, setCompletedTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!user?.email) return;
    fetchCompletedTopics();
  }, [user, selectedSubject]);

  const fetchCompletedTopics = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('syllabus_progress')
        .select('topic_id')
        .eq('student_email', user.email)
        .eq('subject', selectedSubject)
        .eq('completed', true);

      if (fetchError) throw fetchError;

      setCompletedTopics(data?.map(item => item.topic_id) || []);
    } catch (err) {
      console.error('Error fetching syllabus progress:', err);
      setError(err.message || 'Failed to load syllabus progress');
      toast.error('Failed to load syllabus progress');
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = async (topicId) => {
    const isCompleted = completedTopics.includes(topicId);
    
    try {
      if (isCompleted) {
        // Remove completion
        const { error: deleteError } = await supabase
          .from('syllabus_progress')
          .delete()
          .eq('student_email', user.email)
          .eq('subject', selectedSubject)
          .eq('topic_id', topicId);

        if (deleteError) throw deleteError;
        
        setCompletedTopics(prev => prev.filter(id => id !== topicId));
        toast.success('Topic marked as incomplete');
      } else {
        // Add completion
        const { error: insertError } = await supabase
          .from('syllabus_progress')
          .insert([
            {
              student_email: user.email,
              subject: selectedSubject,
              topic_id: topicId,
              completed: true,
              completed_at: new Date().toISOString()
            }
          ]);

        if (insertError) throw insertError;
        
        setCompletedTopics(prev => [...prev, topicId]);
        toast.success('Topic marked as complete! 🎉');
      }
    } catch (err) {
      console.error('Error toggling topic:', err);
      toast.error(err.message || 'Failed to update topic status');
    }
  };

  const toggleExpand = (topicId) => {
    setExpanded(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };

  const currentTopics = SYLLABUS_TOPICS[selectedSubject] || [];
  const completionCount = completedTopics.length;
  const totalTopics = currentTopics.length;
  const progressPercentage = totalTopics > 0 ? Math.round((completionCount / totalTopics) * 100) : 0;

  if (loading) {
    return (
      <Card className="border-border shadow-md bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading syllabus topics...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-md bg-card">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary shrink-0" /> Syllabus Tracker
          </CardTitle>
          <Badge variant="outline" className="text-xs font-bold">
            {completionCount}/{totalTopics} Topics
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {error && (
          <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-[11px] font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Subject Selector */}
        <div className="flex flex-wrap gap-1.5">
          {SUBJECT_LIST.map(subject => (
            <Button
              key={subject}
              variant={selectedSubject === subject ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8"
              onClick={() => setSelectedSubject(subject)}
            >
              {subject}
            </Button>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span className="font-bold">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Topics List */}
        <div className="space-y-2">
          {currentTopics.map(topic => {
            const isCompleted = completedTopics.includes(topic.id);
            
            return (
              <div
                key={topic.id}
                className={`rounded-lg border p-3 transition-all cursor-pointer hover:shadow-sm ${
                  isCompleted 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20' 
                    : 'bg-card border-border hover:border-primary/30'
                }`}
                onClick={() => toggleTopic(topic.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={`text-sm ${isCompleted ? 'font-medium text-green-700 dark:text-green-400' : 'text-foreground'}`}>
                      {topic.label}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(topic.id);
                    }}
                  >
                    {expanded[topic.id] ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                
                {expanded[topic.id] && (
                  <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                    <p>Click to {isCompleted ? 'mark as incomplete' : 'mark as complete'}</p>
                    <p className="text-[10px] mt-1">
                      {isCompleted ? '✅ Completed' : '⏳ Not started'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">
            {progressPercentage === 100 ? (
              <span className="text-green-600 font-bold">🎉 All topics completed! Great job!</span>
            ) : (
              `${completionCount} of ${totalTopics} topics completed (${progressPercentage}%)`
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Add PropTypes to the component
SyllabusTopicTracker.propTypes = propTypes;
