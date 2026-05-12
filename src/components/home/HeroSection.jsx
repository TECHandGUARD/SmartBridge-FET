import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, BookOpen, Users, Star } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 pt-16 pb-24">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div>
            <Badge className="mb-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              🇿🇦 CAPS-Aligned • Grades 10–12
            </Badge>
            <h1 className="font-playfair text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Learn Smarter.{' '}
              <span className="text-primary">Achieve More.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              South Africa's premier FET Phase learning platform. Access CAPS-aligned resources,
              connect with qualified tutors, and track your academic journey from Grade 10 to Matric.
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              {['No contracts', 'SACE Verified Tutors', 'POPIA Compliant'].map((item) =>
              <div key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  {item}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="/subjects">
                <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2 px-6">
                  Explore Subjects <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/premium">
                

                
              </Link>
            </div>
          </div>

          {/* Right: Stats cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
            { icon: BookOpen, label: 'CAPS Subjects', value: '11', color: 'bg-primary/10 text-primary' },
            { icon: Users, label: 'Verified Tutors', value: '50+', color: 'bg-secondary/20 text-amber-700' },
            { icon: Star, label: 'Resources', value: '500+', color: 'bg-green-100 text-green-700' },
            { icon: CheckCircle, label: 'Grades Covered', value: '10–12', color: 'bg-blue-100 text-blue-700' }].
            map(({ icon: Icon, label, value, color }) =>
            <div key={label} className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-playfair text-3xl font-bold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground mt-1">{label}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>);

}