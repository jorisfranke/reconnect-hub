import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarDays, CheckCircle2, Users, Lock, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { useMemberAuth } from '@/lib/MemberAuthContext';

export default function PollsTab() {
  const { currentMember } = useMemberAuth();

  const { data: polls = [], refetch } = useQuery({
    queryKey: ['date-polls'],
    queryFn: () => base44.entities.DatePoll.list('-created_date', 50),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const handleVote = async (poll, dateIndex, available) => {
    const updatedDates = poll.proposed_dates.map((d, i) => {
      if (i !== dateIndex) return d;
      const votes = (d.votes || []).filter(v => v.member_id !== currentMember.id);
      return {
        ...d,
        votes: [...votes, { member_id: currentMember.id, member_name: currentMember.name, available }]
      };
    });
    await base44.entities.DatePoll.update(poll.id, { proposed_dates: updatedDates });
    refetch();
  };

  const handleClose = async (poll) => {
    await base44.entities.DatePoll.update(poll.id, { is_closed: true });
    refetch();
  };

  const openPolls = polls.filter(p => !p.is_closed);
  const closedPolls = polls.filter(p => p.is_closed);

  const getTaskTitle = (taskId) => tasks.find(t => t.id === taskId)?.title;

  const totalMembers = members.length;

  return (
    <div className="space-y-6 mt-4">
      {polls.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Noch keine Abstimmungen vorhanden.</p>
          <p className="text-xs mt-1">Erstelle eine Terminabstimmung über eine Aufgabe.</p>
        </div>
      )}

      {openPolls.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Offene Abstimmungen</h3>
          {openPolls.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              taskTitle={getTaskTitle(poll.task_id)}
              currentMember={currentMember}
              totalMembers={totalMembers}
              onVote={handleVote}
              onClose={handleClose}
            />
          ))}
        </div>
      )}

      {closedPolls.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Abgeschlossene Abstimmungen</h3>
          {closedPolls.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              taskTitle={getTaskTitle(poll.task_id)}
              currentMember={currentMember}
              totalMembers={totalMembers}
              onVote={handleVote}
              onClose={handleClose}
              closed
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PollCard({ poll, taskTitle, currentMember, totalMembers, onVote, onClose, closed }) {
  const isAdmin = currentMember?.role === 'admin';

  // Find best date (most "yes" votes)
  const bestDate = poll.proposed_dates?.reduce((best, d) => {
    const yesCount = (d.votes || []).filter(v => v.available).length;
    const bestYes = (best?.votes || []).filter(v => v.available).length;
    return yesCount > bestYes ? d : best;
  }, null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{poll.title}</CardTitle>
              {closed
                ? <Badge variant="secondary" className="text-[10px]"><Lock className="w-3 h-3 mr-1" />Abgeschlossen</Badge>
                : <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Offen</Badge>
              }
            </div>
            {taskTitle && (
              <p className="text-xs text-muted-foreground mt-0.5">Aufgabe: {taskTitle}</p>
            )}
          </div>
          {!closed && isAdmin && (
            <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => onClose(poll)}>
              <Lock className="w-3 h-3 mr-1" />
              Schließen
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {poll.proposed_dates?.map((d, i) => {
          const yesVotes = (d.votes || []).filter(v => v.available);
          const noVotes = (d.votes || []).filter(v => !v.available);
          const totalVotes = (d.votes || []).length;
          const myVote = (d.votes || []).find(v => v.member_id === currentMember?.id);
          const isBest = !closed && d === bestDate && yesVotes.length > 0;

          return (
            <div
              key={i}
              className={`rounded-lg border p-3 transition-colors ${isBest ? 'border-primary/50 bg-primary/5' : 'border-border bg-background'}`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className={`text-sm font-medium ${isBest ? 'text-primary' : ''}`}>
                    {isBest && '★ '}
                    {format(new Date(d.date), 'EEEE, dd. MMMM yyyy', { locale: de })}
                    {d.time && <span className="text-muted-foreground ml-2 font-normal">· {d.time} Uhr</span>}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />{yesVotes.length}
                    </span>
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3" />{noVotes.length}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />{totalVotes}/{totalMembers}
                    </span>
                  </div>
                  {yesVotes.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Ja: {yesVotes.map(v => v.member_name).join(', ')}
                    </p>
                  )}
                </div>
                {!closed && (
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant={myVote?.available === true ? 'default' : 'outline'}
                      className={`h-8 text-xs ${myVote?.available === true ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                      onClick={() => onVote(poll, i, true)}
                    >
                      <ThumbsUp className="w-3 h-3 mr-1" />Ja
                    </Button>
                    <Button
                      size="sm"
                      variant={myVote?.available === false ? 'destructive' : 'outline'}
                      className="h-8 text-xs"
                      onClick={() => onVote(poll, i, false)}
                    >
                      <ThumbsDown className="w-3 h-3 mr-1" />Nein
                    </Button>
                  </div>
                )}
                {closed && myVote && (
                  <Badge variant={myVote.available ? 'default' : 'destructive'} className="text-[10px]">
                    {myVote.available ? 'Du: Ja' : 'Du: Nein'}
                  </Badge>
                )}
              </div>
              {/* Vote bar */}
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: totalMembers > 0 ? `${(yesVotes.length / totalMembers) * 100}%` : '0%' }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}