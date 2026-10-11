import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function PositionFormDialog({ open, onOpenChange, position, teams, onSaved }) {
  const [form, setForm] = useState({
    title: '', description: '', team: '', location: '',
    date: '', start_time: '', end_time: '', requirements: '',
    status: 'open', capacity: 1
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (position) {
      setForm({
        title: position.title || '',
        description: position.description || '',
        team: position.team || '',
        location: position.location || '',
        date: position.date || '',
        start_time: position.start_time || '',
        end_time: position.end_time || '',
        requirements: position.requirements || '',
        status: position.status || 'open',
        capacity: position.capacity || 1,
      });
    } else {
      setForm({
        title: '', description: '', team: teams[0] || '', location: '',
        date: '', start_time: '', end_time: '', requirements: '',
        status: 'open', capacity: 1
      });
    }
  }, [position, open, teams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.team) return;
    setSaving(true);
    const payload = {
      ...form,
      capacity: Number(form.capacity) || 1,
      applications: position?.applications || [],
      assigned_member_ids: position?.assigned_member_ids || [],
    };
    if (position) {
      await base44.entities.Position.update(position.id, payload);
    } else {
      await base44.entities.Position.create(payload);
    }
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{position ? 'Posten bearbeiten' : 'Neuen Posten ausschreiben'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Titel *</Label>
            <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="z.B. Eingangskasse, Bühnenhilfe" />
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Was umfasst dieser Posten?" className="min-h-[70px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Team *</Label>
              <Select value={form.team} onValueChange={(v) => setForm(p => ({ ...p, team: v }))}>
                <SelectTrigger><SelectValue placeholder="Team wählen" /></SelectTrigger>
                <SelectContent>
                  {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ort</Label>
              <Input value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} placeholder="z.B. Haupteingang" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Von</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm(p => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Bis</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm(p => ({ ...p, end_time: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Anzahl Personen</Label>
              <Input type="number" min="1" value={form.capacity} onChange={(e) => setForm(p => ({ ...p, capacity: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Offen</SelectItem>
                  <SelectItem value="filled">Besetzt</SelectItem>
                  <SelectItem value="closed">Geschlossen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Anforderungen</Label>
            <Textarea value={form.requirements} onChange={(e) => setForm(p => ({ ...p, requirements: e.target.value }))} placeholder="Was wird erwartet? (z.B. volljährig, Erfahrung am Mischanlage)" className="min-h-[60px]" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={saving || !form.title.trim() || !form.team}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : position ? 'Speichern' : 'Ausschreiben'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}