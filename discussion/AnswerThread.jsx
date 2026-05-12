import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ThumbsUp, GraduationCap, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function AnswerThread({ post, user, onAnswerAdded }) {
  const [answers, setAnswers] = useState([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnswers();
  }, [post.id]);

  const fetchAnswers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discussion_answers')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAnswers(data || []);
    } catch (error) {
      console.error('Error fetching answers:', error);
      toast.error('Failed to load answers');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!newAnswer.trim()) return;
    if (!user) {
      toast.error('Please sign in to post an answer.');
      return;
    }
    
    setSubmitting(true);
    try {
      // Create new answer
      const { data: newAns, error: ansError } = await supabase
        .from('discussion_answers')
        .insert({
          post_id: post.id,
          author_email: user.email,
          author_name: user.user_metadata?.full_name || user.email,
          author_role: userProfile?.role || 'student',
          answer: newAnswer.trim(),
          upvotes: 0,
          is_accepted: false,
        })
        .select()
        .single();
      
      if (ansError) throw ansError;
      
      // Update post answer count
      await supabase
        .from('discussion_posts')
        .update({
          answer_count: (post.answer_count || 0) + 1,
          is_answered: true,
        })
        .eq('id', post.id);
      
      setAnswers(prev => [newAns, ...prev]);
      setNewAnswer('');
      toast.success('Answer posted!');
      onAnswerAdded?.();
    } catch (error) {
      console.error('Error posting answer:', error);
      toast.error('Failed to post answer');
    } finally {
      setSubmitting(false);
    }
  };

  const upvote = async (ans) => {
    try {
      const { error } = await supabase
        .from('discussion_answers')
        .update({ upvotes: (ans.upvotes || 0) + 1 })
        .eq('id', ans.id);
      
      if (error) throw error;
      setAnswers(prev => prev.map(a => a.id === ans.id ? { ...a, upvotes: (a.upvotes || 0) + 1 } : a));
    } catch (error) {
      console.error('Error upvoting:', error);
      toast.error('Failed to upvote');
    }
  };

  const acceptAnswer = async (ans) => {
    try {
      // Mark this answer as accepted
      const { error: updateError } = await supabase
        .from('discussion_answers')
        .update({ is_accepted: true })
        .eq('id', ans.id);
      
      if (updateError) throw updateError;
      
      // Update post as answered
      await supabase
        .from('discussion_posts')
        .update({ is_answered: true })
        .eq('id', post.id);
      
      setAnswers(prev => prev.map(a => ({ ...a, is_accepted: a.id === ans.id })));
      toast.success('Answer accepted!');
    } catch (error) {
      console.error('Error accepting answer:', error);
      toast.error('Failed to accept answer');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 mt-3">
        <div className="p-4 text-center text-muted-foreground">Loading answers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {answers.length === 0 && (
        <div className="p-4 text-center text-muted-foreground text-sm">
          No answers yet. Be the first to help!
        </div>
      )}

      {answers.map(ans => (
        <div key={ans.id} className={`p-3 rounded-xl border text-sm ${ans.is_accepted ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-muted/30 border-border'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              {ans.author_role === 'tutor' ? (
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
              ) : (
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className="font-semibold text-xs">{ans.author_name}</span>
              {ans.author_role === 'tutor' && <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">Tutor</Badge>}
              {ans.is_accepted && <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Accepted</Badge>}
              <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(ans.created_at), { addSuffix: true })}</span>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => upvote(ans)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                <ThumbsUp className="w-3 h-3" />{ans.upvotes || 0}
              </button>
              {!ans.is_accepted && post.author_email === user?.email && (
                <button onClick={() => acceptAnswer(ans)} className="text-[10px] text-green-600 hover:underline">Accept</button>
              )}
            </div>
          </div>
          <p className="text-foreground leading-relaxed">{ans.answer}</p>
        </div>
      ))}

      {user && (
        <div className="flex gap-2 items-start">
          <Textarea
            value={newAnswer}
            onChange={e => setNewAnswer(e.target.value)}
            placeholder="Write your answer..."
            className="text-sm min-h-[60px] resize-none"
          />
          <Button size="sm" disabled={submitting || !newAnswer.trim()} onClick={submit} className="flex-shrink-0">
            {submitting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      )}
    </div>
  );
}