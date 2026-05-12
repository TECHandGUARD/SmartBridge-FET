import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Star, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SubjectTutors({ subjectName }) {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectName) return;
    
    const fetchTutors = async () => {
      setLoading(true);
      try {
        // Fetch all verified tutors
        const { data, error } = await supabase
          .from('tutor_profiles')
          .select('*')
          .eq('is_verified', true)
          .order('rating', { ascending: false });
        
        if (error) throw error;
        
        // Filter tutors that teach this subject
        // Since subjects might be stored as JSON array or comma-separated string
        const filtered = (data || []).filter(t => {
          if (t.subjects && Array.isArray(t.subjects)) {
            return t.subjects.includes(subjectName);
          }
          if (t.subjects && typeof t.subjects === 'string') {
            return t.subjects.toLowerCase().includes(subjectName.toLowerCase());
          }
          return false;
        });
        
        setTutors(filtered);
      } catch (error) {
        console.error('Error fetching subject tutors:', error);
        toast.error('Failed to load tutors');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTutors();
  }, [subjectName]);

  if (loading) return null;
  if (tutors.length === 0) return null;

  return (
    <Card className="border-border mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Tutors for this Subject
          </CardTitle>
          <Link to="/tutors" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          {tutors.slice(0, 4).map(tutor => (
            <div key={tutor.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                {tutor.full_name?.[0]?.toUpperCase() || 'T'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold truncate">{tutor.full_name}</p>
                  {tutor.is_verified && <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {tutor.rating && (
                    <span className="text-xs flex items-center gap-0.5 text-muted-foreground">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {Number(tutor.rating).toFixed(1)}
                    </span>
                  )}
                  {tutor.hourly_rate && (
                    <span className="text-xs text-muted-foreground">R{tutor.hourly_rate}/hr</span>
                  )}
                </div>
              </div>
              {tutor.user_email && (
                <a href={`mailto:${tutor.user_email}`}>
                  <Button size="icon" variant="outline" className="h-8 w-8">
                    <Mail className="w-3.5 h-3.5" />
                  </Button>
                </a>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}