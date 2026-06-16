import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import ForumPostCard from "@/components/forum/ForumPostCard";
import CreatePostModal from "@/components/forum/CreatePostModal";
import ForumPostDetail from "@/components/forum/ForumPostDetail";

const CATEGORIES = ["All", "University Questions", "NBT Prep", "Course Choices", "Bursaries", "General"];

const CATEGORY_COLORS = {
  "University Questions": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "NBT Prep": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Course Choices": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Bursaries": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "General": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
};

// ── Debounce Hook for Search Input ──────────────────────────────────────────
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function CommunityForum() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Debounced search to prevent lag on low-end devices
  const debouncedSearch = useDebounce(search, 300);

  // ── Secure Data Fetching with Error Handling ──────────────────────────────
  const loadData = useCallback(async (showSilentLoader = false) => {
    if (!showSilentLoader) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    
    try {
      // Fetch posts - no auth dependency so public users can see posts
      const { data: postsData, error: postsError } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('is_removed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      setPosts(postsData || []);
    } catch (err) {
      console.error("Forum data fetch failure:", err);
      setError("Unable to sync with discussion servers. Please check your connection and try again.");
      toast.error("Failed to load forum posts");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // ── Real-time Subscription ──────────────────────────────────────────────────
  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('forum_posts_channel')
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
          table: 'forum_posts',
        },
        (payload) => {
          setPosts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // ── Unified State Synchronization Cache ──────────────────────────────────
  const handlePostUpdated = useCallback((updated) => {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, []);

  // Selected post is derived from the main posts array (single source of truth)
  const selectedPost = useMemo(() => {
    return posts.find(p => p.id === selectedPostId) || null;
  }, [posts, selectedPostId]);

  // ── Optimized Search/Filter Computations ─────────────────────────────────
  const filteredPosts = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return posts.filter(p => {
      const matchesCategory = activeCategory === "All" || p.category === activeCategory;
      const matchesSearch = !query ||
        p.title?.toLowerCase().includes(query) ||
        p.body?.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [posts, activeCategory, debouncedSearch]);

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
    setShowCreateModal(false);
    toast.success("Discussion posted successfully!");
  };

  // ── Handle Back Navigation ──────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    setSelectedPostId(null);
    // Silently refresh in background without showing loader
    loadData(true);
  }, [loadData]);

  // ── Render Detail View ─────────────────────────────────────────────────────
  if (selectedPost) {
    return (
      <ForumPostDetail
        post={selectedPost}
        user={user}
        onBack={handleBack}
        onPostUpdated={handlePostUpdated}
      />
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md border rounded-xl p-8 bg-destructive/5 border-destructive/20">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Connection Error</h3>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => loadData(false)} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Container */}
      <div className="bg-gradient-to-r from-primary to-emerald-800 text-white py-10 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold font-playfair tracking-tight mb-2">Community Forum</h1>
          <p className="text-white/80 mb-6 max-w-xl text-sm sm:text-base">
            Ask questions, share knowledge, and collaborate to navigate tertiary education paths across South Africa.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <Input
                placeholder="Search forum text content..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/30 w-full"
              />
            </div>
            {user && (
              <Button onClick={() => setShowCreateModal(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2 font-medium shrink-0">
                <Plus className="w-4 h-4" /> New Discussion
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Category Filtration Badges */}
        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Forum Categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              aria-selected={activeCategory === cat}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 shadow-sm ${
                activeCategory === cat
                  ? "bg-primary text-white scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Runtime Diagnostics Information Bar */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 font-medium">
          <span>{filteredPosts.length} discussion{filteredPosts.length !== 1 ? 's' : ''} found</span>
          {activeCategory !== "All" && (
            <Badge variant="secondary" className={`${CATEGORY_COLORS[activeCategory] || "bg-gray-100 text-gray-700"} border-none shadow-none`}>
              {activeCategory}
            </Badge>
          )}
          {isRefreshing && (
            <span className="flex items-center gap-1 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" /> Refreshing...
            </span>
          )}
        </div>

        {/* Dynamic Registry View Feed Wrapper */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs">Loading discussions...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-xl max-w-xl mx-auto bg-muted/20">
            <p className="text-base font-semibold text-foreground mb-1">No discussions found</p>
            <p className="text-xs text-muted-foreground mb-5 px-6">
              {search || activeCategory !== "All" 
                ? "No discussions match your current filters. Try adjusting your search or category selection."
                : "There are no discussions yet. Be the first to start a conversation!"}
            </p>
            {user ? (
              <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Start Thread
              </Button>
            ) : (
              <p className="text-xs text-primary/80 font-medium">Please sign in to open a new conversation.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map(post => (
              <ForumPostCard
                key={post.id}
                post={post}
                user={user}
                onClick={() => setSelectedPostId(post.id)}
                onUpdated={handlePostUpdated}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreatePostModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePostCreated}
        />
      )}
    </div>
  );
}