import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isPast } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ListTodo, CheckCircle2, Clock, Users, Plus, Search,
  AlertTriangle, TrendingUp, Activity, BarChart2, Bell, CalendarDays, ShieldAlert, FileText
} from 'lucide-react';
import { STATUS_LABELS, PRIORITY_COLORS } from '@/lib/constants';
import { useTeams } from '@/lib/teams';
import TaskFormDialog from '@/components/tasks/TaskFormDialog';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';
import TaskCard from '@/components/tasks/TaskCard';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import SystemNotificationBanner from '@/components/dashboard/SystemNotificationBanner';
import PollsTab from '@/components/dashboard/PollsTab';
import AdminToolsTab from '@/components/dashboard/AdminToolsTab';
import ConceptTab from '@/components/dashboard/ConceptTab';

export default function AdminDashboard() {
  const { currentMember } = useMemberAuth();
  const { teams, colors } = useTeams();
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [search, setSearch] = useState('');

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const totalTasks = tasks.length;
  const openTasks = tasks.filter(t => t.status === 'open').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const overdueTasks = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'done').length;
  const globalProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const recentCompletions = tasks
    .flatMap(t => (t.completions || []).map(c => ({ ...c, taskTitle: t.title, taskId: t.id })))
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, 8);

  const myTasks = tasks.filter(t => t.assigned_member_ids?.includes(currentMember?.id) && t.status !== 'done');

  const filteredTasks = search
    ? tasks.filter(t => t.title?.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* System notifications banner */}
      <SystemNotificationBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">re:connect – Gesamtübersicht</p>
        </div>
        <Button onClick={() => setTaskFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Neue Aufgabe
        </Button>
      </div>

      {/* Global progress bar */}
      <Card className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Gesamt-Fortschritt</span>
          <Progress value={globalProgress} className="h-2 flex-1" />
          <span className="text-sm font-bold text-primary whitespace-nowrap">{globalProgress}%</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{doneTasks}/{totalTasks}</span>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Offen', value: openTasks, icon: Clock, color: 'text-blue-600' },
          { label: 'In Bearbeitung', value: inProgressTasks, icon: TrendingUp, color: 'text-amber-600' },
          { label: 'Erledigt', value: doneTasks, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Überfällig', value: overdueTasks, icon: AlertTriangle, color: 'text-destructive' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Aufgaben suchen..."
          className="pl-9"
        />
      </div>

      {search && filteredTasks.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map(t => (
            <TaskCard key={t.id} task={t} members={members} onClick={setSelectedTask} />
          ))}
        </div>
      )}

      {/* Tabs: My Tasks / Activity / Team Progress */}
      <Tabs defaultValue="my-tasks">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="my-tasks" className="flex items-center gap-1.5">
            <ListTodo className="w-3.5 h-3.5" />
            Meine Aufgaben
            {myTasks.length > 0 && <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{myTasks.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            Team-Fortschritt
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Aktivitäten
          </TabsTrigger>
          <TabsTrigger value="polls" className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Abstimmungen
          </TabsTrigger>
          <TabsTrigger value="admin-tools" className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Admin-Werkzeuge
          </TabsTrigger>
          <TabsTrigger value="concept" className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Konzept
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-tasks" className="mt-4">
          {myTasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Keine offenen Aufgaben – alles erledigt!</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {myTasks.map(t => (
                <TaskCard key={t.id} task={t} members={members} onClick={setSelectedTask} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map(team => {
              const teamMembers = members.filter(m => m.teams?.includes(team));
              const teamTasks = tasks.filter(t => t.assigned_team === team || t.assigned_member_ids?.some(id => teamMembers.some(m => m.id === id)));
              const teamDone = teamTasks.filter(t => t.status === 'done').length;
              const progress = teamTasks.length > 0 ? Math.round((teamDone / teamTasks.length) * 100) : 0;

              return (
                <Card key={team} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colors[team]?.dot}`} />
                      <CardTitle className="text-sm font-semibold">{team}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{teamMembers.length} Mitglieder</span>
                      <span>{teamDone}/{teamTasks.length} Aufgaben</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-right text-xs font-medium">{progress}%</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="polls" className="mt-4">
          <PollsTab />
        </TabsContent>

        <TabsContent value="admin-tools" className="mt-4">
          <AdminToolsTab />
        </TabsContent>

        <TabsContent value="concept" className="mt-4">
          <ConceptTab />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {recentCompletions.length === 0 && (
                <p className="text-sm text-muted-foreground">Noch keine Aktivitäten.</p>
              )}
              <div className="space-y-3">
                {recentCompletions.map((c, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                      {c.member_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{c.member_name}</span>
                        {' '}hat{' '}
                        <span className="font-medium">„{c.taskTitle}"</span>
                        {' '}erledigt
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(c.completed_at), 'dd. MMM, HH:mm', { locale: de })} Uhr
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TaskFormDialog open={taskFormOpen} onOpenChange={setTaskFormOpen} members={members} onSaved={refetchTasks} />
      <TaskDetailDialog task={selectedTask} open={!!selectedTask} onOpenChange={() => setSelectedTask(null)} members={members} onUpdate={() => { refetchTasks(); setSelectedTask(null); }} />
    </div>
  );
}