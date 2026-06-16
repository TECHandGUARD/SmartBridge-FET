import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Flag, Pin, ChevronRight, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const categoryColors = {
  "University Questions": "bg-blue-100 text-blue-700",
  "NBT Prep": "bg-purple-100 text-purple-700",
  "Course Choices": "bg-green-100 text-green-700",
  "Bursaries": "bg-yellow-100 text-yellow-700",
  "General": "bg-gray-100 text-gray-700"
};

export default function ForumPostCard({ post, user, onClick, onUpdated }) {
  const [liking, setLiking] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [removing, setRemoving] = useState(false);
  
  const isLiked = user && post.liked_by?.includes(user.email);
  const isAdmin = user?.role === 'admin';

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to like posts");
      return;
    }
    
    setLiking(true);
    const alreadyLiked = post.liked_by?.includes(user.email);
    const newLikedBy = alreadyLiked
      ? (post.liked_by || []).filter(e => e !== user.email)
      : [...(post.liked_by || []), user.email];
    
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({
          liked_by: newLikedBy,
          likes: newLikedBy.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);
      
      if (error) throw error;
      
      onUpdated({ ...post, liked_by: newLikedBy, likes: newLikedBy.length });
    } catch (err) {
      console.error('Error updating like:', err);
      toast.error("Failed to update like");
    } finally {
      setLiking(false);
    }
  };

  const handleFlag = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to flag posts");
      return;
    }
    
    setFlagging(true);
    try {
      const newFlagged = !post.is_flagged;
      const { error } = await supabase
        .from('forum_posts')
        .update({ 
          is_flagged: newFlagged,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);
      
      if (error) throw error;
      
      onUpdated({ ...post, is_flagged: newFlagged });
      toast.success(newFlagged ? "Post flagged for review" : "Flag removed");
    } catch (err) {
      console.error('Error flagging post:', err);
      toast.error("Failed to flag post");
    } finally {
      setFlagging(false);
    }
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    if (!isAdmin) return;
    
    setRemoving(true);
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({ 
          is_removed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);
      
      if (error) throw error;
      
      onUpdated({ ...post, is_removed: true });
      toast.success("Post removed");
    } catch (err) {
      console.error('Error removing post:', err);
      toast.error("Failed to remove post");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-card border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {post.is_pinned && (
              <Badge className="bg-primary/10 text-primary text-xs gap-1">
                <Pin className="w-3 h-3" /> Pinned
              </Badge>
            )}
            {post.is_flagged && isAdmin && (
              <Badge className="bg-red-100 text-red-700 text-xs">Flagged</Badge>
            )}
            <Badge className={`text-xs ${categoryColors[post.category] || "bg-gray-100 text-gray-700"}`}>
              {post.category}
            </Badge>
            {post.university_tag && (
              <Badge variant="outline" className="text-xs">{post.university_tag}</Badge>
            )}
          </div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.body}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">{post.author_name}</span>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t">
        <button
          onClick={handleLike}
          disabled={liking}
          className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'} disabled:opacity-50`}
        >
          {liking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />}
          <span>{post.likes || 0}</span>
        </button>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          <span>{post.comment_count || 0}</span>
        </div>
        {user && !isAdmin && (
          <button
            onClick={handleFlag}
            disabled={flagging}
            className={`flex items-center gap-1.5 text-xs ml-auto transition-colors disabled:opacity-50 ${post.is_flagged ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-400'}`}
          >
            {flagging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />}
            {post.is_flagged ? 'Flagged' : 'Flag'}
          </button>
        )}
        {isAdmin && (
          <div className="flex items-center gap-2 ml-auto">
            <button 
              onClick={handleFlag} 
              disabled={flagging}
              className={`text-xs transition-colors disabled:opacity-50 ${post.is_flagged ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-400'}`}
            >
              <Flag className="w-3 h-3" />
            </button>
            <button 
              onClick={handleRemove} 
              disabled={removing}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remove'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
