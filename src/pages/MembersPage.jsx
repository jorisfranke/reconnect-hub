import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Plus, Search, Edit2, Trash2, Shield, Wifi, CheckCircle2, UserCheck,
  User, Layers, MessageCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTeams } from '@/lib/teams';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import MemberFormDialog from '@/components/members/MemberFormDialog';
import TaskCard from '@/components/tasks/TaskCard';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';

export default function MembersPage() {
  const { currentMember } = useMemberAuth();
  const { colors } = useTeams();
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | pending | multi | admin

  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });

  const isOnline = (member) => {
    if (!member.last_login) return false;
    return (Date.now() - new Date(member.last_login).getTime()) < 5 * 60 * 1000;
  };

  let filtered = members;
  if (filter === 'pending') filtered = filtered.filter(m => m.status === 'pending');
  if (filter === 'multi') filtered = filtered.filter(m => (m.teams?.length || 0) > 1);
  if (filter === 'admin') filtered = filtered.filter(m => m.role === 'admin');
  if (search) filtered = filtered.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()));

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const memberTasks = selectedMember
    ? tasks.filter(t => t.assigned_member_ids?.includes(selectedMember.id))
    : [];
  const contactOf = (id) => members.find(m => m.id === id);
  const pendingCount = members.filter(m => m.status === 'pending').length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.Member.delete(deleteTarget.id);
    setDeleteTarget(null);
    if (selectedMemberId === deleteTarget.id) setSelectedMemberId(null);
    refetchMembers();
  };

  const confirmMember = async (m) => {
    await base44.entities.Member.update(m.id, { status: 'confirmed' });
    refetchMembers();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mitglieder</h1>
          <p className="text-sm text-muted-foreground">Anlegen, bestätigen und verwalten</p>
        </div>
        <Button onClick={() => { setEditingMember(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Neues Mitglied
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mitglieder suchen…" className="pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Alle</Button>
          <Button size="sm" variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>
            Ausstehend {pendingCount > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] py-0">{pendingCount}</Badge>}
          </Button>
          <Button size="sm" variant={filter === 'multi' ? 'default' : 'outline'} onClick={() => setFilter('multi')}>
            <Layers className="w-3.5 h-3.5 mr-1" />Mehrere Teams
          </Button>
          <Button size="sm" variant={filter === 'admin' ? 'default' : 'outline'} onClick={() => setFilter('admin')}>Admins</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(m => {
          const mTasks = tasks.filter(t => t.assigned_member_ids?.includes(m.id));
          const mDone = mTasks.filter(t => t.status === 'done').length;
          const contact = contactOf(m.contact_person_id);
          const isMulti = (m.teams?.length || 0) > 1;
          return (
            <Card
              key={m.id}
              className={`cursor-pointer hover:shadow-md transition-all ${selectedMemberId === m.id ? 'ring-2 ring-primary' : ''} ${m.status === 'pending' ? 'border-amber-300 bg-amber-50/40' : ''}`}
              onClick={() => setSelectedMemberId(m.id === selectedMemberId ? null : m.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {m.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{m.name}</p>
                        {m.role === 'admin' && <Shield className="w-3.5 h-3.5 text-primary shrink-0" />}
                        {isMulti && <Layers className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </div>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {m.teams?.map(t => {
                          const c = colors[t] || {};
                          return <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>{t}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {m.status === 'pending' && (
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-emerald-600" title="Bestätigen" onClick={(e) => { e.stopPropagation(); confirmMember(m); }}>
                        <UserCheck className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={(e) => { e.stopPropagation(); setEditingMember(m); setFormOpen(true); }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(m); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center gap-2">
                    {m.status === 'pending' && (
                      <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">Ausstehend</Badge>
                    )}
                    {contact && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />Ansprechpartner: {contact.name}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{mDone}/{mTasks.length} erl.</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`w-2 h-2 rounded-full ${isOnline(m) ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span className="text-[10px] text-muted-foreground">
                    {isOnline(m) ? 'Online' : m.last_login
                      ? `Zuletzt: ${formatDistanceToNow(new Date(m.last_login), { locale: de, addSuffix: true })}`
                      : 'Noch nie eingeloggt'}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Keine Mitglieder gefunden.</p>}
      </div>

      {selectedMember && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Aufgaben von {selectedMember.name}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {memberTasks.map(t => (
              <TaskCard key={t.id} task={t} members={members} onClick={setSelectedTask} />
            ))}
            {memberTasks.length === 0 && <p className="text-sm text-muted-foreground">Keine Aufgaben zugewiesen.</p>}
          </div>
        </div>
      )}

      <MemberFormDialog open={formOpen} onOpenChange={setFormOpen} member={editingMember} members={members} onSaved={refetchMembers} />
      <TaskDetailDialog task={selectedTask} open={!!selectedTask} onOpenChange={() => setSelectedTask(null)} members={members} onUpdate={() => { refetchTasks(); setSelectedTask(null); }} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mitglied löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du „{deleteTarget?.name}" wirklich entfernen? Dies kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}