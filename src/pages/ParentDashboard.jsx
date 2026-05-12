import { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, TrendingUp, Star, ArrowRight, Mail, Phone } from 'lucide-react';
import ParentSummaryReport from '@/components/parent/ParentSummaryReport';
import WeeklyEmailReport from '@/components/parent/WeeklyEmailReport';
import ParentChildLink from '@/components/parent/ParentChildLink';
import ParentProgressDashboard from '@/components/parent/ParentProgressDashboard';

export default function ParentDashboard() {
  const { user, userProfile } = useOutletContext() || {};
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchTutors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('is_verified', true)
        .order('rating', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      setTutors(data || []);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh parent data when child link changes
  const refreshParentData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <Users className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold mb-2">Parent Dashboard</h2>
          <p className="text-muted-foreground mb-6">Please sign in to access the parent dashboard.</p>
          <Button onClick={() => window.location.href = '/login'} className="bg-primary">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-playfair text-3xl font-bold text-foreground">
            Parent Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Monitor your child's academic progress and connect with tutors.</p>
        </div>

        {/* Info cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Subjects Available', value: '11', icon: BookOpen, color: 'bg-primary/10 text-primary' },
            { label: 'Verified Tutors', value: tutors.length + '+', icon: Users, color: 'bg-blue-100 text-blue-700' },
            { label: 'Grades Covered', value: '10 – 12', icon: TrendingUp, color: 'bg-green-100 text-green-700' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border">
              <CardContent className="pt-5 pb-4">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="font-playfair text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Child link + Summary Report + Weekly Email */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <ParentChildLink user={user} userProfile={userProfile} onUpdate={refreshParentData} />
          <ParentSummaryReport key={refreshKey} user={user} userProfile={userProfile} />
          <WeeklyEmailReport parentUser={user} />
        </div>

        {/* Child Progress Dashboard */}
        <div className="mb-6">
          <ParentProgressDashboard user={user} userProfile={userProfile} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* CAPS Subjects Overview */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-playfair">CAPS Subjects Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {SUBJECTS.map((s) => (
                  <Link
                    key={s.code}
                    to={`/subjects/${s.code}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <span className="text-lg">{s.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.category}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Gr 10–12</Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tutors + Premium */}
          <div className="space-y-5">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-playfair">Top Tutors</CardTitle>
                  <Link to="/tutors" className="text-xs text-primary hover:underline">View all →</Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  [1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)
                ) : tutors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No verified tutors yet</p>
                ) : (
                  tutors.map((tutor) => (
                    <div key={tutor.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {tutor.full_name?.[0] || 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{tutor.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tutor.qualifications?.slice(0, 30)}</p>
                      </div>
                      {tutor.is_verified && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">✅ Verified</Badge>
                      )}
                    </div>
                  ))
                )}
                <Link to="/tutors">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2">
                    Find a Tutor <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium for child */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
              <Star className="w-6 h-6 fill-amber-400 text-amber-400 mb-2" />
              <p className="font-playfair font-bold text-lg text-foreground mb-1">Premium for Your Child</p>
              <p className="text-sm text-muted-foreground mb-3">
                Give your child access to all premium study materials, past papers and tutor notes — R50/month for parents.
              </p>
              <a href="https://pay.yoco.com/r/4jppyY" target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-primary hover:bg-primary/90 w-full">
                  Upgrade to Parent Premium — R50/month
                </Button>
              </a>
              <p className="text-xs text-muted-foreground mt-2">Use your email as reference. Activated by Admin within 60 min.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}