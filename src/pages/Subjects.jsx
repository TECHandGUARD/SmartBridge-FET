// src/pages/Subjects.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SUBJECTS } from '@/lib/subjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, BookOpen, Filter, X, Grid3x3, List,
  TrendingUp, Award, Users, Sparkles,
  ChevronRight, GraduationCap, Star
} from 'lucide-react';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Categories
  CATEGORIES: (import.meta.env.VITE_SUBJECT_CATEGORIES ||
    'All,Mathematics,Sciences,Commerce,Humanities,Languages,Life Skills'
  ).split(',').map(c => c.trim()),

  // App name
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',

  // Messages
  MESSAGES: {
    TITLE: import.meta.env.VITE_SUBJECTS_TITLE || 'FET Phase Subjects',
    SUBTITLE: import.meta.env.VITE_SUBJECTS_SUBTITLE || 'All subjects aligned with the South African CAPS curriculum for Grades 10–12.',
    NO_RESULTS: import.meta.env.VITE_SUBJECTS_NO_RESULTS_MSG || 'No subjects match your search criteria.',
    VIEW_RESOURCES: import.meta.env.VITE_SUBJECTS_VIEW_RESOURCES || 'View Resources →',
    CAPS_BADGE: import.meta.env.VITE_SUBJECTS_CAPS_BADGE || 'CAPS Curriculum',
  },
};

// ============================================================
// Sub-Components
// ============================================================

function SubjectCard({ subject }) {
  const colorParts = subject.color.split(' ');
  const bgColor = colorParts.slice(0, 2).join(' ');
  const borderColor = colorParts[2] || 'border-border';

  return (
    <Link
      to={`/subjects/${subject.code}`}
      className={`group block bg-card border ${borderColor} rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
          {subject.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-playfair text-lg font-bold text-foreground group-hover:text-primary transition-colors">
              {subject.name}
            </h3>
            {subject.is_premium && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] flex-shrink-0">
                <Star className="w-2.5 h-2.5 fill-current" /> Premium
              </Badge>
            )}
          </div>
          <Badge variant="secondary" className="text-xs mb-2 font-medium">{subject.category}</Badge>
          <p className="text-sm text-muted-foreground line-clamp-2">{subject.description}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1">
          {subject.grades.map((g) => (
            <span key={g} className="text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full font-medium">
              {g.replace('Grade ', 'Gr ')}
            </span>
          ))}
        </div>
        <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-0.5">
          {CONFIG.MESSAGES.VIEW_RESOURCES}
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

function CategoryButton({ category, activeCategory, onClick }) {
  const isActive = activeCategory === category;

  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      size="sm"
      onClick={() => onClick(category)}
      className={`transition-all duration-200 ${
        isActive
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'hover:border-primary/50'
      }`}
    >
      {category}
    </Button>
  );
}

function EmptyState({ searchQuery, activeCategory, onClear }) {
  return (
    <div className="col-span-full text-center py-16 bg-card rounded-2xl border border-border">
      <div className="text-5xl mb-4 opacity-30">🔍</div>
      <p className="text-lg font-semibold mb-1">{CONFIG.MESSAGES.NO_RESULTS}</p>
      <p className="text-sm text-muted-foreground">
        {searchQuery ? `Try adjusting your search or filters.` : 'No subjects available.'}
      </p>
      {(searchQuery || activeCategory !== 'All') && (
        <Button variant="outline" size="sm" onClick={onClear} className="mt-4 gap-1">
          <X className="w-3.5 h-3.5" /> Clear Filters
        </Button>
      )}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function Subjects() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // grid | list

  // ============================================================
  // Filter Subjects
  // ============================================================

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return SUBJECTS.filter((s) => {
      const matchSearch = !query || s.name.toLowerCase().includes(query);
      const matchCat = activeCategory === 'All' || s.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [search, activeCategory]);

  // ============================================================
  // Handlers
  // ============================================================

  const clearFilters = () => {
    setSearch('');
    setActiveCategory('All');
  };

  const hasFilters = search.trim() || activeCategory !== 'All';

  // ============================================================
  // Computed Values
  // ============================================================

  const totalSubjects = SUBJECTS.length;
  const categoriesCount = CONFIG.CATEGORIES.length - 1; // Excluding 'All'

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20 gap-1.5 px-3 py-1.5">
            <BookOpen className="w-3 h-3" /> {CONFIG.MESSAGES.CAPS_BADGE}
          </Badge>
          <h1 className="font-playfair text-4xl font-bold text-foreground mb-3">
            {CONFIG.MESSAGES.TITLE}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {CONFIG.MESSAGES.SUBTITLE}
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> {totalSubjects} Subjects
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {categoriesCount} Categories
            </span>
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> CAPS Aligned
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
              aria-label="Search subjects"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
              {CONFIG.CATEGORIES.map((cat) => (
                <CategoryButton
                  key={cat}
                  category={cat}
                  activeCategory={activeCategory}
                  onClick={setActiveCategory}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
                aria-label="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {filtered.length} subject{filtered.length !== 1 ? 's' : ''} found
            </p>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs gap-1 text-muted-foreground"
              >
                <X className="w-3 h-3" /> Clear
              </Button>
            )}
          </div>
          {activeCategory !== 'All' && (
            <Badge variant="outline" className="text-xs font-medium">
              <Filter className="w-3 h-3 mr-1" /> {activeCategory}
            </Badge>
          )}
        </div>

        {/* Subject Grid */}
        {filtered.length === 0 ? (
          <EmptyState
            searchQuery={search}
            activeCategory={activeCategory}
            onClear={clearFilters}
          />
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-5'
              : 'space-y-3'
          }>
            {filtered.map((subject) => (
              viewMode === 'grid' ? (
                <SubjectCard key={subject.code} subject={subject} />
              ) : (
                <Link
                  key={subject.code}
                  to={`/subjects/${subject.code}`}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group"
                >
                  <div className={`w-12 h-12 rounded-xl ${subject.color.split(' ').slice(0, 2).join(' ')} flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    {subject.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {subject.name}
                      </h3>
                      <Badge variant="secondary" className="text-[10px]">{subject.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{subject.description}</p>
                    <div className="flex gap-1 mt-1">
                      {subject.grades.map((g) => (
                        <span key={g} className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-full">
                          {g.replace('Grade ', 'Gr ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              )
            ))}
          </div>
        )}

        {/* Footer Stats */}
        {filtered.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border pt-4">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {filtered.length} subjects shown
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {totalSubjects} total available
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {filtered.filter(s => s.is_premium).length} premium subjects
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
