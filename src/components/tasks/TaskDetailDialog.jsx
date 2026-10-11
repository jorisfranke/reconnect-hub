import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { base44 } from '@/api/base44Client';
import { format, isPast } from 'date-fns';
import { de } from 'date-fns/locale';
import { CheckCircle2, Clock, Send, AlertTriangle, Calendar, User, CalendarDays } from 'lucide-react';
import DatePollDialog from '@/components/tasks/DatePollDialog';
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants';
import { useTeams } from '@/lib/teams';
import { useMemberAuth } from '@/lib/MemberAuthContext';

export default function TaskDetailDialog({ task, open, onOpenChange, members = [], onUpdate }) {
  const { currentMember } = useMemberAuth();
  const { colors } = useTeams();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [datePollOpen, setDatePollOpen] = useState(false);

  useEffect(() => {
    if (task?.id && open) {
      base44.entities.Comment.filter({ task_id: task.id }, '-created_date').then(setComments);
    }
  }, [task?.id, open]);

  if (!task) return null;

  const assignedMembers = members.filter(m => task.assigned_member_ids?.includes(m.id));
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
  const myCompletion = task.completions?.find(c => c.member_id === currentMember?.id);
  const canComplete = assignedMembers.some(m => m.id === currentMember?.id) && !myCompletion;

  const handleComplete = async () => {
    const newCompletion = {
      member_id: currentMember.id,
      member_name: currentMember.name,
      completed_at: new Date().toISOString()
    };
    const updatedCompletions = [...(task.completions || []), newCompletion];
    const updates = {
      completions: updatedCompletions,
      status: 'done'
    };
    await base44.entities.Task.update(task.id, updates);
    onUpdate?.();
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    await base44.entities.Comment.create({
      task_id: task.id,
      member_id: currentMember.id,
      member_name: currentMember.name,
      text: newComment.trim()
    });
    setNewComment('');
    const updated = await base44.entities.Comment.filter({ task_id: task.id }, '-created_date');
    setComments(updated);
    setSending(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 text-lg">
            {isOverdue && <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={`${STATUS_COLORS[task.status]?.bg} ${STATUS_COLORS[task.status]?.text} border-0`}>
              {STATUS_LABELS[task.status]}
            </Badge>
            <Badge className={`${PRIORITY_COLORS[task.priority]?.bg} ${PRIORITY_COLORS[task.priority]?.text} border-0`}>
              {PRIORITY_LABELS[task.priority]}
            </Badge>
            {task.category && <Badge variant="outline">{task.category}</Badge>}
            {task.assigned_team && (
              <Badge className={`border-0 ${colors[task.assigned_team]?.bg} ${colors[task.assigned_team]?.text}`}>
                {task.assigned_team}
              </Badge>
            )}
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}

          {task.due_date && (
            <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Calendar className="w-4 h-4" />
              Fällig am {format(new Date(task.due_date), 'dd. MMMM yyyy', { locale: de })}
            </div>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-2">Zugewiesene Personen</h4>
            <div className="space-y-2">
              {assignedMembers.map(m => {
                const completion = task.completions?.find(c => c.member_id === m.id);
                return (
                  <div key={m.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {m.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm">{m.name}</span>
                    </div>
                    {completion ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Erledigt am {format(new Date(completion.completed_at), 'dd.MM.yy, HH:mm', { locale: de })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Ausstehend
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {canComplete && (
              <Button className="flex-1" onClick={handleComplete}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Als erledigt markieren
              </Button>
            )}
            <Button variant="outline" onClick={() => setDatePollOpen(true)} className={canComplete ? '' : 'w-full'}>
              <CalendarDays className="w-4 h-4 mr-2" />
              Terminabstimmung
            </Button>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-3">Kommentare</h4>
            <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground">Noch keine Kommentare.</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                    {c.member_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{c.member_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(c.created_date), 'dd.MM.yy HH:mm')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Kommentar schreiben..."
                className="text-sm min-h-[60px]"
              />
              <Button size="icon" onClick={handleComment} disabled={sending || !newComment.trim()} className="shrink-0 self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <DatePollDialog task={task} open={datePollOpen} onOpenChange={setDatePollOpen} />
    </>
  );
}