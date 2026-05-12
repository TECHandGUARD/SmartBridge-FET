import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { CAPS_TOPICS } from '@/lib/capsTopics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Plus, ChevronDown, ChevronUp, CheckCircle2, ThumbsUp, Search, GraduationCap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import AnswerThread from './AnswerThread';

const SUBJECT_NAMES = SUBJECTS.map(s => s.name);

function PostCard({ post, user, onPostUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [upvotes, setUpvotes] = useState(post.upvotes || 0);

  const upvote = async (e) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('discussion_posts')
        .update({ upvotes: upvotes + 1 })
        .eq('id', post.id);
      
      if (error) throw error;
      setUpvotes(prev => prev + 1);
    } catch (error) {
      console.error('Error upvoting:', error);
      toast.error('Failed to upvote');
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
          <p className="font-semibold text-sm leading-snug">{post.question}</p>
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
            <button onClick={upvote} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <ThumbsUp className="w-3.5 h-3.5" /> {upvotes}
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
          onAnswerAdded={() => {
            if (onPostUpdate) onPostUpdate();
          }} 
        />
      )}
    </div>
  );
}

export default function DiscussionBoard({ user, userProfile }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterSubject, setFilterSubject] = useState('all');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({ subject: '', topic: '', question: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discussion_posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const topicsForSubject = CAPS_TOPICS[form.subject] || [];

  const submitPost = async () => {
    if (!form.question.trim() || !form.subject) {
      toast.error('Please enter a question and select a subject.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('discussion_posts')
        .insert({
          author_email: user.email,
          author_name: user.user_metadata?.full_name || user.email,
          author_role: userProfile?.role || 'student',
          subject: form.subject,
          topic: form.topic || '',
          question: form.question.trim(),
          is_answered: false,
          answer_count: 0,
          upvotes: 0,
        });
      
      if (error) throw error;
      
      setForm({ subject: '', topic: '', question: '' });
      setShowForm(false);
      toast.success('Question posted!');
      load();
    } catch (error) {
      console.error('Error posting question:', error);
      toast.error('Failed to post question');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = posts.filter(p => {
    const matchSubject = filterSubject === 'all' || p.subject === filterSubject;
    const matchSearch = !search || p.question.toLowerCase().includes(search.toLowerCase()) || p.subject.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  const handlePostUpdate = () => {
    load();
  };

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
        <p className="text-sm text-muted-foreground">Ask questions about CAPS topics and get answers from peers and tutors.</p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Ask form */}
        {showForm && user && (
          <div className="border border-border rounded-xl p-4 bg-muted/30 space-y-3">
            <p className="text-sm font-semibold">New Question</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v, topic: '' }))}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select subject *" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_NAMES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.topic} onValueChange={v => setForm(f => ({ ...f, topic: v }))} disabled={!topicsForSubject.length}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select topic (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {topicsForSubject.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={form.question}
              onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              placeholder="Describe your question clearly..."
              className="text-sm min-h-[80px] resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" disabled={submitting || !form.question.trim() || !form.subject} onClick={submitPost}>
                {submitting ? 'Posting…' : 'Post Question'}
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…" className="pl-8 h-8 text-sm" />
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

        {/* Posts */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No questions yet. Be the first to ask!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                user={user} 
                onPostUpdate={handlePostUpdate}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}