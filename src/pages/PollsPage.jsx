import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Lock, CheckCircle2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import PollFormDialog from '@/components/polls/PollFormDialog';

export default function PollsPage() {
  const { currentMember } = useMemberAuth();
  const [formOpen, setFormOpen] = useState(false);
  const isAdmin = currentMember?.role === 'admin';

  const { data: polls = [], refetch } = useQuery({
    queryKey: ['polls'],
    queryFn: () => base44.entities.Poll.list('-created_date', 100),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const totalMembers = members.length;

  // Filter polls visible to this member
  const visiblePolls = polls.filter(p => {
    if (!p.visible_to_teams || p.visible_to_teams.length === 0) return true;
    return p.visible_to_teams.some(t => currentMember?.teams?.includes(t));
  });

  const openPolls = visiblePolls.filter(p => !p.is_closed);
  const closedPolls = visiblePolls.filter(p => p.is_closed);

  const handleVote = async (poll, choice) => {
    const votes = (poll.votes || []).filter(v => v.member_id !== currentMember.id);
    const newVotes = [...votes, { member_id: currentMember.id, member_name: currentMember.name, choice }];
    await base44.entities.Poll.update(poll.id, { votes: newVotes });
    refetch();
  };

  const handleClose = async (poll) => {
    await base44.entities.Poll.update(poll.id, { is_closed: true });
    refetch();
  };

  const handleDelete = async (poll) => {
    await base44.entities.Poll.delete(poll.id);
    refetch();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Abstimmungen</h1>
          <p className="text-sm text-muted-foreground">Allgemeine Abstimmungen für das Team</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Neue Abstimmung
          </Button>
        )}
      </div>

      {visiblePolls.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Noch keine Abstimmungen vorhanden.</p>
        </div>
      )}

      {openPolls.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aktive Abstimmungen</h2>
          {openPolls.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              currentMember={currentMember}
              totalMembers={totalMembers}
              isAdmin={isAdmin}
              onVote={handleVote}
              onClose={handleClose}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {closedPolls.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Abgeschlossene Abstimmungen</h2>
          {closedPolls.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              currentMember={currentMember}
              totalMembers={totalMembers}
              isAdmin={isAdmin}
              onVote={handleVote}
              onClose={handleClose}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <PollFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={refetch} />
    </div>
  );
}

function PollCard({ poll, currentMember, totalMembers, isAdmin, onVote, onClose, onDelete }) {
  const myVote = (poll.votes || []).find(v => v.member_id === currentMember?.id);
  const isClosed = poll.is_closed;

  const options = poll.type === 'yes_no' ? ['Ja', 'Nein'] : (poll.options || []);

  const voteCounts = options.map(opt => ({
    label: opt,
    count: (poll.votes || []).filter(v => v.choice === opt).length,
    voters: (poll.votes || []).filter(v => v.choice === opt).map(v => v.member_name),
  }));

  const maxCount = Math.max(...voteCounts.map(v => v.count), 1);
  const totalVotes = (poll.votes || []).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{poll.title}</CardTitle>
              {isClosed
                ? <Badge variant="secondary" className="text-[10px]"><Lock className="w-3 h-3 mr-1" />Abgeschlossen</Badge>
                : <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Offen</Badge>
              }
              {poll.type === 'multiple_choice' && (
                <Badge variant="outline" className="text-[10px]">Mehrfachauswahl</Badge>
              )}
            </div>
            {poll.description && <p className="text-xs text-muted-foreground mt-1">{poll.description}</p>}
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Von {poll.created_by_name} · {poll.created_date ? format(new Date(poll.created_date), 'dd. MMM yyyy', { locale: de }) : ''}
              {poll.visible_to_teams?.length > 0 && ` · Nur: ${poll.visible_to_teams.join(', ')}`}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-1 shrink-0">
              {!isClosed && (
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onClose(poll)}>
                  <Lock className="w-3 h-3 mr-1" />Schließen
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive" onClick={() => onDelete(poll)}>
                Löschen
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {voteCounts.map(({ label, count, voters }) => {
          const isMyChoice = myVote?.choice === label;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isWinner = isClosed && count === maxCount && count > 0;

          return (
            <div key={label}>
              <div className="flex items-center gap-2">
                {!isClosed ? (
                  <button
                    onClick={() => onVote(poll, label)}
                    className={`flex-1 text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                      isMyChoice
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {label}
                    {isMyChoice && <span className="ml-2 text-[10px]">✓ Deine Wahl</span>}
                  </button>
                ) : (
                  <div className={`flex-1 px-3 py-2 rounded-lg border text-sm ${isWinner ? 'border-primary/50 bg-primary/5 font-medium text-primary' : 'border-border'}`}>
                    {isWinner && '🏆 '}{label}
                    {isMyChoice && <span className="ml-2 text-[10px] text-muted-foreground">(deine Wahl)</span>}
                  </div>
                )}
                <span className="text-xs text-muted-foreground w-12 text-right">{count} ({pct}%)</span>
              </div>
              <div className="mt-1 ml-0 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isWinner ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {voters.length > 0 && (
                <p className="text-[10px] text-muted-foreground ml-1 mt-0.5">{voters.join(', ')}</p>
              )}
            </div>
          );
        })}

        <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          {totalVotes} von {totalMembers} haben abgestimmt
          {!isClosed && !myVote && <span className="ml-1 text-amber-600 font-medium">· Du hast noch nicht abgestimmt</span>}
        </div>
      </CardContent>
    </Card>
  );
}