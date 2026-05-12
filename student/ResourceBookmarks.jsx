import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Trash2, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

export default function ResourceBookmarks({ user }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    
    const fetchBookmarks = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('resource_bookmarks')
          .select('*')
          .eq('user_email', user.email)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setBookmarks(data || []);
      } catch (error) {
        console.error('Error fetching bookmarks:', error);
        toast.error('Failed to load bookmarks');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookmarks();
  }, [user]);

  const removeBookmark = async (id) => {
    try {
      const { error } = await supabase
        .from('resource_bookmarks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setBookmarks(prev => prev.filter(b => b.id !== id));
      toast.success('Bookmark removed');
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error('Failed to remove bookmark');
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary fill-primary" /> Saved Resources
            <Badge variant="outline" className="text-xs ml-auto">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 flex justify-center">
            <div className="w-5 h-5 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-playfair flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-primary fill-primary" /> Saved Resources
          <Badge variant="outline" className="text-xs ml-auto">{bookmarks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookmarks.length === 0 ? (
          <div className="text-center py-6">
            <Bookmark className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">No saved resources yet.</p>
            <Link to="/subjects">
              <Button size="sm" variant="outline" className="mt-2 text-xs gap-1">
                <BookOpen className="w-3 h-3" /> Browse Resources
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {bookmarks.map(b => {
              const sub = SUBJECTS.find(s => s.name === b.subject);
              return (
                <div key={b.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 hover:bg-muted transition-colors group">
                  <span className="text-base flex-shrink-0">{sub?.icon || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.resource_title || 'Resource'}</p>
                    {(b.subject || b.grade) && (
                      <p className="text-xs text-muted-foreground">{b.subject}{b.grade ? ` • ${b.grade}` : ''}</p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    onClick={() => removeBookmark(b.id)}
                  >
                    <Trash2 className="w-3 h-3" />
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