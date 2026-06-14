import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MessageSquare, StickyNote, ChevronDown, ChevronUp, Send, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StudyRoomBoard({ room, user }) {
  const [posts, setPosts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'Note', title: '', body: '' });
  const [posting, setPosting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState({});

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('study_room_posts')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(30);
    
    if (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load posts');
    } else {
      setPosts(data || []);
    }
  }, [room.id]);

  // Set up real-time subscription
  useEffect(() => {
    loadPosts();

    const channel = supabase
      .channel(`study_room_${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_room_posts',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setPosts(prev => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'study_room_posts',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setPosts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'study_room_posts',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setPosts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, loadPosts]);

  const handlePost = async () => {
    if (!form.body.trim()) {
      toast.error('Please enter content for your post');
      return;
    }
    
    setPosting(true);
    try {
      const { error } = await supabase
        .from('study_room_posts')
        .insert({
          room_id: room.id,
          subject: room.name,
          author_email: user.email,
          author_name: user.full_name || user.email,
          type: form.type,
          title: form.title.trim() || null,
          body: form.body.trim(),
          replies: [],
        });
      
      if (error) throw error;
      
      setForm({ type: 'Note', title: '', body: '' });
      setShowForm(false);
      toast.success('Post added to the board!');
    } catch (err) {
      console.error('Error creating post:', err);
      toast.error(`Failed to post: ${err.message}`);
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (post) => {
    const text = replyText[post.id]?.trim();
    if (!text) return;
    
    const newReply = {
      author_email: user.email,
      author_name: user.full_name || user.email,
      body: text,
      created_at: new Date().toISOString(),
    };
    
    const updatedReplies = [...(post.replies || []), newReply];
    
    try {
      const { error } = await supabase
        .from('study_room_posts')
        .update({ replies: updatedReplies })
        .eq('id', post.id);
      
      if (error) throw error;
      
      setReplyText(prev => ({ ...prev, [post.id]: '' }));
      // Update local state
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, replies: updatedReplies } : p));
    } catch (err) {
      console.error('Error adding reply:', err);
      toast.error(`Failed to add reply: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('study_room_posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Post removed.');
    } catch (err) {
      console.error('Error deleting post:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <p className="text-sm text-muted-foreground">{posts.length} post{posts.length !== 1 ? 's' : ''} in this room</p>
        <Button size="sm" className="bg-primary gap-1.5" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> New Post
        </Button>
      </div>

      {/* New Post Form */}
      {showForm && (
        <div className="p-4 border-b border-border bg-muted/30 space-y-3 flex-shrink-0">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Note">📝 Note</SelectItem>
                  <SelectItem value="Question">❓ Question</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-[3] space-y-1">
              <Label className="text-xs">Title (optional)</Label>
              <Input
                className="h-8 text-sm"
                placeholder="e.g. Summary: Laws of Motion"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Content *</Label>
            <Textarea
              className="text-sm min-h-[80px] resize-none"
              placeholder={form.type === 'Question' ? 'Ask your question here...' : 'Share your notes or insights...'}
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-primary gap-1.5" onClick={handlePost} disabled={posting || !form.body.trim()}>
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {posting ? 'Posting...' : 'Post'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {posts.length === 0 && (
          <div className="text-center pt-12 text-muted-foreground">
            <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="font-medium text-sm">No posts yet</p>
            <p className="text-xs">Share notes or ask a question to get started!</p>
          </div>
        )}

        {posts.map(post => (
          <Card key={post.id} className={`border ${post.type === 'Question' ? 'border-amber-200 bg-amber-50/40' : 'border-border'}`}>
            <CardContent className="p-4">
              {/* Post Header */}
              <div className="flex items-start gap-2 mb-2">
                <Badge className={`text-xs flex-shrink-0 ${post.type === 'Question' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-accent text-accent-foreground'}`}>
                  {post.type === 'Question' ? '❓ Question' : '📝 Note'}
                </Badge>
                <div className="flex-1 min-w-0">
                  {post.title && <p className="font-semibold text-sm text-foreground leading-tight">{post.title}</p>}
                  <p className="text-xs text-muted-foreground">{post.author_name} · {new Date(post.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {post.author_email === user.email && (
                  <button onClick={() => handleDelete(post.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Body */}
              <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{post.body}</p>

              {/* Replies toggle */}
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {post.replies?.length || 0} {post.replies?.length === 1 ? 'reply' : 'replies'}
                {expandedId === post.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {/* Replies */}
              {expandedId === post.id && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {(post.replies || []).map((r, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] flex-shrink-0">
                        {r.author_name?.[0] || '?'}
                      </div>
                      <div className="bg-muted rounded-xl px-3 py-2 text-sm flex-1">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">{r.author_name}</p>
                        <p>{r.body}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <Input
                      className="h-8 text-sm"
                      placeholder="Write a reply..."
                      value={replyText[post.id] || ''}
                      onChange={e => setReplyText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleReply(post)}
                    />
                    <Button size="sm" variant="outline" onClick={() => handleReply(post)} disabled={!replyText[post.id]?.trim()}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}