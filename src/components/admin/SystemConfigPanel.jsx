import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

// Default system configurations in case the table is empty
const DEFAULT_CONFIGS = [
  { key: 'ai_guardrails', label: 'AI Guardrails', description: 'Rules that constrain AI assistant responses', value: '{\n  "guardrails": [\n    "Do not provide exam answers directly",\n    "Encourage critical thinking",\n    "Do not discuss inappropriate topics"\n  ]\n}', is_active: true },
  { key: 'ai_welcome_message', label: 'AI Welcome Message', description: 'Intro message for the AI Study Assistant', value: '{\n  "message": "Hi! 👋 I\\'m your AI Study Assistant. I can help you explain concepts, summarise notes, and generate practice questions. What would you like help with today?"\n}', is_active: true },
  { key: 'ai_suggestions', label: 'AI Suggestions', description: 'Suggested questions for AI chat', value: '{\n  "suggestions": [\n    "Explain Newton\\'s Second Law",\n    "Help me with calculus derivatives",\n    "Give me study tips for exams"\n  ]\n}', is_active: true },
  { key: 'exam_term_dates', label: 'Exam Term Dates', description: 'Current academic term dates used for study planning', value: '{\n  "term_start": "2026-01-15",\n  "mid_term_break": "2026-03-20",\n  "term_end": "2026-06-10",\n  "exams_start": "2026-05-20",\n  "exams_end": "2026-06-05"\n}', is_active: true },
];

export default function SystemConfigPanel() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [edits, setEdits] = useState({});

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_configurations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      let configData = data || [];
      
      // If no configs exist, seed defaults
      if (configData.length === 0) {
        const { data: seededData, error: seedError } = await supabase
          .from('system_configurations')
          .insert(DEFAULT_CONFIGS)
          .select();
        
        if (seedError) throw seedError;
        configData = seededData || [];
      }
      
      setConfigs(configData);
      
      // Initialize edit values
      const initEdits = {};
      configData.forEach(c => {
        let valueStr = '';
        if (typeof c.value === 'object') {
          valueStr = JSON.stringify(c.value, null, 2);
        } else {
          valueStr = c.value;
        }
        initEdits[c.id] = valueStr;
      });
      setEdits(initEdits);
    } catch (err) {
      console.error('Failed to load configurations:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (config) => {
    let parsed;
    try {
      parsed = JSON.parse(edits[config.id]);
    } catch (err) {
      toast.error('Invalid JSON. Please fix the format before saving.');
      return;
    }
    setSaving(config.id);
    try {
      const { error } = await supabase
        .from('system_configurations')
        .update({ value: parsed })
        .eq('id', config.id);
      
      if (error) throw error;
      
      setConfigs(prev => prev.map(c => 
        c.id === config.id ? { ...c, value: parsed } : c
      ));
      toast.success(`"${config.label || config.key}" saved.`);
    } catch (err) {
      console.error('Failed to save configuration:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const toggleActive = async (config) => {
    try {
      const newStatus = !config.is_active;
      const { error } = await supabase
        .from('system_configurations')
        .update({ is_active: newStatus })
        .eq('id', config.id);
      
      if (error) throw error;
      
      setConfigs(prev => prev.map(c => 
        c.id === config.id ? { ...c, is_active: newStatus } : c
      ));
      toast.success(`${config.label || config.key} ${newStatus ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      console.error('Failed to toggle configuration:', err);
      toast.error(`Failed to update: ${err.message}`);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-primary" />
        <div>
          <p className="font-semibold text-sm">AI System Configuration</p>
          <p className="text-xs text-muted-foreground">
            Edit guardrails, welcome messages, suggestions, and term dates used by all AI tools.
          </p>
        </div>
      </div>

      {configs.map(config => (
        <Card key={config.id} className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold">{config.label || config.key}</CardTitle>
                <Badge variant="outline" className="text-xs font-mono">{config.key}</Badge>
                <Badge className={`text-xs ${config.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {config.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleActive(config)}>
                  {config.is_active ? 'Disable' : 'Enable'}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 w-7 p-0" 
                  onClick={() => setExpanded(prev => ({ ...prev, [config.id]: !prev[config.id] }))}
                >
                  {expanded[config.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            {config.description && <p className="text-xs text-muted-foreground">{config.description}</p>}
          </CardHeader>
          {expanded[config.id] && (
            <CardContent className="pt-0 space-y-2">
              <Textarea
                className="font-mono text-xs min-h-[120px]"
                value={edits[config.id] || ''}
                onChange={e => setEdits(prev => ({ ...prev, [config.id]: e.target.value }))}
              />
              <Button 
                size="sm" 
                className="bg-primary gap-1.5 text-xs h-8" 
                onClick={() => saveConfig(config)} 
                disabled={saving === config.id}
              >
                {saving === config.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </Button>
            </CardContent>
          )}
        </Card>
      ))}

      {configs.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">No configuration records found.</p>
      )}
    </div>
  );
}