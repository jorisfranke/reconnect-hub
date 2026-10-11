import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import { Plus, Trash2, Check, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function DatePollDialog({ task, open, onOpenChange }) {
  const { currentMember } = useMemberAuth();
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [creating, setCreating] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: polls = [], refetch } = useQuery({
    queryKey: ['date-polls', task?.id],
    queryFn: () => base44.entities.DatePoll.filter({ task_id: task?.id }),
    enabled: !!task?.id && open,
  });

  const handleCreatePoll = async () => {
    if (!pollTitle.trim() || !newDate) return;
    setCreating(true);
    await base44.entities.DatePoll.create({
      task_id: task.id,
      title: pollTitle,
      proposed_dates: [{ date: newDate, time: newTime, votes: [] }],
      created_by_id: currentMember.id,
      is_closed: false,
    });
    setPollTitle('');
    setNewDate('');
    setNewTime('');
    setShowCreateForm(false);
    setCreating(false);
    refetch();
  };

  const handleAddDate = async (poll) => {
    if (!newDate) return;
    const updated = [...(poll.proposed_dates || []), { date: newDate, time: newTime, votes: [] }];
    await base44.entities.DatePoll.update(poll.id, { proposed_dates: updated });
    setNewDate('');
    setNewTime('');
    refetch();
  };

  const handleVote = async (poll, dateIndex, available) => {
    const updatedDates = poll.proposed_dates.map((d, i) => {
      if (i !== dateIndex) return d;
      const otherVotes = (d.votes || []).filter(v => v.member_id !== currentMember.id);
      return { ...d, votes: [...otherVotes, { member_id: currentMember.id, member_name: currentMember.name, available }] };
    });
    await base44.entities.DatePoll.update(poll.id, { proposed_dates: updatedDates });
    refetch();
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Terminabstimmung – {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {polls.length === 0 && !showCreateForm && (
            <p className="text-sm text-muted-foreground text-center py-4">Noch keine Terminabstimmungen für diese Aufgabe.</p>
          )}

          {polls.map(poll => (
            <div key={poll.id} className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{poll.title}</h3>
                {poll.is_closed && <Badge variant="secondary">Abgeschlossen</Badge>}
              </div>

              <div className="space-y-2">
                {(poll.proposed_dates || []).map((d, idx) => {
                  const myVote = d.votes?.find(v => v.member_id === currentMember.id);
                  const yesVotes = d.votes?.filter(v => v.available).length || 0;
                  const noVotes = d.votes?.filter(v => !v.available).length || 0;

                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {format(new Date(d.date), 'EEE, dd. MMMM yyyy', { locale: de })}
                          {d.time && <span className="text-muted-foreground"> · {d.time} Uhr</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> {yesVotes}
                          </span>
                          <span className="text-xs text-red-500 flex items-center gap-0.5">
                            <X className="w-3 h-3" /> {noVotes}
                          </span>
                          <div className="flex -space-x-1 ml-1">
                            {(d.votes || []).slice(0, 5).map((v, vi) => (
                              <div
                                key={vi}
                                className={`w-5 h-5 rounded-full border border-white flex items-center justify-center text-[9px] font-bold ${v.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                                title={v.member_name}
                              >
                                {v.member_name?.[0]?.toUpperCase()}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {!poll.is_closed && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleVote(poll, idx, true)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${myVote?.available === true ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleVote(poll, idx, false)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${myVote?.available === false ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!poll.is_closed && (
                <div className="flex gap-2 pt-1">
                  <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="text-xs h-8" />
                  <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="text-xs h-8 w-24" />
                  <Button size="sm" variant="outline" onClick={() => handleAddDate(poll)} disabled={!newDate} className="h-8 px-2">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {showCreateForm && (
            <div className="border rounded-xl p-4 space-y-3 border-primary/30 bg-primary/5">
              <p className="text-sm font-semibold">Neue Abstimmung erstellen</p>
              <Input value={pollTitle} onChange={e => setPollTitle(e.target.value)} placeholder="Titel der Abstimmung..." />
              <div className="flex gap-2">
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="text-xs" />
                <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="text-xs w-28" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreatePoll} disabled={creating || !pollTitle || !newDate}>
                  Erstellen
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          {!showCreateForm && (
            <Button variant="outline" className="w-full" onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Neue Terminabstimmung
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}