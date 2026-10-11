import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';

export default function EventFormDialog({ open, onOpenChange, currentMember, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', date: '', time: '', location: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
    setLoading(true);
    await base44.entities.Event.create({ ...form, created_by_id: currentMember.id, attendances: [] });
    setForm({ title: '', description: '', date: '', time: '', location: '' });
    setLoading(false);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Neuer Termin</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Titel *</Label>
            <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          </div>
          <div className="space-y-1.5">
            <Label>Beschreibung</Label>
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Datum *</Label>
              <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>
            <div className="space-y-1.5">
              <Label>Uhrzeit</Label>
              <Input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Ort</Label>
            <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Veranstaltungsort..." />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Wird gespeichert...' : 'Termin erstellen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}