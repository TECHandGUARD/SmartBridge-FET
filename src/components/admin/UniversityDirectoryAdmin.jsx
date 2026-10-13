import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus, Trash2, Edit, X,
  Loader2, Search, ChevronUp, ChevronDown,
  CheckCircle, XCircle, ExternalLink
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// ============================================================
// Configuration
// ============================================================

const TYPE_OPTIONS = [
  'Traditional',
  'Comprehensive',
  'Distance',
  'University of Technology'
];

const PROVINCE_OPTIONS = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
  'National (Distance)',
  'National',
];

const typeColors = {
  "Traditional": "bg-primary/10 text-primary",
  "Comprehensive": "bg-blue-100 text-blue-700",
  "Distance": "bg-purple-100 text-purple-700",
  "University of Technology": "bg-orange-100 text-orange-700",
};

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// Add/Edit Modal
// ============================================================

function UniversityFormModal({
  isOpen,
  onClose,
  onSave,
  university = null,
  saving
}) {
  const [form, setForm] = useState({
    name: '',
    url: '',
    province: '',
    type: 'Traditional',
    is_active: true,
  });

  useEffect(() => {
    if (university) {
      setForm({
        name: university.name || '',
        url: university.url || '',
        province: university.province || '',
        type: university.type || 'Traditional',
        is_active: university.is_active !== undefined ? university.is_active : true,
      });
    } else {
      setForm({
        name: '',
        url: '',
        province: '',
        type: 'Traditional',
        is_active: true,
      });
    }
  }, [university, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('University name is required');
      return;
    }

    if (!form.url.trim()) {
      toast.error('Application URL is required');
      return;
    }

    if (!form.province) {
      toast.error('Province is required');
      return;
    }

    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">
            {university ? 'Edit University' : 'Add University'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              University Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. University of Cape Town (UCT)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Application URL <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="https://www.uct.ac.za/apply"
              value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Province <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.province}
                onChange={e => setForm({ ...form, province: e.target.value })}
                required
              >
                <option value="">Select province</option>
                {PROVINCE_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
              >
                {TYPE_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              Active (visible to users)
            </label>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" className="flex-1 bg-primary" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {saving ? 'Saving...' : (university ? 'Update' : 'Add')}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function UniversityDirectoryAdmin() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const loadUniversities = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('university_directory')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setUniversities(data || []);
    } catch (err) {
      console.error('Error loading universities:', err);
      toast.error('Failed to load universities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUniversities();
  }, [loadUniversities]);

  const handleAdd = async (formData) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('university_directory')
        .insert({
          name: formData.name.trim(),
          url: formData.url.trim(),
          province: formData.province,
          type: formData.type,
          is_active: formData.is_active,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('University added successfully');
      setShowModal(false);
      loadUniversities();
    } catch (err) {
      console.error('Error adding university:', err);
      toast.error(`Failed to add: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (formData) => {
    if (!editingUniversity) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('university_directory')
        .update({
          name: formData.name.trim(),
          url: formData.url.trim(),
          province: formData.province,
          type: formData.type,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUniversity.id);

      if (error) throw error;

      toast.success('University updated successfully');
      setShowModal(false);
      setEditingUniversity(null);
      loadUniversities();
    } catch (err) {
      console.error('Error updating university:', err);
      toast.error(`Failed to update: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (university) => {
    if (!confirm(`Delete "${university.name}" permanently?`)) return;

    try {
      const { error } = await supabase
        .from('university_directory')
        .delete()
        .eq('id', university.id);

      if (error) throw error;

      toast.success('University deleted');
      loadUniversities();
    } catch (err) {
      console.error('Error deleting university:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const handleToggleActive = async (university) => {
    try {
      const { error } = await supabase
        .from('university_directory')
        .update({
          is_active: !university.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', university.id);

      if (error) throw error;

      toast.success(`${university.name} ${university.is_active ? 'deactivated' : 'activated'}`);
      loadUniversities();
    } catch (err) {
      console.error('Error toggling active status:', err);
      toast.error(`Failed to update: ${err.message}`);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filtered = universities.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.province?.toLowerCase().includes(search.toLowerCase()) ||
    u.type?.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    return sortDirection === 'asc'
      ? aVal.localeCompare(bVal)
      : bVal.localeCompare(aVal);
  });

  const activeCount = universities.filter(u => u.is_active).length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-playfair text-xl font-bold">University Directory</h2>
          <p className="text-sm text-muted-foreground">
            {activeCount} active · {universities.length} total
          </p>
        </div>
        <Button onClick={() => { setEditingUniversity(null); setShowModal(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add University
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, province, or type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* University List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      Name
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('province')}>
                    <div className="flex items-center gap-1">
                      Province
                      {sortField === 'province' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-1">
                      Type
                      {sortField === 'type' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-10 text-muted-foreground">
                      {search ? 'No universities match your search.' : 'No universities found. Add your first one above.'}
                    </td>
                  </tr>
                ) : (
                  sorted.map(uni => (
                    <tr key={uni.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{uni.name}</p>
                          <a
                            href={uni.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                          >
                            {uni.url.replace(/^https?:\/\//, '').slice(0, 30)} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{uni.province || '—'}</td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs ${typeColors[uni.type] || 'bg-muted text-muted-foreground'}`}>
                          {uni.type || '—'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs ${uni.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {uni.is_active ? (
                            <><CheckCircle className="w-3 h-3 mr-0.5 inline" /> Active</>
                          ) : (
                            <><XCircle className="w-3 h-3 mr-0.5 inline" /> Inactive</>
                          )}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggleActive(uni)}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                            title={uni.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {uni.is_active ? <XCircle className="w-4 h-4 text-muted-foreground" /> : <CheckCircle className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          <button
                            onClick={() => { setEditingUniversity(uni); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleDelete(uni)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <UniversityFormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingUniversity(null); }}
        onSave={editingUniversity ? handleEdit : handleAdd}
        university={editingUniversity}
        saving={saving}
      />
    </div>
  );
}
