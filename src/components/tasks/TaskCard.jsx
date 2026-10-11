import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format, isPast, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, AlertTriangle, CheckCircle2, Clock, User } from 'lucide-react';
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants';
import { useTeams } from '@/lib/teams';

export default function TaskCard({ task, members = [], onClick, compact = false }) {
  const { colors } = useTeams();
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
  const isDueToday = task.due_date && isToday(new Date(task.due_date));
  const assignedMembers = members.filter(m => task.assigned_member_ids?.includes(m.id));
  const completionCount = task.completions?.length || 0;
  const totalAssigned = assignedMembers.length;

  return (
    <Card
      className={`p-3.5 cursor-pointer hover:shadow-md transition-all group ${
        isOverdue ? 'border-destructive/40 bg-destructive/5' : ''
      }`}
      onClick={() => onClick?.(task)}
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className={`text-sm font-semibold leading-tight ${isOverdue ? 'text-destructive' : ''}`}>
            {isOverdue && <AlertTriangle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
            {task.title}
          </h4>
          <Badge className={`text-[10px] shrink-0 ${PRIORITY_COLORS[task.priority]?.bg} ${PRIORITY_COLORS[task.priority]?.text} border-0`}>
            {PRIORITY_LABELS[task.priority]}
          </Badge>
        </div>

        {!compact && task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {task.category && (
            <Badge variant="outline" className="text-[10px]">{task.category}</Badge>
          )}
          {task.assigned_team && (
            <Badge className={`text-[10px] border-0 ${colors[task.assigned_team]?.bg} ${colors[task.assigned_team]?.text}`}>
              {task.assigned_team}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {task.due_date && (
              <span className={`text-[11px] flex items-center gap-1 ${
                isOverdue ? 'text-destructive font-medium' : isDueToday ? 'text-amber-600' : 'text-muted-foreground'
              }`}>
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), 'dd. MMM', { locale: de })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {totalAssigned > 0 && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {completionCount}/{totalAssigned}
              </span>
            )}
            <div className="flex -space-x-1.5 ml-1">
              {assignedMembers.slice(0, 3).map(m => (
                <div key={m.id} className="w-5 h-5 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-[8px] font-bold text-primary">
                  {m.name?.[0]?.toUpperCase()}
                </div>
              ))}
              {assignedMembers.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[8px] text-muted-foreground">
                  +{assignedMembers.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}