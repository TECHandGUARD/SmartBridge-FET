import { useState } from 'react';
import { SIMULATIONS, SUBJECTS_SIM, GRADES_SIM } from '@/lib/simulations';
import SimulationCard from './SimulationCard';
import SimulationPlayer from './SimulationPlayer';
import QuizSync from './QuizSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical } from 'lucide-react';

export default function SimulationLab({ isTutor = false }) {
  const [subject, setSubject] = useState('All');
  const [grade, setGrade] = useState('All Grades');
  const [active, setActive] = useState(null); // currently playing simulation

  const filtered = SIMULATIONS.filter(s =>
    (subject === 'All' || s.subject === subject) &&
    (grade === 'All Grades' || s.grade === grade)
  );

  return (
    <>
      {/* Full-screen player (portal-like overlay) */}
      {active && (
        <SimulationPlayer
          simulation={active}
          isTutor={isTutor}
          onClose={() => setActive(null)}
        />
      )}

      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg font-playfair flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" /> Science Simulation Lab
              {isTutor && (
                <span className="text-xs font-normal text-muted-foreground bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2 py-0.5">
                  Tutor Mode
                </span>
              )}
            </CardTitle>
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-xl overflow-hidden border border-border">
                {SUBJECTS_SIM.map(s => (
                  <button
                    key={s}
                    onClick={() => setSubject(s)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      subject === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex rounded-xl overflow-hidden border border-border">
                {GRADES_SIM.map(g => (
                  <button
                    key={g}
                    onClick={() => setGrade(g)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      grade === g
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {g === 'All Grades' ? 'All' : g.replace('Grade ','')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(sim => (
              <SimulationCard key={sim.id} simulation={sim} onPlay={() => setActive(sim)} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-10 text-muted-foreground">
                <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No simulations match these filters.</p>
              </div>
            )}
          </div>

          {/* Quiz Sync panel — shown when a simulation is selected from the gallery without opening player */}
          {isTutor && (
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">
                Select a simulation above, then use Quiz Sync after the lesson:
              </p>
              <QuizSync simulation={SIMULATIONS.find(s =>
                (subject === 'All' ? true : s.subject === subject)
              ) || SIMULATIONS[0]} />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}