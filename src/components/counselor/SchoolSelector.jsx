import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building2, ChevronDown, Plus, Check, School
} from 'lucide-react';

// ============================================================
// Configuration (Soft-coded for future flexibility)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// Main Component
// ============================================================

export default function SchoolSelector({ 
  schools = [], 
  selectedIndex = 0, 
  onSelect, 
  onAddSchool 
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef(null);

  const selected = schools[selectedIndex];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
        setAdding(false);
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setAdding(false);
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddSchool(newName.trim());
    setNewName('');
    setAdding(false);
  };

  const handleSelect = (index) => {
    onSelect(index);
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors rounded-xl px-3 py-2 text-white text-sm font-medium"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select school"
      >
        <School className="w-4 h-4" aria-hidden="true" />
        <span className="max-w-[160px] truncate">{selected?.name || 'Select School'}</span>
        <Badge className="bg-white/20 text-white text-[10px] px-1.5 py-0 border-0">
          {selected?.student_emails?.length || 0} students
        </Badge>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div 
          className="absolute top-full left-0 mt-2 w-72 bg-white text-foreground rounded-xl shadow-xl border border-border z-50 overflow-hidden"
          role="listbox"
        >
          <div className="p-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Your Schools</p>
            <div className="space-y-0.5">
              {schools.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-2">No schools added yet.</p>
              ) : (
                schools.map((school, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left ${
                      i === selectedIndex ? 'bg-primary/5' : ''
                    }`}
                    role="option"
                    aria-selected={i === selectedIndex}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-hidden="true" />
                      <span className="text-sm font-medium truncate">{school.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{school.student_emails?.length || 0}</span>
                      {i === selectedIndex && <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" />}
                    </div>
                  </button>
                ))
              )}
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
                  onKeyDown={e => { 
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdd(); 
                    }
                    if (e.key === 'Escape') {
                      setAdding(false);
                      setNewName('');
                    }
                  }}
                  className="h-8 text-xs"
                  aria-label="New school name"
                />
                <Button 
                  size="sm" 
                  className="h-8 text-xs px-3" 
                  onClick={handleAdd} 
                  disabled={!newName.trim()}
                >
                  Add
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm text-primary font-medium"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add Another School
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
