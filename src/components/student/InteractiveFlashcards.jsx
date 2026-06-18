import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookMarked, RotateCcw, CheckCircle, XCircle, Loader2, Info, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const SUBJECT_OPTIONS = [
  { code: 'Mathematics', name: 'Mathematics' },
  { code: 'Physical Sciences', name: 'Physical Sciences' },
  { code: 'Life Sciences', name: 'Life Sciences' },
  { code: 'Accounting', name: 'Accounting' },
  { code: 'Economics', name: 'Economics' },
  { code: 'History', name: 'History' },
  { code: 'Geography', name: 'Geography' },
  { code: 'Business Studies', name: 'Business Studies' },
];

export default function InteractiveFlashcards({ studentEmail }) {
  const [subject, setSubject] = useState('Mathematics');
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState([]);
  const [reviewIds, setReviewIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  const loadFlashcards = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('flashcards')
        .select('id, subject, front, back, is_active')
        .eq('subject', subject)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setCards(data || []);
      setSessionComplete(false);
      setIndex(0);
      setKnownIds([]);
      setReviewIds([]);
      setFlipped(false);
    } catch (err) {
      console.error('Error loading flashcards:', err);
      toast.error('Failed to sync active flashcard modules.');
    } finally {
      setLoading(false);
    }
  }, [subject]);

  useEffect(() => {
    loadFlashcards();
  }, [loadFlashcards]);

  const logWeakConcept = useCallback(async (flashcardId) => {
    if (!studentEmail) return;
    
    try {
      const { error } = await supabase
        .from('weak_concepts')
        .insert({
          student_email: studentEmail,
          flashcard_id: flashcardId,
          subject_tag: subject,
          attempted_at: new Date().toISOString()
        });
      
      if (error) console.error('Failed to log weak concept:', error);
    } catch (err) {
      console.error('Error logging weak concept:', err);
    }
  }, [studentEmail, subject]);

  const syncSetCompletion = useCallback(async (finalKnownCount) => {
    if (!studentEmail) return;
    
    try {
      setIsSyncing(true);
      
      // Log to student_analytics
      const { error: analyticsError } = await supabase
        .from('student_analytics')
        .insert({
          student_email: studentEmail,
          activity_type: 'Flashcards',
          meta_label: subject,
          score_achieved: finalKnownCount,
          total_possible: cards.length,
          completed_at: new Date().toISOString()
        });
      
      if (analyticsError) console.error('Analytics error:', analyticsError);
      
      // Also update student_progress for gamification
      const { error: progressError } = await supabase
        .from('student_progress')
        .upsert({
          user_email: studentEmail,
          subject: subject,
          study_sessions: 1,
          last_access: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_email,subject'
        });
      
      if (progressError) console.error('Progress update error:', progressError);
      
      toast.success(`Flashcard session complete! ${finalKnownCount}/${cards.length} mastered.`);
    } catch (err) {
      console.error('Failed processing score analytics sync.', err);
    } finally {
      setIsSyncing(false);
    }
  }, [studentEmail, subject, cards.length]);

  const handleNextCard = useCallback(async (knewCard) => {
    const currentCard = cards[index];
    if (!currentCard) return;

    // Track state by card ID strings
    if (knewCard) {
      setKnownIds(prev => [...prev, currentCard.id]);
    } else {
      setReviewIds(prev => [...prev, currentCard.id]);
      
      // PERMANENT TELEMETRY: Log weak concepts for teacher audits
      await logWeakConcept(currentCard.id);
    }

    setFlipped(false);

    // FIXED: Strict safety boundary check - prevent race condition
    const isLastCard = index >= cards.length - 1;
    
    if (!isLastCard) {
      // Move to next card
      setTimeout(() => {
        setIndex(prev => prev + 1);
      }, 150);
    } else {
      // Session complete - sync final results
      const finalKnownCount = knownIds.length + (knewCard ? 1 : 0);
      await syncSetCompletion(finalKnownCount);
      setSessionComplete(true);
    }
  }, [cards, index, knownIds.length, logWeakConcept, syncSetCompletion]);

  const handleResetDeck = () => {
    setIndex(0);
    setFlipped(false);
    setKnownIds([]);
    setReviewIds([]);
    setSessionComplete(false);
    toast.info('Flashcard session reset. Starting fresh!');
  };

  const totalCardsCount = cards.length;
  const processedCount = knownIds.length + reviewIds.length;
  const isFinished = sessionComplete || (processedCount >= totalCardsCount && totalCardsCount > 0);
  const activeCard = !isFinished && totalCardsCount > 0 && index < totalCardsCount ? cards[index] : null;
  const progressPercent = totalCardsCount > 0 ? (processedCount / totalCardsCount) * 100 : 0;

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading flashcards...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-lg max-w-xl mx-auto bg-card">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" /> Retrieval Practice Lab
          </CardTitle>
          
          <div className="flex items-center gap-2 ml-auto">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_OPTIONS.map(s => (
                  <SelectItem key={s.code} value={s.code} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {!isFinished && totalCardsCount > 0 && (
              <Badge variant="secondary" className="text-[10px] font-bold px-2 h-6">
                Card {index + 1} of {totalCardsCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-5">
        {totalCardsCount === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-2xl bg-muted/20">
            <BookMarked className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">Deck Empty</p>
            <p className="text-xs mt-0.5 max-w-xs mx-auto">
              No flashcards available for {subject} yet.
            </p>
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Session Progress</span>
                <span>{processedCount}/{totalCardsCount} cards</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-300" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </div>

            {isFinished ? (
              /* Session Complete View */
              <div className="text-center py-10 space-y-4 animate-fadeIn">
                <div className="text-5xl select-none">🎯</div>
                <div>
                  <h4 className="font-extrabold text-foreground text-lg">Active Recall Completed!</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Performance recorded for teacher review.
                  </p>
                </div>
                
                <div className="flex justify-center gap-3 max-w-xs mx-auto pt-1">
                  <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 flex-1 text-center">
                    <p className="text-lg font-black text-green-700 leading-none">{knownIds.length}</p>
                    <p className="text-[10px] font-bold text-green-600/80 mt-1 uppercase tracking-wider flex items-center justify-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Mastered
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 flex-1 text-center">
                    <p className="text-lg font-black text-red-700 leading-none">{reviewIds.length}</p>
                    <p className="text-[10px] font-bold text-red-600/80 mt-1 uppercase tracking-wider flex items-center justify-center gap-1">
                      <XCircle className="w-3 h-3" /> Needs Review
                    </p>
                  </div>
                </div>
                
                {reviewIds.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    Weak concepts have been logged for your teacher's review.
                  </div>
                )}
                
                <Button 
                  type="button"
                  onClick={handleResetDeck} 
                  className="bg-primary hover:bg-primary/90 gap-1.5 text-xs font-bold px-4 h-9"
                >
                  <RotateCcw className="w-4 h-4" /> Practice Again
                </Button>
              </div>
            ) : (
              <>
                {/* Flashcard */}
                <div
                  className="relative w-full cursor-pointer select-none"
                  style={{ minHeight: '190px' }}
                  onClick={() => setFlipped(!flipped)}
                >
                  <div className={`w-full rounded-2xl border-2 p-6 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[190px] shadow-sm ${
                    flipped 
                      ? 'bg-primary/5 border-primary/30 shadow-inner' 
                      : 'bg-card border-border hover:border-primary/40 hover:shadow-md'
                  }`}>
                    <Badge variant="outline" className={`mb-4 text-[9px] font-bold tracking-wider uppercase py-0 px-2 shadow-sm ${
                      flipped 
                        ? 'bg-primary/10 text-primary border-primary/20' 
                        : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {flipped ? '📖 Answer' : '❓ Question — tap to reveal'}
                    </Badge>
                    <p className={`text-sm md:text-base leading-relaxed px-2 max-w-sm transition-all duration-200 ${
                      flipped ? 'text-primary font-bold' : 'text-foreground font-semibold'
                    }`}>
                      {activeCard ? (flipped ? activeCard.back : activeCard.front) : ''}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                {flipped ? (
                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      variant="outline"
                      className="flex-1 gap-1.5 text-xs font-bold text-red-700 border-red-200 hover:bg-red-50 h-9 rounded-xl"
                      onClick={() => handleNextCard(false)}
                    >
                      <XCircle className="w-4 h-4" /> Still Learning
                    </Button>
                    <Button 
                      type="button"
                      className="flex-1 gap-1.5 text-xs font-bold bg-green-600 hover:bg-green-700 text-white h-9 rounded-xl shadow-md transition-transform transform active:scale-95"
                      onClick={() => handleNextCard(true)}
                    >
                      <CheckCircle className="w-4 h-4" /> Got It!
                    </Button>
                  </div>
                ) : (
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full text-xs font-bold border-border text-foreground hover:text-primary hover:border-primary/30 h-9 bg-card rounded-xl transition-all"
                    onClick={() => setFlipped(true)}
                  >
                    Flip to Reveal Answer
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
