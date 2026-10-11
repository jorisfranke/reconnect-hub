import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Calendar, Clock, MapPin, Briefcase, ListTodo,
  User, AlertTriangle, CalendarDays, Plus, Edit2, Trash2, StickyNote, Users
} from 'lucide-react';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import { useTeams } from '@/lib/teams';
import ScheduleEntryFormDialog from '@/components/schedule/ScheduleEntryFormDialog';

function timeKey(date, time) {
  if (!date) return '9999-12-31';
  return date + 'T' + (time || '00:00');
}

export default function SchedulePage() {
  const { currentMember } = useMemberAuth();
  const { teams, colors } = useTeams();
  const queryClient = useQueryClient();
  const isAdmin = currentMember?.role === 'admin';

  const [viewMode, setViewMode] = useState('person'); // 'person' | 'team'
  const [selectedMemberId, setSelectedMemberId] = useState(currentMember?.id || '');
  const [selectedTeam, setSelectedTeam] = useState(teams[0] || '');
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list('-created_date', 500),
  });
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date', 200),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });
  const { data: scheduleEntries = [] } = useQuery({
    queryKey: ['schedule-entries'],
    queryFn: () => base44.entities.ScheduleEntry.list('-created_date', 500),
  });

  if (!currentMember) return null;

  // Non-admins always see their own schedule (person view)
  const effectiveViewMode = isAdmin ? viewMode : 'person';
  const targetMemberId = isAdmin ? (selectedMemberId || currentMember.id) : currentMember.id;
  const targetMember = members.find(m => m.id === targetMemberId) || currentMember;
  const contact = members.find(m => m.id === targetMember.contact_person_id);

  // Determine which team entries to show
  let teamEntries = [];
  let customEntries = [];

  if (effectiveViewMode === 'team') {
    // Team view: show only entries assigned to this team
    customEntries = scheduleEntries.filter(e => e.team === selectedTeam);
  } else {
    // Person view: show personal entries + entries for any of the person's teams
    const memberTeams = targetMember?.teams || [];
    customEntries = scheduleEntries.filter(e =>
      e.member_id === targetMemberId || (e.team && memberTeams.includes(e.team))
    );
  }

  // Build schedule items
  const items = [];

  if (effectiveViewMode === 'person') {
    // Accepted positions
    positions.forEach(p => {
      const app = p.applications?.find(a => a.member_id === targetMemberId && a.status === 'accepted');
      if (!app) return;
      items.push({
        id: 'pos-' + p.id,
        type: 'position',
        title: p.title,
        subtitle: p.location || p.team,
        date: p.date,
        time: p.start_time,
        endTime: p.end_time,
        team: p.team,
        icon: Briefcase,
      });
    });

    // Tasks assigned to target member
    tasks.forEach(t => {
      if (!t.assigned_member_ids?.includes(targetMemberId)) return;
      if (!t.due_date) return;
      if (t.status === 'done') return;
      items.push({
        id: 'task-' + t.id,
        type: 'task',
        title: t.title,
        subtitle: t.category,
        date: t.due_date,
        time: null,
        team: t.assigned_team,
        icon: ListTodo,
        overdue: t.due_date && isPast(parseISO(t.due_date)) && (!t.due_date.includes('T') ? !isToday(parseISO(t.due_date)) : true),
      });
    });
  }

  // Events (shown in both views)
  events.forEach(e => {
    items.push({
      id: 'evt-' + e.id,
      type: 'event',
      title: e.title,
      subtitle: e.location,
      date: e.date,
      time: e.time,
      team: null,
      icon: CalendarDays,
    });
  });

  // Custom schedule entries
  customEntries.forEach(e => {
    items.push({
      id: 'se-' + e.id,
      type: 'custom',
      entryId: e.id,
      title: e.title,
      subtitle: e.location,
      date: e.date,
      time: e.start_time,
      endTime: e.end_time,
      team: e.team,
      icon: StickyNote,
      notes: e.notes,
      isTeamEntry: !!e.team,
    });
  });

  items.sort((a, b) => timeKey(a.date, a.time).localeCompare(timeKey(b.date, b.time)));

  // Group by date
  const byDate = {};
  items.forEach(it => {
    const key = it.date || 'Ohne Datum';
    (byDate[key] = byDate[key] || []).push(it);
  });
  const dateKeys = Object.keys(byDate).sort();

  const refreshEntries = () => {
    queryClient.invalidateQueries({ queryKey: ['schedule-entries'] });
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Diesen Eintrag wirklich löschen?')) return;
    await base44.entities.ScheduleEntry.delete(entryId);
    refreshEntries();
  };

  const formProps = effectiveViewMode === 'team'
    ? { team: selectedTeam }
    : { memberId: targetMemberId };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ablaufplan</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? effectiveViewMode === 'team'
                ? `Team-Ablaufplan: ${selectedTeam}`
                : 'Individueller Zeitplan pro Person'
              : 'Deine persönlichen Posten, Termine und Aufgaben'
            }
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditingEntry(null); setEntryFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Eintrag
          </Button>
        )}
      </div>

      {/* Admin: view mode + selector */}
      {isAdmin && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* View mode toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setViewMode('person')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  effectiveViewMode === 'person'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <User className="w-4 h-4" /> Person
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  effectiveViewMode === 'team'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <Users className="w-4 h-4" /> Team
              </button>
            </div>

            {/* Selector */}
            {effectiveViewMode === 'person' ? (
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Mitglied wählen" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}{m.role === 'admin' ? ' (Admin)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Team wählen" /></SelectTrigger>
                <SelectContent>
                  {teams.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ansprechpartner (person view, non-admin) */}
      {!isAdmin && effectiveViewMode === 'person' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Dein Ansprechpartner</h3>
            </div>
            {contact ? (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary">
                  {contact.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{contact.name}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {contact.role === 'admin' && <Badge variant="outline" className="text-[10px] py-0">Admin</Badge>}
                    {contact.teams?.map(t => {
                      const c = colors[t] || {};
                      return <span key={t} className={'text-[10px] px-1.5 py-0.5 rounded-full ' + c.bg + ' ' + c.text}>{t}</span>;
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Dir ist noch kein Ansprechpartner zugewiesen. Bitte wende dich an die Orga.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Briefcase className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-xl font-bold">{items.filter(i => i.type === 'position').length}</p>
          <p className="text-[11px] text-muted-foreground">Posten</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <CalendarDays className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-xl font-bold">{items.filter(i => i.type === 'event').length}</p>
          <p className="text-[11px] text-muted-foreground">Termine</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <StickyNote className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-xl font-bold">{items.filter(i => i.type === 'custom').length}</p>
          <p className="text-[11px] text-muted-foreground">Einträge</p>
        </CardContent></Card>
      </div>

      {/* Timeline */}
      {dateKeys.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch nichts im Ablaufplan.</p>
          {isAdmin && <p className="text-xs mt-1">Lege einen Eintrag für diese {effectiveViewMode === 'team' ? 'Team' : 'Person'} an.</p>}
        </div>
      )}

      <div className="space-y-6">
        {dateKeys.map(dateKey => {
          const dayItems = byDate[dateKey];
          let label = 'Ohne Datum';
          let dayObj = null;
          if (dateKey !== 'Ohne Datum') {
            dayObj = parseISO(dateKey);
            label = format(dayObj, 'EEEE, dd. MMMM yyyy', { locale: de });
          }
          const isToday_ = dayObj && isToday(dayObj);
          return (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className={'text-sm font-semibold ' + (isToday_ ? 'text-primary' : '')}>
                  {label}
                </h3>
                {isToday_ && <Badge className="text-[10px]">Heute</Badge>}
              </div>
              <div className="relative pl-6 space-y-3">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                {dayItems.map(it => {
                  const c = it.team ? (colors[it.team] || {}) : {};
                  const Icon = it.icon;
                  return (
                    <div key={it.id} className="relative group">
                      <div className={'absolute -left-[18px] top-3 w-3.5 h-3.5 rounded-full border-2 border-card ' + (it.type === 'position' ? c.dot || 'bg-primary' : it.type === 'event' ? 'bg-blue-500' : it.type === 'custom' ? (it.isTeamEntry ? 'bg-cyan-500' : 'bg-violet-500') : it.overdue ? 'bg-destructive' : 'bg-amber-500')} />
                      <Card className={it.overdue ? 'border-destructive/40 bg-destructive/5' : ''}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <Icon className={'w-4 h-4 mt-0.5 shrink-0 ' + (it.overdue ? 'text-destructive' : it.type === 'position' ? c.text || 'text-primary' : it.type === 'custom' ? (it.isTeamEntry ? 'text-cyan-600' : 'text-violet-600') : 'text-muted-foreground')} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={'text-sm font-medium ' + (it.overdue ? 'text-destructive' : '')}>{it.title}</p>
                                {it.time && (
                                  <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {it.time}{it.endTime ? '–' + it.endTime : ''}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                {it.team && <Badge className={'text-[9px] border-0 ' + c.bg + ' ' + c.text}>{it.team}</Badge>}
                                {it.subtitle && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{it.subtitle}</span>}
                                {it.type === 'task' && <Badge variant="outline" className="text-[9px]">Aufgabe</Badge>}
                                {it.type === 'custom' && (
                                  <Badge variant="outline" className={'text-[9px] ' + (it.isTeamEntry ? 'text-cyan-600 border-cyan-200' : 'text-violet-600 border-violet-200')}>
                                    {it.isTeamEntry ? 'Team-Eintrag' : 'Eintrag'}
                                  </Badge>
                                )}
                                {it.overdue && <span className="text-[10px] text-destructive flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />Überfällig</span>}
                              </div>
                              {it.notes && <p className="text-[11px] text-muted-foreground mt-1 italic">{it.notes}</p>}
                            </div>
                            {isAdmin && it.type === 'custom' && (
                              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingEntry(it); setEntryFormOpen(true); }}>
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteEntry(it.entryId)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <ScheduleEntryFormDialog
        open={entryFormOpen}
        onOpenChange={setEntryFormOpen}
        entry={editingEntry}
        onSaved={refreshEntries}
        {...formProps}
      />
    </div>
  );
}