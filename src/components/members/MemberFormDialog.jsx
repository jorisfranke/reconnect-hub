import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useTeams } from '@/lib/teams';
import { Loader2 } from 'lucide-react';

export default function MemberFormDialog({ open, onOpenChange, member, members = [], onSaved }) {
  const { teams, colors } = useTeams();
  const [form, setForm] = useState({
    name: '', pin: '', role: 'member', teams: [],
    status: 'confirmed', contact_person_id: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name || '',
        pin: member.pin || '',
        role: member.role || 'member',
        teams: member.teams || [],
        status: member.status || 'confirmed',
        contact_person_id: member.contact_person_id || '',
        notes: member.notes || '',
      });
    } else {
      setForm({ name: '', pin: '', role: 'member', teams: [], status: 'confirmed', contact_person_id: '', notes: '' });
    }
  }, [member, open]);

  const toggleTeam = (team) => {
    setForm(prev => ({
      ...prev,
      teams: prev.teams.includes(team)
        ? prev.teams.filter(t => t !== team)
        : [...prev.teams, team]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.pin.length !== 4 || form.teams.length === 0) return;
    setSaving(true);
    const payload = { ...form, contact_person_id: form.contact_person_id || null };
    if (member) {
      await base44.entities.Member.update(member.id, payload);
    } else {
      await base44.entities.Member.create(payload);
    }
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  const selectableContacts = members.filter(m => m.id !== member?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? 'Mitglied bearbeiten' : 'Neues Mitglied'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Vollständiger Name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>PIN (4-stellig) *</Label>
              <Input value={form.pin} maxLength={4} onChange={(e) => setForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, '') }))} placeholder="1234" className="tracking-[0.5em] text-center font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Bestätigt</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rolle</Label>
            <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Mitglied</SelectItem>
                <SelectItem value="admin">Admin (Teamleitung)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Teams *</Label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto border rounded-lg p-2">
              {teams.map(team => {
                const c = colors[team] || {};
                return (
                  <label key={team} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${form.teams.includes(team) ? c.bg : 'hover:bg-accent'}`}>
                    <Checkbox checked={form.teams.includes(team)} onCheckedChange={() => toggleTeam(team)} />
                    <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className="text-sm flex-1">{team}</span>
                  </label>
                );
              })}
              {teams.length === 0 && <p className="text-xs text-muted-foreground p-2">Noch keine Teams angelegt.</p>}
            </div>
            {form.teams.length > 1 && (
              <p className="text-[11px] text-muted-foreground">Dieses Mitglied gehört mehreren Teams an.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Ansprechpartner</Label>
            <Select value={form.contact_person_id || 'none'} onValueChange={(v) => setForm(p => ({ ...p, contact_person_id: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Keiner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keiner</SelectItem>
                {selectableContacts.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}{m.role === 'admin' ? ' (Admin)' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notizen</Label>
            <Textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Interne Notizen…" className="min-h-[60px]" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={saving || !form.name.trim() || form.pin.length !== 4 || form.teams.length === 0}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : member ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}