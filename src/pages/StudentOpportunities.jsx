// src/pages/StudentOpportunities.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import {
  GraduationCap, BookOpen, Calendar, Download, Bot, Sparkles,
  ClipboardList, Zap, GitCompareArrows, CalendarCheck, Loader2, AlertCircle, RefreshCw, Star
} from 'lucide-react';
import usePremiumAccess from '@/hooks/usePremiumAccess';
import TrialBanner from '@/components/ui/TrialBanner';
import ApplicationTracker from '@/components/opportunities/ApplicationTracker';
import UniversityComparison from '@/components/opportunities/UniversityComparison';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // App name
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',

  // University count display
  UNIVERSITY_COUNT: Number(import.meta.env.VITE_OPPORTUNITIES_UNIVERSITY_COUNT) || 14,

  // Feature flags
  ENABLE_AI_CHAT: import.meta.env.VITE_ENABLE_OPPORTUNITIES_AI !== 'false',

  // Messages
  MESSAGES: {
    LOAD_FAILED: import.meta.env.VITE_OPPORTUNITIES_LOAD_FAILED_MSG || 'Failed to load opportunities data. Please try again.',
    TITLE: import.meta.env.VITE_OPPORTUNITIES_TITLE || 'Student Opportunities',
    SUBTITLE: import.meta.env.VITE_OPPORTUNITIES_SUBTITLE || 'Your complete guide to university applications and NBT preparation',
    UNIVERSITIES_LABEL: import.meta.env.VITE_OPPORTUNITIES_UNIVERSITIES_LABEL || 'Universities',
    PROSPECTUS_LABEL: import.meta.env.VITE_OPPORTUNITIES_PROSPECTUS_LABEL || 'Prospectuses',
    AI_LABEL: import.meta.env.VITE_OPPORTUNITIES_AI_LABEL || 'AI-Powered Guidance',
    PREMIUM_TAG: import.meta.env.VITE_OPPORTUNITIES_PREMIUM_TAG || 'Premium',
  },
};

// ============================================================
// Sub-Components
// ============================================================

function HeroStats({ universityCount, prospectusYear, isPremium }) {
  const stats = [
    { icon: GraduationCap, label: CONFIG.MESSAGES.UNIVERSITIES_LABEL, value: `${universityCount}+` },
    { icon: BookOpen, label: CONFIG.MESSAGES.PROSPECTUS_LABEL, value: prospectusYear },
    { icon: Bot, label: CONFIG.MESSAGES.AI_LABEL, value: 'AI-Powered' },
  ];

  return (
    <div className="flex gap-4 flex-wrap mt-4 text-sm text-white/80">
      {stats.map((stat, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <stat.icon className="w-4 h-4" />
          {stat.value}
        </span>
      ))}
      {isPremium && (
        <Badge className="bg-gold text-navy font-semibold gap-1">
          <Star className="w-3 h-3 fill-current" /> Premium
        </Badge>
      )}
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium mb-4">{error}</p>
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground animate-pulse">Loading opportunities...</p>
    </div>
  );
}

// ============================================================
// Tab Configuration
// ============================================================

const TABS = [
  { id: 'universities', label: 'Universities', icon: GraduationCap },
  { id: 'nbt', label: 'NBT Prep', icon: BookOpen },
  { id: 'nbt-planner', label: 'NBT Planner', icon: Zap },
  { id: 'prospectuses', label: 'Prospectuses', icon: BookOpen },
  { id: 'deadlines', label: 'Deadlines', icon: Calendar },
  { id: 'guides', label: 'PDF Guides', icon: Download },
  { id: 'tracker', label: 'My Applications', icon: ClipboardList },
  { id: 'nbt-schedule', label: 'NBT Schedule', icon: CalendarCheck },
  { id: 'compare', label: 'Compare', icon: GitCompareArrows },
];

// ============================================================
// Main Component
// ============================================================

export default function StudentOpportunities() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [prospectusUrls, setProspectusUrls] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('universities');

  // ============================================================
  // Load Data
  // ============================================================

  const loadUserData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
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
      setError(CONFIG.MESSAGES.LOAD_FAILED);
      toast.error(CONFIG.MESSAGES.LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // ============================================================
  // Computed Values
  // ============================================================

  const isAdmin = user?.role === 'admin';
  const { isPremium: hasPremiumAccess, isOnTrial, trialDaysLeft } = usePremiumAccess(user);
  const isPremium = isAdmin || hasPremiumAccess;

  const currentYear = new Date().getFullYear();
  const prospectusYear = currentYear + 1;
  const universityCount = CONFIG.UNIVERSITY_COUNT;

  // ============================================================
  // Render States
  // ============================================================

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadUserData} />;
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-background">
      {isOnTrial && <TrialBanner trialDaysLeft={trialDaysLeft} />}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary via-green-dark to-navy text-white py-10 px-4 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full blur-3xl" />

        <div className="max-w-6xl mx-auto relative">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold font-playfair">
                  {CONFIG.MESSAGES.TITLE}
                </h1>
                <Badge className="bg-amber-400 text-navy font-semibold gap-1">
                  <Sparkles className="w-3 h-3" /> {CONFIG.MESSAGES.PREMIUM_TAG}
                </Badge>
              </div>
              <p className="text-white/80 text-sm mt-0.5">
                {CONFIG.MESSAGES.SUBTITLE}
              </p>
              <HeroStats
                universityCount={universityCount}
                prospectusYear={prospectusYear}
                isPremium={isPremium}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {!isPremium ? (
          <PremiumGate />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="universities" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full mb-6 flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
                  {TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-1.5 text-xs flex-1 min-w-[80px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
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
            {CONFIG.ENABLE_AI_CHAT && (
              <div className="lg:col-span-1">
                <div className="sticky top-4">
                  <div className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">AI Assistant</p>
                        <p className="text-[10px] text-muted-foreground">Powered by AI</p>
                      </div>
                    </div>
                    <AIAssistantChat prospectusUrls={prospectusUrls} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
