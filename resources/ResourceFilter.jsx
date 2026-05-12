import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export default function ResourceFilter({ search, setSearch, grade, setGrade, type, setType }) {
  const hasFilters = search || grade !== 'All' || type !== 'All';

  const clear = () => {
    setSearch('');
    setGrade('All');
    setType('All');
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6 items-center">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={grade} onValueChange={setGrade}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Grade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Grades</SelectItem>
          <SelectItem value="Grade 10">Grade 10</SelectItem>
          <SelectItem value="Grade 11">Grade 11</SelectItem>
          <SelectItem value="Grade 12">Grade 12</SelectItem>
        </SelectContent>
      </Select>
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {['All', 'Notes', 'Past Paper', 'Worksheet', 'Summary', 'Textbook', 'Video'].map(t => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear} className="gap-1 text-muted-foreground">
          <X className="w-3.5 h-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}