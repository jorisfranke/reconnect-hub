import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  CheckCircle2, Clock, MapPin, Calendar, Users, XCircle,
  Trash2, Edit2, UserPlus, UserMinus, AlertCircle, Mail, Loader2
} from 'lucide-react';

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function buildAcceptEmail(name, pin, positionTitle) {
  return [
    'Hallo ' + name + ',',
    '',
    'du wurdest fuer den Posten "' + positionTitle + '" beim re:connect Festival angenommen!',
    '',
    'Ein Konto wurde fuer dich erstellt:',
    'Name: ' + name,
    'PIN: ' + pin,
    '',
    'Log dich unter https://reconnect-hub.base44.app mit deinem Namen und der PIN ein,',
    'um deinen Ablaufplan, Aufgaben und das Team-Portal zu sehen.',
    '',
    'Wir freuen uns auf dich!',
  ].join('\n');
}

export default function PositionDetailDialog({
  position, open, onOpenChange, members = [], colors = {},
  currentMember, isAdmin, onEdit, onUpdate
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);
  if (!position) return null;

  const c = colors[position.team] || {};
  const apps = position.applications || [];
  const myApp = apps.find(a => a.member_id === currentMember?.id);
  const acceptedApps = apps.filter(a => a.status === 'accepted');

  const refresh = (updated) => { onUpdate?.(updated); };

  const handleApply = async () => {
    const newApp = {
      member_id: currentMember.id,
      member_name: currentMember.name,
      status: 'pending',
      applied_at: new Date().toISOString(),
      note: note.trim(),
    };
    const updatedApps = [...apps, newApp];
    const updated = await base44.entities.Position.update(position.id, { applications: updatedApps });
    setNote('');
    refresh(updated);
  };

  const handleWithdraw = async () => {
    const updatedApps = apps.filter(a => a.member_id !== currentMember.id);
    const updatedAssigned = (position.assigned_member_ids || []).filter(id => id !== currentMember.id);
    const updated = await base44.entities.Position.update(position.id, {
      applications: updatedApps,
      assigned_member_ids: updatedAssigned
    });
    refresh(updated);
  };

  const setAppStatus = async (app, status) => {
    setBusy(true);
    setCreatedInfo(null);
    try {
      let memberId = app.member_id;
      const isUnregistered = !app.member_id && !!app.email;

      // Auto-create account when accepting an unregistered applicant
      if (status === 'accepted' && isUnregistered) {
        const pin = generatePin();
        const newMember = await base44.entities.Member.create({
          name: app.member_name,
          pin,
          email: app.email,
          role: 'member',
          teams: [position.team],
          status: 'confirmed',
        });
        memberId = newMember.id;

        // Send email with login info
        try {
          await base44.integrations.Core.SendEmail({
            to: app.email,
            subject: 'Du wurdest angenommen: ' + position.title,
            body: buildAcceptEmail(app.member_name, pin, position.title),
          });
        } catch {}

        setCreatedInfo({ name: app.member_name, pin, email: app.email });
      }

      const updatedApps = apps.map(a =>
        (a.member_id === app.member_id && a.email === app.email)
          ? { ...a, status, member_id: memberId }
          : a
      );
      let assigned = position.assigned_member_ids || [];
      if (status === 'accepted' && memberId && !assigned.includes(memberId)) assigned = [...assigned, memberId];
      if (status === 'rejected' && app.member_id) assigned = assigned.filter(id => id !== app.member_id);
      const filled = updatedApps.filter(a => a.status === 'accepted').length >= (position.capacity || 1);
      const updated = await base44.entities.Position.update(position.id, {
        applications: updatedApps,
        assigned_member_ids: assigned,
        status: filled ? 'filled' : position.status === 'filled' ? 'open' : position.status
      });
      refresh(updated);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    await base44.entities.Position.delete(position.id);
    onOpenChange(false);
    onUpdate?.(null, true);
  };

  const timeRange = position.start_time + (position.end_time ? ' - ' + position.end_time : '') + ' Uhr';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 text-lg pr-8">
            {position.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={'border-0 ' + c.bg + ' ' + c.text}>{position.team}</Badge>
            <Badge variant="outline" className="text-[11px]">
              {position.status === 'open' ? 'Offen' : position.status === 'filled' ? 'Besetzt' : 'Geschlossen'}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              <Users className="w-3 h-3 mr-1" />
              {acceptedApps.length}/{position.capacity || 1}
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
                {timeRange}
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
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-3.5 h-3.5" /> Anforderungen
              </p>
              <p className="text-xs text-amber-800">{position.requirements}</p>
            </div>
          )}

          <Separator />

          {isAdmin ? (
            <div>
              <h4 className="text-sm font-semibold mb-2">Bewerbungen ({apps.length})</h4>
              {apps.length === 0 && <p className="text-xs text-muted-foreground">Noch keine Bewerbungen.</p>}
              <div className="space-y-2">
                {apps.map(a => {
                  const m = members.find(mm => mm.id === a.member_id);
                  const isUnregistered = !a.member_id && !!a.email;
                  return (
                    <div key={a.member_id || a.email} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {a.member_name?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{a.member_name}</p>
                          {isUnregistered && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3" />{a.email}
                            </p>
                          )}
                          {m?.teams?.length > 0 && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {m.teams.join(', ')}
                            </p>
                          )}
                          {a.note && <p className="text-[10px] text-muted-foreground italic truncate">&bdquo;{a.note}&ldquo;</p>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {a.status === 'accepted' ? (
                          <Button size="sm" variant="outline" className="h-7 text-emerald-600 border-emerald-200" disabled={busy} onClick={() => setAppStatus(a, 'pending')}>
                            <UserMinus className="w-3.5 h-3.5" />
                          </Button>
                        ) : a.status === 'rejected' ? (
                          <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => setAppStatus(a, 'pending')}>
                            Zurücksetzen
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-emerald-600 border-emerald-200" disabled={busy} onClick={() => setAppStatus(a, 'accepted')}>
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-destructive border-destructive/30" disabled={busy} onClick={() => setAppStatus(a, 'rejected')}>
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {createdInfo && (
                <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-1">
                  <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Konto erstellt fuer {createdInfo.name}
                  </p>
                  <p className="text-xs text-emerald-700">
                    PIN: <span className="font-mono font-bold tracking-wider">{createdInfo.pin}</span> &mdash;
                    Eine E-Mail mit Zugangsdaten wurde an {createdInfo.email} gesendet.
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { onOpenChange(false); onEdit?.(position); }}>
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Bearbeiten
                </Button>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Löschen
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-semibold mb-2">Deine Bewerbung</h4>
              {myApp?.status === 'accepted' && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm text-emerald-700">Du wurdest für diesen Posten angenommen!</p>
                </div>
              )}
              {myApp?.status === 'pending' && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-center justify-between gap-2">
                  <p className="text-sm text-amber-700 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Deine Bewerbung wird geprüft.
                  </p>
                  <Button size="sm" variant="outline" className="h-7" onClick={handleWithdraw}>Zurückziehen</Button>
                </div>
              )}
              {myApp?.status === 'rejected' && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-destructive">Leider wurde für diesen Posten abgelehnt.</p>
                </div>
              )}
              {!myApp && position.status === 'open' && (
                <div className="space-y-2">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional: Anmerkung an die Orga…" className="text-sm min-h-[60px]" />
                  <Button className="w-full" onClick={handleApply}>
                    <UserPlus className="w-4 h-4 mr-2" /> Auf diesen Posten bewerben
                  </Button>
                </div>
              )}
              {!myApp && position.status !== 'open' && (
                <p className="text-sm text-muted-foreground">Dieser Posten ist nicht mehr offen für Bewerbungen.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}