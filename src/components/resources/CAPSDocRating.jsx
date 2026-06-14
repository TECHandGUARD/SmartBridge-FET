import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageSquare, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CAPSDocRating({ docId, user }) {
  const [ratings, setRatings] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const userEmail = user?.email;

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resource_ratings')
        .select('*')
        .eq('resource_id', docId);
      
      if (error) throw error;
      setRatings(data || []);
      
      const mine = (data || []).find(r => r.user_email === userEmail);
      if (mine) { 
        setSelected(mine.rating); 
        setComment(mine.comment || ''); 
      }
    } catch (err) {
      console.error('Error fetching ratings:', err);
      toast.error('Failed to load ratings');
    } finally {
      setLoading(false);
    }
  }, [docId, userEmail]);

  useEffect(() => {
    if (showPanel) fetchRatings();
  }, [showPanel, fetchRatings]);

  const avgRating = ratings.length
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : null;

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
    try {
      const existing = ratings.find(r => r.user_email === userEmail);
      
      if (existing) {
        const { error } = await supabase
          .from('resource_ratings')
          .update({ 
            rating: selected, 
            comment: comment,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('resource_ratings')
          .insert({
            resource_id: docId,
            user_email: userEmail,
            rating: selected,
            comment: comment
          });
        
        if (error) throw error;
      }
      
      toast.success('Rating saved — thank you!');
      await fetchRatings();
    } catch (err) {
      console.error('Error saving rating:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShowPanel(v => !v)}
      >
        {avgRating ? (
          <span className="flex items-center gap-1 font-medium text-amber-500">
            <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
            {avgRating} ({ratings.length} rating{ratings.length !== 1 ? 's' : ''})
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" /> No ratings yet
          </span>
        )}
        <MessageSquare className="w-3.5 h-3.5 ml-1" />
        {showPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showPanel && (
        <div className="mt-3 space-y-3">
          {/* Rate this document */}
          <div className="bg-muted/40 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Rate this document</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setSelected(n)}
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
            <Textarea
              placeholder="Optional comment — what did you find helpful?"
              className="text-xs min-h-[60px] resize-none"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            <Button size="sm" className="h-7 text-xs bg-primary gap-1" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Submit Rating
            </Button>
          </div>

          {/* Existing comments */}
          {loading ? (
            <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : ratings.filter(r => r.comment).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Comments</p>
              {ratings.filter(r => r.comment).map(r => (
                <div key={r.id} className="flex gap-2 text-xs">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                    {r.user_email?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'fill-amber-400 stroke-amber-500' : 'fill-transparent stroke-muted-foreground'}`} />
                      ))}
                    </div>
                    <p className="text-muted-foreground leading-snug">{r.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
