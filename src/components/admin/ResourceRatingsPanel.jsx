import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Star, Search, ThumbsUp, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function StarDisplay({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star 
          key={i} 
          className={`w-3.5 h-3.5 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} 
        />
      ))}
    </div>
  );
}

export default function ResourceRatingsPanel() {
  const [ratings, setRatings] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('avg_desc');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load resource ratings from Supabase
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('resource_ratings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (ratingsError) throw ratingsError;
      
      // Load resources from Supabase
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (resourcesError) throw resourcesError;
      
      setRatings(ratingsData || []);
      setResources(resourcesData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate ratings per resource
  const aggregated = resources.map(res => {
    const resourceRatings = ratings.filter(r => r.resource_id === res.id);
    const avg = resourceRatings.length > 0 
      ? resourceRatings.reduce((s, r) => s + (r.rating || 0), 0) / resourceRatings.length 
      : null;
    const comments = resourceRatings.filter(r => r.comment?.trim());
    return { 
      ...res, 
      ratingCount: resourceRatings.length, 
      avgRating: avg, 
      comments, 
      rawRatings: resourceRatings 
    };
  }).filter(r => r.ratingCount > 0);

  const filtered = aggregated
    .filter(r => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (r.title?.toLowerCase().includes(searchLower) || 
              r.subject?.toLowerCase().includes(searchLower));
    })
    .sort((a, b) => {
      if (sortBy === 'avg_desc') return (b.avgRating || 0) - (a.avgRating || 0);
      if (sortBy === 'avg_asc') return (a.avgRating || 0) - (b.avgRating || 0);
      if (sortBy === 'count_desc') return b.ratingCount - a.ratingCount;
      return 0;
    });

  const overallAvg = aggregated.length > 0
    ? (aggregated.reduce((s, r) => s + (r.avgRating || 0), 0) / aggregated.length).toFixed(1)
    : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-5 pb-4 text-center">
            <p className="font-playfair text-3xl font-bold text-amber-500">{overallAvg}</p>
            <p className="text-xs text-muted-foreground mt-1">Overall Avg Rating</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-5 pb-4 text-center">
            <p className="font-playfair text-3xl font-bold text-primary">{aggregated.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Rated Resources</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-5 pb-4 text-center">
            <p className="font-playfair text-3xl font-bold text-blue-600">{ratings.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="avg_desc">Highest Rated</option>
          <option value="avg_asc">Lowest Rated</option>
          <option value="count_desc">Most Reviewed</option>
        </select>
      </div>

      {/* Resource list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            {search ? 'No resources match your search.' : 'No resource ratings found yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(res => (
            <Card key={res.id} className="border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-sm">{res.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">{res.subject || 'No Subject'}</Badge>
                          <Badge variant="secondary" className="text-xs">{res.grade || 'No Grade'}</Badge>
                          {res.type && <Badge variant="outline" className="text-xs">{res.type}</Badge>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1.5 justify-end">
                          <StarDisplay rating={Math.round(res.avgRating)} />
                          <span className="font-bold text-sm">{res.avgRating?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 justify-end text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <ThumbsUp className="w-3 h-3" /> {res.ratingCount} ratings
                          </span>
                          {res.comments.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <MessageSquare className="w-3 h-3" /> {res.comments.length} comments
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rating distribution bar */}
                    {res.ratingCount > 0 && (
                      <div className="mt-3 space-y-1">
                        {[5, 4, 3, 2, 1].map(star => {
                          const count = res.rawRatings.filter(r => r.rating === star).length;
                          const pct = res.ratingCount > 0 ? (count / res.ratingCount) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2 text-xs">
                              <span className="w-3 text-muted-foreground text-right">{star}</span>
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-amber-400 rounded-full transition-all" 
                                  style={{ width: `${pct}%` }} 
                                />
                              </div>
                              <span className="w-5 text-muted-foreground text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Comments */}
                    {res.comments.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Student Feedback
                        </p>
                        {res.comments.slice(0, 3).map((c, i) => (
                          <div key={i} className="bg-muted/50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <StarDisplay rating={c.rating} />
                              <span className="text-xs text-muted-foreground">
                                {c.user_email || 'Anonymous'}
                              </span>
                            </div>
                            <p className="text-xs text-foreground">"{c.comment}"</p>
                          </div>
                        ))}
                        {res.comments.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-1">
                            +{res.comments.length - 3} more comments
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}