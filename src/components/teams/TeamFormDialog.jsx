import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { TEAM_COLOR_OPTIONS } from '@/lib/teams';
import { Loader2 } from 'lucide-react';

export default function TeamFormDialog({ open, onOpenChange, team, members = [], onSaved }) {
  const [form, setForm] = useState({ name: '', color: 'violet', description: '', lead_id: '', order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (team) {
      setForm({
        name: team.name || '',
        color: team.color || 'violet',
        description: team.description || '',
        lead_id: team.lead_id || '',
        order: team.order || 0,
      });
    } else {
      setForm({ name: '', color: 'violet', description: '', lead_id: '', order: 0 });
    }
  }, [team, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      color: form.color,
      description: form.description,
      lead_id: form.lead_id || null,
      order: Number(form.order) || 0,
    };
    if (team?.id) {
      await base44.entities.Team.update(team.id, payload);
    } else {
      await base44.entities.Team.create(payload);
    }
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{team?.id ? 'Team bearbeiten' : 'Neues Team'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="z.B. Catering" />
          </div>
          <div className="space-y-2">
            <Label>Farbe</Label>
            <div className="grid grid-cols-5 gap-2">
              {TEAM_COLOR_OPTIONS.map(c => (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => setForm(p => ({ ...p, color: c.key }))}
                  className={`h-9 rounded-lg ${c.bg} flex items-center justify-center transition-all ${
                    form.color === c.key ? 'ring-2 ring-primary ring-offset-1' : ''
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Wofür ist dieses Team zuständig?" className="min-h-[70px]" />
          </div>
          <div className="space-y-2">
            <Label>Teamleitung (Ansprechpartner)</Label>
            <Select value={form.lead_id || 'none'} onValueChange={(v) => setForm(p => ({ ...p, lead_id: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Keine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine</SelectItem>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : team?.id ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}