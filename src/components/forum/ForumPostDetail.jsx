import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, Flag, Trash2, CheckCircle, Pin, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const categoryColors = {
  "University Questions": "bg-blue-100 text-blue-700",
  "NBT Prep": "bg-purple-100 text-purple-700",
  "Course Choices": "bg-green-100 text-green-700",
  "Bursaries": "bg-yellow-100 text-yellow-700",
  "General": "bg-gray-100 text-gray-700"
};

export default function ForumPostDetail({ post, user, onBack, onPostUpdated }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);
  const isAdmin = user?.role === 'admin';

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forum_comments')
        .select('*')
        .eq('post_id', post.id)
        .eq('is_removed', false)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error loading comments:', err);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [post.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    
    setSubmitting(true);
    try {
      // Create the comment
      const { data: comment, error: commentError } = await supabase
        .from('forum_comments')
        .insert({
          post_id: post.id,
          body: newComment.trim(),
          author_email: user.email,
          author_name: user.full_name || user.email,
          likes: 0,
          liked_by: [],
          is_flagged: false,
          is_removed: false,
          is_best_answer: false
        })
        .select()
        .single();
      
      if (commentError) throw commentError;
      
      // Update comment count on post
      const updatedCount = (currentPost.comment_count || 0) + 1;
      const { error: updateError } = await supabase
        .from('forum_posts')
        .update({ comment_count: updatedCount })
        .eq('id', post.id);
      
      if (updateError) throw updateError;
      
      const updatedPost = { ...currentPost, comment_count: updatedCount };
      setCurrentPost(updatedPost);
      onPostUpdated(updatedPost);
      setComments(prev => [...prev, comment]);
      setNewComment("");
      toast.success("Comment posted!");
    } catch (err) {
      console.error('Error posting comment:', err);
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikePost = async () => {
    if (!user) {
      toast.error("Please sign in to like posts");
      return;
    }
    
    const alreadyLiked = currentPost.liked_by?.includes(user.email);
    const newLikedBy = alreadyLiked
      ? (currentPost.liked_by || []).filter(e => e !== user.email)
      : [...(currentPost.liked_by || []), user.email];
    
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({
          liked_by: newLikedBy,
          likes: newLikedBy.length
        })
        .eq('id', post.id);
      
      if (error) throw error;
      
      const updated = { ...currentPost, liked_by: newLikedBy, likes: newLikedBy.length };
      setCurrentPost(updated);
      onPostUpdated(updated);
    } catch (err) {
      console.error('Error liking post:', err);
      toast.error("Failed to like post");
    }
  };

  const handleLikeComment = async (comment) => {
    if (!user) {
      toast.error("Please sign in to like comments");
      return;
    }
    
    const alreadyLiked = comment.liked_by?.includes(user.email);
    const newLikedBy = alreadyLiked
      ? (comment.liked_by || []).filter(e => e !== user.email)
      : [...(comment.liked_by || []), user.email];
    
    try {
      const { error } = await supabase
        .from('forum_comments')
        .update({
          liked_by: newLikedBy,
          likes: newLikedBy.length
        })
        .eq('id', comment.id);
      
      if (error) throw error;
      
      setComments(prev => prev.map(c => 
        c.id === comment.id ? { ...c, liked_by: newLikedBy, likes: newLikedBy.length } : c
      ));
    } catch (err) {
      console.error('Error liking comment:', err);
      toast.error("Failed to like comment");
    }
  };

  const handleFlagComment = async (comment) => {
    try {
      const { error } = await supabase
        .from('forum_comments')
        .update({ is_flagged: !comment.is_flagged })
        .eq('id', comment.id);
      
      if (error) throw error;
      
      setComments(prev => prev.map(c => 
        c.id === comment.id ? { ...c, is_flagged: !comment.is_flagged } : c
      ));
      toast.success(comment.is_flagged ? "Flag removed" : "Comment flagged");
    } catch (err) {
      console.error('Error flagging comment:', err);
      toast.error("Failed to flag comment");
    }
  };

  const handleRemoveComment = async (comment) => {
    try {
      const { error } = await supabase
        .from('forum_comments')
        .update({ is_removed: true })
        .eq('id', comment.id);
      
      if (error) throw error;
      
      setComments(prev => prev.filter(c => c.id !== comment.id));
      toast.success("Comment removed");
    } catch (err) {
      console.error('Error removing comment:', err);
      toast.error("Failed to remove comment");
    }
  };

  const handleMarkBestAnswer = async (comment) => {
    try {
      // Update all comments - unmark all, mark the selected one
      for (const c of comments) {
        const { error } = await supabase
          .from('forum_comments')
          .update({ is_best_answer: c.id === comment.id })
          .eq('id', c.id);
        
        if (error) throw error;
      }
      
      setComments(prev => prev.map(c => ({ ...c, is_best_answer: c.id === comment.id })));
      toast.success("Best answer marked");
    } catch (err) {
      console.error('Error marking best answer:', err);
      toast.error("Failed to mark best answer");
    }
  };

  const handlePinPost = async () => {
    try {
      const updated = { ...currentPost, is_pinned: !currentPost.is_pinned };
      const { error } = await supabase
        .from('forum_posts')
        .update({ is_pinned: updated.is_pinned })
        .eq('id', post.id);
      
      if (error) throw error;
      
      setCurrentPost(updated);
      onPostUpdated(updated);
      toast.success(updated.is_pinned ? "Post pinned" : "Post unpinned");
    } catch (err) {
      console.error('Error pinning post:', err);
      toast.error("Failed to update pin status");
    }
  };

  const handleRemovePost = async () => {
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({ is_removed: true })
        .eq('id', post.id);
      
      if (error) throw error;
      
      toast.success("Post removed");
      onBack();
    } catch (err) {
      console.error('Error removing post:', err);
      toast.error("Failed to remove post");
    }
  };

  const isPostLiked = user && currentPost.liked_by?.includes(user.email);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Forum
        </button>

        {/* Post */}
        <div className="bg-card border rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap gap-2 mb-3">
            {currentPost.is_pinned && <Badge className="bg-primary/10 text-primary text-xs gap-1"><Pin className="w-3 h-3" /> Pinned</Badge>}
            <Badge className={`text-xs ${categoryColors[currentPost.category] || ""}`}>{currentPost.category}</Badge>
            {currentPost.university_tag && <Badge variant="outline" className="text-xs">{currentPost.university_tag}</Badge>}
          </div>
          <h1 className="text-2xl font-bold mb-3">{currentPost.title}</h1>
          <p className="text-muted-foreground leading-relaxed mb-4">{currentPost.body}</p>
          <div className="flex items-center justify-between flex-wrap gap-2 pt-4 border-t">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{currentPost.author_name}</span>
              <span>{formatDistanceToNow(new Date(currentPost.created_at), { addSuffix: true })}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleLikePost} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${isPostLiked ? 'bg-red-50 text-red-500' : 'bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-400'}`}>
                <Heart className={`w-4 h-4 ${isPostLiked ? 'fill-current' : ''}`} />
                <span>{currentPost.likes || 0}</span>
              </button>
              {isAdmin && (
                <>
                  <button onClick={handlePinPost} className={`p-1.5 rounded-lg transition-colors ${currentPost.is_pinned ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}>
                    <Pin className="w-4 h-4" />
                  </button>
                  <button onClick={handleRemovePost} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Comments */}
        <h2 className="text-lg font-semibold mb-4">{comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {comments.map(comment => (
              <div key={comment.id} className={`bg-card border rounded-xl p-4 ${comment.is_best_answer ? 'border-green-400 bg-green-50/50' : ''}`}>
                {comment.is_best_answer && (
                  <div className="flex items-center gap-1.5 text-green-600 text-xs font-semibold mb-2">
                    <CheckCircle className="w-4 h-4" /> Best Answer
                  </div>
                )}
                <p className="text-sm leading-relaxed mb-3">{comment.body}</p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-medium">{comment.author_name}</span>
                    <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLikeComment(comment)}
                      className={`flex items-center gap-1 text-xs transition-colors ${comment.liked_by?.includes(user?.email) ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'}`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${comment.liked_by?.includes(user?.email) ? 'fill-current' : ''}`} />
                      {comment.likes || 0}
                    </button>
                    {user && !isAdmin && (
                      <button onClick={() => handleFlagComment(comment)} className={`text-xs transition-colors ${comment.is_flagged ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-400'}`}>
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button onClick={() => handleMarkBestAnswer(comment)} className={`text-xs transition-colors ${comment.is_best_answer ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'}`}>
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleFlagComment(comment)} className={`text-xs transition-colors ${comment.is_flagged ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-400'}`}>
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleRemoveComment(comment)} className="text-xs text-red-500 hover:text-red-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add comment */}
        {user ? (
          <form onSubmit={handleSubmitComment} className="bg-card border rounded-xl p-4">
            <p className="text-sm font-medium mb-2">Add your answer or comment</p>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-3"
              placeholder="Share your knowledge..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || !newComment.trim()} size="sm">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {submitting ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="bg-muted rounded-xl p-4 text-center text-sm text-muted-foreground">
            Please log in to add a comment.
          </div>
        )}
      </div>
    </div>
  );
}