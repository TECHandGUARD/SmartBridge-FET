import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Zap, ExternalLink, Play, AlertTriangle, Loader2, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function QuizSync({ simulation, isAdmin = false }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // States for adding new quizzes
  const [customCode, setCustomCode] = useState('');
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizTopic, setNewQuizTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAlignedQuizzes = useCallback(async () => {
    if (!simulation?.id) return;
    
    try {
      setLoading(true);
      setDbError(null);
      
      const { data, error } = await supabase
        .from('sim_quizzes')
        .select('*')
        .eq('simulation_id', simulation.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setDbError(err.message || 'Failed to retrieve aligned quizzes');
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }, [simulation?.id]);

  useEffect(() => {
    fetchAlignedQuizzes();
  }, [fetchAlignedQuizzes]);

  const handleLaunchGame = (code) => {
    if (!code) return;
    const cleanCode = code.trim().replace(/^https?:\/\/quizizz\.com\/join\?gc=/, '');
    const playerGatewayUrl = `https://quizizz.com/join?gc=${cleanCode}`;
    window.open(playerGatewayUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCreateQuizRecord = async (e) => {
    e.preventDefault();
    if (!customCode.trim() || !newQuizTitle.trim()) {
      toast.error('Please enter both title and Quizizz code');
      return;
    }

    try {
      setIsSubmitting(true);
      setDbError(null);
      const cleanCode = customCode.trim().replace(/^https?:\/\/quizizz\.com\/join\?gc=/, '');

      const { error } = await supabase
        .from('sim_quizzes')
        .insert({
          simulation_id: simulation.id,
          title: newQuizTitle.trim(),
          quizizz_code: cleanCode,
          topic_tag: newQuizTopic.trim() || simulation.caps_topic,
          grade_level: simulation.grade_level,
          subject_category: simulation.subject,
          is_active: true
        });

      if (error) throw error;

      toast.success('Quiz linked successfully!');
      setCustomCode('');
      setNewQuizTitle('');
      setNewQuizTopic('');
      setShowAddForm(false);
      await fetchAlignedQuizzes();
    } catch (err) {
      console.error('Error creating quiz record:', err);
      setDbError(err.message || 'Failed to save quiz association');
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuizRecord = async (quizId, quizTitle) => {
    if (!confirm(`Are you sure you want to delete "${quizTitle}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('sim_quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;
      
      toast.success('Quiz removed successfully');
      await fetchAlignedQuizzes();
    } catch (err) {
      console.error('Error deleting quiz:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <CardTitle className="text-base font-playfair flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Assessment Sync
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] ml-auto">
            Live Database
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        
        {/* Active Metadata Context */}
        <div className="bg-muted/30 p-3 rounded-xl border border-border text-xs flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground">CAPS Mapping</span>
            <span className="font-black text-primary">Grade {simulation?.grade_level} · {simulation?.subject}</span>
          </div>
          <p className="text-muted-foreground text-[11px]">
            Topic: <span className="font-medium text-foreground">{simulation?.caps_topic}</span>
          </p>
        </div>

        {/* Error Banner */}
        {dbError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] font-medium flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>{dbError}</div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-xs font-semibold text-muted-foreground">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span>Loading quizzes...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {quizzes.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed">
                No quizzes linked to this simulation yet.
                {isAdmin && ' Use the form below to add one.'}
              </p>
            ) : (
              quizzes.map(q => (
                <div key={q.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{q.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Code: {q.quizizz_code} · Topic: {q.topic_tag}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button 
                      type="button"
                      size="sm" 
                      onClick={() => handleLaunchGame(q.quizizz_code)}
                      className="h-7 text-[11px] font-bold bg-primary hover:bg-primary/90 text-white gap-1"
                    >
                      <Play className="w-3 h-3" /> Start
                    </Button>
                    
                    {isAdmin && (
                      <Button 
                        type="button"
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleDeleteQuizRecord(q.id, q.title)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Admin Add Form */}
        {isAdmin && (
          <div className="border-t border-border pt-4 mt-2">
            {!showAddForm ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddForm(true)}
                className="w-full gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Link New Quiz
              </Button>
            ) : (
              <form onSubmit={handleCreateQuizRecord} className="space-y-2.5">
                <span className="text-[11px] font-semibold text-foreground block">
                  Add Quiz to Database
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    required
                    className="text-xs h-8"
                    placeholder="Quiz title (e.g. Newton's Laws)"
                    value={newQuizTitle}
                    onChange={e => setNewQuizTitle(e.target.value)}
                  />
                  <Input
                    className="text-xs h-8"
                    placeholder="Topic tag (optional)"
                    value={newQuizTopic}
                    onChange={e => setNewQuizTopic(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Input
                    required
                    className="text-xs h-8 flex-1"
                    placeholder="Quizizz PIN or URL..."
                    value={customCode}
                    onChange={e => setCustomCode(e.target.value)}
                  />
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    size="sm" 
                    className="h-8 text-xs bg-primary gap-1"
                  >
                    {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {isSubmitting ? 'Linking...' : 'Link Quiz'}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
        
      </CardContent>
    </Card>
  );
}
