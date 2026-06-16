import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { CAPS_TOPICS } from '@/lib/capsTopics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';
import { MessageSquare, Plus, ChevronDown, ChevronUp, CheckCircle2, ThumbsUp, Search, GraduationCap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import AnswerThread from './AnswerThread';

const SUBJECT_NAMES = SUBJECTS.map(s => s.name);

function PostCard({ post, user, onPostUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [upvoting, setUpvoting] = useState(false);

  const upvote = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please sign in to upvote');
      return;
    }
    
    setUpvoting(true);
    try {
      const newUpvotes = (post.upvotes || 0) + 1;
      const { error } = await supabase
        .from('forum_posts')
        .update({ upvotes: newUpvotes, updated_at: new Date().toISOString() })
        .eq('id', post.id);
      
      if (error) throw error;
      
      onPostUpdate({ ...post, upvotes: newUpvotes });
    } catch (err) {
      console.error('Error upvoting:', err);
      toast.error('Failed to upvote');
    } finally {
      setUpvoting(false);
    }
  };

  return (
    <div className="border border-border rounded-xl p-4 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{post.subject}</Badge>
            {post.topic && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{post.topic}</Badge>}
            {post.is_answered && (
              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Answered
              </Badge>
            )}
          </div>
          <p className="font-semibold text-sm leading-snug">{post.title}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {post.author_role === 'tutor' ? <GraduationCap className="w-3 h-3" /> : null}
              {post.author_name}
            </span>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={upvote} 
              disabled={upvoting}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              <ThumbsUp className="w-3.5 h-3.5" /> {post.upvotes || 0}
            </button>
            <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <MessageSquare className="w-3.5 h-3.5" /> {post.answer_count || 0}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <AnswerThread 
          post={post} 
          user={user} 
          onAnswerAdded={() => onPostUpdate({ ...post, answer_count: (post.answer_count || 0) + 1 })}
        />
      )}
    </div>
  );
}

export default function DiscussionBoard({ user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterSubject, setFilterSubject] = useState('all');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject: '', topic: '', title: '', content: '' });

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('forum_posts')
        .select('*')
        .eq('is_removed', false)
        .order('created_at', { ascending: false })
        .limit(50);
      
      const { data, error: postsError } = await query;
      
      if (postsError) throw postsError;
      setPosts(data || []);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load discussions');
      toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time subscription for new posts
  useEffect(() => {
    loadPosts();
    
    const channel = supabase
      .channel('forum_posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_posts',
          filter: 'is_removed=eq.false',
        },
        (payload) => {
          setPosts(prev => [payload.new, ...prev]);
          toast.info('New discussion posted!');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'forum_posts',
          filter: 'is_removed=eq.false',
        },
        (payload) => {
          setPosts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPosts]);

  const updatePost = (updatedPost) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  const topicsForSubject = CAPS_TOPICS[form.subject] || [];

  const submitPost = async () => {
    if (!form.title?.trim() || !form.subject) {
      toast.error('Please fill in title and subject');
      return;
    }
    if (!user) {
      toast.error('Please sign in to post');
      return;
    }
    
    setSubmitting(true);
    try {
      const { data, error: postError } = await supabase
        .from('forum_posts')
        .insert({
          title: form.title.trim(),
          content: form.content?.trim() || '',
          subject: form.subject,
          topic: form.topic || null,
          author_email: user.email,
          author_name: user.full_name || user.email,
          author_role: user.role || 'student',
          is_answered: false,
          answer_count: 0,
          upvotes: 0,
          is_flagged: false,
          is_removed: false,
          is_pinned: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (postError) throw postError;
      
      setPosts(prev => [data, ...prev]);
      setForm({ subject: '', topic: '', title: '', content: '' });
      setShowForm(false);
      toast.success('Question posted!');
    } catch (err) {
      console.error('Error posting:', err);
      toast.error('Failed to post question');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = posts.filter(p => {
    const matchSubject = filterSubject === 'all' || p.subject === filterSubject;
    const matchSearch = !search || 
      p.title?.toLowerCase().includes(search.toLowerCase()) || 
      p.content?.toLowerCase().includes(search.toLowerCase()) ||
      p.subject?.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Discussion Board
          </CardTitle>
          {user && (
            <Button size="sm" className="gap-1.5" onClick={() => setShowForm(s => !s)}>
              <Plus className="w-4 h-4" /> Ask a Question
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Ask questions about CAPS topics and get answers from peers and tutors.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Ask form */}
        {showForm && user && (
          <div className="border border-border rounded-xl p-4 bg-muted/30 space-y-3">
            <p className="text-sm font-semibold">New Question</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Select 
                value={form.subject} 
                onValueChange={v => setForm(f => ({ ...f, subject: v, topic: '' }))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select subject *" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_NAMES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select 
                value={form.topic} 
                onValueChange={v => setForm(f => ({ ...f, topic: v }))} 
                disabled={!topicsForSubject.length}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select topic (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {topicsForSubject.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Question title *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="text-sm"
            />
            <Textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Describe your question clearly..."
              className="text-sm min-h-[80px] resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button 
                size="sm" 
                disabled={submitting || !form.title?.trim() || !form.subject} 
                onClick={submitPost}
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post Question'}
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search questions…" 
              className="pl-8 h-8 text-sm" 
            />
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {SUBJECT_NAMES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={loadPosts}>
              Retry
            </Button>
          </div>
        )}

        {/* Posts List */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No questions yet. Be the first to ask!</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                user={user} 
                onPostUpdate={updatePost}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
