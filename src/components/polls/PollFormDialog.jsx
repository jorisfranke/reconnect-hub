import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2 } from 'lucide-react';
import { useTeams } from '@/lib/teams';
import { useMemberAuth } from '@/lib/MemberAuthContext';

export default function PollFormDialog({ open, onOpenChange, onSaved }) {
  const { currentMember } = useMemberAuth();
  const { teams } = useTeams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('yes_no');
  const [options, setOptions] = useState(['', '']);
  const [visibleToTeams, setVisibleToTeams] = useState([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(''); setDescription(''); setType('yes_no');
    setOptions(['', '']); setVisibleToTeams([]);
  };

  const handleClose = (v) => { if (!v) reset(); onOpenChange(v); };

  const toggleTeam = (team) => {
    setVisibleToTeams(prev => prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const pollData = {
      title: title.trim(),
      description: description.trim(),
      type,
      options: type === 'multiple_choice' ? options.filter(o => o.trim()) : ['Ja', 'Nein'],
      votes: [],
      is_closed: false,
      created_by_id: currentMember.id,
      created_by_name: currentMember.name,
      visible_to_teams: visibleToTeams,
    };
    await base44.entities.Poll.create(pollData);
    setSaving(false);
    onSaved?.();
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Abstimmung</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Frage / Titel</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Welche Farbe für das Shirt?" className="mt-1" />
          </div>
          <div>
            <Label>Beschreibung (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Zusätzlicher Kontext..." className="mt-1 min-h-[60px]" />
          </div>
          <div>
            <Label>Typ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes_no">Ja / Nein</SelectItem>
                <SelectItem value="multiple_choice">Mehrfachauswahl</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'multiple_choice' && (
            <div>
              <Label>Antwortoptionen</Label>
              <div className="mt-1 space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={e => setOptions(prev => prev.map((o, idx) => idx === i ? e.target.value : o))}
                      placeholder={`Option ${i + 1}`}
                    />
                    {options.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => setOptions(prev => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setOptions(prev => [...prev, ''])}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Option hinzufügen
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label>Sichtbar für Teams (leer = alle)</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {teams.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTeam(t)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    visibleToTeams.includes(t)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => handleClose(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>Erstellen</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}