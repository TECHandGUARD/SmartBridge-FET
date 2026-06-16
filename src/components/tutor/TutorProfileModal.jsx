import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  CheckCircle, Star, GraduationCap, BookOpen, Mail,
  CalendarDays, MessageCircle, ShieldCheck, Award, Users, Sparkles, Globe, Video, User as UserIcon
} from 'lucide-react';
import { toast } from 'sonner';

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );
}

export default function TutorProfileModal({ tutor, user, open, onClose, onBook, onChat }) {
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [error, setError] = useState(null);

  const loadReviews = useCallback(async () => {
    if (!tutor?.user_email || !open) return;
    
    setLoadingReviews(true);
    setError(null);
    try {
      const { data, error: reviewsError } = await supabase
        .from('tutor_reviews')
        .select('*')
        .eq('tutor_email', tutor.user_email)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (reviewsError) throw reviewsError;
      setReviews(data || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setError('Failed to load reviews');
      toast.error('Failed to load reviews');
    } finally {
      setLoadingReviews(false);
    }
  }, [tutor?.user_email, open]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const getQualificationsArray = (qualifications) => {
    if (!qualifications) return [];
    if (Array.isArray(qualifications)) return qualifications;
    if (typeof qualifications === 'string') {
      if (qualifications.includes(',')) return qualifications.split(',').map(q => q.trim());
      return [qualifications];
    }
    return [];
  };

  const getSpecializationsArray = (specializations) => {
    if (!specializations) return [];
    if (Array.isArray(specializations)) return specializations;
    if (typeof specializations === 'string') {
      if (specializations.includes(',')) return specializations.split(',').map(s => s.trim());
      return [specializations];
    }
    return [];
  };

  if (!tutor) return null;

  const qualificationsList = getQualificationsArray(tutor.qualifications);
  const specializationsList = getSpecializationsArray(tutor.specializations);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4 pt-1">
            {/* Avatar with real photo */}
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl flex-shrink-0 overflow-hidden">
              {tutor.avatar_url ? (
                <img src={tutor.avatar_url} alt={tutor.full_name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="font-playfair text-xl">{tutor.full_name}</DialogTitle>
                {tutor.is_verified && (
                  tutor.sace_number ? (
                    <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {tutor.is_verified && (
                  tutor.sace_number ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
                      <ShieldCheck className="w-3 h-3" /> SACE Verified
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs gap-1">
                      <CheckCircle className="w-3 h-3" /> Admin Verified
                    </Badge>
                  )
                )}
                {tutor.is_premium && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1">
                    <Award className="w-3 h-3" /> Premium Tutor
                  </Badge>
                )}
              </div>
              {tutor.rating && tutor.rating > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <StarRating rating={tutor.rating} />
                  <span className="text-xs text-muted-foreground">
                    {tutor.rating.toFixed(1)} ({tutor.total_reviews || reviews.length} review{reviews.length !== 1 ? 's' : ''})
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Introduction Video */}
          {tutor.video_url && (
            <div className="bg-muted/20 rounded-xl p-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <Video className="w-4 h-4 text-primary" /> Meet {tutor.full_name?.split(' ')[0]}
              </h3>
              <video src={tutor.video_url} controls className="w-full rounded-xl border border-border" poster={tutor.avatar_url || undefined} />
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Watch this short intro to learn about {tutor.full_name?.split(' ')[0]}'s teaching style
              </p>
            </div>
          )}

          {/* Hourly Rate */}
          {tutor.hourly_rate && (
            <div className="flex items-center justify-between bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
              <span className="text-sm font-medium">Hourly Rate</span>
              <span className="font-playfair text-xl font-bold text-primary">
                R{tutor.hourly_rate}<span className="text-sm font-normal text-muted-foreground">/hr</span>
              </span>
            </div>
          )}

          {/* Bio */}
          {tutor.bio && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-1.5">
                <BookOpen className="w-4 h-4 text-primary" /> About Me
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{tutor.bio}</p>
            </div>
          )}

          <Separator />

          {/* Academic Background */}
          {(tutor.institution || tutor.study_field) && (
            <div className="bg-muted/40 rounded-xl px-4 py-3 flex items-start gap-3">
              <GraduationCap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                {tutor.institution && <p className="text-sm font-semibold">{tutor.institution}</p>}
                {tutor.study_field && <p className="text-xs text-muted-foreground">{tutor.study_field}{tutor.study_year ? ` · ${tutor.study_year}` : ''}</p>}
              </div>
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

          {/* Qualifications */}
          {qualificationsList.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <GraduationCap className="w-4 h-4 text-primary" /> Qualifications
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {qualificationsList.map((q, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">🎓 {q}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Specializations */}
          {specializationsList.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4 text-primary" /> Specializations
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {specializationsList.map((s, i) => (
                  <Badge key={i} className="bg-primary/10 text-primary border-primary/20 text-xs">✨ {s}</Badge>
                ))}
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

          {/* Teaching Languages */}
          {tutor.teaching_languages?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <Globe className="w-4 h-4 text-primary" /> Teaching Languages
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {tutor.teaching_languages.map(l => (
                  <Badge key={l} className="bg-amber-100 text-amber-700 border-amber-200 text-xs">🌍 {l}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Section */}
          {loadingReviews && (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">Loading reviews...</p>
            </div>
          )}

          {error && !loadingReviews && (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={loadReviews}>
                Retry
              </Button>
            </div>
          )}

          {!loadingReviews && !error && reviews.length > 0 && (
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

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            {tutor.user_email && (
              <a href={`mailto:${tutor.user_email}`} className="flex-1">
                <Button variant="outline" className="w-full gap-1.5 text-sm h-10">
                  <Mail className="w-4 h-4" /> Email
                </Button>
              </a>
            )}
            <Button 
              variant="outline" 
              className="flex-1 gap-1.5 text-sm h-10" 
              onClick={() => { onClose(); onChat(tutor); }}
            >
              <MessageCircle className="w-4 h-4" /> Chat
            </Button>
            <Button 
              className="flex-1 gap-1.5 text-sm h-10 bg-primary" 
              onClick={() => { onClose(); onBook(tutor); }}
            >
              <CalendarDays className="w-4 h-4" /> Book
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}