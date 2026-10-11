import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Trash2, Users, Layers, ListTodo, Briefcase, CalendarDays, Vote,
  MessageSquare, CalendarClock, UserCheck, RotateCcw, ShieldAlert, Loader2,
  Download, Database, Code2, CheckCircle2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Each tool: id, label, description, icon, color, action (async), confirmText, countKey
const TOOLS = [
  {
    id: 'deleteAllTeams',
    label: 'Alle Teams löschen',
    description: 'Entfernt jedes Team. Mitglieder bleiben erhalten, verlieren aber ihre Team-Zuordnung nicht automatisch.',
    icon: Layers,
    tone: 'text-rose-600',
    action: () => base44.entities.Team.deleteMany({}),
    confirm: 'ALLE Teams'
  },
  {
    id: 'deleteAllMembers',
    label: 'Alle Mitglieder löschen',
    description: 'Entfernt sämtliche Mitglieder aus der Datenbank. Nur du bleibst erhalten.',
    icon: Users,
    tone: 'text-rose-600',
    action: () => base44.entities.Member.deleteMany({ role: { $ne: 'admin' } }),
    confirm: 'ALLE Mitglieder (außer Admins)'
  },
  {
    id: 'confirmPending',
    label: 'Alle ausstehenden Mitglieder bestätigen',
    description: 'Bestätigt alle Mitglieder mit Status „ausstehend" mit einem Klick.',
    icon: UserCheck,
    tone: 'text-emerald-600',
    action: () => base44.entities.Member.updateMany({ status: 'pending' }, { $set: { status: 'confirmed' } }),
    confirm: 'alle ausstehenden Mitglieder'
  },
  {
    id: 'deleteAllTasks',
    label: 'Alle Aufgaben löschen',
    description: 'Entfernt sämtliche Aufgaben ungeachtet ihres Status.',
    icon: ListTodo,
    tone: 'text-rose-600',
    action: () => base44.entities.Task.deleteMany({}),
    confirm: 'ALLE Aufgaben'
  },
  {
    id: 'resetTasks',
    label: 'Alle Aufgaben zurücksetzen',
    description: 'Setzt jede Aufgabe wieder auf „Offen" — nützlich für einen neuen Durchlauf.',
    icon: RotateCcw,
    tone: 'text-amber-600',
    action: () => base44.entities.Task.updateMany({}, { $set: { status: 'open' } }),
    confirm: 'ALLE Aufgaben'
  },
  {
    id: 'deleteDoneTasks',
    label: 'Erledigte Aufgaben löschen',
    description: 'Räumt auf: löscht nur Aufgaben mit Status „Erledigt".',
    icon: Trash2,
    tone: 'text-rose-600',
    action: () => base44.entities.Task.deleteMany({ status: 'done' }),
    confirm: 'alle erledigten Aufgaben'
  },
  {
    id: 'deleteAllPositions',
    label: 'Alle Posten löschen',
    description: 'Entfernt sämtliche Festival-Posten inkl. Bewerbungen.',
    icon: Briefcase,
    tone: 'text-rose-600',
    action: () => base44.entities.Position.deleteMany({}),
    confirm: 'ALLE Posten'
  },
  {
    id: 'deleteClosedPositions',
    label: 'Geschlossene Posten löschen',
    description: 'Löscht nur Posten mit Status „Geschlossen".',
    icon: Briefcase,
    tone: 'text-rose-600',
    action: () => base44.entities.Position.deleteMany({ status: 'closed' }),
    confirm: 'alle geschlossenen Posten'
  },
  {
    id: 'deleteAllEvents',
    label: 'Alle Events löschen',
    description: 'Entfernt sämtliche Events und Teilnahmeantworten.',
    icon: CalendarDays,
    tone: 'text-rose-600',
    action: () => base44.entities.Event.deleteMany({}),
    confirm: 'ALLE Events'
  },
  {
    id: 'deleteAllPolls',
    label: 'Alle Umfragen löschen',
    description: 'Entfernt sämtliche Umfragen und Abstimmungen.',
    icon: Vote,
    tone: 'text-rose-600',
    action: () => base44.entities.Poll.deleteMany({}),
    confirm: 'ALLE Umfragen'
  },
  {
    id: 'deleteAllChat',
    label: 'Alle Chat-Nachrichten löschen',
    description: 'Leert alle Chat-Kanäle — Team-Chats, DMs und Systemmeldungen.',
    icon: MessageSquare,
    tone: 'text-rose-600',
    action: () => base44.entities.ChatMessage.deleteMany({}),
    confirm: 'ALLE Chat-Nachrichten'
  },
  {
    id: 'deleteAllSchedule',
    label: 'Alle Zeitplan-Einträge löschen',
    description: 'Entfernt sämtliche individuelle und Team-Zeitplan-Einträge.',
    icon: CalendarClock,
    tone: 'text-rose-600',
    action: () => base44.entities.ScheduleEntry.deleteMany({}),
    confirm: 'ALLE Zeitplan-Einträge'
  }
];

export default function AdminToolsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pending, setPending] = useState(null);
  const [confirmTool, setConfirmTool] = useState(null);
  const [result, setResult] = useState(null);
  const [backupLoading, setBackupLoading] = useState(null);

  const handleBackup = async (mode) => {
    setBackupLoading(mode);
    try {
      const res = await base44.functions.invoke('exportBackup', { mode });
      const data = res.data || res;
      const stamp = new Date().toISOString().slice(0, 10);
      const name = mode === 'data'
        ? `datenbank-backup-${stamp}.json`
        : `code-backup-${stamp}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: 'Backup heruntergeladen',
        description: mode === 'data'
          ? `${Object.values(data.counts || {}).reduce((s, n) => s + n, 0)} Einträge exportiert.`
          : `${data.codeFileCount || 0} Dateien exportiert.`
      });
    } catch (e) {
      toast({ title: 'Backup fehlgeschlagen', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setBackupLoading(null);
    }
  };

  const runTool = async (tool) => {
    setPending(tool.id);
    setResult(null);
    try {
      const res = await tool.action();
      await queryClient.invalidateQueries();
      setResult({ toolId: tool.id, ok: true, res });
    } catch (e) {
      setResult({ toolId: tool.id, ok: false, error: e?.message || String(e) });
    } finally {
      setPending(null);
      setConfirmTool(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <Download className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-primary">Backups</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Lade alle Datenbankeinträge oder den kompletten App-Quellcode als JSON-Datei herunter — ideal für externe Backups.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => handleBackup('data')} disabled={!!backupLoading} className="sm:flex-1">
              {backupLoading === 'data' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
              Datenbank-Backup
            </Button>
            <Button onClick={() => handleBackup('code')} disabled={!!backupLoading} variant="outline" className="sm:flex-1">
              {backupLoading === 'code' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Code2 className="w-4 h-4 mr-2" />}
              Code-Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-rose-500/40 bg-rose-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">Gefahrenzone</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Diese Werkzeuge wirken sich auf die gesamte Datenbank aus und können nicht rückgängig gemacht werden. Bitte mit Bedacht verwenden.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map(tool => {
          const Icon = tool.icon;
          const isRunning = pending === tool.id;
          const lastResult = result?.toolId === tool.id ? result : null;
          return (
            <Card key={tool.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${tool.tone}`} />
                  <CardTitle className="text-sm font-semibold leading-tight">{tool.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-3">
                <p className="text-xs text-muted-foreground">{tool.description}</p>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className={tool.tone.includes('rose') ? 'border-rose-300 text-rose-600 hover:bg-rose-50' : ''}
                    disabled={isRunning}
                    onClick={() => setConfirmTool(tool)}
                  >
                    {isRunning ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Icon className="w-3.5 h-3.5 mr-1.5" />}
                    Ausführen
                  </Button>
                  {lastResult && (
                    <Badge variant="outline" className={lastResult.ok ? 'text-emerald-600 border-emerald-300' : 'text-rose-600 border-rose-300'}>
                      {lastResult.ok ? 'Erledigt' : 'Fehler'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!confirmTool} onOpenChange={() => setConfirmTool(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTool?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTool?.description}<br /><br />
              Bitte bestätige: tippe <span className="font-semibold text-rose-600">{confirmTool?.confirm}</span> zum Fortfahren. Diese Aktion ist endgültig.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!pending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!pending}
              className="bg-destructive text-destructive-foreground"
              onClick={() => confirmTool && runTool(confirmTool)}
            >
              {pending === confirmTool?.id ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Endgültig ausführen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}