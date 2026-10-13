import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageSquare, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const STARS = [1, 2, 3, 4, 5];

// ============================================================
// Main Component
// ============================================================

export default function CAPSDocRating({ docId, user, onRatingUpdate }) {
  const [ratings, setRatings] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const userEmail = user?.email;

  const fetchRatings = useCallback(async () => {
    if (!docId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('resource_ratings')
        .select('*')
        .eq('resource_id', docId)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      setRatings(data || []);

      // Check if current user has rated
      if (userEmail) {
        const mine = data?.find(r => r.user_email === userEmail);
        if (mine) {
          setSelected(mine.rating);
          setComment(mine.comment || '');
        }
      }
    } catch (err) {
      console.error('Error fetching ratings:', err);
      setError('Failed to load ratings');
      toast.error('Failed to load ratings');
    } finally {
      setLoading(false);
    }
  }, [docId, userEmail]);

  useEffect(() => {
    if (showPanel) fetchRatings();
  }, [showPanel, fetchRatings]);

  const avgRating = ratings.length
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length)
    : 0;

  const ratingCount = ratings.length;
  const avgDisplay = avgRating > 0 ? avgRating.toFixed(1) : null;

  const handleSubmit = async () => {
    if (!userEmail) {
      toast.error('Please log in to rate documents.');
      return;
    }

    if (!selected) {
      toast.error('Please select a star rating.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const existing = ratings.find(r => r.user_email === userEmail);

      const payload = {
        rating: selected,
        comment: comment.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // Update existing rating
        const { error: updateError } = await supabase
          .from('resource_ratings')
          .update(payload)
          .eq('id', existing.id);

        if (updateError) throw updateError;
        toast.success('Rating updated!');
      } else {
        // Create new rating
        const { error: insertError } = await supabase
          .from('resource_ratings')
          .insert({
            resource_id: docId,
            user_email: userEmail,
            rating: selected,
            comment: comment.trim() || null,
            created_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
        toast.success('Rating saved — thank you!');
      }

      // Log activity for POPIA compliance
      await Promise.resolve(supabase
        .from('activity_log')
        .insert({
          event_type: 'resource_rated',
          user_email: userEmail,
          user_id: user?.id || null,
          description: `Rated resource ${docId} with ${selected} stars`,
          metadata: {
            resource_id: docId,
            rating: selected,
            has_comment: !!comment.trim()
          }
        }))
        .catch(() => {}); // Silent fail for logging

      // Refresh ratings
      await fetchRatings();

      // Notify parent if callback provided
      if (onRatingUpdate) onRatingUpdate();

    } catch (err) {
      console.error('Error saving rating:', err);
      setError(err.message);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* Toggle Button */}
      <button
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
        onClick={() => setShowPanel(v => !v)}
        aria-expanded={showPanel}
      >
        {avgDisplay ? (
          <span className="flex items-center gap-1 font-medium text-amber-500">
            <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
            {avgDisplay} ({ratingCount} rating{ratingCount !== 1 ? 's' : ''})
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" /> No ratings yet
          </span>
        )}
        <MessageSquare className="w-3.5 h-3.5 ml-1" />
        {showPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {showPanel ? 'Hide' : 'Rate & review'}
        </span>
      </button>

      {showPanel && (
        <div className="mt-3 space-y-3">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Rating Form */}
          <div className="bg-muted/40 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">
              Rate this document
              {userEmail && <span className="text-muted-foreground font-normal ml-1">as {userEmail}</span>}
            </p>

            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {STARS.map(n => (
                  <button
                    key={n}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setSelected(n)}
                    disabled={submitting}
                    className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`Rate ${n} stars`}
                  >
                    <Star
                      className={`w-5 h-5 transition-colors ${
                        n <= (hovered || selected)
                          ? 'fill-amber-400 stroke-amber-500'
                          : 'fill-transparent stroke-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {selected > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selected} star{selected !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <Textarea
              placeholder="Optional comment — what did you find helpful?"
              className="text-xs min-h-[60px] resize-none"
              value={comment}
              onChange={e => setComment(e.target.value)}
              disabled={submitting}
            />

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 text-xs bg-primary gap-1"
                onClick={handleSubmit}
                disabled={submitting || !selected}
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {submitting ? 'Saving...' : 'Submit Rating'}
              </Button>
              {selected > 0 && ratings.some(r => r.user_email === userEmail) && (
                <span className="text-[10px] text-muted-foreground">
                  Update your rating
                </span>
              )}
            </div>
          </div>

          {/* Existing Comments */}
          {loading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : ratings.filter(r => r.comment).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-3 h-3" />
                Comments ({ratings.filter(r => r.comment).length})
              </p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {ratings.filter(r => r.comment).map(r => (
                  <div key={r.id} className="flex gap-2 text-xs bg-background rounded-lg p-2 border border-border/50">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                      {r.user_email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          {STARS.map(n => (
                            <Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'fill-amber-400 stroke-amber-500' : 'fill-transparent stroke-muted-foreground'}`} />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString('en-ZA') : ''}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-snug mt-0.5">{r.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
