import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import SimulationCard from './SimulationCard';
import SimulationPlayer from './SimulationPlayer';
import QuizSync from './QuizSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FlaskConical, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const SUBJECT_OPTIONS = ['All', 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Physical Sciences'];
const GRADE_OPTIONS = ['All Grades', 'Grade 10', 'Grade 11', 'Grade 12'];

export default function SimulationLab({ isTutor = false }) {
  const [simulations, setSimulations] = useState([]);
  const [filteredSims, setFilteredSims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All Grades');
  const [activeSim, setActiveSim] = useState(null);

  const fetchSimulations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('simulations')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      
      setSimulations(data || []);
    } catch (err) {
      console.error('Error fetching simulations:', err);
      setError(err.message || 'Failed to load simulations');
      toast.error('Failed to load simulations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  useEffect(() => {
    let result = [...simulations];

    if (selectedSubject !== 'All') {
      result = result.filter(s => s.subject === selectedSubject);
    }

    if (selectedGrade !== 'All Grades') {
      const numericalGrade = parseInt(selectedGrade.replace('Grade ', ''));
      result = result.filter(s => s.grade_level === numericalGrade);
    }

    setFilteredSims(result);
  }, [selectedSubject, selectedGrade, simulations]);

  const handlePlay = (sim) => {
    setActiveSim(sim);
  };

  const handleRetry = () => {
    fetchSimulations();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 p-1">
      
      {/* Simulation Overlay Player */}
      {activeSim && (
        <SimulationPlayer
          simulation={activeSim}
          isTutor={isTutor}
          onClose={() => setActiveSim(null)}
        />
      )}

      <Card className="border-border shadow-xl bg-card">
        <CardHeader className="pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between flex-wrap gap-4">
            
            <CardTitle className="text-lg font-playfair flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" /> Science Simulation Lab
              {isTutor && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                  Tutor Mode
                </Badge>
              )}
            </CardTitle>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              
              {/* Subject Filters */}
              <div className="flex rounded-xl overflow-hidden border border-border bg-card p-0.5 shadow-sm">
                {SUBJECT_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSubject(s)}
                    className={`px-3 py-1.5 text-[11px] font-bold transition-all rounded-lg ${
                      selectedSubject === s
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground bg-transparent hover:bg-muted'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Grade Filters */}
              <div className="flex rounded-xl overflow-hidden border border-border bg-card p-0.5 shadow-sm">
                {GRADE_OPTIONS.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGrade(g)}
                    className={`px-3 py-1.5 text-[11px] font-bold transition-all rounded-lg ${
                      selectedGrade === g
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground bg-transparent hover:bg-muted'
                    }`}
                  >
                    {g === 'All Grades' ? 'All' : g.replace('Grade ', 'G')}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleRetry}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          
          {/* Error Banner */}
          {error && (
            <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-semibold flex items-center justify-between">
              <span>Error: {error}</span>
              <button onClick={handleRetry} className="text-primary hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground font-bold text-xs">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span>Loading simulations...</span>
            </div>
          ) : (
            <>
              {/* Simulations Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredSims.map(sim => (
                  <SimulationCard 
                    key={sim.id} 
                    simulation={sim} 
                    onPlay={handlePlay} 
                  />
                ))}
              </div>

              {/* Empty State */}
              {filteredSims.length === 0 && (
                <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/20">
                  <FlaskConical className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm font-semibold text-foreground">No simulations match these filters</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-0.5">
                    Try adjusting your subject or grade selection
                  </p>
                </div>
              )}

              {/* Quiz Sync for Tutors - Fixed to use first filtered simulation */}
              {isTutor && filteredSims.length > 0 && (
                <div className="mt-8 border-t border-border pt-6">
                  <div className="mb-4 bg-muted/30 p-3 rounded-xl border border-border">
                    <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Tutor Post-Lesson Assessment
                    </h5>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                      Quiz Sync is bound to "{filteredSims[0]?.title}" - the first simulation in your filtered results.
                    </p>
                  </div>
                  <QuizSync simulation={filteredSims[0]} isAdmin={isTutor} />
                </div>
              )}
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
