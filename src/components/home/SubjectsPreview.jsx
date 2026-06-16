import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { SUBJECTS } from '@/lib/subjects';

export default function SubjectsPreview() {
  const preview = SUBJECTS.slice(0, 6);

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">CAPS Curriculum</p>
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-foreground mb-4">
            All 11 FET Subjects
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Fully aligned with the Curriculum and Assessment Policy Statement for South African Grades 10–12.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {preview.map((subject) => (
            <Link
              key={subject.code}
              to={`/subjects/${subject.code}`}
              className="group bg-card border border-border rounded-2xl p-4 text-center hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-2">{subject.icon}</div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                {subject.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{subject.category}</p>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link to="/subjects">
            <Button variant="outline" className="gap-2">
              View All Subjects <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
