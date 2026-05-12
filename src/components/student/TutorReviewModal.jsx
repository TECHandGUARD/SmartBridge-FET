import { useState } from 'react';
import { supabase } from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function TutorReviewModal({ booking, user, onClose, onReviewed }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (rating === 0) { toast.error('Please select a star rating.'); return; }
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('tutor_reviews')
        .insert({
          tutor_email: booking.tutor_email,
          tutor_name: booking.tutor_name,
          student_email: user.email,
          student_name: user.user_metadata?.full_name || user.email,
          rating: rating,
          comment: comment,
          subject: booking.subject,
          booking_id: booking.id,
        });
      
      if (error) throw error;
      
      // Also update the booking to mark as reviewed
      await supabase
        .from('tutor_bookings')
        .update({ is_reviewed: true })
        .eq('id', booking.id);
      
      toast.success('Thank you for your feedback!');
      onReviewed?.();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-playfair text-xl font-bold">Rate Your Session</h2>
            <p className="text-sm text-muted-foreground">with {booking.tutor_name} · {booking.subject}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110"
            >
              <Star className={`w-9 h-9 transition-colors ${s <= (hovered || rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-sm font-medium text-muted-foreground">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'][rating]}
          </p>
        )}

        <Textarea
          placeholder="Share your experience with this tutor (optional)..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="resize-none h-24"
        />

        <div className="flex gap-3">
          <Button onClick={submit} disabled={saving || rating === 0} className="flex-1 bg-primary gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
            Submit Review
          </Button>
          <Button variant="outline" onClick={onClose}>Skip</Button>
        </div>
      </div>
    </div>
  );
}