import packs from '@/data/study-packs.json';
import { SUBJECTS } from '@/lib/subjects';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, BookOpen, Users, Star, Crown } from 'lucide-react';

// ============================================================
// Configuration (Soft-coded for future flexibility)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// Main Component
// ============================================================

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
              A learning platform built for South African FET learners. Explore focused study guides,
              explore tutor profiles, and track your academic journey from Grade 10 to Matric.
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              {['Grades 10–12', 'Visual study guides', 'Download for offline study'].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="/learn#collection">
                <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2 px-6">
                  Explore Study Guides <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/premium">
                <Button size="lg" variant="outline" className="gap-2 px-6">
                  <Crown className="w-4 h-4 text-amber-500" />
                  Go Premium
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Stats cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BookOpen, label: 'CAPS Subjects', value: String(SUBJECTS.length), color: 'bg-primary/10 text-primary' },
              { icon: Users, label: 'Subject-and-grade Guides', value: String(packs.length), color: 'bg-secondary/20 text-amber-700' },
              { icon: Star, label: 'Practice Questions', value: String(packs.reduce((n,p)=>n+p.questions.length,0)), color: 'bg-green-100 text-green-700' },
              { icon: CheckCircle, label: 'Grades Covered', value: '10–12', color: 'bg-blue-100 text-blue-700' }
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-playfair text-3xl font-bold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
