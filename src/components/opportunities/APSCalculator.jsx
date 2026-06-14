import React, { useState } from 'react';
import { Calculator, Info, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SubjectConfig {
  id: string;
  name: string;
  required: boolean;
  isLO: boolean;
  conflictsWith?: string;
  subMinCheck?: string;
}

const SUBJECTS: SubjectConfig[] = [
  { id: "hl", name: "Home Language (HL)", required: true, isLO: false, subMinCheck: "hl" },
  { id: "fal", name: "First Additional Language (FAL)", required: true, isLO: false },
  { id: "math", name: "Mathematics", required: false, isLO: false, conflictsWith: "mathlit", subMinCheck: "math" },
  { id: "mathlit", name: "Mathematical Literacy", required: false, isLO: false, conflictsWith: "math" },
  { id: "physci", name: "Physical Sciences", required: false, isLO: false, subMinCheck: "physci" },
  { id: "lifesci", name: "Life Sciences", required: false, isLO: false },
  { id: "geog", name: "Geography", required: false, isLO: false },
  { id: "hist", name: "History", required: false, isLO: false },
  { id: "acc", name: "Accounting", required: false, isLO: false },
  { id: "bus", name: "Business Studies", required: false, isLO: false },
  { id: "econ", name: "Economics", required: false, isLO: false },
  { id: "lo", name: "Life Orientation (LO)", required: true, isLO: true },
  { id: "elective1", name: "Elective 3 (e.g. EGD / CAT / IT)", required: false, isLO: false },
  { id: "elective2", name: "Elective 4 (e.g. Tourism / Agricultural)", required: false, isLO: false },
  { id: "elective3", name: "Elective 5 (Optional 8th Subject)", required: false, isLO: false },
];

function percentToAPS(pct: number): number {
  if (pct >= 80) return 7;
  if (pct >= 70) return 6;
  if (pct >= 60) return 5;
  if (pct >= 50) return 4;
  if (pct >= 40) return 3;
  if (pct >= 30) return 2;
  if (pct >= 1 && pct < 30) return 1;
  return 0;
}

const APS_BENCHMARKS = [
  { 
    label: "Medicine / Health Sciences (UCT, Wits, SU)", 
    min: 42, 
    color: "bg-red-50 text-red-700 border-red-200",
    reqs: { math: 70, physci: 70, hl: 60 },
    useLO: false
  },
  { 
    label: "Engineering & Built Environment (UCT, Wits, UP)", 
    min: 36, 
    color: "bg-orange-50 text-orange-700 border-orange-200",
    reqs: { math: 70, physci: 70 },
    useLO: false
  },
  { 
    label: "Commerce / Law / Accounting (Top Universities)", 
    min: 34, 
    color: "bg-amber-50 text-amber-800 border-amber-200",
    reqs: { math: 60 },
    useLO: true
  },
  { 
    label: "Humanities / Social Sciences (Most Universities)", 
    min: 28, 
    color: "bg-blue-50 text-blue-700 border-blue-200",
    reqs: {},
    useLO: true
  },
  { 
    label: "Diploma Programmes / TVET Colleges", 
    min: 19, 
    color: "bg-green-50 text-green-700 border-green-200",
    reqs: {},
    useLO: true
  },
];

export default function APSCalculator() {
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [showBenchmarks, setShowBenchmarks] = useState(false);

  const handleMark = (id: string, val: string) => {
    const num = val === '' ? 0 : Math.max(0, Math.min(100, parseInt(val) || 0));
    setMarks(prev => {
      const updated = { ...prev, [id]: num };
      const currentSubject = SUBJECTS.find(s => s.id === id);
      if (currentSubject?.conflictsWith && num > 0) {
        updated[currentSubject.conflictsWith] = 0;
      }
      return updated;
    });
  };

  const scoredSubjects = SUBJECTS.map(s => {
    const pct = marks[s.id] || 0;
    const aps = percentToAPS(pct);
    return { ...s, pct, aps };
  }).filter(s => s.pct > 0);

  const academicSubjects = scoredSubjects.filter(s => !s.isLO);
  const loSubject = scoredSubjects.find(s => s.isLO);

  const sortedAcademic = [...academicSubjects].sort((a, b) => b.aps - a.aps);
  const top6Academic = sortedAcademic.slice(0, 6);
  const academicAPS = top6Academic.reduce((sum, s) => sum + s.aps, 0);

  let loPoints = 0;
  if (loSubject) {
    if (loSubject.pct >= 80) loPoints = 3;
    else if (loSubject.pct >= 70) loPoints = 2;
    else if (loSubject.pct >= 60) loPoints = 1;
  }
  const generalAPS = academicAPS + loPoints;

  const totalActiveCount = scoredSubjects.length;
  const satisfiesHL = (marks['hl'] || 0) >= 40;
  const satisfiesFAL = (marks['fal'] || 0) >= 30;
  const isNSCCompliant = totalActiveCount >= 7 && satisfiesHL && satisfiesFAL;

  const qualified = APS_BENCHMARKS.filter(b => {
    const scoreToCompare = b.useLO ? generalAPS : academicAPS;
    return scoreToCompare >= b.min;
  });
  const topQualified = qualified[0];

  return (
    <Card className="border-slate-200 shadow-xl max-w-xl mx-auto bg-white">
      <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <Calculator className="w-5 h-5 text-blue-600" /> SmartBridge APS Engine
        </CardTitle>
        <p className="text-xs text-slate-500">Official Department of Education NSC Matrix Integration</p>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        
        {/* Dual Score Matrix Panel */}
        <div className="grid grid-cols-2 gap-3 bg-slate-900 text-white rounded-xl p-4 shadow-inner">
          <div className="border-r border-slate-700 pr-2">
            <div className="text-3xl font-black text-blue-400">{academicAPS}</div>
            <div className="text-[11px] font-bold text-slate-300">Academic APS</div>
            <p className="text-[9px] text-slate-400 leading-tight">UCT, Wits, SU framework (Excludes LO)</p>
          </div>
          <div className="pl-2">
            <div className="text-3xl font-black text-emerald-400">{generalAPS}</div>
            <div className="text-[11px] font-bold text-slate-300">General APS</div>
            <p className="text-[9px] text-slate-400 leading-tight">UJ, UP, UNISA framework (Includes LO)</p>
          </div>
        </div>

        {/* Dynamic National Rule Validator Badges */}
        {totalActiveCount > 0 && (
          <div className={`p-2.5 rounded-lg flex items-start gap-2 border text-[11px] ${isNSCCompliant ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            {isNSCCompliant ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div><strong>NSC Compliant:</strong> Subject requirements and core language thresholds verified for official Certificate release.</div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>NSC Warning:</strong> Standard certificates require 7 total subjects including Home Language at ≥40% and First Additional Language at ≥30%.
                </div>
              </>
            )}
          </div>
        )}

        {/* Top-Tier Program Status Banner */}
        {totalActiveCount > 0 && topQualified && (
          <div className={`p-3 rounded-xl border text-center text-xs font-bold ${topQualified.color}`}>
            Highest Application Match: {topQualified.label}
          </div>
        )}

        {/* Subject Grid Input Fields */}
        <div className="space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
          {SUBJECTS.map(s => {
            const hasValue = (marks[s.id] || 0) > 0;
            const isRowHighlighted = top6Academic.some(t => t.id === s.id) || (s.isLO && hasValue);
            
            if (s.id === 'mathlit' && (marks['math'] || 0) > 0) return null;
            if (s.id === 'math' && (marks['mathlit'] || 0) > 0) return null;

            return (
              <div key={s.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors border ${isRowHighlighted ? 'bg-blue-50/40 border-blue-100/40' : 'border-transparent'}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-0.5">
                    {s.name}
                    {s.required && <span className="text-red-500 font-bold text-[10px]">*</span>}
                  </div>
                </div>
                
                <input
                  type="number"
                  min="0" max="100"
                  placeholder="%"
                  value={marks[s.id] || ''}
                  onChange={e => handleMark(s.id, e.target.value)}
                  className="w-16 h-8 text-xs font-bold text-center rounded-md border border-slate-200 bg-white px-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                
                <div className={`w-8 text-center text-xs font-black py-0.5 rounded ${
                  hasValue && percentToAPS(marks[s.id]) >= 6 ? 'bg-emerald-100 text-emerald-800' :
                  hasValue && percentToAPS(marks[s.id]) >= 4 ? 'bg-blue-100 text-blue-800' :
                  hasValue ? 'bg-slate-200 text-slate-700' : 'text-slate-300'
                }`}>
                  {hasValue ? percentToAPS(marks[s.id]) : '—'}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-400 flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400" /> Best 6 academic courses are colored. Elective boxes accept any valid missing NSC subject marks.
        </p>

        {/* Requirements Toggle */}
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline pt-1"
          onClick={() => setShowBenchmarks(b => !b)}
        >
          {showBenchmarks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Check University Faculty Sub-Minimum Rules
        </button>