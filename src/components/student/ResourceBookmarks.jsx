import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Trash2, BookOpen, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// Main Component
// ============================================================

export default function ResourceBookmarks({ user }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================
  // Load Bookmarks
  // ============================================================

  const loadBookmarks = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // ✅ Using student_email to match other tables
      const { data, error: queryError } = await supabase
        .from('resource_bookmarks')
        .select('*')
        .eq('student_email', user.email)  // ✅ Fixed field name
        .order('created_at', { ascending: false });
      
      if (queryError) throw queryError;
      setBookmarks(data || []);
    } catch (err) {
      console.error('Error loading bookmarks:', err);
      setError('Failed to load bookmarks');
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // ============================================================
  // Remove Bookmark
  // ============================================================

  const removeBookmark = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('resource_bookmarks')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      const removed = bookmarks.find(b => b.id === id);
      setBookmarks(prev => prev.filter(b => b.id !== id));
      toast.success('Bookmark removed');
      
      // Log activity for POPIA compliance
      if (removed) {
        await supabase
          .from('activity_log')
          .insert({
            event_type: 'bookmark_removed',
            user_email: user.email,
            user_id: user.id || null,
            description: `Removed bookmark: ${removed.resource_title || 'Resource'}`,
            metadata: {
              resource_id: removed.resource_id,
              resource_title: removed.resource_title,
              subject: removed.subject
            }
          })
          .catch(() => {});
      }
      
    } catch (err) {
      console.error('Error removing bookmark:', err);
      toast.error('Failed to remove bookmark');
    }
  };

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary fill-primary" /> Saved Resources
            <Badge variant="outline" className="text-xs ml-auto">{bookmarks.length}</Badge>
          </CardTitle>
          <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3 text-green-500" /> Private
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Resources you've saved for quick access.
        </p>
      </CardHeader>
      
      <CardContent>
        {/* Error Display */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 dark:bg-red-950/20 dark:border-red-800">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            <button 
              onClick={loadBookmarks}
              className="ml-auto text-primary hover:underline text-xs font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {bookmarks.length === 0 ? (
          <div className="text-center py-8">
            <Bookmark className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">No saved resources yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Bookmark resources you want to revisit later.
            </p>
            <Link to="/subjects">
              <Button size="sm" variant="outline" className="mt-3 text-xs gap-1">
                <BookOpen className="w-3 h-3" /> Browse Resources
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
            {bookmarks.map(b => {
              const sub = SUBJECTS.find(s => s.name === b.subject);
              return (
                <div key={b.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 hover:bg-muted transition-colors group">
                  <span className="text-base flex-shrink-0">{sub?.icon || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.resource_title || 'Resource'}</p>
                    <div className="flex items-center gap-2">
                      {(b.subject || b.grade) && (
                        <p className="text-xs text-muted-foreground">
                          {b.subject}{b.grade ? ` • ${b.grade}` : ''}
                        </p>
                      )}
                      {b.created_at && (
                        <span className="text-[10px] text-muted-foreground">
                          Saved {new Date(b.created_at).toLocaleDateString('en-ZA')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                    onClick={() => removeBookmark(b.id)}
                    title="Remove bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
