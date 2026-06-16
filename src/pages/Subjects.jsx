import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SUBJECTS } from '@/lib/subjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const categories = ['All', 'Mathematics', 'Sciences', 'Commerce', 'Humanities', 'Languages', 'Life Skills'];

export default function Subjects() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = SUBJECTS.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || s.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">CAPS Curriculum</Badge>
          <h1 className="font-playfair text-4xl font-bold text-foreground mb-3">FET Phase Subjects</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            All 14 subjects aligned with the South African CAPS curriculum for Grades 10–12.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className={activeCategory === cat ? 'bg-primary text-primary-foreground' : ''}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Subject Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((subject) => (
            <Link
              key={subject.code}
              to={`/subjects/${subject.code}`}
              className={`group block bg-card border ${subject.color.split(' ')[2] || 'border-border'} rounded-2xl p-6 hover:shadow-lg transition-all duration-300`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl ${subject.color.split(' ').slice(0,2).join(' ')} flex items-center justify-center text-2xl flex-shrink-0`}>
                  {subject.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-playfair text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                    {subject.name}
                  </h3>
                  <Badge variant="secondary" className="text-xs mb-2">{subject.category}</Badge>
                  <p className="text-sm text-muted-foreground line-clamp-2">{subject.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-1">
                  {subject.grades.map((g) => (
                    <span key={g} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {g.replace('Grade ', 'Gr ')}
                    </span>
                  ))}
                </div>
                <span className="text-xs font-semibold text-primary group-hover:underline">View Resources →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}