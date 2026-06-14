import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ResourceRating({ resource, user }) {
  const [myRating, setMyRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchRatings = useCallback(async () => {
    if (!resource?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('resource_ratings')
        .select('*')
        .eq('resource_id', resource.id);
      
      if (error) throw error;
      
      setTotalRatings(data?.length || 0);
      if (data?.length) {
        const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
        setAvgRating(avg);
      }
      
      if (user?.email) {
        const mine = data?.find(r => r.user_email === user.email);
        if (mine) setMyRating(mine.rating);
      }
    } catch (err) {
      console.error('Error fetching ratings:', err);
    }
  }, [resource?.id, user?.email]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const rate = async (val) => {
    if (!user) { 
      toast.error('Sign in to rate resources.'); 
      return; 
    }
    
    setSaving(true);
    try {
      // Check if already rated
      const { data: existing, error: findError } = await supabase
        .from('resource_ratings')
        .select('*')
        .eq('resource_id', resource.id)
        .eq('user_email', user.email);
      
      if (findError) throw findError;
      
      if (existing && existing.length > 0) {
        const { error: updateError } = await supabase
          .from('resource_ratings')
          .update({ 
            rating: val,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing[0].id);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('resource_ratings')
          .insert({
            resource_id: resource.id,
            user_email: user.email,
            rating: val
          });
        
        if (insertError) throw insertError;
      }
      
      setMyRating(val);
      toast.success('Rating saved!');
      fetchRatings();
    } catch (err) {
      console.error('Error saving rating:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1,2,3,4,5].map(i => (
          <button
            key={i}
            onClick={() => rate(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            disabled={saving}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star className={`w-4 h-4 ${(hover || myRating) >= i ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
          </button>
        ))}
      </div>
      {saving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      {totalRatings > 0 && (
        <span className="text-xs text-muted-foreground">
          {avgRating.toFixed(1)} ({totalRatings})
        </span>
      )}
    </div>
  );
}
