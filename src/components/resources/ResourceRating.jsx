import { CheckCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const STARS = [1, 2, 3, 4, 5];
export default function ResourceRating({
  resource,
  user,
  onRatingUpdate = undefined
}) {
  const [myRating, setMyRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fetchRatings = useCallback(async () => {
    if (!resource?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('resource_ratings').select('*').eq('resource_id', resource.id);
      if (error) throw error;
      const ratings = data || [];
      setTotalRatings(ratings.length);
      if (ratings.length) {
        const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
        setAvgRating(avg);
      }
      if (user?.email) {
        const mine = ratings.find(r => r.user_email === user.email);
        if (mine) setMyRating(mine.rating);
      }
    } catch (err) {
      console.error('Error fetching ratings:', err);
      toast.error('Failed to load ratings');
    } finally {
      setLoading(false);
    }
  }, [resource?.id, user?.email]);
  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);
  const rate = async val => {
    if (!user) {
      toast.error('Sign in to rate resources.');
      return;
    }
    if (!user.email) {
      toast.error('Your account is missing an email address.');
      return;
    }
    setSaving(true);
    try {
      const {
        data: existing,
        error: findError
      } = await supabase.from('resource_ratings').select('*').eq('resource_id', resource.id).eq('user_email', user.email).maybeSingle();
      if (findError) throw findError;
      if (existing) {
        const {
          error: updateError
        } = await supabase.from('resource_ratings').update({
          rating: val,
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
        if (updateError) throw updateError;
        toast.success('Rating updated!');
      } else {
        const {
          error: insertError
        } = await supabase.from('resource_ratings').insert({
          resource_id: resource.id,
          user_email: user.email,
          rating: val,
          created_at: new Date().toISOString()
        });
        if (insertError) throw insertError;
        toast.success('Rating saved!');
      }
      setMyRating(val);
      await Promise.resolve(supabase.from('activity_log').insert({
        event_type: 'resource_rated',
        user_email: user.email,
        user_id: user.id || null,
        description: `Rated resource ${resource.id} with ${val} stars`,
        metadata: {
          resource_id: resource.id,
          rating: val
        }
      })).catch(() => {});
      await fetchRatings();
      if (onRatingUpdate) onRatingUpdate();
    } catch (err) {
      console.error('Error saving rating:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  const avgDisplay = avgRating > 0 ? avgRating.toFixed(1) : '0.0';
  if (loading) {
    return <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading ratings...</span>
      </div>;
  }
  return <div className="flex items-center gap-2">
      <div className="flex">
        {STARS.map(i => <button key={i} onClick={() => rate(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} disabled={saving} className="p-0.5 transition-transform hover:scale-110 focus:outline-none" aria-label={`Rate ${i} stars`}>
            <Star className={`w-4 h-4 ${(hover || myRating) >= i ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
          </button>)}
      </div>

      {saving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}

      {totalRatings > 0 && <span className="text-xs text-muted-foreground">
          {avgDisplay} ({totalRatings})
        </span>}

      {myRating > 0 && !saving && <span className="text-[10px] text-green-600 flex items-center gap-0.5">
          <CheckCircle className="w-3 h-3" /> Rated
        </span>}
    </div>;
}
