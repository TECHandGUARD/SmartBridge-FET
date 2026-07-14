// src/pages/BursaryFinder.jsx
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, ExternalLink, Sparkles, BookOpen, TrendingUp,
  DollarSign, Clock, ChevronDown, ChevronUp, Loader2,
  AlertCircle, MapPin, CheckCircle2, RefreshCw, XCircle
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 HARDENED CONFIGURATION (All softcoded)
// ============================================================

const CONFIG = {
  // Default values (with .env fallback)
  DEFAULTS: {
    FIELD: import.meta.env.VITE_BURSARY_DEFAULT_FIELD || 'STEM (Science, Technology, Engineering, Mathematics)',
    INCOME: import.meta.env.VITE_BURSARY_DEFAULT_INCOME || '350000',
    MARK: import.meta.env.VITE_BURSARY_DEFAULT_MARK || '75',
    PROVINCE: import.meta.env.VITE_BURSARY_DEFAULT_PROVINCE || 'National',
  },

  // Feature flags
  FEATURES: {
    SHOW_MATCH_REASONS: import.meta.env.VITE_BURSARY_SHOW_MATCH_REASONS !== 'false',
    SHOW_DEADLINE_WARNING: import.meta.env.VITE_BURSARY_SHOW_DEADLINE_WARNING !== 'false',
    ENABLE_RETRY: import.meta.env.VITE_BURSARY_ENABLE_RETRY !== 'false',
  },

  // Timeouts (in milliseconds)
  TIMEOUTS: {
    SEARCH: Number(import.meta.env.VITE_BURSARY_SEARCH_TIMEOUT) || 30000,
    RETRY_DELAY: Number(import.meta.env.VITE_BURSARY_RETRY_DELAY) || 2000,
    RETRY_MAX_ATTEMPTS: Number(import.meta.env.VITE_BURSARY_RETRY_ATTEMPTS) || 3,
  },

  // Validation rules
  VALIDATION: {
    MIN_INCOME: Number(import.meta.env.VITE_BURSARY_MIN_INCOME) || 0,
    MAX_INCOME: Number(import.meta.env.VITE_BURSARY_MAX_INCOME) || 999999999,
    MIN_MARK: Number(import.meta.env.VITE_BURSARY_MIN_MARK) || 0,
    MAX_MARK: Number(import.meta.env.VITE_BURSARY_MAX_MARK) || 100,
  },

  // User-facing messages
  MESSAGES: {
    NO_RESULTS: import.meta.env.VITE_BURSARY_NO_RESULTS_MSG || 'No bursaries found matching your profile parameters.',
    RESULTS_FOUND: import.meta.env.VITE_BURSARY_RESULTS_MSG || 'Found {count} matching bursaries!',
    ERROR: import.meta.env.VITE_BURSARY_ERROR_MSG || 'Failed to fetch bursary matches. Please try again.',
    AWAITING_SEARCH: import.meta.env.VITE_BURSARY_AWAITING_MSG || 'Enter your profile details and click "Find Bursaries" to get started.',
    NO_RESULTS_DETAIL: import.meta.env.VITE_BURSARY_NO_RESULTS_DETAIL || 'No active bursary tracks discovered matching those explicit parameter sets.',
    RESET_SUCCESS: import.meta.env.VITE_BURSARY_RESET_MSG || 'Filters reset successfully.',
    INVALID_INCOME: import.meta.env.VITE_BURSARY_INVALID_INCOME_MSG || 'Please enter a valid household income.',
    INVALID_MARK: import.meta.env.VITE_BURSARY_INVALID_MARK_MSG || 'Please enter a valid average mark (0-100).',
    RETRYING: import.meta.env.VITE_BURSARY_RETRYING_MSG || 'Connection issue. Retrying... ({attempt}/{max})',
    NETWORK_ERROR: import.meta.env.VITE_BURSARY_NETWORK_ERROR_MSG || 'Network error. Please check your connection and try again.',
  },
};

// ============================================================
// Constants
// ============================================================

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

const PROVINCES = [
  'National', 'Gauteng', 'Western Cape', 'KwaZulu-Natal',
  'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West',
  'Free State', 'Northern Cape'
];

// ============================================================
// Sub-Components
// ============================================================

function MeterBar({ score }) {
  const clampedScore = Math.min(Math.max(score, 0), 100);
  
  const barColor = clampedScore >= 75 ? 'bg-emerald-500' :
                   clampedScore >= 55 ? 'bg-blue-600' :
                   clampedScore >= 35 ? 'bg-amber-500' :
                   'bg-slate-400';

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${clampedScore}%` }}
          role="progressbar"
          aria-valuenow={clampedScore}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className={`text-xs font-black min-w-[28px] text-right ${
        clampedScore >= 75 ? 'text-emerald-600' :
        clampedScore >= 55 ? 'text-blue-600' :
        'text-amber-600'
      }`}>
        {clampedScore}%
      </span>
    </div>
  );
}

function BursaryRowCard({ bursary }) {
  const [open, setOpen] = useState(false);

  const totalDaysRemaining = bursary.deadline
    ? Math.ceil((new Date(bursary.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpired = totalDaysRemaining !== null && totalDaysRemaining < 0;
  const isUrgent = totalDaysRemaining !== null && totalDaysRemaining >= 0 && totalDaysRemaining <= 14;

  const closingMonthLabel = bursary.deadline
    ? new Date(bursary.deadline).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
    : 'Open Status';

  return (
    <Card className={`border-slate-200 shadow-sm overflow-hidden transition-all bg-white hover:shadow-md ${isExpired ? 'opacity-60' : ''}`}>
      <CardContent className="p-4 space-y-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-extrabold text-sm text-slate-800 tracking-tight truncate">
                {bursary.name}
              </h4>
              {isExpired && (
                <Badge className="text-[9px] font-bold bg-red-100 text-red-600 border-red-200 rounded px-1.5 h-4">
                  Closed
                </Badge>
              )}
              {isUrgent && !isExpired && (
                <Badge className="text-[9px] font-bold bg-amber-100 text-amber-700 border-amber-200 rounded px-1.5 h-4 animate-pulse">
                  ⚡ Urgent
                </Badge>
              )}
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">{bursary.provider}</p>
          </div>

          <div className="text-right shrink-0 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-xl min-w-[48px]">
            <div className={`text-sm font-black leading-none ${
              bursary.match_score >= 75 ? 'text-emerald-600' :
              bursary.match_score >= 55 ? 'text-blue-600' :
              'text-amber-600'
            }`}>
              {bursary.match_score}%
            </div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mt-0.5">Match</span>
          </div>
        </div>

        <MeterBar score={bursary.match_score} />

        {/* Match reasons */}
        {CONFIG.FEATURES.SHOW_MATCH_REASONS && bursary.match_reasons?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {bursary.match_reasons.map(reason => (
              <Badge key={reason} variant="outline" className="text-[9px] font-bold bg-emerald-50 text-emerald-800 border-emerald-100 py-0 px-2 h-4.5 rounded-full">
                ✓ {reason}
              </Badge>
            ))}
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-50">
          <span>📊 Min Avg: {bursary.min_average || 'N/A'}%</span>
          <span>💰 Income Cap: {bursary.max_household_income ? `R ${bursary.max_household_income.toLocaleString()}` : 'Open'}</span>
          {bursary.fields_of_study?.length > 0 && (
            <span className="col-span-2">🎯 {bursary.fields_of_study.slice(0, 2).join(', ')}{bursary.fields_of_study.length > 2 ? ` +${bursary.fields_of_study.length - 2}` : ''}</span>
          )}
          {CONFIG.FEATURES.SHOW_DEADLINE_WARNING && totalDaysRemaining !== null && !isExpired && (
            <span className={`col-span-2 flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold ${
              isUrgent ? 'text-amber-600 animate-pulse' : 'text-slate-400'
            }`}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {totalDaysRemaining} day{totalDaysRemaining !== 1 ? 's' : ''} remaining
            </span>
          )}
          {isExpired && (
            <span className="col-span-2 flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold text-red-500">
              <Clock className="w-3.5 h-3.5 shrink-0" /> Application closed
            </span>
          )}
        </div>

        {/* Expandable */}
        {(bursary.description || bursary.covers || bursary.fields_of_study?.length > 0) && (
          <div>
            <button
              type="button"
              className="flex items-center gap-0.5 text-[11px] text-blue-600 font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
            >
              {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {open ? 'Hide Information Scope' : 'View Scope Parameters'}
            </button>
            {open && (
              <div className="mt-2 space-y-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5 leading-relaxed font-medium">
                {bursary.description && <p>{bursary.description}</p>}
                {bursary.covers && <p><span className="font-bold text-slate-700">Funding Coverage:</span> {bursary.covers}</p>}
                {bursary.fields_of_study?.length > 0 && (
                  <p><span className="font-bold text-slate-700">Target Disciplines:</span> {bursary.fields_of_study.join(', ')}</p>
                )}
                {bursary.deadline && (
                  <p><span className="font-bold text-slate-700">Deadline:</span> {new Date(bursary.deadline).toLocaleDateString('en-ZA')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Apply button */}
        <a
          href={bursary.apply_link}
          target="_blank"
          rel="noopener noreferrer"
          className="block pt-1"
          aria-label={`Apply for ${bursary.name}`}
        >
          <Button
            size="sm"
            className="w-full gap-1.5 h-8 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isExpired}
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            {isExpired ? 'Applications Closed' : 'Access Application Channel'}
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function BursaryFinder() {
  // Form state
  const [fieldOfStudy, setFieldOfStudy] = useState(CONFIG.DEFAULTS.FIELD);
  const [householdIncome, setHouseholdIncome] = useState(CONFIG.DEFAULTS.INCOME);
  const [averageMark, setAverageMark] = useState(CONFIG.DEFAULTS.MARK);
  const [province, setProvince] = useState(CONFIG.DEFAULTS.PROVINCE);

  // UI state
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchCount, setSearchCount] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);

  // Refs for abort control
  const abortControllerRef = useRef(null);

  // ============================================================
  // Validation
  // ============================================================

  const validateInputs = useCallback(() => {
    const incomeNum = parseInt(householdIncome);
    const markNum = parseInt(averageMark);

    if (isNaN(incomeNum) || incomeNum < CONFIG.VALIDATION.MIN_INCOME) {
      toast.error(CONFIG.MESSAGES.INVALID_INCOME);
      return false;
    }

    if (isNaN(markNum) || markNum < CONFIG.VALIDATION.MIN_MARK || markNum > CONFIG.VALIDATION.MAX_MARK) {
      toast.error(CONFIG.MESSAGES.INVALID_MARK);
      return false;
    }

    return true;
  }, [householdIncome, averageMark]);

  // ============================================================
  // Core Search Function (with retry support)
  // ============================================================

  const performSearch = useCallback(async (attempt = 0) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const incomeNum = parseInt(householdIncome);
      const markNum = parseInt(averageMark);

      // Build timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timed out'));
        }, CONFIG.TIMEOUTS.SEARCH);
      });

      // Build search promise
      const searchPromise = supabase.functions.invoke('getBursaryRecommendations', {
        body: {
          field_of_study: fieldOfStudy,
          household_income: incomeNum,
          average_mark: markNum,
          province: province === 'National' ? null : province,
        },
        signal: controller.signal,
      });

      // Race between search and timeout
      const { data, error: functionError } = await Promise.race([
        searchPromise,
        timeoutPromise.then(() => { throw new Error('Request timed out'); })
      ]);

      if (functionError) throw functionError;

      const bursaries = data?.bursaries || [];
      setResults(bursaries);
      setSearchCount(prev => prev + 1);
      setRetryAttempt(0);

      if (bursaries.length === 0) {
        toast.info(CONFIG.MESSAGES.NO_RESULTS);
      } else {
        toast.success(CONFIG.MESSAGES.RESULTS_FOUND.replace('{count}', bursaries.length));
      }

    } catch (err) {
      // Don't show error if request was aborted
      if (err.name === 'AbortError') {
        return;
      }

      console.error('Bursary search error:', err);

      // Handle network errors with retry
      const isNetworkError = err.message?.includes('fetch') || err.message?.includes('network') || err.message?.includes('timed out');

      if (isNetworkError && CONFIG.FEATURES.ENABLE_RETRY && attempt < CONFIG.TIMEOUTS.RETRY_MAX_ATTEMPTS) {
        const nextAttempt = attempt + 1;
        setRetryAttempt(nextAttempt);
        toast.warning(CONFIG.MESSAGES.RETRYING.replace('{attempt}', nextAttempt).replace('{max}', CONFIG.TIMEOUTS.RETRY_MAX_ATTEMPTS));

        // Exponential backoff
        const delay = CONFIG.TIMEOUTS.RETRY_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Recursive retry
        return performSearch(nextAttempt);
      }

      setError(err.message || CONFIG.MESSAGES.ERROR);
      toast.error(err.message || CONFIG.MESSAGES.ERROR);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [fieldOfStudy, householdIncome, averageMark, province]);

  // ============================================================
  // Handlers
  // ============================================================

  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();

    if (loading) return;

    if (!validateInputs()) {
      return;
    }

    setRetryAttempt(0);
    await performSearch(0);
  }, [validateInputs, performSearch, loading]);

  const handleReset = useCallback(() => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setFieldOfStudy(CONFIG.DEFAULTS.FIELD);
    setHouseholdIncome(CONFIG.DEFAULTS.INCOME);
    setAverageMark(CONFIG.DEFAULTS.MARK);
    setProvince(CONFIG.DEFAULTS.PROVINCE);
    setResults(null);
    setError(null);
    setLoading(false);
    setRetryAttempt(0);
    toast.success(CONFIG.MESSAGES.RESET_SUCCESS);
  }, []);

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased pb-10">

      {/* Hero */}
      <div className="bg-slate-900 text-white py-10 px-4 shadow-md border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
            <BookOpen className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">Bursary Identification Portal</h2>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold px-2 h-5">
                <Sparkles className="w-3 h-3 fill-current text-emerald-400 mr-0.5" /> AI-Powered Matching
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-normal max-w-xl">
              Filter national funding indexes by study field, academic performance, and location.
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Filter Panel */}
        <Card className="border-slate-200 shadow-xl bg-white rounded-2xl p-4 md:col-span-1 h-fit">
          <CardHeader className="p-0 pb-3 border-b border-slate-50">
            <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-4 h-4 text-blue-600" /> Profile Parameters
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleSearch} className="space-y-3.5 pt-4" noValidate>
            {/* Field */}
            <div className="space-y-1">
              <Label htmlFor="fieldOfStudy" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Field of Study Category
              </Label>
              <Select value={fieldOfStudy} onValueChange={setFieldOfStudy}>
                <SelectTrigger id="fieldOfStudy" className="text-xs h-8 bg-white border-slate-200 font-semibold text-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {EXTENDED_FIELDS.map(f => (
                    <SelectItem key={f} value={f} className="text-xs font-medium">{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Income */}
            <div className="space-y-1">
              <Label htmlFor="householdIncome" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Gross Household Income (ZAR / p.a.)
              </Label>
              <Input
                id="householdIncome"
                type="number"
                min={CONFIG.VALIDATION.MIN_INCOME}
                step="1000"
                value={householdIncome}
                onChange={e => setHouseholdIncome(e.target.value)}
                className="text-xs h-8 font-bold border-slate-200 bg-white"
                placeholder="e.g. 350000"
                aria-describedby="incomeHelp"
              />
              <p id="incomeHelp" className="text-[9px] text-slate-400">Enter your annual household income in ZAR</p>
            </div>

            {/* Mark */}
            <div className="space-y-1">
              <Label htmlFor="averageMark" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Current Average Mark (%)
              </Label>
              <Input
                id="averageMark"
                type="number"
                min={CONFIG.VALIDATION.MIN_MARK}
                max={CONFIG.VALIDATION.MAX_MARK}
                value={averageMark}
                onChange={e => setAverageMark(e.target.value)}
                className="text-xs h-8 font-bold border-slate-200 bg-white"
                placeholder="e.g. 75"
                aria-describedby="markHelp"
              />
              <p id="markHelp" className="text-[9px] text-slate-400">Your overall academic average</p>
            </div>

            {/* Province */}
            <div className="space-y-1">
              <Label htmlFor="province" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Province
              </Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger id="province" className="text-xs h-8 bg-white border-slate-200 font-semibold text-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {PROVINCES.map(p => (
                    <SelectItem key={p} value={p} className="text-xs font-medium">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {retryAttempt > 0 ? `Retry ${retryAttempt}/${CONFIG.TIMEOUTS.RETRY_MAX_ATTEMPTS}` : 'Searching...'}</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> Find Bursaries</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold shrink-0"
                onClick={handleReset}
                disabled={loading}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>

            {searchCount > 0 && (
              <p className="text-[10px] text-slate-400 text-center font-medium">
                {searchCount} search{searchCount !== 1 ? 'es' : ''} performed
              </p>
            )}
          </form>
        </Card>

        {/* Results Panel */}
        <div className="md:col-span-2 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {CONFIG.FEATURES.ENABLE_RETRY && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-3 h-6 text-[10px] font-bold border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => performSearch(0)}
                    disabled={loading}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {results === null && !error && (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardContent className="text-center py-12">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-600 text-sm">Awaiting Search</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {CONFIG.MESSAGES.AWAITING_SEARCH}
                </p>
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {results !== null && results.length === 0 && !error && (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardContent className="text-center py-12">
                <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-600 text-sm">No Matching Bursaries Found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {CONFIG.MESSAGES.NO_RESULTS_DETAIL}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs font-bold"
                  onClick={handleReset}
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results !== null && results.length > 0 && !error && (
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
