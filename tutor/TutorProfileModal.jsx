import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle, Star, GraduationCap, BookOpen, Mail,
  CalendarDays, MessageCircle, ShieldCheck, Award, Users
} from 'lucide-react';
import { toast } from 'sonner';

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

export default function TutorProfileModal({ tutor, user, open, onClose, onBook, onChat }) {
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    if (!tutor?.user_email || !open) return;
    fetchReviews();
  }, [tutor?.user_email, open]);

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from('tutor_reviews')
        .select('*')
        .eq('tutor_email', tutor.user_email)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoadingReviews(false);
    }
  };

  if (!tutor) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Avatar + name header */}
          <div className="flex items-start gap-4 pt-1">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl flex-shrink-0 overflow-hidden">
              {tutor.avatar_url
                ? <img src={tutor.avatar_url} alt={tutor.full_name} className="w-full h-full object-cover" />
                : tutor.full_name?.[0]?.toUpperCase() || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="font-playfair text-xl">{tutor.full_name}</DialogTitle>
                {tutor.is_verified && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {tutor.is_verified && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
                    <ShieldCheck className="w-3 h-3" /> SACE Verified
                  </Badge>
                )}
                {tutor.is_premium && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1">
                    <Award className="w-3 h-3" /> Premium Tutor
                  </Badge>
                )}
              </div>
              {tutor.rating && (
                <div className="flex items-center gap-2 mt-1.5">
                  <StarRating rating={tutor.rating} />
                  <span className="text-xs text-muted-foreground">
                    {Number(tutor.rating).toFixed(1)} ({tutor.total_reviews || reviews.length} review{tutor.total_reviews !== 1 ? 's' : ''})
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Rate */}
          {tutor.hourly_rate && (
            <div className="flex items-center justify-between bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
              <span className="text-sm font-medium">Hourly Rate</span>
              <span className="font-playfair text-xl font-bold text-primary">R{tutor.hourly_rate}<span className="text-sm font-normal text-muted-foreground">/hr</span></span>
            </div>
          )}

          {/* Bio */}
          {tutor.bio && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-1.5">
                <BookOpen className="w-4 h-4 text-primary" /> About
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{tutor.bio}</p>
            </div>
          )}

          <Separator />

          {/* Qualifications */}
          {tutor.qualifications && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-1.5">
                <GraduationCap className="w-4 h-4 text-primary" /> Qualifications
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{tutor.qualifications}</p>
            </div>
          )}

          {/* SACE number */}
          {tutor.sace_number && (
            <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
              <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-700 dark:text-green-400">SACE Registration Number</p>
                <p className="text-sm font-mono font-bold text-green-800 dark:text-green-300">{tutor.sace_number}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Subjects */}
          {tutor.subjects?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <BookOpen className="w-4 h-4 text-primary" /> Subjects
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {tutor.subjects.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Grades */}
          {tutor.grades?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <Users className="w-4 h-4 text-primary" /> Grades Taught
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {tutor.grades.map(g => (
                  <Badge key={g} className="bg-primary/10 text-primary border-primary/20 text-xs">{g}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {!loadingReviews && reviews.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                  <Star className="w-4 h-4 text-amber-500" /> Student Reviews
                </h3>
                <div className="space-y-2.5">
                  {reviews.map(r => (
                    <div key={r.id} className="bg-muted/40 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold">{r.student_name || r.student_email?.split('@')[0]}</p>
                        <StarRating rating={r.rating} />
                      </div>
                      {r.subject && <Badge variant="outline" className="text-[10px] px-1.5 py-0 mb-1">{r.subject}</Badge>}
                      {r.comment && <p className="text-xs text-muted-foreground italic">"{r.comment}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* CTA buttons */}
          <div className="flex gap-2 pt-1">
            {tutor.user_email && (
              <a href={`mailto:${tutor.user_email}`} className="flex-1">
                <Button variant="outline" className="w-full gap-1.5 text-sm h-10">
                  <Mail className="w-4 h-4" /> Email
                </Button>
              </a>
            )}
            <Button variant="outline" className="flex-1 gap-1.5 text-sm h-10" onClick={() => { onClose(); onChat(tutor); }}>
              <MessageCircle className="w-4 h-4" /> Chat
            </Button>
            <Button className="flex-1 gap-1.5 text-sm h-10 bg-primary" onClick={() => { onClose(); onBook(tutor); }}>
              <CalendarDays className="w-4 h-4" /> Book
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}