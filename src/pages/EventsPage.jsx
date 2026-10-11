import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Plus, Check, X, Minus } from 'lucide-react';
import EventFormDialog from '@/components/events/EventFormDialog';

export default function EventsPage() {
  const { currentMember } = useMemberAuth();
  const isAdmin = currentMember?.role === 'admin';
  const [formOpen, setFormOpen] = useState(false);

  const { data: events = [], refetch } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('date', 100),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const handleAttend = async (event, status) => {
    const existing = (event.attendances || []).filter(a => a.member_id !== currentMember.id);
    const updated = [...existing, { member_id: currentMember.id, member_name: currentMember.name, status }];
    await base44.entities.Event.update(event.id, { attendances: updated });
    refetch();
  };

  const statusConfig = {
    yes: { label: 'Zusage', icon: Check, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    no: { label: 'Absage', icon: X, cls: 'bg-red-100 text-red-700 border-red-200' },
    maybe: { label: 'Vielleicht', icon: Minus, cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  };

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)));
  const pastEvents = events.filter(e => new Date(e.date) < new Date(new Date().setHours(0,0,0,0)));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Termine</h1>
          <p className="text-sm text-muted-foreground">Veranstaltungen & Termine</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Neuer Termin
          </Button>
        )}
      </div>

      {upcomingEvents.length === 0 && pastEvents.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Noch keine Termine eingetragen.</p>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Kommende Termine</h2>
          <div className="space-y-3">
            {upcomingEvents.map(event => {
              const myAttendance = event.attendances?.find(a => a.member_id === currentMember?.id);
              const yesCnt = event.attendances?.filter(a => a.status === 'yes').length || 0;
              const noCnt = event.attendances?.filter(a => a.status === 'no').length || 0;
              const maybeCnt = event.attendances?.filter(a => a.status === 'maybe').length || 0;

              return (
                <Card key={event.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      {/* Date block */}
                      <div className="bg-primary/10 rounded-xl p-3 text-center min-w-[64px]">
                        <p className="text-xs font-medium text-primary uppercase">
                          {format(new Date(event.date), 'MMM', { locale: de })}
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {format(new Date(event.date), 'dd')}
                        </p>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">{event.title}</h3>
                        {event.description && <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          {event.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {event.time} Uhr
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {event.location}
                            </span>
                          )}
                        </div>

                        {/* Attendance stats */}
                        <div className="flex gap-3 mt-3 text-xs">
                          <span className="text-emerald-600 font-medium">{yesCnt} ✓</span>
                          <span className="text-red-500 font-medium">{noCnt} ✗</span>
                          <span className="text-amber-600 font-medium">{maybeCnt} ?</span>
                        </div>

                        {/* Attendance buttons */}
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {(['yes', 'no', 'maybe']).map(s => {
                            const cfg = statusConfig[s];
                            const active = myAttendance?.status === s;
                            return (
                              <button
                                key={s}
                                onClick={() => handleAttend(event, s)}
                                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                  active ? cfg.cls : 'bg-transparent text-muted-foreground border-border hover:bg-secondary'
                                }`}
                              >
                                <cfg.icon className="w-3 h-3" />
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Attendees summary */}
                      <div className="flex -space-x-1.5 items-center mt-1">
                        {(event.attendances || []).filter(a => a.status === 'yes').slice(0, 5).map((a, i) => {
                          const m = members.find(x => x.id === a.member_id);
                          return (
                            <div key={i} className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-emerald-700">
                              {a.member_name?.[0]?.toUpperCase()}
                            </div>
                          );
                        })}
                        {yesCnt > 5 && <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-muted-foreground">+{yesCnt - 5}</div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Vergangene Termine</h2>
          <div className="space-y-2 opacity-60">
            {pastEvents.map(event => (
              <Card key={event.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{event.title}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(event.date), 'dd. MMM yyyy', { locale: de })}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} currentMember={currentMember} onSaved={refetch} />
    </div>
  );
}