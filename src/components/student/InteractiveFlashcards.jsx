import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, BookMarked, CheckCircle, XCircle } from 'lucide-react';

// Flashcards organized by subject AND grade
const FLASHCARD_SETS = {
  math: {
    10: [
      { front: 'What is the quadratic formula?', back: 'x = (-b ± √(b²-4ac)) / 2a' },
      { front: 'What is the difference of squares?', back: 'a² - b² = (a+b)(a-b)' },
      { front: 'What is 20% of 150?', back: '30' },
    ],
    11: [
      { front: 'What is the derivative of sin(x)?', back: 'cos(x)' },
      { front: 'What is the sum of interior angles of a polygon with n sides?', back: '(n-2) × 180°' },
      { front: 'State the Pythagorean theorem.', back: 'a² + b² = c²' },
    ],
    12: [
      { front: 'What is the derivative of ln(x)?', back: '1/x' },
      { front: 'What is the integral of x²?', back: 'x³/3 + C' },
      { front: 'What is the value of π (pi) to two decimal places?', back: '3.14' },
    ],
  },
  phsc: {
    10: [
      { front: "State Newton's Second Law of Motion.", back: 'F = ma' },
      { front: 'What is the formula for density?', back: 'Density = Mass / Volume' },
      { front: 'What is the pH of a neutral solution?', back: '7' },
    ],
    11: [
      { front: "What does Ohm's Law state?", back: 'V = IR' },
      { front: 'What is the charge of an electron?', back: '-1.6 × 10⁻¹⁹ C' },
      { front: 'What is the speed of light?', back: '3 × 10⁸ m/s' },
    ],
    12: [
      { front: 'What is the photoelectric effect?', back: 'Emission of electrons when light hits a metal surface.' },
      { front: 'What is the half-life formula?', back: 'N = N₀(1/2)^(t/t½)' },
      { front: 'Define electronegativity.', back: 'An atom\'s ability to attract electrons.' },
    ],
  },
  lisc: {
    10: [
      { front: 'What is the function of the nucleus?', back: 'Controls cell activities and contains DNA.' },
      { front: 'Define an ecosystem.', back: 'Living organisms interacting with their non-living environment.' },
      { front: 'What is photosynthesis?', back: 'Plants convert sunlight, CO₂, water into glucose and oxygen.' },
    ],
    11: [
      { front: 'What is the powerhouse of the cell?', back: 'Mitochondria — produces ATP.' },
      { front: 'Define natural selection.', back: 'Organisms with favourable traits survive and reproduce more.' },
      { front: 'What is DNA?', back: 'Deoxyribonucleic acid — carries genetic information.' },
    ],
    12: [
      { front: "What is Mendel's Law of Segregation?", back: 'Two alleles separate during gamete formation.' },
      { front: 'What is homeostasis?', back: 'Maintaining a stable internal environment.' },
      { front: 'What is a mutation?', back: 'A change in the DNA sequence.' },
    ],
  },
  acc: {
    10: [
      { front: 'What is the accounting equation?', back: 'Assets = Liabilities + Owner\'s Equity' },
      { front: 'Define a creditor.', back: 'Someone to whom the business owes money.' },
      { front: 'What is a debtor?', back: 'Someone who owes money to the business.' },
    ],
    11: [
      { front: 'Define depreciation.', back: 'Systematic reduction in a fixed asset\'s recorded cost.' },
      { front: 'What is a trial balance?', back: 'A list of ledger balances to check debits = credits.' },
      { front: 'What is gross profit?', back: 'Sales – Cost of Goods Sold' },
    ],
    12: [
      { front: 'What is a cash flow statement?', back: 'Shows cash inflows and outflows over a period.' },
      { front: 'Define a non-current asset?', back: 'An asset expected to last more than one year.' },
      { front: 'What is the difference between a debit and credit?', back: 'Debit records expense/asset increase; Credit records liability/income increase.' },
    ],
  },
  bus: {
    10: [
      { front: 'What is a stakeholder?', back: 'Anyone affected by a business\'s activities.' },
      { front: 'What is a sole proprietorship?', back: 'A business owned by one person.' },
      { front: 'What is a partnership?', back: 'A business owned by 2-20 people.' },
    ],
    11: [
      { front: 'Define SWOT analysis.', back: 'Strengths, Weaknesses, Opportunities, Threats.' },
      { front: 'What is market research?', back: 'Gathering information about consumer needs.' },
      { front: 'Define branding.', back: 'Creating a unique name, symbol, or design for a product.' },
    ],
    12: [
      { front: 'What is the triple bottom line?', back: 'People, Planet, Profit.' },
      { front: 'What is the purpose of a business plan?', back: 'Outlines goals, strategies, and financial projections.' },
      { front: 'Define corporate social responsibility (CSR).', back: 'Businesses acting ethically and contributing to society.' },
    ],
  },
  eco: {
    10: [
      { front: 'Define scarcity.', back: 'Limited resources relative to unlimited wants.' },
      { front: 'What is opportunity cost?', back: 'The value of the next best alternative foregone.' },
      { front: 'What is the law of demand?', back: 'As price increases, quantity demanded decreases.' },
    ],
    11: [
      { front: 'Define inflation.', back: 'A sustained increase in general price levels.' },
      { front: 'What is GDP?', back: 'Total value of goods and services produced in a country in a year.' },
      { front: 'Define a monopoly.', back: 'A single seller dominates the market.' },
    ],
    12: [
      { front: 'What is the SARB?', back: 'South African Reserve Bank — manages monetary policy.' },
      { front: 'What is fiscal policy?', back: 'Government use of taxation and spending to influence the economy.' },
      { front: 'What is monetary policy?', back: 'Central bank control of interest rates and money supply.' },
    ],
  },
  geo: {
    10: [
      { front: 'What is the difference between weather and climate?', back: 'Weather is short-term; climate is long-term patterns.' },
      { front: 'What causes earthquakes?', back: 'Movement of tectonic plates.' },
      { front: 'Define erosion.', back: 'Wearing away of soil and rock by wind, water, or ice.' },
    ],
    11: [
      { front: 'Define urbanisation.', back: 'Movement of people from rural areas to cities.' },
      { front: 'What is a plateau?', back: 'An elevated flat area of land.' },
      { front: 'What is the greenhouse effect?', back: 'Trapping of heat by gases in the atmosphere.' },
    ],
    12: [
      { front: 'What is a GIS?', back: 'Geographic Information System — maps data.' },
      { front: 'What is remote sensing?', back: 'Collecting data from satellites or aircraft.' },
      { front: 'What is the difference between renewable and non-renewable resources?', back: 'Renewable can be replenished; non-renewable cannot.' },
    ],
  },
  hist: {
    10: [
      { front: 'What was the Cold War?', back: 'Conflict (1947–1991) between USA and USSR.' },
      { front: 'What caused World War I?', back: 'Assassination of Archduke Franz Ferdinand + MAIN causes.' },
      { front: 'What was the Berlin Wall?', back: 'Wall dividing East and West Berlin (1961-1989).' },
    ],
    11: [
      { front: 'When did apartheid end in South Africa?', back: '1994 — first democratic elections.' },
      { front: 'What was the Sharpeville Massacre?', back: '21 March 1960 — police killed 69 protesters.' },
      { front: 'Who was the first President of post-apartheid SA?', back: 'Nelson Mandela (1994–1999).' },
    ],
    12: [
      { front: 'What was the Soweto Uprising?', back: '16 June 1976 — student protests against Afrikaans.' },
      { front: 'What was the Truth and Reconciliation Commission?', back: 'Post-apartheid hearings for apartheid-era crimes.' },
      { front: 'Who was Steve Biko?', back: 'Anti-apartheid activist and Black Consciousness Movement leader.' },
    ],
  },
  eng: {
    10: [
      { front: 'What is a simile?', back: 'A comparison using "like" or "as".' },
      { front: 'What is a metaphor?', back: 'A direct comparison without "like" or "as".' },
      { front: 'What is alliteration?', back: 'Repetition of initial consonant sounds.' },
    ],
    11: [
      { front: 'What is personification?', back: 'Giving human qualities to non-human things.' },
      { front: 'Define irony.', back: 'A contrast between expectation and reality.' },
      { front: 'What is a thesis statement?', back: 'The main argument of an essay.' },
    ],
    12: [
      { front: 'What is the difference between affect and effect?', back: 'Affect is verb; Effect is noun.' },
      { front: 'What is a sonnet?', back: 'A 14-line poem, typically in iambic pentameter.' },
      { front: 'What is a metaphor?', back: 'A figure of speech comparing two things directly.' },
    ],
  },
  afr: {
    10: [
      { front: 'Wat is \'n selfstandige naamwoord?', back: '\'n Woord wat \'n persoon, plek, ding of idee benoem.' },
      { front: 'Wat is \'n byvoeglike naamwoord?', back: 'Beskryf \'n selfstandige naamwoord.' },
      { front: 'Wat is die verlede tyd van "loop"?', back: 'Geval.' },
    ],
    11: [
      { front: 'Wat is \'n voorsetsel?', back: 'Toon verband tussen woorde in \'n sin.' },
      { front: 'Define \'n metafoor.', back: '\'n Vergelyking sonder "soos" of "soos".' },
      { front: 'Hoe skryf jy \'n opstel?', back: 'Inleiding, liggaam, gevolgtrekking.' },
    ],
    12: [
      { front: 'Wat is die hoofletterreël in Afrikaans?', back: 'Eerste letter van \'n sin, name, en selfstandige naamwoorde word met hoofletter geskryf.' },
      { front: 'Wat is \'n voegwoord?', back: 'Woord wat twee sinne verbind (bv. en, maar, want).' },
      { front: 'Wat is \'n bywoord?', back: 'Woord wat \'n werkwoord, byvoeglike naamwoord of ander bywoord beskryf.' },
    ],
  },
  mathlit: {
    10: [
      { front: 'How do you calculate percentage increase?', back: '(New - Original) / Original × 100%' },
      { front: 'What is VAT in South Africa?', back: '15%' },
      { front: 'How do you calculate the mean?', back: 'Sum of values ÷ number of values.' },
    ],
    11: [
      { front: 'What is the median?', back: 'Middle value when numbers are in order.' },
      { front: 'What is the mode?', back: 'Most frequently occurring value.' },
      { front: 'What is simple interest?', back: 'Interest = Principal × Rate × Time.' },
    ],
    12: [
      { front: 'What is compound interest?', back: 'Interest earned on interest.' },
      { front: 'What is the difference between profit and revenue?', back: 'Revenue is total income; Profit = Revenue - Expenses.' },
      { front: 'What is a budget?', back: 'A plan for income and expenses.' },
    ],
  },
  // NEW: isiXhosa Home Language
  xho: {
    10: [
      { front: 'Yintoni isibizo?', back: 'Igama elibizwa umntu, indawo, into, okanye ingcamango.' },
      { front: 'Yintoni isenzi?', back: 'Igama elibonisa isenzo okanye imeko (ukubaleka, ukutya, ukulala).' },
      { front: 'Yintoni isichazi?', back: 'Igama elichaza isibizo (umntu omde, indlu enkulu).' },
    ],
    11: [
      { front: 'Yintoni isihlomelo?', back: 'Igama elichaza isenzi (ukubaleka ngokukhawuleza).' },
      { front: 'Yintoni isimelabizo?', back: 'Igama elithatha indawo yesibizo (mna, wena, yena, yona).' },
      { front: 'Yintoni isibanjalo?', back: 'Igama elidibanisa amagama (kwaye, okanye, kodwa).' },
    ],
    12: [
      { front: 'Yintoni umhobe?', back: 'Umhobe yimbongo enemigca emifutshane ebonisa iimvakalelo ezinzulu.' },
      { front: 'Yintoni isaci?', back: 'Ibinzana elinentsingiselo eyahlukileyo (ukubamba ugwayi — ukufumana ithuba).' },
      { front: 'Yintoni iqhalo?', back: 'Ibinzana elifutshane elinobulumko (Inkomo ingumhlobo wabantu).' },
    ],
  },
};

const GRADE_OPTIONS = ['10', '11', '12'];

const SUBJECT_OPTIONS = [
  { code: 'math', name: 'Mathematics', icon: '📐' },
  { code: 'phsc', name: 'Physical Sciences', icon: '⚛️' },
  { code: 'lisc', name: 'Life Sciences', icon: '🧬' },
  { code: 'acc', name: 'Accounting', icon: '💰' },
  { code: 'bus', name: 'Business Studies', icon: '📊' },
  { code: 'eco', name: 'Economics', icon: '📈' },
  { code: 'geo', name: 'Geography', icon: '🌍' },
  { code: 'hist', name: 'History', icon: '📜' },
  { code: 'eng', name: 'English Home Language', icon: '📖' },
  { code: 'afr', name: 'Afrikaans First Additional Language', icon: '🇿🇦' },
  { code: 'mathlit', name: 'Mathematical Literacy', icon: '🧮' },
  { code: 'xho', name: 'isiXhosa Home Language', icon: '🗣️' },
];

export default function InteractiveFlashcards() {
  const [subject, setSubject] = useState('math');
  const [grade, setGrade] = useState('10');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState([]);
  const [unknown, setUnknown] = useState([]);

  const cards = FLASHCARD_SETS[subject]?.[grade] || [];
  const card = cards[index];
  const total = cards.length;
  const done = known.length + unknown.length;

  const handleSubject = (val) => {
    setSubject(val);
    setIndex(0);
    setFlipped(false);
    setKnown([]);
    setUnknown([]);
  };

  const handleGrade = (val) => {
    setGrade(val);
    setIndex(0);
    setFlipped(false);
    setKnown([]);
    setUnknown([]);
  };

  const next = (knew) => {
    if (knew) setKnown(prev => [...prev, index]);
    else setUnknown(prev => [...prev, index]);
    setFlipped(false);
    setTimeout(() => setIndex(i => Math.min(i + 1, total - 1)), 150);
  };

  const reset = () => {
    setIndex(0);
    setFlipped(false);
    setKnown([]);
    setUnknown([]);
  };

  const finished = done >= total;
  const currentSubject = SUBJECT_OPTIONS.find(s => s.code === subject);

  if (!card) {
    return (
      <Card className="border-border">
        <CardContent className="pt-8 pb-8 text-center">
          <p className="text-muted-foreground">No flashcards available for this subject and grade.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-playfair text-lg flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-primary" /> Interactive Flashcards
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Select value={subject} onValueChange={handleSubject}>
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {SUBJECT_OPTIONS.map(s => (
                <SelectItem key={s.code} value={s.code}>
                  {s.icon} {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={grade} onValueChange={handleGrade}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_OPTIONS.map(g => (
                <SelectItem key={g} value={g}>Grade {g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {currentSubject?.icon} Grade {grade} · {Math.min(index + 1, total)}/{total}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>

        {finished ? (
          <div className="text-center py-8 space-y-3">
            <div className="text-4xl">🎉</div>
            <p className="font-playfair font-bold text-xl">Set Complete!</p>
            <div className="flex justify-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-700"><CheckCircle className="w-4 h-4" /> {known.length} known</span>
              <span className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4" /> {unknown.length} review</span>
            </div>
            <Button onClick={reset} className="bg-primary gap-2 mt-2">
              <RotateCcw className="w-4 h-4" /> Restart
            </Button>
          </div>
        ) : (
          <>
            <div
              className="relative w-full cursor-pointer"
              style={{ minHeight: '200px' }}
              onClick={() => setFlipped(!flipped)}
            >
              <div className={`w-full rounded-2xl border-2 flex flex-col items-center justify-center p-6 text-center transition-all duration-300 min-h-48 ${flipped ? 'bg-primary/5 border-primary/30' : 'bg-muted/40 border-border hover:border-primary/30'}`}>
                <Badge className={`mb-3 text-xs ${flipped ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {flipped ? `Grade ${grade} ${currentSubject?.name} — Answer` : `Grade ${grade} ${currentSubject?.name} — Question`}
                </Badge>
                <p className={`font-semibold text-base leading-relaxed ${flipped ? 'text-primary font-bold' : 'text-foreground'}`}>
                  {flipped ? card.back : card.front}
                </p>
              </div>
            </div>

            {flipped ? (
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2 text-red-700 border-red-200 hover:bg-red-50" onClick={() => next(false)}>
                  <XCircle className="w-4 h-4" /> Still Learning
                </Button>
                <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => next(true)}>
                  <CheckCircle className="w-4 h-4" /> Got It!
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setFlipped(true)}>
                Reveal Answer
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}