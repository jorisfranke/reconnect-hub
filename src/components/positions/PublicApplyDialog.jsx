import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, MapPin, Calendar, Users, Loader2, CheckCircle2, Mail } from 'lucide-react';

export default function PublicApplyDialog({ position, open, onOpenChange, colors = {} }) {
  const [form, setForm] = useState({ name: '', email: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!position) return null;
  const c = colors[position.team] || {};
  const accepted = (position.applications || []).filter(a => a.status === 'accepted');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Bitte gültige E-Mail-Adresse eingeben.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await base44.functions.invoke('submitPublicApplication', {
        position_id: position.id,
        name: form.name.trim(),
        email: form.email.trim(),
        note: form.note.trim(),
      });
      if (res?.data?.error) {
        setError(res.data.error);
        setSaving(false);
        return;
      }
      setSaving(false);
      setDone(true);
    } catch (err) {
      setError('Beim Speichern ist ein Fehler aufgetreten. Bitte versuche es erneut.');
      setSaving(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    setForm({ name: '', email: '', note: '' });
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {done ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Bewerbung eingegangen!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Wir haben deine Bewerbung für „{position.title}" erhalten.
                Du erhältst eine E-Mail, sobald wir sie geprüft haben.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">Schließen</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8">{position.title}</DialogTitle>
              <DialogDescription className="sr-only">Bewerbung</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={`border-0 ${c.bg} ${c.text}`}>{position.team}</Badge>
                <Badge variant="outline" className="text-[11px]">
                  <Users className="w-3 h-3 mr-1" />
                  {accepted.length}/{position.capacity || 1} besetzt
                </Badge>
              </div>

              {position.description && (
                <p className="text-sm text-muted-foreground">{position.description}</p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                {position.date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(position.date), 'dd. MMMM yyyy', { locale: de })}
                  </span>
                )}
                {position.start_time && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {position.start_time}{position.end_time ? ` – ${position.end_time}` : ''} Uhr
                  </span>
                )}
                {position.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {position.location}
                  </span>
                )}
              </div>

              {position.requirements && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Anforderungen</p>
                  <p className="text-xs text-amber-800">{position.requirements}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Dein vollständiger Name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-Mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="deine@email.de"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Anmerkung (optional)</Label>
                  <Textarea
                    value={form.note}
                    onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))}
                    placeholder="Erfahrung, Verfügbarkeit, Fragen…"
                    className="min-h-[60px]"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <p className="text-[11px] text-muted-foreground">
                  Mit deiner Bewerbung akzeptierst du, dass wir dich per E-Mail über den Status informieren.
                  Bei Annahme wird automatisch ein Konto für dich erstellt.
                </p>
                <Button type="submit" className="w-full" disabled={saving || !form.name.trim() || !form.email.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Bewerbung absenden'}
                </Button>
              </form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}