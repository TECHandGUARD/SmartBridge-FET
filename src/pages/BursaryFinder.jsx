import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ExternalLink, Sparkles, BookOpen, TrendingUp, DollarSign, Clock, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const EXTENDED_FIELDS = [
  'STEM (Science, Technology, Engineering, Mathematics)',
  'Health Sciences',
  'Business and Commerce',
  'Social Sciences',
  'Humanities',
  'Education',
  'Arts and Design',
  'Agriculture and Environmental Studies',
  'Law and Legal Studies'
];

const PROVINCES = ['National', 'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape'];

function MeterBar({ score }) {
  const barColor = score >= 75 ? 'bg-emerald-500' : score >= 55 ? 'bg-blue-600' : score >= 35 ? 'bg-amber-500' : 'bg-slate-400';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-black min-w-[28px] text-right text-slate-700">{score}%</span>
    </div>
  );
}

function BursaryRowCard({ bursary }) {
  const [open, setOpen] = useState(false);
  
  const totalDaysRemaining = bursary.deadline
    ? Math.ceil((new Date(bursary.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Formats text outputs to mirror the exact index month labels used by UniApply ForMe
  const closingMonthLabel = bursary.deadline
    ? new Date(bursary.deadline).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
    : 'Open Status';

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden transition-all bg-white hover:shadow-md">
      <CardContent className="p-4 space-y-2.5">
        
        {/* Header Metadata Section */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-extrabold text-sm text-slate-800 tracking-tight truncate">{bursary.name}</h4>
              <Badge variant="secondary" className="text-[9px] font-bold bg-slate-100 text-slate-500 rounded px-1.5 h-4 border-slate-200/60">
                Closes: {closingMonthLabel}
              </Badge>
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">{bursary.provider}</p>
          </div>
          
          <div className="text-right shrink-0 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-xl min-w-[48px]">
            <div className={`text-sm font-black leading-none ${bursary.match_score >= 75 ? 'text-emerald-600' : bursary.match_score >= 55 ? 'text-blue-600' : 'text-amber-600'}`}>
              {bursary.match_score}%
            </div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mt-0.5">Match</span>
          </div>
        </div>

        {/* Scoring Bar Indicator */}
        <MeterBar score={bursary.match_score} />

        {/* Verification Check Badges */}
        {bursary.match_reasons && bursary.match_reasons.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {bursary.match_reasons.map(reason => (
              <Badge key={reason} variant="outline" className="text-[9px] font-bold bg-emerald-50 text-emerald-800 border-emerald-100 py-0 px-2 h-4.5 rounded-full">
                ✓ {reason}
              </Badge>
            ))}
          </div>
        )}

        {/* Parameter Details Summary Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-50">
          <span>📊 Min Average Req: {bursary.min_average}%</span>
          {bursary.max_household_income ? (
            <span>💰 Income Cap: R {bursary.max_household_income.toLocaleString()}</span>
          ) : (
            <span>💰 Income Cap: Open</span>
          )}
          {totalDaysRemaining !== null && (
            <span className={`col-span-2 flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold ${totalDaysRemaining <= 14 ? 'text-amber-600' : 'text-slate-400'}`}>
              <Clock className="w-3.5 h-3.5 shrink-0" /> {totalDaysRemaining} Days left before profile closure
            </span>
          )}
        </div>

        {/* Expanding Metadata Panel Drawer */}
        <div>
          <button
            type="button"
            className="flex items-center gap-0.5 text-[11px] text-blue-600 font-bold hover:underline"
            onClick={() => setOpen(!open)}
          >
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {open ? 'Hide Information Scope' : 'View Scope Parameters'}
          </button>
          {open && (
            <div className="mt-2 space-y-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5 leading-relaxed animate-fadeIn font-medium">
              {bursary.description && <p>{bursary.description}</p>}
              {bursary.covers && <p><span className="font-bold text-slate-700">Funding Coverage:</span> {bursary.covers}</p>}
              <p><span className="font-bold text-slate-700">Target Disciplines:</span> {bursary.fields_of_study.join(', ')}</p>
            </div>
          )}
        </div>

        {/* Action Button Gateway */}
        <a href={bursary.apply_link} target="_blank" rel="noopener noreferrer" className="block pt-1">
          <Button size="sm" className="w-full gap-1.5 h-8 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm">
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> Access Application Channel
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}

export default function BursaryFinder() {
  const [fieldOfStudy, setFieldOfStudy] = useState('STEM (Science, Technology, Engineering, Mathematics)');
  const [householdIncome, setHouseholdIncome] = useState('350000');
  const [averageMark, setAverageMark] = useState('75');
  const [province, setProvince] = useState('National');
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExecuteBursarySearch = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Triggers high-speed RPC processing pipeline on Supabase servers
      const { data, error: rpcError } = await supabase.rpc('find_matching_bursaries_v2', {
        target_field: fieldOfStudy,
        user_income: parseInt(householdIncome) || 0,
        user_average: parseInt(averageMark) || 0,
        target_province: province
      });

      if (rpcError) throw rpcError;
      setResults(data || []);
      
      if (data?.length === 0) {
        toast.info('No bursaries found matching your profile parameters.');
      } else {
        toast.success(`Found ${data?.length || 0} matching bursaries!`);
      }
    } catch (err) {
      setError(err.message || 'Failed processing server metrics calculation routines.');
      toast.error(err.message || 'Failed to fetch bursary matches.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans select-none antialiased pb-10">
      
      {/* Visual Identity Hero Section Banner */}
      <div className="bg-slate-900 text-white py-10 px-4 shadow-md border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
            <BookOpen className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">Bursary Identification Portal</h2>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold px-2 h-5">
                <Sparkles className="w-3 h-3 fill-current text-emerald-400 mr-0.5" /> Server-Side Sync Active
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-normal max-w-xl">
              Filter national funding indexes directly by study field category configurations and academic pass markers.
            </p>
          </div>
        </div>
      </div>

      {/* Main Structural Working Interface Layout Grid Block */}
      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Filter Control Settings Card */}
        <Card className="border-slate-200 shadow-xl bg-white rounded-2xl p-4 md:col-span-1 h-fit">
          <CardHeader className="p-0 pb-3 border-b border-slate-50">
            <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-4 h-4 text-blue-600" /> Profiling Parameters
            </CardTitle>
          </CardHeader>
          
          <form onSubmit={handleExecuteBursarySearch} className="space-y-3.5 pt-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Field of Study Category</Label>
              <Select value={fieldOfStudy} onValueChange={setFieldOfStudy}>
                <SelectTrigger className="text-xs h-8 bg-white border-slate-200 font-semibold text-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {EXTENDED_FIELDS.map(f => (
                    <SelectItem key={f} value={f} className="text-xs font-medium">{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Gross Household Income (ZAR / p.a.)</Label>
              <Input 
                type="number" 
                value={householdIncome} 
                onChange={e => setHouseholdIncome(e.target.value)} 
                className="text-xs h-8 font-bold border-slate-200 bg-white" 
                placeholder="e.g. 350000"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Current Pass Average Mark (%)</Label>
              <Input 
                type="number" 
                min={0} 
                max={100} 
                value={averageMark} 
                onChange={e => setAverageMark(e.target.value)} 
                className="text-xs h-8 font-bold border-slate-200 bg-white" 
                placeholder="e.g. 75"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Regional Territory Province</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger className="text-xs h-8 bg-white border-slate-200 font-semibold text-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {PROVINCES.map(p => (
                    <SelectItem key={p} value={p} className="text-xs font-medium">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm gap-1.5"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing Server Pipeline...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Run Filter Assessment</>
              )}
            </Button>
          </form>
        </Card>

        {/* Dynamic Display Target Result Feed Output List */}
        <div className="md:col-span-2 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {results === null ? (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardContent className="text-center py-12">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-600 text-sm">Awaiting Pipeline Filter Parameters</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Run the database filter interface to fetch active, high-priority bursary vacancies matching your academic performance sheet profile.
                </p>
              </CardContent>
            </Card>
          ) : results.length === 0 ? (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardContent className="text-center py-12">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-600 text-sm">No Financial Assistance Tracks Found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  No active bursary tracks discovered matching those explicit parameter sets.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 text-xs font-bold"
                  onClick={() => {
                    setFieldOfStudy('STEM (Science, Technology, Engineering, Mathematics)');
                    setHouseholdIncome('350000');
                    setAverageMark('75');
                    setProvince('National');
                    setResults(null);
                  }}
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">
                  {results.length} bursar{results.length !== 1 ? 'ies' : 'y'} matched
                </p>
                <Badge variant="outline" className="text-[9px] font-bold text-slate-400">
                  Sorted by match score
                </Badge>
              </div>
              {results.map((bursaryItem) => (
                <BursaryRowCard key={bursaryItem.id} bursary={bursaryItem} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}