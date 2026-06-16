import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { GraduationCap, BookOpen, Calendar, Download, Bot, Sparkles, ClipboardList, Zap, GitCompareArrows, CalendarCheck, Loader2 } from 'lucide-react';
import usePremiumAccess from '@/hooks/usePremiumAccess';
import TrialBanner from '@/components/ui/TrialBanner';
import ApplicationTracker from '@/components/opportunities/ApplicationTracker';
import UniversityComparison from '@/components/opportunities/UniversityComparison';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import PremiumGate from '@/components/opportunities/PremiumGate';
import UniversityDirectory from '@/components/opportunities/UniversityDirectory';
import NBTResources from '@/components/opportunities/NBTResources';
import NBTPrepPlanner from '@/components/opportunities/NBTPrepPlanner';
import NBTScheduler from '@/components/opportunities/NBTScheduler';
import DeadlinesCalendar from '@/components/opportunities/DeadlinesCalendar';
import PDFGuides from '@/components/opportunities/PDFGuides';
import ProspectusLibrary from '@/components/opportunities/ProspectusLibrary';
import AIAssistantChat from '@/components/opportunities/AIAssistantChat';
import { toast } from 'sonner';

export default function StudentOpportunities() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [prospectusUrls, setProspectusUrls] = useState([]);
  const [error, setError] = useState(null);

  const loadUserData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Load prospectuses
      const { data, error: prospectusError } = await supabase
        .from('university_prospectuses')
        .select('file_url')
        .order('year', { ascending: false })
        .limit(20);

      if (prospectusError) throw prospectusError;
      
      const urls = (data || [])
        .map(p => p.file_url)
        .filter(Boolean);
      
      setProspectusUrls(urls);
    } catch (err) {
      console.error('Error loading student opportunities:', err);
      setError('Failed to load opportunities data');
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const isAdmin = user?.role === 'admin';
  const { isPremium: hasPremiumAccess, isOnTrial, trialDaysLeft } = usePremiumAccess(user);
  const isPremium = isAdmin || hasPremiumAccess;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-red-500 font-medium mb-4">{error}</p>
          <button 
            onClick={loadUserData}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const prospectusYear = currentYear + 1;

  return (
    <div className="min-h-screen bg-background">
      {isOnTrial && <TrialBanner trialDaysLeft={trialDaysLeft} />}
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary via-green-dark to-navy text-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold font-playfair">Student Opportunities</h1>
                <Badge className="bg-gold text-navy font-semibold gap-1">
                  <Sparkles className="w-3 h-3" /> Premium
                </Badge>
              </div>
              <p className="text-white/70 text-sm">Your complete guide to university applications and NBT preparation</p>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap mt-4 text-sm text-white/80">
            <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4" /> 14+ Universities</span>
            <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {prospectusYear} Prospectuses</span>
            <span className="flex items-center gap-1.5"><Bot className="w-4 h-4" /> AI-Powered Guidance</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {!isPremium ? (
          <PremiumGate />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="universities">
                <TabsList className="w-full mb-6 flex flex-wrap h-auto gap-1 bg-muted p-1">
                  <TabsTrigger value="universities" className="flex items-center gap-1.5 text-xs flex-1">
                    <GraduationCap className="w-3.5 h-3.5" /> Universities
                  </TabsTrigger>
                  <TabsTrigger value="nbt" className="flex items-center gap-1.5 text-xs flex-1">
                    <BookOpen className="w-3.5 h-3.5" /> NBT Prep
                  </TabsTrigger>
                  <TabsTrigger value="nbt-planner" className="flex items-center gap-1.5 text-xs flex-1">
                    <Zap className="w-3.5 h-3.5" /> NBT Planner
                  </TabsTrigger>
                  <TabsTrigger value="prospectuses" className="flex items-center gap-1.5 text-xs flex-1">
                    <BookOpen className="w-3.5 h-3.5" /> Prospectuses
                  </TabsTrigger>
                  <TabsTrigger value="deadlines" className="flex items-center gap-1.5 text-xs flex-1">
                    <Calendar className="w-3.5 h-3.5" /> Deadlines
                  </TabsTrigger>
                  <TabsTrigger value="guides" className="flex items-center gap-1.5 text-xs flex-1">
                    <Download className="w-3.5 h-3.5" /> PDF Guides
                  </TabsTrigger>
                  <TabsTrigger value="tracker" className="flex items-center gap-1.5 text-xs flex-1">
                    <ClipboardList className="w-3.5 h-3.5" /> My Applications
                  </TabsTrigger>
                  <TabsTrigger value="nbt-schedule" className="flex items-center gap-1.5 text-xs flex-1">
                    <CalendarCheck className="w-3.5 h-3.5" /> NBT Schedule
                  </TabsTrigger>
                  <TabsTrigger value="compare" className="flex items-center gap-1.5 text-xs flex-1">
                    <GitCompareArrows className="w-3.5 h-3.5" /> Compare
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="universities">
                  <UniversityDirectory />
                </TabsContent>

                <TabsContent value="nbt">
                  <NBTResources />
                </TabsContent>

                <TabsContent value="nbt-planner">
                  <NBTPrepPlanner userEmail={user?.email} />
                </TabsContent>

                <TabsContent value="prospectuses">
                  <ProspectusLibrary isAdmin={isAdmin} />
                </TabsContent>

                <TabsContent value="deadlines">
                  <DeadlinesCalendar isAdmin={isAdmin} />
                </TabsContent>

                <TabsContent value="guides">
                  <PDFGuides isAdmin={isAdmin} />
                </TabsContent>

                <TabsContent value="tracker">
                  <ApplicationTracker userEmail={user?.email} />
                </TabsContent>

                <TabsContent value="nbt-schedule">
                  <NBTScheduler userEmail={user?.email} isAdmin={isAdmin} />
                </TabsContent>

                <TabsContent value="compare">
                  <UniversityComparison userEmail={user?.email} />
                </TabsContent>
              </Tabs>
            </div>

            {/* AI Assistant Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 bg-card border rounded-xl p-4 shadow-sm">
                <AIAssistantChat prospectusUrls={prospectusUrls} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}