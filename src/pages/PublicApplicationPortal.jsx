import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Search, Briefcase, Zap, MapPin, Clock, Users, Calendar } from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTeams } from '@/lib/teams';
import PublicApplyDialog from '@/components/positions/PublicApplyDialog';

export default function PublicApplicationPortal() {
  const { teams, colors } = useTeams();
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const { data: positions = [] } = useQuery({
    queryKey: ['positions-public'],
    queryFn: () => base44.entities.Position.list('-created_date', 500),
  });

  const open = positions.filter(p => p.status === 'open');

  let visible = open;
  if (teamFilter !== 'all') visible = visible.filter(p => p.team === teamFilter);
  if (search) {
    visible = visible.filter(p =>
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase())
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">re:connect Festival</h1>
              <p className="text-sm opacity-90">Bewerbungsportal — Mach mit!</p>
            </div>
          </div>
          <p className="text-sm opacity-90 max-w-xl">
            Hier findest du alle offenen Posten für unser Festival. Bewirb dich direkt online —
            kein Konto nötig. Wenn wir dich annehmen, erhältst du automatisch Zugang zum Team-Portal.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Posten suchen…" className="pl-9" />
          </div>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Teams</SelectItem>
              {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Positions */}
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> Offene Posten ({visible.length})
          </h2>
          {visible.length === 0 ? (
            <Card className="p-10 text-center">
              <Briefcase className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">
                {open.length === 0 ? 'Aktuell sind keine Posten ausgeschrieben. Schlater später wieder vorbei!' : 'Keine Posten gefunden.'}
              </p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map(p => {
                const c = colors[p.team] || {};
                const accepted = (p.applications || []).filter(a => a.status === 'accepted');
                const isToday_ = p.date && isToday(new Date(p.date));
                const isPast_ = p.date && isPast(new Date(p.date)) && !isToday_;
                return (
                  <Card
                    key={p.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setSelected(p)}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-tight">{p.title}</h3>
                        <Badge className={`text-[10px] shrink-0 border-0 ${c.bg} ${c.text}`}>{p.team}</Badge>
                      </div>
                      {p.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {p.date && (
                          <span className={`flex items-center gap-1 ${isPast_ ? 'text-destructive' : isToday_ ? 'text-amber-600 font-medium' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            {format(new Date(p.date), 'dd. MMM', { locale: de })}
                          </span>
                        )}
                        {p.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {p.start_time}{p.end_time ? `–${p.end_time}` : ''}
                          </span>
                        )}
                        {p.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {p.location}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {accepted.length}/{p.capacity || 1} besetzt
                        </span>
                        <span className="text-[11px] text-primary font-medium">Bewerben →</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PublicApplyDialog
        position={selected}
        open={!!selected}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
        colors={colors}
      />
    </div>
  );
}