import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );
}

export default function TutorReviews({ tutorEmail }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReviews = useCallback(async () => {
    if (!tutorEmail) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const { data, error: reviewsError } = await supabase
        .from('tutor_reviews')
        .select('*')
        .eq('tutor_email', tutorEmail)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (reviewsError) throw reviewsError;
      setReviews(data || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
      setError('Failed to load reviews');
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [tutorEmail]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // Loading state
  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" /> Student Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" /> Student Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadReviews}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-playfair flex items-center gap-2">
          <Star className="w-5 h-5 fill-amber-400 text-amber-400" /> Student Reviews
          {avgRating && (
            <span className="text-sm font-normal text-muted-foreground">
              {avgRating}/5 ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No reviews yet. Reviews appear after completed sessions.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {reviews.map(r => (
              <div key={r.id} className="p-3 rounded-xl bg-muted/40 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {r.student_name?.[0] || 'S'}
                    </div>
                    <span className="text-sm font-semibold">{r.student_name || 'Student'}</span>
                  </div>
                  <StarDisplay rating={r.rating} />
                </div>
                {r.subject && <p className="text-xs text-muted-foreground">{r.subject}</p>}
                {r.comment && <p className="text-sm text-foreground leading-relaxed">"{r.comment}"</p>}
                <p className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}