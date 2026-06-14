import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ExternalLink, GraduationCap, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const FALLBACK_UNIVERSITIES = [
  { name: "University of Cape Town (UCT)", url: "https://www.uct.ac.za/apply", province: "Western Cape", type: "Traditional" },
  { name: "University of the Witwatersrand (Wits)", url: "https://www.wits.ac.za/apply", province: "Gauteng", type: "Traditional" },
  { name: "University of Pretoria (UP)", url: "https://www.up.ac.za/apply", province: "Gauteng", type: "Traditional" },
  { name: "Stellenbosch University (SU)", url: "https://www.sun.ac.za/apply", province: "Western Cape", type: "Traditional" },
  { name: "University of Johannesburg (UJ)", url: "https://www.uj.ac.za/apply", province: "Gauteng", type: "Comprehensive" },
  { name: "UKZN", url: "https://www.ukzn.ac.za/apply", province: "KwaZulu-Natal", type: "Traditional" },
  { name: "Nelson Mandela University (NMU)", url: "https://www.mandela.ac.za/apply", province: "Eastern Cape", type: "Comprehensive" },
  { name: "University of the Western Cape (UWC)", url: "https://www.uwc.ac.za/apply", province: "Western Cape", type: "Comprehensive" },
  { name: "Rhodes University", url: "https://www.ru.ac.za/apply", province: "Eastern Cape", type: "Traditional" },
  { name: "University of Limpopo (UL)", url: "https://www.ul.ac.za/apply", province: "Limpopo", type: "Comprehensive" },
  { name: "UNISA", url: "https://www.unisa.ac.za/apply", province: "National (Distance)", type: "Distance" },
  { name: "Cape Peninsula University of Technology (CPUT)", url: "https://www.cput.ac.za/apply", province: "Western Cape", type: "University of Technology" },
  { name: "Tshwane University of Technology (TUT)", url: "https://www.tut.ac.za/apply", province: "Gauteng", type: "University of Technology" },
  { name: "Durban University of Technology (DUT)", url: "https://www.dut.ac.za/apply", province: "KwaZulu-Natal", type: "University of Technology" },
];

const typeColors = {
  "Traditional": "bg-primary/10 text-primary",
  "Comprehensive": "bg-blue-100 text-blue-700",
  "Distance": "bg-purple-100 text-purple-700",
  "University of Technology": "bg-orange-100 text-orange-700",
};

export default function UniversityDirectory() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUniversities = useCallback(async () => {
    setLoading(true);
    try {
      // Try to load from Supabase first
      const { data, error } = await supabase
        .from('university_directory')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setUniversities(data);
      } else {
        // Use fallback static data
        setUniversities(FALLBACK_UNIVERSITIES);
      }
    } catch (err) {
      console.error('Error loading universities:', err);
      // Use fallback on error
      setUniversities(FALLBACK_UNIVERSITIES);
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

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">South African Universities — Apply Now</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {universities.map((uni) => (
          <Card key={uni.id || uni.name} className="hover:shadow-md transition-shadow">
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