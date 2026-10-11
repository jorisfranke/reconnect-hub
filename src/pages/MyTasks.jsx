import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, isPast, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  CheckCircle2, Clock, AlertTriangle, Calendar,
  ListTodo, Bell, TrendingUp
} from 'lucide-react';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS, STATUS_COLORS, TEAM_COLORS } from '@/lib/constants';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';

export default function MyTasks() {
  const { currentMember } = useMemberAuth();
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: tasks = [], refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const myTasks = useMemo(() =>
    tasks.filter(t => t.assigned_member_ids?.includes(currentMember?.id)),
    [tasks, currentMember?.id]
  );

  const newTasks = useMemo(() => {
    if (!currentMember?.previous_login) return myTasks;
    return myTasks.filter(t => new Date(t.created_date) > new Date(currentMember.previous_login));
  }, [myTasks, currentMember?.previous_login]);

  const myCompletion = (task) => task.completions?.find(c => c.member_id === currentMember?.id);

  const openTasks = myTasks.filter(t => t.status === 'open' && !myCompletion(t));
  const inProgressTasks = myTasks.filter(t => t.status === 'in_progress' && !myCompletion(t));
  const doneTasks = myTasks.filter(t => myCompletion(t) || t.status === 'done');

  const totalCount = myTasks.length;
  const doneCount = doneTasks.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleComplete = async (task) => {
    const newCompletion = {
      member_id: currentMember.id,
      member_name: currentMember.name,
      completed_at: new Date().toISOString()
    };
    const updatedCompletions = [...(task.completions || []), newCompletion];
    const assignedMembers = members.filter(m => task.assigned_member_ids?.includes(m.id));
    const allDone = assignedMembers.every(m =>
      updatedCompletions.some(c => c.member_id === m.id)
    );
    await base44.entities.Task.update(task.id, {
      completions: updatedCompletions,
      status: allDone ? 'done' : task.status === 'open' ? 'in_progress' : task.status
    });
    refetch();
  };

  const TaskSection = ({ title, icon: Icon, tasks: sectionTasks, color, showComplete = false }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="text-xs">{sectionTasks.length}</Badge>
      </div>
      {sectionTasks.length === 0 && (
        <p className="text-sm text-muted-foreground pl-6">Keine Aufgaben.</p>
      )}
      <div className="space-y-2">
        {sectionTasks.map(task => {
          const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
          const isDueToday = task.due_date && isToday(new Date(task.due_date));
          const completion = myCompletion(task);
          const isNew = newTasks.some(nt => nt.id === task.id);

          return (
            <Card
              key={task.id}
              className={`cursor-pointer hover:shadow-md transition-all ${isOverdue ? 'border-destructive/40 bg-destructive/5' : ''}`}
              onClick={() => setSelectedTask(task)}
            >
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                      <h4 className={`text-sm font-semibold truncate ${isOverdue ? 'text-destructive' : ''}`}>{task.title}</h4>
                      {isNew && !completion && <Badge className="bg-primary/10 text-primary text-[10px] border-0">Neu</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`text-[10px] border-0 ${PRIORITY_COLORS[task.priority]?.bg} ${PRIORITY_COLORS[task.priority]?.text}`}>
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
                      {task.category && <Badge variant="outline" className="text-[10px]">{task.category}</Badge>}
                      {task.due_date && (
                        <span className={`text-[11px] flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : isDueToday ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          <Calendar className="w-3 h-3" />
                          {format(new Date(task.due_date), 'dd. MMM', { locale: de })}
                        </span>
                      )}
                    </div>
                    {completion && (
                      <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Erledigt am {format(new Date(completion.completed_at), 'dd.MM.yy, HH:mm', { locale: de })}
                      </p>
                    )}
                  </div>
                  {showComplete && !completion && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={(e) => { e.stopPropagation(); handleComplete(task); }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Erledigt
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meine Aufgaben</h1>
          <p className="text-sm text-muted-foreground">Hallo, {currentMember?.name}!</p>
        </div>
        {newTasks.length > 0 && (
          <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
            <Bell className="w-3 h-3" />
            {newTasks.length} neue
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mein Fortschritt</span>
            <span className="font-semibold">{doneCount}/{totalCount}</span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-muted-foreground text-right">{progress}% erledigt</p>
        </CardContent>
      </Card>

      <TaskSection title="Offen" icon={Clock} tasks={openTasks} color="text-blue-600" showComplete />
      <TaskSection title="In Bearbeitung" icon={TrendingUp} tasks={inProgressTasks} color="text-amber-600" showComplete />
      <TaskSection title="Erledigt" icon={CheckCircle2} tasks={doneTasks} color="text-emerald-600" />

      <TaskDetailDialog task={selectedTask} open={!!selectedTask} onOpenChange={() => setSelectedTask(null)} members={members} onUpdate={() => { refetch(); setSelectedTask(null); }} />
    </div>
  );
}