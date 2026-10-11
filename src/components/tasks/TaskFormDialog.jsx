import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { PRIORITY_LABELS } from '@/lib/constants';
import { useTeams } from '@/lib/teams';
import { Loader2 } from 'lucide-react';

export default function TaskFormDialog({ open, onOpenChange, task, members = [], onSaved }) {
  const { teams, colors } = useTeams();
  const [form, setForm] = useState({
    title: '', description: '', due_date: '', status: 'open',
    priority: 'medium', category: '', assigned_member_ids: [], assigned_team: ''
  });
  const [saving, setSaving] = useState(false);
  const [assignMode, setAssignMode] = useState('members'); // 'members' or 'team'

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        due_date: task.due_date || '',
        status: task.status || 'open',
        priority: task.priority || 'medium',
        category: task.category || '',
        assigned_member_ids: task.assigned_member_ids || [],
        assigned_team: task.assigned_team || ''
      });
      setAssignMode(task.assigned_team ? 'team' : 'members');
    } else {
      setForm({ title: '', description: '', due_date: '', status: 'open', priority: 'medium', category: '', assigned_member_ids: [], assigned_team: '' });
      setAssignMode('members');
    }
  }, [task, open]);

  const handleTeamAssign = (team) => {
    setForm(prev => ({ ...prev, assigned_team: team }));
    const teamMembers = members.filter(m => m.teams?.includes(team));
    setForm(prev => ({ ...prev, assigned_member_ids: teamMembers.map(m => m.id) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    if (task) {
      await base44.entities.Task.update(task.id, form);
    } else {
      await base44.entities.Task.create({ ...form, completions: [] });
    }
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  const toggleMember = (id) => {
    setForm(prev => ({
      ...prev,
      assigned_member_ids: prev.assigned_member_ids.includes(id)
        ? prev.assigned_member_ids.filter(x => x !== id)
        : [...prev.assigned_member_ids, id]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Titel *</Label>
            <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Aufgabentitel" />
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Details zur Aufgabe..." className="min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fälligkeitsdatum</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Input value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} placeholder="z.B. Logistik" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priorität</Label>
              <Select value={form.priority} onValueChange={(v) => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Offen</SelectItem>
                  <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                  <SelectItem value="done">Erledigt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Zuweisung</Label>
            <div className="flex gap-2 mb-2">
              <Button type="button" size="sm" variant={assignMode === 'members' ? 'default' : 'outline'} onClick={() => setAssignMode('members')}>
                An Personen
              </Button>
              <Button type="button" size="sm" variant={assignMode === 'team' ? 'default' : 'outline'} onClick={() => setAssignMode('team')}>
                An Team
              </Button>
            </div>

            {assignMode === 'team' ? (
              <Select value={form.assigned_team} onValueChange={handleTeamAssign}>
                <SelectTrigger><SelectValue placeholder="Team wählen" /></SelectTrigger>
                <SelectContent>
                  {teams.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 border rounded-lg p-2">
                {members.map(m => (
                  <label key={m.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer">
                    <Checkbox
                      checked={form.assigned_member_ids.includes(m.id)}
                      onCheckedChange={() => toggleMember(m.id)}
                    />
                    <span className="text-sm">{m.name}</span>
                    <div className="flex gap-1 ml-auto">
                      {m.teams?.map(t => (
                        <span key={t} className={`text-[9px] px-1 rounded ${colors[t]?.bg} ${colors[t]?.text}`}>{t}</span>
                      ))}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : task ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}