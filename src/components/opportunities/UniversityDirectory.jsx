import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ExternalLink, GraduationCap, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ============================================================
// Configuration
// ============================================================

const typeColors = {
  "Traditional": "bg-primary/10 text-primary",
  "Comprehensive": "bg-blue-100 text-blue-700",
  "Distance": "bg-purple-100 text-purple-700",
  "University of Technology": "bg-orange-100 text-orange-700",
};

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// Main Component
// ============================================================

export default function UniversityDirectory() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUniversities = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('university_directory')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      setUniversities(data || []);
    } catch (err) {
      console.error('Error loading universities:', err);
      setUniversities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUniversities();
  }, [loadUniversities]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (universities.length === 0) {
    return (
      <div className="text-center py-10">
        <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-muted-foreground">No universities available at the moment.</p>
        <p className="text-xs text-muted-foreground">Check back later for updates.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">South African Universities — Apply Now</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {universities.map((uni) => (
          <Card key={uni.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="font-medium text-sm text-foreground mb-1 leading-tight">{uni.name}</p>
              <p className="text-xs text-muted-foreground mb-2">{uni.province}</p>
              <div className="flex items-center justify-between">
                <Badge className={`text-xs ${typeColors[uni.type] || 'bg-muted text-muted-foreground'}`}>
                  {uni.type}
                </Badge>
                <a
                  href={uni.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  Apply <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
