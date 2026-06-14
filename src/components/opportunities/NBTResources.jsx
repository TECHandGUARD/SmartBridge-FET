import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ExternalLink, BookOpen, FileText, Globe, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Fallback static resources in case database is empty
const FALLBACK_RESOURCES = [
  {
    title: "Official NBT Website",
    description: "Register for the NBT, find test dates and venues across South Africa.",
    url: "https://www.nbt.ac.za",
    type: "Official",
    icon: "Globe"
  },
  {
    title: "NBT Practice Tests",
    description: "Download official practice papers for Academic Literacy (AL), Quantitative Literacy (QL), and Mathematics (MAT).",
    url: "https://www.nbt.ac.za/content/practice-tests",
    type: "Practice",
    icon: "FileText"
  },
  {
    title: "NBT AL Study Guide",
    description: "Academic Literacy test preparation — reading comprehension, vocabulary, and text analysis.",
    url: "https://www.nbt.ac.za/content/academic-literacy",
    type: "Study Guide",
    icon: "BookOpen"
  },
  {
    title: "NBT QL Study Guide",
    description: "Quantitative Literacy preparation — numerical reasoning, data handling, and problem-solving.",
    url: "https://www.nbt.ac.za/content/quantitative-literacy",
    type: "Study Guide",
    icon: "BookOpen"
  },
  {
    title: "NBT Mathematics Guide",
    description: "Mathematics test prep — algebra, functions, calculus, and problem-solving strategies.",
    url: "https://www.nbt.ac.za/content/mathematics",
    type: "Study Guide",
    icon: "BookOpen"
  },
  {
    title: "HESA NBT Information",
    description: "Higher Education South Africa's overview of NBT requirements per institution.",
    url: "https://www.hesa-enrol.ac.za",
    type: "Information",
    icon: "Globe"
  },
];

const iconMap = {
  Globe: Globe,
  FileText: FileText,
  BookOpen: BookOpen,
};

const typeBadge = {
  "Official": "bg-primary text-primary-foreground",
  "Practice": "bg-blue-600 text-white",
  "Study Guide": "bg-green-600 text-white",
  "Information": "bg-orange-500 text-white",
};

export default function NBTResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      // Try to load from Supabase first
      const { data, error } = await supabase
        .from('nbt_resources')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setResources(data);
      } else {
        // Use fallback static resources
        setResources(FALLBACK_RESOURCES);
      }
    } catch (err) {
      console.error('Error loading NBT resources:', err);
      // Use fallback on error
      setResources(FALLBACK_RESOURCES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

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
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">NBT Preparation Resources</h3>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
        <strong>What is the NBT?</strong> The National Benchmark Test assesses your readiness for university-level study. Most South African universities require NBT scores alongside your NSC results. There are 3 tests: AL (Academic Literacy), QL (Quantitative Literacy), and MAT (Mathematics).
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {resources.map((res) => {
          const Icon = iconMap[res.icon] || BookOpen;
          return (
            <Card key={res.id || res.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-sm leading-tight">{res.title}</p>
                    <Badge className={`text-xs whitespace-nowrap ${typeBadge[res.type]}`}>{res.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{res.description}</p>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    Visit Resource <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}