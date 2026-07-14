import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import SimulationCard from './SimulationCard';
import SimulationPlayer from './SimulationPlayer';
import QuizSync from './QuizSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FlaskConical, Loader2, RefreshCw, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// Filter Options
// ============================================================

const SUBJECT_OPTIONS = ['All', 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Physical Sciences', 'Life Sciences'];
const GRADE_OPTIONS = ['All Grades', 'Grade 10', 'Grade 11', 'Grade 12'];

// ============================================================
// Main Component
// ============================================================

export default function SimulationLab({ isTutor = false, user = null }) {
  const [simulations, setSimulations] = useState([]);
  const [filteredSims, setFilteredSims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All Grades');
  const [activeSim, setActiveSim] = useState(null);
  const [showOnlyApproved, setShowOnlyApproved] = useState(true);

  // ============================================================
  // Fetch Simulations from Supabase
  // ============================================================

  const fetchSimulations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query
      let query = supabase
        .from('simulations')
        .select('*')
        .order('created_at', { ascending: false });

      // Only show approved simulations to non-admin users
      if (!isTutor && showOnlyApproved) {
        query = query.eq('is_approved', true);
      }

      const { data, error: dbError } = await query;

      if (dbError) throw dbError;
      
      setSimulations(data || []);
      
      // Log activity (non-PII)
      if (user?.email) {
        await supabase
          .from('activity_log')
          .insert({
            event_type: 'simulation_lab_viewed',
            user_email: user.email,
            user_id: user.id || null,
            description: 'Viewed simulation lab',
            metadata: {
              simulation_count: data?.length || 0,
              is_tutor: isTutor
            }
          })
          .catch(() => {}); // Silent fail for logging
      }

    } catch (err) {
      console.error('Error fetching simulations:', err);
      setError(err.message || 'Failed to load simulations');
      toast.error('Failed to load simulations');
    } finally {
      setLoading(false);
    }
  }, [isTutor, showOnlyApproved, user]);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  // ============================================================
  // Filter Simulations
  // ============================================================

  useEffect(() => {
    let result = [...simulations];

    // Filter by subject
    if (selectedSubject !== 'All') {
      result = result.filter(s => s.subject === selectedSubject);
    }

    // Filter by grade (parse "Grade 10" to number 10)
    if (selectedGrade !== 'All Grades') {
      const numericalGrade = parseInt(selectedGrade.replace('Grade ', ''));
      if (!isNaN(numericalGrade)) {
        result = result.filter(s => s.grade_level === numericalGrade);
      }
    }

    setFilteredSims(result);
  }, [selectedSubject, selectedGrade, simulations]);

  // ============================================================
  // Event Handlers
  // ============================================================

  const handlePlay = (sim) => {
    // Validate simulation URL before launching
    if (!sim.simulation_url) {
      toast.error('This simulation has no URL configured.');
      return;
    }
    
    // Basic URL safety check
    try {
      const url = new URL(sim.simulation_url);
      const approvedDomains = [
        'phet.colorado.edu',
        'www.geogebra.org',
        'www.desmos.com',
        'www.siyavula.com',
        'www.mindsetlearn.co.za',
        'www.2enable.org',
        'learningportal.dbe.gov.za',
        'resources.sace.org.za',
        'quizizz.com',
        'youtu.be',
        'www.youtube.com'
      ];
      
      const isSafe = approvedDomains.some(domain => 
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );
      
      if (!isSafe && !isTutor) {
        toast.error('This simulation content is not from an approved educational source.');
        return;
      }
    } catch {
      toast.error('Invalid simulation URL.');
      return;
    }

    setActiveSim(sim);
  };

  const handleRetry = () => {
    fetchSimulations();
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 p-1">
      
      {/* Simulation Overlay Player */}
      {activeSim && (
        <SimulationPlayer
          simulation={activeSim}
          isTutor={isTutor}
          user={user}
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
              {!isTutor && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3 text-green-500" /> Verified Content
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
                    disabled={loading}
                  >
                    {s === 'All' ? 'All' : s}
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
                    disabled={loading}
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
                title="Refresh simulations"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {/* Simulation Count */}
          {!loading && !error && (
            <div className="text-[11px] text-muted-foreground mt-1">
              {filteredSims.length} simulation{filteredSims.length !== 1 ? 's' : ''} available
              {selectedSubject !== 'All' && ` · ${selectedSubject}`}
              {selectedGrade !== 'All Grades' && ` · ${selectedGrade}`}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="pt-6">
          
          {/* Error Banner */}
          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>Error: {error}</span>
              </div>
              <button 
                onClick={handleRetry} 
                className="text-primary hover:underline flex items-center gap-1 font-medium"
              >
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
                    showApprovalStatus={isTutor}
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
                  {isTutor && (
                    <p className="text-xs text-muted-foreground mt-2">
                      As a tutor, you can add new simulations via the admin panel.
                    </p>
                  )}
                </div>
              )}

              {/* Quiz Sync for Tutors */}
              {isTutor && filteredSims.length > 0 && (
                <div className="mt-8 border-t border-border pt-6">
                  <div className="mb-4 bg-muted/30 p-3 rounded-xl border border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          📝 Tutor Post-Lesson Assessment
                        </h5>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                          Quiz Sync is bound to "<span className="font-medium text-foreground">{filteredSims[0]?.title}</span>" - the first simulation in your filtered results.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {filteredSims.length} simulation{filteredSims.length !== 1 ? 's' : ''} available
                      </Badge>
                    </div>
                  </div>
                  <QuizSync 
                    simulation={filteredSims[0]} 
                    isAdmin={isTutor}
                    user={user}
                  />
                </div>
              )}
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
