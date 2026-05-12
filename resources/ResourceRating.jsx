import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

export default function ResourceRating({ resource, user }) {
  const [myRating, setMyRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!resource?.id) return;
    fetchRatings();
  }, [resource, user]);

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_ratings')
        .select('*')
        .eq('resource_id', resource.id);
      
      if (error) throw error;
      
      const ratings = data || [];
      setTotalRatings(ratings.length);
      if (ratings.length) {
        setAvgRating(ratings.reduce((s, r) => s + r.rating, 0) / ratings.length);
      }
      if (user?.email) {
        const mine = ratings.find(r => r.user_email === user.email);
        if (mine) setMyRating(mine.rating);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const rate = async (val) => {
    if (!user) { toast.error('Sign in to rate resources.'); return; }
    setSaving(true);
    
    try {
      // Check if user already rated this resource
      const { data: existing, error: findError } = await supabase
        .from('resource_ratings')
        .select('id')
        .eq('resource_id', resource.id)
        .eq('user_email', user.email)
        .maybeSingle();
      
      if (findError && findError.code !== 'PGRST116') throw findError;
      
      if (existing) {
        // Update existing rating
        const { error: updateError } = await supabase
          .from('resource_ratings')
          .update({ rating: val })
          .eq('id', existing.id);
        
        if (updateError) throw updateError;
      } else {
        // Create new rating
        const { error: createError } = await supabase
          .from('resource_ratings')
          .insert({
            resource_id: resource.id,
            user_email: user.email,
            rating: val
          });
        
        if (createError) throw createError;
      }
      
      setMyRating(val);
      toast.success('Rating saved!');
      
      // Refresh ratings to update average
      fetchRatings();
    } catch (error) {
      console.error('Error saving rating:', error);
      toast.error('Failed to save rating');
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
      {totalRatings > 0 && (
        <span className="text-xs text-muted-foreground">
          {avgRating.toFixed(1)} ({totalRatings})
        </span>
      )}
    </div>
  );
}