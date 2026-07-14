import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, X, ShieldAlert, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const MAX_COMMENT_LENGTH = 500;

// ============================================================
// Main Component
// ============================================================

export default function TutorReviewModal({ booking, user, onClose, onReviewed }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [validationStep, setValidationStep] = useState('idle'); // idle | validating | submitting

  // ============================================================
  // RANK LABELS
  // ============================================================

  const RANK_LABELS = [
    '',
    'Needs Improvement',
    'Below Expectations',
    'Satisfactory',
    'Very Good',
    'Exceptional'
  ];

  // ============================================================
  // VALIDATE & SUBMIT
  // ============================================================

  const handleValidateAndSubmit = async () => {
    // Step 1: Rating validation
    if (rating === 0) {
      toast.error('Please select a star rating.');
      return;
    }

    // Step 2: Session status validation
    if (booking.status !== 'completed') {
      setErrorMessage(
        'Access Denied: You can only review completed sessions. ' +
        'Please contact support if this session was completed but not marked.'
      );
      toast.error('Only completed sessions can be reviewed');
      return;
    }

    setIsSubmitting(true);
    setValidationStep('validating');
    setErrorMessage(null);

    try {
      // Step 3: Anti-fraud - Check for existing review
      const { data: existingReview, error: lookupError } = await supabase
        .from('tutor_reviews')
        .select('id, created_at')
        .eq('booking_id', booking.id)
        .eq('student_email', user.email)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existingReview) {
        const reviewDate = new Date(existingReview.created_at).toLocaleDateString('en-ZA');
        setErrorMessage(
          `Duplicate Review Detected: You already reviewed this session on ${reviewDate}.`
        );
        toast.error('You have already reviewed this session');
        setIsSubmitting(false);
        setValidationStep('idle');
        return;
      }

      // Step 4: All checks passed - submit review
      setValidationStep('submitting');
      await executeReviewSubmission();

    } catch (error) {
      console.error('Validation error:', error);
      setErrorMessage(error.message || 'Validation failed. Please try again.');
      toast.error('Failed to validate review');
      setIsSubmitting(false);
      setValidationStep('idle');
    }
  };

  // ============================================================
  // EXECUTE REVIEW SUBMISSION
  // ============================================================

  const executeReviewSubmission = async () => {
    try {
      // Sanitize comment
      const sanitizedComment = comment.trim().slice(0, MAX_COMMENT_LENGTH);

      // 1. Insert review record
      const { data: reviewData, error: insertError } = await supabase
        .from('tutor_reviews')
        .insert([
          {
            booking_id: booking.id,
            tutor_email: booking.tutor_email,
            tutor_name: booking.tutor_name,
            student_email: user.email,
            student_name: user.full_name || user.email || 'Student',
            rating: rating,
            comment: sanitizedComment || null,
            subject: booking.subject,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Log activity for POPIA compliance
      await supabase
        .from('activity_log')  // ✅ Fixed: singular table name
        .insert([
          {
            event_type: 'tutor_review_submitted',
            user_email: user.email,
            user_id: user.id || null,
            description: `Submitted ${rating}-star review for tutor: ${booking.tutor_name}`,
            metadata: {
              booking_id: booking.id,
              tutor_email: booking.tutor_email,
              rating: rating,
              has_comment: !!sanitizedComment
            }
          }
        ])
        .catch((e) => console.warn('Activity logging fallback:', e));

      // 3. Update booking with review flag (optional - for UI feedback)
      await supabase
        .from('tutor_bookings')
        .update({ has_review: true })
        .eq('id', booking.id)
        .catch((e) => console.warn('Booking update fallback:', e));

      // 4. Success feedback
      toast.success(`Thank you! Your ${rating}-star review has been published.`);
      
      // 5. Callback and close
      if (onReviewed) onReviewed();
      onClose();

    } catch (error) {
      console.error('Review submission error:', error);
      setErrorMessage(error.message || 'Failed to submit review. Please try again.');
      toast.error('Failed to submit review');
      throw error;
    } finally {
      setIsSubmitting(false);
      setValidationStep('idle');
    }
  };

  // ============================================================
  // RESET FORM
  // ============================================================

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-border animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">Rate Your Session</h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {booking.tutor_name} · {booking.subject}
              {booking.date && ` · ${new Date(booking.date).toLocaleDateString('en-ZA')}`}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground rounded-lg h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] font-medium flex items-start gap-2 animate-shake dark:bg-red-950/20 dark:border-red-800 dark:text-red-300">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-600 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Star Rating */}
        <div className="flex flex-col items-center justify-center py-3 bg-muted/30 rounded-xl border border-border/50">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (!isSubmitting) {
                    setRating(s);
                    setErrorMessage(null);
                  }
                }}
                onMouseEnter={() => !isSubmitting && setHovered(s)}
                onMouseLeave={() => !isSubmitting && setHovered(0)}
                className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                disabled={isSubmitting}
                aria-label={`Rate ${s} stars`}
              >
                <Star
                  className={`w-8 h-8 transition-colors stroke-[1.5] ${
                    s <= (hovered || rating)
                      ? 'fill-amber-400 text-amber-500 drop-shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="h-5 mt-1.5">
            {rating > 0 && (
              <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {RANK_LABELS[rating] || ''}
              </p>
            )}
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Feedback (Optional)
          </label>
          <Textarea
            placeholder="Share your experience with this tutor..."
            value={comment}
            disabled={isSubmitting}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
            className="resize-none h-24 text-sm font-medium bg-background border-border text-foreground focus:ring-2 focus:ring-primary focus:outline-none rounded-xl p-3"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Feedback helps other students</span>
            <span className="font-medium">
              {comment.length} / {MAX_COMMENT_LENGTH}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            onClick={handleValidateAndSubmit}
            disabled={isSubmitting || rating === 0}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-sm gap-1.5 transition-transform transform active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {validationStep === 'validating' ? 'Verifying...' : 'Submitting...'}
              </>
            ) : (
              <>
                <Star className="w-4 h-4" />
                Submit Review
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="border-border text-muted-foreground hover:bg-muted font-medium text-xs h-9 rounded-xl"
          >
            Cancel
          </Button>
        </div>

        {/* Compliance Footer */}
        <div className="text-center border-t border-border pt-2 mt-1">
          <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-1">
            <ShieldAlert className="w-3 h-3 text-green-500" />
            All reviews are verified and comply with SACE Code of Conduct
          </p>
        </div>

      </div>
    </div>
  );
}
