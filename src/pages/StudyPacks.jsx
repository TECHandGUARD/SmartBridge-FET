import ShareLinks from '@/components/marketing/ShareLinks';
import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  Download,
  Search,
  ArrowLeft,
  GraduationCap,
  WifiOff,
  Eye,
} from "lucide-react";
import TopicVisual from "@/components/resources/TopicVisual";
import packs from "@/data/study-packs.json";
import files from "@/data/study-pack-files.json";
import { SUBJECTS } from "@/lib/subjects";
import "./study-packs.css";
const fileById = new Map(files.map((f) => [f.id, f]));
export const packStats = {
  packs: packs.length,
  subjects: new Set(packs.map((p) => p.code)).size,
  questions: packs.reduce((n, p) => n + p.questions.length, 0),
};
function Header() {
  return (
    <header className="learn-nav">
      <Link to="/learn" className="learn-brand">
        <BookOpen aria-hidden="true" />
        SmartBridge FET
      </Link>
      <nav aria-label="Learning navigation" className="flex-wrap">
        <Link to="/learn#collection">Study guides</Link>
        <Link to="/find-tutors">Tutors</Link><Link to="/news">News</Link><Link to="/refer">Invite</Link><Link to="/login">Sign in</Link>
        <Link className="learn-button" to="/register">
          Get started <ArrowRight size={16} />
        </Link>
      </nav>
    </header>

  );
}
export function StudyPackLinks({ code = null }) {
  const selected = packs.filter((p) => !code || p.code === code);
  const previews = code ? selected : ['math-11', 'lisc-10', 'geo-12'].map(id => packs.find(p => p.id === id));
  return (
    <section className="resource-discovery" aria-label="Visual study resources">
      <div className="resource-discovery-heading">
        <div><p className="learn-eyebrow">SEE IT. UNDERSTAND IT. TRY IT.</p>
          <h2>Start with a picture of the idea.</h2>
          <p>{selected.length} free topic guides with diagrams, worked examples and answers.</p>
        </div>
        <Link className="learn-button" to={code ? `/learn?subject=${code}#collection` : '/learn#collection'}>Browse guides <ArrowRight size={17} /></Link>
      </div>
      <div className="resource-visual-grid">{previews.map(p => <Link key={p.id} to={'/study-packs/' + p.id} className="resource-visual-card">
        <TopicVisual pack={p} preview />
        <div><span>Grade {p.grade} · {p.subject}</span><h3>{p.title}</h3><span>Explore the diagram and lesson →</span></div>
      </Link>)}</div>
      <div className="resource-learning-paths">
        <Link to="/learn#collection"><BookOpen size={20} /><div><strong>Visual guides</strong><span>Read → follow an example → practise</span></div></Link>
        <Link to="/search"><Search size={20} /><div><strong>Find a resource</strong><span>Search by subject, grade and type</span></div></Link>
        <Link to="/student-dashboard?section=ai"><GraduationCap size={20} /><div><strong>Ask the study assistant</strong><span>Premium AI tools · check source references</span></div></Link>
      </div>
      <p className="resource-source-help">The study assistant can retrieve indexed passages from the knowledge base. Check the source title and page references in its response; an explanation may also use web research or general knowledge. Original books keep their publisher attribution.</p>
    </section>
  );
}

export function VisualTable({ pack }) {
  return (
    <figure className="learn-visual">
      <figcaption>{pack.visual.title}</figcaption>
      <div
        className="learn-table-scroll"
        role="region"
        aria-label={pack.visual.title}
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              {pack.visual.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pack.visual.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
function Guide() {
  const { packId } = useParams();
  const p = packs.find((p) => p.id === packId);
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState({});
  if (!p)
    return (
      <div className="learn-page">
        <Header /><div className="max-w-6xl mx-auto px-6 pt-4"><ShareLinks path={window.location.pathname+window.location.search} title="Free SmartBridge FET study guides"/></div>
        <main className="learn-shell">
          <h1>Guide not found</h1>
          <Link to="/learn#collection">Browse available guides</Link>
        </main>
      </div>
    );
  const f = fileById.get(p.id);
  return (
    <div className="learn-page">
      <Header /><div className="max-w-6xl mx-auto px-6 pt-4"><ShareLinks path={window.location.pathname+window.location.search} title="Free SmartBridge FET study guides"/></div>
      <main
        className="learn-shell learn-reader"
        lang={
          { Afrikaans: "af", isiXhosa: "xh", isiZulu: "zu", English: "en" }[
            p.language
          ]
        }
      >
        <Link
          to={"/learn?subject=" + p.code + "#collection"}
          className="learn-back"
        >
          <ArrowLeft size={17} /> All {p.subject} guides
        </Link>
        <div className="learn-reader-heading">
          <div>
            <p className="learn-eyebrow">
              GRADE {p.grade} / {p.subject} / {p.language}
            </p>
            <h1>{p.title}</h1>
            <p className="learn-muted">
              Focused topic guide · {p.minutes} minutes · Edition {p.edition}
            </p>
          </div>
          <a className="learn-button" href={p.pdfUrl} download>
            <Download size={18} /> Download PDF · {Math.ceil(f.bytes / 1024)} KB
          </a>
        </div>
        <aside className="learn-coverage">
          <strong>CAPS topic focus</strong>
          <p>{p.capsTopic}</p>
          <small>
            A selected-topic supplement. This guide does not cover the entire
            grade syllabus. Subject-teacher and language-specialist review
            pending.
          </small>
        </aside>
        <nav className="learn-reader-tabs" aria-label="Guide sections">
          <a href="#understand">01 · Understand</a><a href="#worked-example">02 · Worked example</a><a href="#practise">03 · Practise</a>
        </nav>
        <div className="learn-reader-grid">
          <article>
            <section id="understand">
              <p className="learn-eyebrow">01 / UNDERSTAND</p>
              <h2>Build the idea</h2>
              <ul className="learn-goals">
                {p.goals.map((g) => (
                  <li key={g}>
                    <Check size={16} />
                    {g}
                  </li>
                ))}
              </ul>
              <TopicVisual pack={p} />
              <div className="learn-note-cards">{p.notes.map((n, i) => (
                <div key={n} className="learn-note-card"><span aria-hidden="true">{i + 1}</span><p>{n}</p></div>
              ))}</div>
              <VisualTable pack={p} />
            </section>
            <section id="worked-example">
              <p className="learn-eyebrow">02 / FOLLOW THE REASONING</p>
              <h2>A worked example</h2>
              <p className="learn-question">{p.example}</p>
              <ol className="learn-steps">
                {p.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <aside className="learn-mistake">
                <strong>Common mistake to avoid</strong>
                <p>{p.commonMistake}</p>
              </aside>
            </section>
            <section id="practise">
              <p className="learn-eyebrow">03 / PRACTISE</p>
              <h2>Make the thinking your own</h2>
              <p>
                Try these before opening the answer guide. Use a notebook or
                type a short attempt below. Typed attempts stay in this page
                only and clear when it closes.
              </p>
              {p.questions.map((q, i) => (
                <label className="learn-practice" key={q}>
                  <strong>
                    {i + 1}. {q}
                  </strong>
                  <textarea
                    rows={3}
                    maxLength={3000}
                    aria-label={"Your attempt " + (i + 1)}
                    value={attempts[i] || ""}
                    onChange={(e) =>
                      setAttempts((a) => ({ ...a, [i]: e.target.value }))
                    }
                  />
                </label>
              ))}
              <button
                className="learn-button"
                aria-expanded={revealed}
                onClick={() => setRevealed((v) => !v)}
              >
                <Eye size={17} />
                {revealed ? "Hide answer guide" : "Open answer guide"}
              </button>
              {revealed && (
                <div className="learn-answers">
                  <h3>Check, correct, explain</h3>
                  <ol>
                    {p.answers.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ol>
                  <p>
                    This is self-check practice, not a marked assessment.
                    Explain one correction in your own words, then revisit the
                    topic tomorrow.
                  </p>
                </div>
              )}
            </section>
          </article>
          <aside className="learn-reader-aside">
            <p className="learn-eyebrow">YOUR STUDY ROUTE</p>
            <h3>A small step, done well.</h3>
            <ol>
              <li>Read the explanation.</li>
              <li>Follow the example.</li>
              <li>Attempt all three questions.</li>
              <li>Explain one correction.</li>
              <li>Try again after a gap.</li>
            </ol>
            <a href={p.pdfUrl} download className="learn-text-link">
              <WifiOff size={17} /> Keep the PDF for offline study
            </a>
            <p>
              No video download needed. The file contains the explanation,
              visual table, practice and answers.
            </p>
            {p.furtherReading && (
              <>
                <hr />
                <h3>Continue with the book</h3>
                <p>{p.furtherReading}</p>
                <Link to="/search">Open signed-in resource search →</Link>
              </>
            )}
            <hr />
            <h3>Need another explanation?</h3>
            <Link to="/student-dashboard?section=ai">Open the study assistant →</Link>
            <p>Ask about this topic and check any source titles and page references. The assistant can search indexed knowledge-base passages; a response may also use other evidence.</p>
            <hr />
            <h3>Curriculum reference</h3>
            <a href={p.sourceUrl} target="_blank" rel="noreferrer">
              {p.sourceLabel} ↗
            </a>
            <p>
              Original SmartBridge content and visuals, with AI-assisted
              authoring. Not DBE endorsed. Use your school’s prescribed texts
              and teaching plan alongside this guide.
            </p>
            <a
              className="learn-text-link"
              href={
                "mailto:aneleq@techandguard.co.za?subject=" +
                encodeURIComponent("Study guide correction: " + p.id)
              }
            >
              Report a correction · {p.id}
            </a>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
function Footer() {
  return (
    <footer className="learn-footer">
      <span>SmartBridge FET · Learning, with a next step.</span>
      <div>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <a href="mailto:aneleq@techandguard.co.za">Contact</a>
      </div>
    </footer>
  );
}
export default function StudyPacks() {
  const [params, setParams] = useSearchParams();
  const subject = params.get("subject") || "";
  const grade = params.get("grade") || "";
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      packs.filter(
        (p) =>
          (!subject || p.code === subject) &&
          (!grade || p.grade === Number(grade)) &&
          `${p.title} ${p.subject} ${p.capsTopic}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [subject, grade, search],
  );
  const choose = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  };
  return (
    <div className="learn-page">
      <Header /><div className="max-w-6xl mx-auto px-6 pt-4"><ShareLinks path={window.location.pathname+window.location.search} title="Free SmartBridge FET study guides"/></div>
      <main>
        <section className="learn-hero learn-shell">
          <div>
            <p className="learn-eyebrow">FOR SOUTH AFRICAN GRADES 10–12</p>
            <h1>
              Understanding starts
              <br />
              with <em>one clear idea.</em>
            </h1>
            <p className="learn-lead">
              Thoughtful study guides. Visual explanations. Practice that helps
              you understand your mistakes. Explore the SmartBridge FET
              collection before you sign up.
            </p>
            <div className="learn-actions">
              <a href="#collection" className="learn-button">
                Explore the collection <ArrowRight size={18} />
              </a>
              <Link to="/study-packs/math-12" className="learn-text-link">
                Read a real guide <ArrowRight size={17} />
              </Link>
            </div>
            <p className="learn-caption">
              Free guides · No card required · Download once, study offline
            </p>
          </div>
          <div className="learn-preview">
            <p className="learn-eyebrow">INSIDE THE COLLECTION / GRADE 12</p>
            <h2>
              From a formula
              <br />
              to a reason.
            </h2>
            <TopicVisual pack={packs.find(p => p.id === 'math-12')} preview />
            <div className="learn-example-row">
              <span>Differentiate</span>
              <strong>f′(x) = 3x² − 3</strong>
            </div>
            <div className="learn-example-row">
              <span>Find stationary points</span>
              <strong>x = −1 or x = 1</strong>
            </div>
            <div className="learn-example-row">
              <span>Explain the change</span>
              <strong>Gradient + → − : local maximum</strong>
            </div>
            <Link to="/study-packs/math-12">
              Open this guide <ArrowRight size={17} />
            </Link>
          </div>
        </section>
        <section
          className="learn-proof learn-shell"
          aria-label="Available collection"
        >
          <div>
            <strong>{packStats.packs}</strong>
            <span>downloadable topic guides</span>
          </div>
          <div>
            <strong>{packStats.subjects}</strong>
            <span>supported subjects</span>
          </div>
          <div>
            <strong>10–12</strong>
            <span>all three FET grades</span>
          </div>
          <div>
            <strong>{packStats.questions}</strong>
            <span>questions with answer guides</span>
          </div>
        </section>
        <section className="learn-shell learn-promise">
          <div>
            <p className="learn-eyebrow">QUALITY YOU CAN OPEN</p>
            <h2>
              See the work.
              <br />
              Then decide.
            </h2>
            <p>
              Every card below opens the actual guide, with a matching PDF. Each
              shows its CAPS topic focus, language and edition. Counts describe
              this published collection; they are not claims about tutors, exam
              results or complete syllabus coverage.
            </p>
          </div>
          <div className="learn-promise-grid">
            {[
              {
                Icon: BookOpen,
                title: "Understand",
                body: "An explanatory diagram and visual table that make relationships easier to see.",
              },
              {
                Icon: GraduationCap,
                title: "Apply",
                body: "A worked example that shows the reasoning, followed by independent practice.",
              },
              {
                Icon: Check,
                title: "Improve",
                body: "Answer explanations, a common mistake to avoid and a prompt to revisit the skill.",
              },
              {
                Icon: WifiOff,
                title: "Keep learning",
                body: "Small PDFs for a phone, a printed page or a study session away from Wi-Fi.",
              },
            ].map(({ Icon, title, body }) => (
              <article key={title}>
                <Icon aria-hidden="true" />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="learn-shell learn-collection" id="collection">
          <div className="learn-section-heading">
            <div>
              <p className="learn-eyebrow">THE FIRST EDITION</p>
              <h2>Find your next clear idea.</h2>
            </div>
            <p>
              Focused CAPS topic supplements.
              <br />
              One guide per supported subject and grade.
            </p>
          </div>
          <div className="learn-filters">
            <label>
              Subject
              <select
                aria-label="Subject"
                value={subject}
                onChange={(e) => choose("subject", e.target.value)}
              >
                <option value="">All subjects</option>
                {SUBJECTS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Grade
              <select
                aria-label="Grade"
                value={grade}
                onChange={(e) => choose("grade", e.target.value)}
              >
                <option value="">All grades</option>
                {[10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="learn-search">
              Search topics
              <div>
                <Search size={17} />
                <input
                  aria-label="Search topics"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Try calculus, cells or poetry"
                />
              </div>
            </label>
          </div>
          <div className="learn-results-toolbar"><p className="learn-result-count" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "guide" : "guides"}{" "}
            available
          </p>{(subject || grade || search) && <button type="button" className="learn-clear" onClick={() => {setParams({}); setSearch("");}}>Clear filters</button>}</div>
          <div className="learn-cards">
            {filtered.map((p) => (
              <article key={p.id} className="learn-card">
                <Link to={'/study-packs/' + p.id} className="learn-card-image" aria-label={'Explore diagram: ' + p.title}><TopicVisual pack={p} preview /></Link>
                <div className="learn-card-top">
                  <span>GRADE {p.grade}</span>
                  <BookOpen size={20} aria-hidden="true" />
                </div>
                <p>
                  {p.subject} · {p.language}
                </p>
                <h3>
                  <Link to={"/study-packs/" + p.id}>{p.title}</Link>
                </h3>
                <p className="learn-card-topic">{p.capsTopic}</p>
                <p className="learn-card-meta">{p.minutes} min · Diagram + example + 3 questions</p>
                <ul>
                  {p.goals.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
                <div className="learn-card-bottom">
                  <Link to={"/study-packs/" + p.id}>
                    Read guide <ArrowRight size={16} />
                  </Link>
                  <a
                    href={p.pdfUrl}
                    download
                    aria-label={
                      "Download " + p.subject + " Grade " + p.grade + " PDF"
                    }
                  >
                    <Download size={16} />{" "}
                    {Math.ceil(fileById.get(p.id).bytes / 1024)} KB
                  </a>
                </div>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <div className="learn-empty">
              No guides match these filters.{" "}
              <button
                onClick={() => {
                  setParams({});
                  setSearch("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
        <section className="learn-shell learn-source-note">
          <h2>A growing collection, with honest coverage.</h2>
          <p>
            These original SmartBridge guides supplement the curriculum. They
            are not complete textbooks, prescribed literature or DBE-endorsed
            publications. AI-assisted first editions are awaiting
            subject-teacher and language-specialist review. Source links and
            correction reporting appear in every guide.
          </p>
          <p>
            The signed-in platform also has a separate educational book
            collection and a passage search index. Those books retain their
            original attribution; indexed passages are not counted as additional
            study guides here.
          </p>
          <div className="learn-actions">
            <Link to="/register" className="learn-button">
              Start your learning journey <ArrowRight size={17} />
            </Link>
            <a
              href="https://www.education.gov.za/Curriculum/NCSGradesR12/CAPSFET/tabid/570/Default.aspx"
              target="_blank"
              rel="noreferrer"
            >
              View official CAPS references ↗
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
export function StudyGuide() {
  const { packId } = useParams();
  return <Guide key={packId} />;
}
