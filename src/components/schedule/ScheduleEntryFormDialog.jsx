import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Loader2, User, Users } from 'lucide-react';
import { useTeams } from '@/lib/teams';

export default function ScheduleEntryFormDialog({ open, onOpenChange, entry, memberId, team: presetTeam, onSaved }) {
  const { teams } = useTeams();
  const [targetType, setTargetType] = useState('person');
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [form, setForm] = useState({
    title: '', date: '', start_time: '', end_time: '', location: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setForm({
        title: entry.title || '',
        date: entry.date || '',
        start_time: entry.start_time || '',
        end_time: entry.end_time || '',
        location: entry.location || '',
        notes: entry.notes || '',
      });
      if (entry.team) {
        setTargetType('team');
        setSelectedTeam(entry.team);
      } else {
        setTargetType('person');
        setSelectedMember(entry.member_id || memberId || '');
      }
    } else {
      setForm({ title: '', date: '', start_time: '', end_time: '', location: '', notes: '' });
      if (presetTeam) {
        setTargetType('team');
        setSelectedTeam(presetTeam);
      } else if (memberId) {
        setTargetType('person');
        setSelectedMember(memberId);
      } else if (teams.length > 0) {
        setTargetType('team');
        setSelectedTeam(teams[0]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, open, memberId, presetTeam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    if (targetType === 'person' && !selectedMember) return;
    if (targetType === 'team' && !selectedTeam) return;
    setSaving(true);
    const payload = {
      ...form,
      member_id: targetType === 'person' ? selectedMember : null,
      team: targetType === 'team' ? selectedTeam : null,
    };
    try {
      if (entry) {
        await base44.entities.ScheduleEntry.update(entry.id, payload);
      } else {
        await base44.entities.ScheduleEntry.create(payload);
      }
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? 'Eintrag bearbeiten' : 'Neuer Ablaufplan-Eintrag'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target type toggle */}
          <div className="space-y-2">
            <Label>Zuweisung an</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('person')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  targetType === 'person'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <User className="w-4 h-4" /> Person
              </button>
              <button
                type="button"
                onClick={() => setTargetType('team')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  targetType === 'team'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <Users className="w-4 h-4" /> Team
              </button>
            </div>
          </div>

          {/* Member or Team selector */}
          {targetType === 'person' ? (
            <div className="space-y-2">
              <Label>Person *</Label>
              <MemberSelector value={selectedMember} onChange={setSelectedMember} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Team *</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger><SelectValue placeholder="Team wählen" /></SelectTrigger>
                <SelectContent>
                  {teams.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Titel *</Label>
            <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="z.B. Aufbau, Probe, Pause" />
          </div>
          <div className="space-y-2">
            <Label>Datum *</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Von</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm(p => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Bis</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm(p => ({ ...p, end_time: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ort</Label>
            <Input value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} placeholder="z.B. Hauptbühne, Eingang" />
          </div>
          <div className="space-y-2">
            <Label>Notizen</Label>
            <Textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Zusätzliche Infos…" className="min-h-[60px]" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={saving || !form.title.trim() || !form.date || (targetType === 'person' ? !selectedMember : !selectedTeam)}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : entry ? 'Speichern' : 'Hinzufügen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberSelector({ value, onChange }) {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    base44.entities.Member.list().then(setMembers).catch(() => {});
  }, []);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Person wählen" /></SelectTrigger>
      <SelectContent>
        {members.map(m => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}{m.role === 'admin' ? ' (Admin)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}