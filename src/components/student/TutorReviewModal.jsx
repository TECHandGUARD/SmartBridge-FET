import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Path to your initialized Supabase Client instance
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, X, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface BookingType {
  id: string;
  status: string;
  tutor_email: string;
  tutor_name: string;
  subject: string;
}

interface UserType {
  email: string;
  full_name?: string;
}

interface TutorReviewModalProps {
  booking: BookingType;
  user: UserType;
  onClose: () => void;
  onReviewed?: () => void;
}

export default function TutorReviewModal({ booking, user, onClose, onReviewed }: TutorReviewModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PRINCIPAL'S COMPLIANCE POLICY: Double-validation guard against fraud or uncompleted session inputs
  const handleValidateAndSubmit = async () => {
    if (rating === 0) { 
      toast.error('Please select a star evaluation metric.'); 
      return; 
    }
    
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      // 1. Strict Institutional Validation: Check session completion state
      if (booking.status !== 'completed') {
        setErrorMessage('Access Denied: Appraising sessions that are not marked as completed is forbidden.');
        setIsSubmitting(false);
        return;
      }
      
      // 2. Anti-Fraud Lookup: Check for existing entries using a select count query
      const { data: existingReview, error: lookupError } = await supabase
        .from('tutor_reviews')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('student_email', user.email)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existingReview) {
        setErrorMessage('Validation Exception: A feedback profile has already been uploaded for this matching booking token identifier.');
        setIsSubmitting(false);
        return;
      }
      
      // Validation checks passed -> Execute transaction pipelines
      await executeReviewSubmission();
    } catch (error: any) {
      console.error('Validation parameters breakdown:', error);
      setErrorMessage(error.message || 'Verification pipeline timeout.');
      setIsSubmitting(false);
    }
  };

  const executeReviewSubmission = async () => {
    try {
      // 1. Write the permanent review record to Supabase
      const { error: insertError } = await supabase
        .from('tutor_reviews')
        .insert([
          {
            booking_id: booking.id,
            tutor_email: booking.tutor_email,
            tutor_name: booking.tutor_name,
            student_email: user.email,
            student_name: user.full_name || user.email,
            rating: rating,
            comment: comment.trim().slice(0, 500), // Enforce strict length containment limits
            subject: booking.subject
          }
        ]);

      if (insertError) throw insertError;
      
      // 2. Log activity securely for administrator compliance audits
      await supabase
        .from('activity_logs')
        .insert([
          {
            event_type: 'review_submitted',
            user_email: user.email,
            description: `Left a verified ${rating}-star evaluation profile for SACE registered tutor: ${booking.tutor_name}`
          }
        ]).catch((e) => console.warn('Activity logging fallback bypassed.', e));
      
      toast.success('Evaluation cataloged into marketplace matrices successfully!');
      onReviewed?.();
      onClose();
    } catch (error: any) {
      console.error('Review mutation submission error:', error);
      setErrorMessage(error.message || 'Database connection loss processing transactional metrics.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-100 animate-scaleUp">
        
        {/* Dynamic Modal Header Description Title */}
        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">Rate Professional Tutor Session</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Instructor: {booking.tutor_name} · {booking.subject}</p>
          </div>
          <Button 
            type="button"
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Dynamic Safety Exception Notification Alert Bar */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] font-bold flex items-start gap-2 animate-shake">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Interactive Star Rating Matrix Selector Core Elements */}
        <div className="flex flex-col items-center justify-center py-2 bg-slate-50/50 rounded-xl border border-slate-100/50">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(s => (
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
              >
                <Star className={`w-8 h-8 transition-colors stroke-[1.5] ${
                  s <= (hovered || rating) 
                    ? 'fill-amber-400 text-amber-500 drop-shadow-sm' 
                    : 'text-slate-300'
                }`} />
              </button>
            ))}
          </div>
          <div className="h-4 mt-2">
            {rating > 0 && (
              <p className="text-center text-xs font-black text-slate-500 uppercase tracking-wider">
                Rank: {['', 'Deficient Performance', 'Marginal Progress', 'Satisfactory Outcome', 'Very Competent', 'Exceptional Instruction'][rating]}
              </p>
            )}
          </div>
        </div>

        {/* Formatted Text Description Box */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Institutional Feedback Notes</label>
          <Textarea
            placeholder="Provide concise descriptive notes regarding the instructor's communication accuracy, pacing support, and CAPS topic clarity..."
            value={comment}
            disabled={isSubmitting}
            onChange={e => setComment(e.target.value.slice(0, 500))}
            className="resize-none h-24 text-xs font-medium bg-white border-slate-200 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-xl p-3"
          />
          <div className="text-right text-[9px] font-bold text-slate-400 uppercase tracking-wide">
            {comment.length} / 500 Characters Max
          </div>
        </div>

        {/* Action Trays Panel Controls */}
        <div className="flex gap-2 pt-2 border-t border-slate-50">
          <Button 
            type="button"
            onClick={handleValidateAndSubmit} 
            disabled={isSubmitting || rating === 0} 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 shadow-md gap-1.5 transition-transform transform active:scale-95"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Star className="w-4 h-4 fill-current text-white" />
            )}
            {isSubmitting ? 'Verifying Integrity...' : 'Publish Session Evaluation'}
          </Button>
          
          <Button 
            type="button"
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs h-9 rounded-xl bg-white"
          >
            Cancel
          </Button>
        </div>
        
      </div>
    </div>
  );
}
