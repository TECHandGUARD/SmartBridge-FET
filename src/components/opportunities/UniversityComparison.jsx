import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { GitCompareArrows, X, ExternalLink, CheckCircle2, AlertCircle, Info, GraduationCap, ChevronDown, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Static knowledge about NBT requirements & faculty APS per university
const UNI_KNOWLEDGE = {
  "university of cape town": {
    short: "UCT",
    nbt: "Required for all applicants. AL + QL mandatory; MAT required for Science, Commerce, Engineering.",
    nbt_level: "High",
    faculties: "Engineering: APS 42+, NSC Maths 80%+\nCommerce: APS 38+, NSC Maths 70%+\nHumanities: APS 36+\nHealth Sciences: APS 42+, NSC Maths 80%+",
    apply_url: "https://www.uct.ac.za/apply",
    province: "Western Cape",
  },
  "university of the witwatersrand": {
    short: "Wits",
    nbt: "Required. AL + QL for all; MAT required for Science, Engineering, Commerce.",
    nbt_level: "High",
    faculties: "Engineering: APS 42+, Maths 75%+\nCommerce: APS 38+, Maths 60%+\nScience: APS 40+\nHealth Sciences: APS 44+",
    apply_url: "https://www.wits.ac.za/apply",
    province: "Gauteng",
  },
  "university of pretoria": {
    short: "UP",
    nbt: "Required for most programmes. AL + QL compulsory; MAT for STEM faculties.",
    nbt_level: "High",
    faculties: "Engineering: APS 30+, Maths 70%+\nLaw: APS 30+\nEducation: APS 24+\nVeterinary Science: APS 34+",
    apply_url: "https://www.up.ac.za/apply",
    province: "Gauteng",
  },
  "stellenbosch university": {
    short: "SU",
    nbt: "Recommended for competitive programmes. AL + QL; MAT for Engineering and Science.",
    nbt_level: "Medium",
    faculties: "Engineering: APS 34+, Maths 70%+\nMedicine: APS 40+\nCommerce: APS 30+\nArts: APS 28+",
    apply_url: "https://www.sun.ac.za/apply",
    province: "Western Cape",
  },
  "university of johannesburg": {
    short: "UJ",
    nbt: "Required for selected programmes. AL + QL; MAT for STEM.",
    nbt_level: "Medium",
    faculties: "Engineering: APS 28+, Maths 60%+\nLaw: APS 30+\nEducation: APS 24+\nBusiness: APS 26+",
    apply_url: "https://www.uj.ac.za/apply",
    province: "Gauteng",
  },
  "ukzn": {
    short: "UKZN",
    nbt: "Required for all first-time applicants.",
    nbt_level: "Medium",
    faculties: "Medicine: APS 42+\nEngineering: APS 32+\nLaw: APS 30+\nCommerce: APS 26+",
    apply_url: "https://www.ukzn.ac.za/apply",
    province: "KwaZulu-Natal",
  },
  "nelson mandela university": {
    short: "NMU",
    nbt: "Recommended but not mandatory for all programmes.",
    nbt_level: "Low",
    faculties: "Engineering: APS 28+\nLaw: APS 26+\nEducation: APS 22+\nBusiness: APS 24+",
    apply_url: "https://www.mandela.ac.za/apply",
    province: "Eastern Cape",
  },
  "university of the western cape": {
    short: "UWC",
    nbt: "Required for Health Sciences and Dentistry programmes.",
    nbt_level: "Medium",
    faculties: "Dentistry: APS 34+\nPharmacy: APS 28+\nLaw: APS 26+\nNatural Sciences: APS 24+",
    apply_url: "https://www.uwc.ac.za/apply",
    province: "Western Cape",
  },
  "rhodes university": {
    short: "Rhodes",
    nbt: "Not currently required.",
    nbt_level: "None",
    faculties: "Humanities: APS 30+\nScience: APS 32+\nLaw: APS 30+\nEducation: APS 24+",
    apply_url: "https://www.ru.ac.za/apply",
    province: "Eastern Cape",
  },
  "unisa": {
    short: "UNISA",
    nbt: "Not required (distance learning institution).",
    nbt_level: "None",
    faculties: "Open entry for most diplomas. Degrees vary by faculty. No fixed APS — NSC pass sufficient for many programmes.",
    apply_url: "https://www.unisa.ac.za/apply",
    province: "National",
  },
  "cape peninsula university of technology": {
    short: "CPUT",
    nbt: "Not mandatory but recommended for Science & Engineering.",
    nbt_level: "Low",
    faculties: "Engineering: APS 26+\nBusiness: APS 24+\nInformatics: APS 24+",
    apply_url: "https://www.cput.ac.za/apply",
    province: "Western Cape",
  },
  "tshwane university of technology": {
    short: "TUT",
    nbt: "Not currently required.",
    nbt_level: "None",
    faculties: "Engineering: APS 24+\nBusiness: APS 22+\nICT: APS 22+",
    apply_url: "https://www.tut.ac.za/apply",
    province: "Gauteng",
  },
};

const NBT_BADGE = {
  High:   "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-800",
  Low:    "bg-blue-100 text-blue-700",
  None:   "bg-gray-100 text-gray-600",
};

function fuzzyMatch(name, key) {
  const n = name.toLowerCase();
  const k = key.toLowerCase();
  return n.includes(k) || k.includes(n) || n.split(' ').some(w => k.includes(w) && w.length > 3);
}

function getKnowledge(uniName) {
  const name = uniName.toLowerCase();
  for (const [key, val] of Object.entries(UNI_KNOWLEDGE)) {
    if (fuzzyMatch(name, key)) return val;
  }
  return null;
}

function Cell({ children, className = '' }) {
  return <td className={`px-4 py-3 text-sm align-top border-b border-border ${className}`}>{children}</td>;
}

function RowLabel({ label, sub }) {
  return (
    <td className="px-4 py-3 text-xs font-semibold text-muted-foreground bg-muted/40 align-top border-b border-border whitespace-nowrap w-32">
      <div>{label}</div>
      {sub && <div className="font-normal text-muted-foreground/70 mt-0.5">{sub}</div>}
    </td>
  );
}

export default function UniversityComparison({ userEmail }) {
  const [trackedApps, setTrackedApps] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [prospectuses, setProspectuses] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load tracked applications
      let apps = [];
      if (userEmail) {
        const { data, error } = await supabase
          .from('university_applications')
          .select('*')
          .eq('student_email', userEmail);
        
        if (error) throw error;
        apps = data || [];
      }
      setTrackedApps(apps);
      
      // Load application deadlines
      const { data: dl, error: dlError } = await supabase
        .from('application_deadlines')
        .select('*')
        .eq('is_approved', true)
        .order('date', { ascending: true })
        .limit(100);
      
      if (dlError) throw dlError;
      setDeadlines(dl || []);
      
      // Load university prospectuses
      const { data: pros, error: prosError } = await supabase
        .from('university_prospectuses')
        .select('*')
        .eq('is_approved', true)
        .order('year', { ascending: false })
        .limit(50);
      
      if (prosError) throw prosError;
      setProspectuses(pros || []);
    } catch (err) {
      console.error('Error loading comparison data:', err);
      toast.error('Failed to load university data');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSelect = (uniName) => {
    setSelected(prev => {
      if (prev.includes(uniName)) return prev.filter(u => u !== uniName);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, uniName];
    });
  };

  // Derive unique university names from tracked apps
  const trackedUniNames = [...new Set(trackedApps.map(a => a.university_name).filter(Boolean))];

  // For a given uni, find matching deadlines
  const getDeadlinesFor = (uniName) => {
    return deadlines.filter(d => {
      const du = (d.university || '').toLowerCase();
      const un = uniName.toLowerCase();
      return du && (du.includes(un.split(' ')[0]) || un.includes(du.split(' ')[0]));
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getProspectusFor = (uniName) => {
    return prospectuses.find(p => {
      const pu = (p.university_name || '').toLowerCase();
      const un = uniName.toLowerCase();
      return pu.includes(un.split(' ')[0]) || un.includes(pu.split(' ')[0]);
    });
  };

  const getAppFor = (uniName) => trackedApps.find(a => a.university_name === uniName);

  const comparisonData = selected.map(uniName => ({
    uniName,
    knowledge: getKnowledge(uniName),
    deadlineList: getDeadlinesFor(uniName),
    prospectus: getProspectusFor(uniName),
    app: getAppFor(uniName),
  }));

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
        <GitCompareArrows className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Compare Universities</h3>
        <Badge variant="outline" className="text-xs ml-1">Select 2–3</Badge>
      </div>

      {trackedUniNames.length === 0 && (
        <div className="text-center py-10 bg-muted/30 rounded-xl">
          <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="font-medium text-sm">No tracked universities yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add universities in the "My Applications" tab to compare them here.</p>
        </div>
      )}

      {trackedUniNames.length > 0 && (
        <>
          {/* University selector chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {trackedUniNames.map(name => {
              const isSelected = selected.includes(name);
              const app = getAppFor(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleSelect(name)}
                  disabled={!isSelected && selected.length >= 3}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
                    ${isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : selected.length >= 3
                        ? 'bg-muted/30 text-muted-foreground border-border cursor-not-allowed opacity-50'
                        : 'bg-card border-border hover:border-primary/60 hover:bg-primary/5'
                    }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[160px]">{name}</span>
                  {app && (
                    <Badge className={`text-xs px-1.5 py-0 ml-1 ${
                      app.stage === 'Accepted' ? 'bg-green-100 text-green-700' :
                      app.stage === 'Rejected' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{app.stage}</Badge>
                  )}
                  {isSelected && <X className="w-3 h-3 ml-1 opacity-70" />}
                </button>
              );
            })}
          </div>

          {selected.length < 2 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 mb-4">
              <Info className="w-4 h-4 flex-shrink-0" />
              Select at least 2 universities above to see the comparison table.
            </div>
          )}

          {/* Comparison Table */}
          {selected.length >= 2 && (
            <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-primary/8">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-32 border-b border-border">Category</th>
                    {comparisonData.map(({ uniName, knowledge }) => (
                      <th key={uniName} className="px-4 py-3 text-left border-b border-border">
                        <div className="font-semibold text-sm text-foreground leading-tight">{knowledge?.short || uniName}</div>
                        <div className="text-xs text-muted-foreground font-normal truncate max-w-[160px]">{knowledge?.province || ''}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Application Stage */}
                  <tr className="hover:bg-muted/20">
                    <RowLabel label="My Stage" />
                    {comparisonData.map(({ uniName, app }) => (
                      <Cell key={uniName}>
                        {app ? (
                          <Badge className={`text-xs ${
                            app.stage === 'Accepted' ? 'bg-green-100 text-green-700' :
                            app.stage === 'Rejected' ? 'bg-red-100 text-red-700' :
                            app.stage === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-800'
                          }`}>{app.stage}</Badge>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                        {app?.course && <div className="text-xs text-muted-foreground mt-1">{app.course}</div>}
                        {app?.faculty && <div className="text-xs text-muted-foreground">{app.faculty}</div>}
                      </Cell>
                    ))}
                  </tr>

                  {/* Application Deadlines */}
                  <tr className="hover:bg-muted/20">
                    <RowLabel label="Deadlines" sub="from calendar" />
                    {comparisonData.map(({ uniName, app, deadlineList }) => (
                      <Cell key={uniName}>
                        {deadlineList.length > 0 ? (
                          <div className="space-y-1">
                            {deadlineList.slice(0, 3).map(d => (
                              <div key={d.id} className="flex items-start gap-1.5">
                                <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-xs font-medium leading-tight">{d.event_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(d.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {app?.deadline ? (
                              <div className="flex items-start gap-1.5">
                                <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="text-xs">
                                  <div className="font-medium">Custom deadline</div>
                                  <div className="text-muted-foreground">
                                    {new Date(app.deadline).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">No deadlines on record</span>
                            )}
                          </div>
                        )}
                      </Cell>
                    ))}
                  </tr>

                  {/* NBT Requirements */}
                  <tr className="hover:bg-muted/20">
                    <RowLabel label="NBT Required" />
                    {comparisonData.map(({ uniName, knowledge }) => (
                      <Cell key={uniName}>
                        {knowledge ? (
                          <div className="space-y-1.5">
                            <Badge className={`text-xs ${NBT_BADGE[knowledge.nbt_level]}`}>
                              {knowledge.nbt_level} requirement
                            </Badge>
                            <p className="text-xs text-muted-foreground leading-relaxed">{knowledge.nbt}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Check university website</span>
                        )}
                      </Cell>
                    ))}
                  </tr>

                  {/* Faculty Admission APS */}
                  <tr className="hover:bg-muted/20">
                    <RowLabel label="Faculty APS" sub="key programmes" />
                    {comparisonData.map(({ uniName, knowledge }) => (
                      <Cell key={uniName}>
                        {knowledge?.faculties ? (
                          <div className="space-y-1">
                            {knowledge.faculties.split('\n').map((line, i) => (
                              <div key={i} className="text-xs text-muted-foreground leading-snug">
                                {line}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </Cell>
                    ))}
                  </tr>

                  {/* Prospectus */}
                  <tr className="hover:bg-muted/20">
                    <RowLabel label="Prospectus" />
                    {comparisonData.map(({ uniName, prospectus, knowledge }) => (
                      <Cell key={uniName}>
                        {prospectus ? (
                          <a
                            href={prospectus.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                            {prospectus.year} Prospectus <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not in library</span>
                        )}
                      </Cell>
                    ))}
                  </tr>

                  {/* Apply Link */}
                  <tr className="hover:bg-muted/20">
                    <RowLabel label="Apply" />
                    {comparisonData.map(({ uniName, app, knowledge, prospectus }) => {
                      const url = app?.application_link || prospectus?.application_link || knowledge?.apply_url;
                      return (
                        <Cell key={uniName}>
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                            >
                              Apply Now <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </Cell>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {selected.length >= 2 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              * APS and NBT data is indicative. Always verify on the official university website before applying.
            </p>
          )}
        </>
      )}
    </div>
  );
}