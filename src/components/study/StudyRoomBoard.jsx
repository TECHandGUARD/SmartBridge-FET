import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, MessageSquare, StickyNote, ChevronDown, ChevronUp, Send, Loader2, Trash2,
  Shield, AlertTriangle, Flag, XCircle, Eye, EyeOff,
  ThumbsUp, Heart, Star, Search, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const MAX_POST_LENGTH = 10000;
const MAX_REPLY_LENGTH = 5000;
const POSTS_PER_PAGE = 20;
const MAX_REPORTS_PER_USER = 1;

// ============================================================
// Report Reasons (Soft-coded for admin control)
// ============================================================

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or Advertising', icon: '🚫' },
  { value: 'harassment', label: 'Harassment or Bullying', icon: '⚠️' },
  { value: 'hate_speech', label: 'Hate Speech or Discrimination', icon: '🏳️' },
  { value: 'inappropriate', label: 'Inappropriate Content', icon: '🔞' },
  { value: 'false_info', label: 'False or Misleading Information', icon: '❌' },
  { value: 'privacy', label: 'Privacy Violation', icon: '🔒' },
  { value: 'other', label: 'Other', icon: '📝' },
];

// ============================================================
// Rate Limiting Configuration
// ============================================================

const RATE_LIMITS = {
  posts: { max: 5, window: 60000 }, // 5 posts per minute
  replies: { max: 10, window: 60000 }, // 10 replies per minute
  reports: { max: 3, window: 60000 }, // 3 reports per minute
};

// ============================================================
// Main Component
// ============================================================

export default function StudyRoomBoard({ room, user }) {
  // --- State ---
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'Note', title: '', body: '' });
  const [posting, setPosting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [reportedPosts, setReportedPosts] = useState(new Set());
  const [showReportModal, setShowReportModal] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [likes, setLikes] = useState({});
  const [isModerator, setIsModerator] = useState(false);
  const [viewingHidden, setViewingHidden] = useState(false);

  // --- Refs for Infinite Scroll ---
  const observerRef = useRef();
  const lastPostRef = useCallback((node) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMorePosts();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore]);

  // ============================================================
  // Check if user is moderator
  // ============================================================

  useEffect(() => {
    const checkModerator = async () => {
      if (!user?.email) return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setIsModerator(['admin', 'moderator', 'school_counselor'].includes(data?.role));
      } catch (err) {
        console.error('Error checking moderator status:', err);
      }
    };
    checkModerator();
  }, [user]);

  // ============================================================
  // Server-Side Rate Limiting (via Edge Function)
  // ============================================================

  const checkRateLimit = async (action, userId) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-rate-limit', {
        body: {
          action,
          user_id: userId,
          limits: RATE_LIMITS[action]
        }
      });

      if (error) throw error;
      return data.allowed;
    } catch (err) {
      console.error('Rate limit check failed:', err);
      return true; // Fail open for now
    }
  };

  // ============================================================
  // Load Posts with Server-Side Pagination & Search
  // ============================================================

  const loadPosts = useCallback(async (reset = true) => {
    if (!room?.id) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('study_room_posts')
        .select('*', { count: 'exact' })
        .eq('room_id', room.id);

      // Only show visible posts unless moderator viewing hidden
      if (!viewingHidden && !isModerator) {
        query = query.eq('is_visible', true);
      }

      // Search filter
      if (searchTerm) {
        query = query.textSearch('search_vector', searchTerm);
      }

      // Type filter
      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      // Server-side pagination
      const offset = reset ? 0 : page * POSTS_PER_PAGE;
      query = query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + POSTS_PER_PAGE - 1);

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;

      if (reset) {
        setPosts(data || []);
        setPage(1);
      } else {
        setPosts(prev => [...prev, ...(data || [])]);
        setPage(prev => prev + 1);
      }

      setHasMore((data || []).length === POSTS_PER_PAGE);

      // Load likes for these posts
      if (data?.length > 0) {
        const postIds = data.map(p => p.id);
        const { data: likesData } = await supabase
          .from('study_room_reactions')
          .select('post_id, type')
          .in('post_id', postIds)
          .eq('user_id', user?.id);

        const likesMap = {};
        likesData?.forEach(l => {
          likesMap[l.post_id] = likesMap[l.post_id] || [];
          likesMap[l.post_id].push(l.type);
        });
        setLikes(prev => ({ ...prev, ...likesMap }));
      }

    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts');
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [room?.id, searchTerm, filterType, page, viewingHidden, isModerator]);

  const loadMorePosts = () => {
    if (!loading && hasMore) {
      loadPosts(false);
    }
  };

  // ============================================================
  // Real-time Subscription (Server-side filtered)
  // ============================================================

  useEffect(() => {
    loadPosts(true);

    if (!room?.id) return;

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
          // Server-side validation already happened
          if (payload.new.is_visible !== false || isModerator) {
            setPosts(prev => [payload.new, ...prev]);
          }
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
          if (payload.new.is_visible === false && !isModerator) {
            setPosts(prev => prev.filter(p => p.id !== payload.new.id));
          } else {
            setPosts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
          }
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
  }, [room?.id, loadPosts, isModerator, viewingHidden]);

  // ============================================================
  // Server-Side Post Creation with Moderation
  // ============================================================

  const handleCreatePost = async () => {
    if (!form.body.trim()) {
      toast.error('Please enter content for your post');
      return;
    }

    if (!user?.email) {
      toast.error('You must be logged in to post');
      return;
    }

    if (form.body.length > MAX_POST_LENGTH) {
      toast.error(`Post is too long. Maximum ${MAX_POST_LENGTH} characters.`);
      return;
    }

    // Rate limiting
    const allowed = await checkRateLimit('posts', user.id);
    if (!allowed) {
      toast.error('You\'re posting too quickly. Please wait a moment.');
      return;
    }

    setPosting(true);
    setError(null);

    try {
      // Server-side moderation via Edge Function
      const { data, error } = await supabase.functions.invoke('moderate-post', {
        body: {
          room_id: room.id,
          subject: room.name || 'Study Room',
          author_id: user.id,
          author_name: user.full_name || user.email || 'Anonymous',
          author_email: user.email,
          type: form.type,
          title: form.title.trim() || null,
          body: form.body.trim(),
          user_agent: navigator.userAgent
        }
      });

      if (error) throw error;

      if (!data.approved) {
        if (data.reason === 'blocked') {
          toast.error('Your post contains inappropriate language. Please rephrase.');
        } else if (data.reason === 'flagged') {
          toast.warning('Your post contains sensitive information. It has been flagged for review.');
        }
        return;
      }

      // Post was approved server-side
      setForm({ type: 'Note', title: '', body: '' });
      setShowForm(false);
      toast.success('Post added to the board!');

      // Reload to ensure consistency
      loadPosts(true);

    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post');
      toast.error(`Failed to post: ${err.message}`);
    } finally {
      setPosting(false);
    }
  };

  // ============================================================
  // Server-Side Reply Creation
  // ============================================================

  const handleReply = async (post) => {
    const text = replyText[post.id]?.trim();
    if (!text) {
      toast.error('Please enter a reply');
      return;
    }

    if (!user?.email) {
      toast.error('You must be logged in to reply');
      return;
    }

    if (text.length > MAX_REPLY_LENGTH) {
      toast.error(`Reply is too long. Maximum ${MAX_REPLY_LENGTH} characters.`);
      return;
    }

    // Rate limiting
    const allowed = await checkRateLimit('replies', user.id);
    if (!allowed) {
      toast.error('You\'re replying too quickly. Please wait a moment.');
      return;
    }

    try {
      // Server-side moderation for reply
      const { data, error } = await supabase.functions.invoke('moderate-reply', {
        body: {
          post_id: post.id,
          author_id: user.id,
          author_name: user.full_name || user.email || 'Anonymous',
          author_email: user.email,
          body: text
        }
      });

      if (error) throw error;

      if (!data.approved) {
        toast.error('Your reply contains inappropriate language. Please rephrase.');
        return;
      }

      // Reply was approved - insert directly with RLS
      const { error: insertError } = await supabase
        .from('study_room_replies')
        .insert({
          post_id: post.id,
          author_id: user.id,
          author_name: user.full_name || user.email || 'Anonymous',
          author_email: user.email,
          body: text,
          is_visible: true,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      setReplyText(prev => ({ ...prev, [post.id]: '' }));

      // Increment reply count on post
      await supabase
        .from('study_room_posts')
        .update({ reply_count: (post.reply_count || 0) + 1 })
        .eq('id', post.id);

      // Update local state
      setPosts(prev => prev.map(p =>
        p.id === post.id ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p
      ));

      // Log activity
      await Promise.resolve(supabase
        .from('activity_log')
        .insert({
          event_type: 'study_room_reply_added',
          user_email: user.email,
          user_id: user.id || null,
          description: `Replied to post in room: ${room.name}`,
          metadata: { room_id: room.id, post_id: post.id }
        }))
        .catch(() => {});

      toast.success('Reply added!');
    } catch (err) {
      console.error('Error adding reply:', err);
      toast.error(`Failed to add reply: ${err.message}`);
    }
  };

  // ============================================================
  // Load Replies for a Post (Lazy Loading)
  // ============================================================

  const loadReplies = async (postId) => {
    try {
      const { data, error } = await supabase
        .from('study_room_replies')
        .select('*')
        .eq('post_id', postId)
        .eq('is_visible', true)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, replies: data || [] } : p
      ));
    } catch (err) {
      console.error('Error loading replies:', err);
      toast.error('Failed to load replies');
    }
  };

  // ============================================================
  // Report Post (Server-side validated)
  // ============================================================

  const handleReportPost = async (post) => {
    if (!user?.email) {
      toast.error('You must be logged in to report content');
      return;
    }

    if (reportedPosts.has(post.id)) {
      toast.info('You have already reported this post');
      return;
    }

    if (!reportReason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    // Rate limiting for reports
    const allowed = await checkRateLimit('reports', user.id);
    if (!allowed) {
      toast.error('You\'re reporting too quickly. Please wait a moment.');
      return;
    }

    setIsSubmittingReport(true);

    try {
      // Server-side report validation
      const { data, error } = await supabase.functions.invoke('report-content', {
        body: {
          post_id: post.id,
          reported_by: user.id,
          reason: reportReason,
          comment: showReportModal?.comment || null
        }
      });

      if (error) throw error;

      if (!data.approved) {
        toast.error(data.message || 'Report could not be processed');
        return;
      }

      setReportedPosts(prev => new Set(prev).add(post.id));
      setShowReportModal(null);
      setReportReason('');

      toast.success('Post reported to moderators for review.');

      // Log report
      await Promise.resolve(supabase
        .from('activity_log')
        .insert({
          event_type: 'study_room_post_reported',
          user_email: user.email,
          user_id: user.id || null,
          description: `Reported post in room: ${room.name}`,
          metadata: { room_id: room.id, post_id: post.id, reason: reportReason }
        }))
        .catch(() => {});

    } catch (err) {
      console.error('Error reporting post:', err);
      toast.error('Failed to report post');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // ============================================================
  // Add Reaction (Like/Heart/Star)
  // ============================================================

  const handleDeletePost = async (postId) => {
    if(!user?.id) return;
    try {
      const {error}=await supabase.from('study_room_posts').delete().eq('id',postId).eq('author_id',user.id);
      if(error) throw error;
      setPosts(previous=>previous.filter(post=>post.id!==postId));
      toast.success('Post deleted');
    }catch(error){toast.error('Could not delete the post');}
  };

  const handleReaction = async (postId, type) => {
    if (!user?.email) {
      toast.error('You must be logged in to react');
      return;
    }

    try {
      const existing = (likes[postId] || []).includes(type);

      if (existing) {
        // Remove reaction
        await supabase
          .from('study_room_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('type', type);

        setLikes(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).filter(t => t !== type)
        }));
      } else {
        // Add reaction
        await supabase
          .from('study_room_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            type: type,
            created_at: new Date().toISOString()
          });

        setLikes(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), type]
        }));
      }
    } catch (err) {
      console.error('Error updating reaction:', err);
      toast.error('Failed to update reaction');
    }
  };

  // ============================================================
  // Admin/Moderator Actions
  // ============================================================

  const handleToggleVisibility = async (post) => {
    if (!isModerator) return;

    try {
      const { error } = await supabase
        .from('study_room_posts')
        .update({
          is_visible: !post.is_visible,
          moderated_at: new Date().toISOString(),
          moderated_by: user.id
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success(`Post ${post.is_visible ? 'hidden' : 'shown'}`);
      loadPosts(true);
    } catch (err) {
      console.error('Error toggling visibility:', err);
      toast.error('Failed to update post');
    }
  };

  // ============================================================
  // Render
  // ============================================================

  const ReactionButton = ({ postId, type, label, icon: Icon }) => {
    const hasReacted = (likes[postId] || []).includes(type);
    return (
      <button
        onClick={() => handleReaction(postId, type)}
        className={`flex items-center gap-1 text-xs transition-colors ${
          hasReacted ? 'text-primary' : 'text-muted-foreground hover:text-primary'
        }`}
      >
        <Icon className={`w-3.5 h-3.5 ${hasReacted ? 'fill-current' : ''}`} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Safety Banner */}
      <div className="px-4 py-2 bg-primary/5 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5 text-green-500" />
          <span>This is a safe learning space. Be kind and respectful.</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Report inappropriate content
          </Badge>
          {isModerator && (
            <Badge className="text-[9px] bg-amber-100 text-amber-700">
              <Eye className="w-3 h-3 mr-1" />
              Moderator
            </Badge>
          )}
        </div>
      </div>

      {/* Header with Search & Filters */}
      <div className="p-4 border-b border-border space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {posts.length} posts
          </p>
          <div className="flex items-center gap-2">
            {isModerator && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setViewingHidden(!viewingHidden)}
              >
                {viewingHidden ? (
                  <> <Eye className="w-3 h-3 mr-1" /> Showing Hidden</>
                ) : (
                  <> <EyeOff className="w-3 h-3 mr-1" /> Show Hidden</>
                )}
              </Button>
            )}
            <Button
              size="sm"
              className="bg-primary gap-1.5"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="w-3.5 h-3.5" /> New Post
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Note">📝 Notes</SelectItem>
              <SelectItem value="Question">❓ Questions</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => { setSearchTerm(''); setFilterType('all'); loadPosts(true); }}
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Reset
          </Button>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-500" /> Report Post
              </h3>
              <button onClick={() => setShowReportModal(null)}>
                <XCircle className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Help keep {appName} safe. Select a reason for reporting this post.
            </p>

            <div className="space-y-2">
              {REPORT_REASONS.map(reason => (
                <button
                  key={reason.value}
                  onClick={() => setReportReason(reason.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    reportReason === reason.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <span className="text-sm">{reason.icon} {reason.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Additional Details (Optional)</Label>
              <Textarea
                className="text-sm min-h-[60px] resize-none"
                placeholder="Provide more context for the moderators..."
                value={showReportModal?.comment || ''}
                onChange={e => setShowReportModal(prev => ({ ...prev, comment: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => handleReportPost(showReportModal.post)}
                disabled={isSubmittingReport || !reportReason}
              >
                {isSubmittingReport ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Flag className="w-4 h-4 mr-1" />
                )}
                Submit Report
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReportModal(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                <Shield className="w-3 h-3 inline mr-1 text-green-500" />
                Content is moderated. Inappropriate content will be removed.
              </p>
              <span className="text-[10px] text-muted-foreground">
                {form.body.length} / {MAX_POST_LENGTH}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-primary gap-1.5"
              onClick={handleCreatePost}
              disabled={posting || !form.body.trim()}
            >
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {posting ? 'Posting...' : 'Post'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center pt-12 text-muted-foreground">
            <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="font-medium text-sm">No posts found</p>
            <p className="text-xs">
              {searchTerm || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Share notes or ask a question to get started!'}
            </p>
          </div>
        ) : (
          posts.map((post, index) => {
            const isLast = index === posts.length - 1;
            const userReactions = likes[post.id] || [];

            return (
              <Card
                key={post.id}
                ref={isLast ? lastPostRef : null}
                className={`border ${
                  post.type === 'Question'
                    ? 'border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-800'
                    : post.is_pinned
                      ? 'border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-800'
                      : 'border-border'
                } ${!post.is_visible ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-4">
                  {/* Post Header */}
                  <div className="flex items-start gap-2 mb-2">
                    <Badge className={`text-xs flex-shrink-0 ${
                      post.type === 'Question'
                        ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800'
                        : post.is_pinned
                          ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800'
                          : 'bg-accent text-accent-foreground'
                    }`}>
                      {post.is_pinned && '📌 '}
                      {post.type === 'Question' ? '❓ Question' : '📝 Note'}
                    </Badge>
                    {!post.is_visible && (
                      <Badge variant="destructive" className="text-[9px]">
                        Hidden
                      </Badge>
                    )}
                    <div className="flex-1 min-w-0">
                      {post.title && <p className="font-semibold text-sm text-foreground leading-tight">{post.title}</p>}
                      <p className="text-xs text-muted-foreground">
                        {post.author_name} · {new Date(post.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {post.is_edited && ' (edited)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Report Button */}
                      {post.author_id !== user?.id && !reportedPosts.has(post.id) && (
                        <button
                          onClick={() => setShowReportModal({ post, comment: '' })}
                          className="text-muted-foreground hover:text-amber-600 p-1 rounded-lg transition-colors"
                          title="Report inappropriate content"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Moderator Actions */}
                      {isModerator && (
                        <button
                          onClick={() => handleToggleVisibility(post)}
                          className="text-muted-foreground hover:text-blue-600 p-1 rounded-lg transition-colors"
                          title={post.is_visible ? 'Hide post' : 'Show post'}
                        >
                          {post.is_visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {/* Delete (own post) */}
                      {post.author_id === user?.id && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 p-1 rounded-lg transition-colors"
                          title="Delete post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{post.body}</p>

                  {/* Reactions */}
                  <div className="flex items-center gap-3 mb-2">
                    <ReactionButton postId={post.id} type="helpful" label="Helpful" icon={ThumbsUp} />
                    <ReactionButton postId={post.id} type="useful" label="Useful" icon={Star} />
                    <ReactionButton postId={post.id} type="important" label="Important" icon={Heart} />
                  </div>

                  {/* Replies toggle */}
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => {
                      if (expandedId === post.id) {
                        setExpandedId(null);
                      } else {
                        setExpandedId(post.id);
                        if (!post.replies && post.reply_count > 0) {
                          loadReplies(post.id);
                        }
                      }
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {post.reply_count || 0} {post.reply_count === 1 ? 'reply' : 'replies'}
                    {expandedId === post.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {/* Replies (Lazy Loaded) */}
                  {expandedId === post.id && (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      {(post.replies || []).map((r, i) => (
                        <div key={i} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] flex-shrink-0">
                            {r.author_name?.[0] || '?'}
                          </div>
                          <div className="bg-muted rounded-xl px-3 py-2 text-sm flex-1 dark:bg-muted/50">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground">{r.author_name}</p>
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(r.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-foreground">{r.body}</p>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReply(post)}
                          disabled={!replyText[post.id]?.trim()}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Loading more indicator */}
        {loading && posts.length > 0 && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {/* End of posts */}
        {!hasMore && posts.length > 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">
            You've reached the end of all posts
          </p>
        )}
      </div>
    </div>
  );
}
