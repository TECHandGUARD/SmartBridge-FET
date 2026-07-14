import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import PropTypes from 'prop-types';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// PropTypes
// ============================================================

const propTypes = {
  /** Email of the tutor whose reviews to display */
  tutorEmail: PropTypes.string.isRequired,
};

// ============================================================
// StarDisplay Component with PropTypes
// ============================================================

const StarDisplayPropTypes = {
  /** Rating value from 0-5 */
  rating: PropTypes.number.isRequired,
};

function StarDisplay({ rating }) {
  return (
    <div 
      className="flex gap-0.5" 
      role="img" 
      aria-label={`Rating: ${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(s => (
        <Star 
          key={s} 
          className={`w-3.5 h-3.5 ${
            s <= rating 
              ? 'fill-amber-400 text-amber-400' 
              : 'text-muted-foreground/30'
          }`} 
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

StarDisplay.propTypes = StarDisplayPropTypes;

// ============================================================
// RatingSummary Component
// ============================================================

function RatingSummary({ avgRating, totalReviews, distribution }) {
  const hasReviews = totalReviews > 0;
  
  return (
    <div className="bg-muted/30 rounded-lg p-3 grid grid-cols-2 gap-2 dark:bg-muted/20">
      {/* Average Rating Display */}
      <div className="text-center">
        <p className="text-3xl font-bold text-foreground">
          {hasReviews ? avgRating : '—'}
        </p>
        {hasReviews && (
          <>
            <div className="flex justify-center mt-0.5">
              <StarDisplay rating={Number(avgRating)} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {totalReviews} review{totalReviews !== 1 ? 's' : ''}
            </p>
          </>
        )}
        {!hasReviews && (
          <p className="text-[10px] text-muted-foreground mt-0.5">No reviews yet</p>
        )}
      </div>
      
      {/* Distribution Bars */}
      <div className="space-y-0.5" role="img" aria-label="Rating distribution">
        {[5, 4, 3, 2, 1].map(star => {
          const count = hasReviews ? (distribution[star] || 0) : 0;
          const percentage = hasReviews ? (count / totalReviews) * 100 : 0;
          
          return (
            <div key={star} className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground w-4">{star}</span>
              <div 
                className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"
                aria-label={`${star} star: ${count} reviews, ${Math.round(percentage)}%`}
              >
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    star >= 4 ? 'bg-green-500' : 
                    star >= 3 ? 'bg-amber-500' : 
                    'bg-red-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground w-8 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

RatingSummary.propTypes = {
  avgRating: PropTypes.string,
  totalReviews: PropTypes.number.isRequired,
  distribution: PropTypes.object.isRequired,
};

// ============================================================
// Main Component
// ============================================================

export default function TutorReviews({ tutorEmail }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================
  // Load Reviews
  // ============================================================

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

  // ============================================================
  // Calculations (with guard against empty reviews)
  // ============================================================

  const totalReviews = reviews.length;
  
  const avgRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : null;

  // Guard against division by zero or NaN
  const ratingDistribution = totalReviews > 0
    ? reviews.reduce((acc, r) => {
        const rounded = Math.round(r.rating);
        acc[rounded] = (acc[rounded] || 0) + 1;
        return acc;
      }, {})
    : {};

  // ============================================================
  // Loading State
  // ============================================================

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

  // ============================================================
  // Error State
  // ============================================================

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
          <Button 
            type="button"  // ✅ CRITICAL FIX: Prevents form submission
            variant="outline" 
            size="sm" 
            className="mt-3" 
            onClick={loadReviews}
          >
            Retry
          </Button>
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" /> Student Reviews
            {avgRating && (
              <span className="text-sm font-normal text-muted-foreground">
                {avgRating}/5 ({totalReviews} review{totalReviews !== 1 ? 's' : ''})
              </span>
            )}
          </CardTitle>
          <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3 text-green-500" /> Verified
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Rating Summary */}
        <RatingSummary 
          avgRating={avgRating}
          totalReviews={totalReviews}
          distribution={ratingDistribution}
        />

        {/* Reviews List */}
        {totalReviews === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No reviews yet. Reviews appear after completed sessions.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {reviews.map(r => (
              <div key={r.id} className="p-3 rounded-xl bg-muted/40 space-y-1 dark:bg-muted/20">
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

// Add PropTypes
TutorReviews.propTypes = propTypes;
