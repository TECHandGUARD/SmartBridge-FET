import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle } from 'lucide-react';
import { CheckCircle2, ThumbsUp, GraduationCap, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function AnswerThread({ post, user, onAnswerAdded }) {
  const [answers, setAnswers] = useState([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnswers = useCallback(async () => {
    if (!post?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error: answersError } = await supabase
        .from('forum_answers')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: false });
      
      if (answersError) throw answersError;
      setAnswers(data || []);
    } catch (err) {
      console.error('Error loading answers:', err);
      setError('Failed to load answers');
      toast.error('Failed to load answers');
    } finally {
      setLoading(false);
    }
  }, [post?.id]);

  // Real-time subscription for new answers
  useEffect(() => {
    loadAnswers();
    
    if (!post?.id) return;
    
    const channel = supabase
      .channel(`answers_${post.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_answers',
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          setAnswers(prev => [payload.new, ...prev]);
          toast.info('New answer posted!');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'forum_answers',
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          setAnswers(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [post?.id, loadAnswers]);

  const submit = async () => {
    if (!newAnswer.trim()) return;
    if (!user) {
      toast.error('Please sign in to post answers');
      return;
    }
    
    setSubmitting(true);
    try {
      const { data: answer, error: answerError } = await supabase
        .from('forum_answers')
        .insert({
          post_id: post.id,
          author_email: user.email,
          author_name: user.full_name || user.email,
          author_role: user.role || 'student',
          content: newAnswer.trim(),
          upvotes: 0,
          is_accepted: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (answerError) throw answerError;
      
      // Update answer count on post
      const { error: updateError } = await supabase
        .from('forum_posts')
        .update({ 
          answer_count: (post.answer_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);
      
      if (updateError) console.error('Error updating post count:', updateError);
      
      setAnswers(prev => [answer, ...prev]);
      setNewAnswer('');
      toast.success('Answer posted!');
      onAnswerAdded?.();
    } catch (err) {
      console.error('Error submitting answer:', err);
      toast.error('Failed to post answer');
    } finally {
      setSubmitting(false);
    }
  };

  const upvote = async (answer) => {
    if (!user) {
      toast.error('Please sign in to upvote');
      return;
    }
    
    try {
      const newUpvotes = (answer.upvotes || 0) + 1;
      const { error } = await supabase
        .from('forum_answers')
        .update({ upvotes: newUpvotes, updated_at: new Date().toISOString() })
        .eq('id', answer.id);
      
      if (error) throw error;
      
      setAnswers(prev => prev.map(a => 
        a.id === answer.id ? { ...a, upvotes: newUpvotes } : a
      ));
    } catch (err) {
      console.error('Error upvoting:', err);
      toast.error('Failed to upvote');
    }
  };

  const accept = async (answer) => {
    if (!user || post.author_email !== user.email) {
      toast.error('Only the post author can accept answers');
      return;
    }
    
    try {
      // Mark this answer as accepted, unmark others
      for (const a of answers) {
        await supabase
          .from('forum_answers')
          .update({ is_accepted: a.id === answer.id })
          .eq('id', a.id);
      }
      
      // Update post as answered
      await supabase
        .from('forum_posts')
        .update({ is_answered: true, updated_at: new Date().toISOString() })
        .eq('id', post.id);
      
      setAnswers(prev => prev.map(a => ({ 
        ...a, 
        is_accepted: a.id === answer.id 
      })));
      
      toast.success('Answer accepted!');
    } catch (err) {
      console.error('Error accepting answer:', err);
      toast.error('Failed to accept answer');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={loadAnswers}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {answers.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No answers yet. Be the first to answer!
        </p>
      )}
      
      {answers.map(ans => (
        <div key={ans.id} className={`p-3 rounded-xl border text-sm ${ans.is_accepted ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-muted/30 border-border'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              {ans.author_role === 'tutor' ? (
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
              ) : (
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className="font-semibold text-xs">{ans.author_name}</span>
              {ans.author_role === 'tutor' && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">Tutor</Badge>
              )}
              {ans.is_accepted && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700 border-green-200">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Accepted
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(ans.created_at), { addSuffix: true })}
              </span>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button 
                onClick={() => upvote(ans)} 
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
              >
                <ThumbsUp className="w-3 h-3" />{ans.upvotes || 0}
              </button>
              {!ans.is_accepted && post.author_email === user?.email && (
                <button 
                  onClick={() => accept(ans)} 
                  className="text-[10px] text-green-600 hover:underline"
                >
                  Accept
                </button>
              )}
            </div>
          </div>
          <p className="text-foreground leading-relaxed mt-1">{ans.content}</p>
        </div>
      ))}

      {user && (
        <div className="flex gap-2 items-start mt-3">
          <Textarea
            value={newAnswer}
            onChange={e => setNewAnswer(e.target.value)}
            placeholder="Write your answer..."
            className="text-sm min-h-[60px] resize-none"
            rows={2}
          />
          <Button 
            size="sm" 
            disabled={submitting || !newAnswer.trim()} 
            onClick={submit} 
            className="flex-shrink-0"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post'}
          </Button>
        </div>
      )}
    </div>
  );
}
