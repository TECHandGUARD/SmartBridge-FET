import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building2, ChevronDown, Plus, Check, School
} from 'lucide-react';

export default function SchoolSelector({ schools, selectedIndex, onSelect, onAddSchool }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const selected = schools[selectedIndex];

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddSchool(newName.trim());
    setNewName('');
    setAdding(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors rounded-xl px-3 py-2 text-white text-sm font-medium"
      >
        <School className="w-4 h-4" />
        <span className="max-w-[160px] truncate">{selected?.name || 'Select School'}</span>
        <Badge className="bg-white/20 text-white text-[10px] px-1.5 py-0 border-0">
          {selected?.student_emails?.length || 0} students
        </Badge>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white text-foreground rounded-xl shadow-xl border border-border z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Your Schools</p>
            <div className="space-y-0.5">
              {schools.map((school, i) => (
                <button
                  key={i}
                  onClick={() => { onSelect(i); setOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{school.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">{school.student_emails?.length || 0}</span>
                    {i === selectedIndex && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-2">
            {adding ? (
              <div className="flex gap-1.5 px-1">
                <Input
                  autoFocus
                  placeholder="New school name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
                  className="h-8 text-xs"
                />
                <Button size="sm" className="h-8 text-xs px-3" onClick={handleAdd} disabled={!newName.trim()}>
                  Add
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm text-primary font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another School
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}