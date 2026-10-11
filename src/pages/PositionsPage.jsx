import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Briefcase, CheckCircle2, Clock } from 'lucide-react';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import { useTeams } from '@/lib/teams';
import PositionCard from '@/components/positions/PositionCard';
import PositionFormDialog from '@/components/positions/PositionFormDialog';
import PositionDetailDialog from '@/components/positions/PositionDetailDialog';

export default function PositionsPage() {
  const { currentMember } = useMemberAuth();
  const { teams, colors } = useTeams();
  const isAdmin = currentMember?.role === 'admin';
  const [formOpen, setFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: positions = [], refetch } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list('-created_date', 500),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const myApps = positions.filter(p => p.applications?.some(a => a.member_id === currentMember?.id));
  const myAccepted = positions.filter(p => p.applications?.some(a => a.member_id === currentMember?.id && a.status === 'accepted'));

  let visible = positions;
  if (!isAdmin) {
    // Members see all positions (so they can discover and apply), but we surface their own applications separately
  }
  if (teamFilter !== 'all') visible = visible.filter(p => p.team === teamFilter);
  if (statusFilter !== 'all') visible = visible.filter(p => p.status === statusFilter);
  if (search) {
    visible = visible.filter(p =>
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase())
    );
  }

  const handleUpdate = (updated, deleted) => {
    refetch();
    if (deleted) setSelected(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bewerbungsportal</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Posten ausschreiben und Bewerbungen verwalten' : 'Offene Posten für das Festival'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditingPosition(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Posten ausschreiben
          </Button>
        )}
      </div>

      {/* Member: my applications summary */}
      {!isAdmin && myApps.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-2xl font-bold">{myApps.filter(p => p.applications.find(a => a.member_id === currentMember.id).status === 'pending').length}</p>
              <p className="text-xs text-muted-foreground">Bewerbungen ausstehend</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{myAccepted.length}</p>
              <p className="text-xs text-muted-foreground">Angenommene Posten</p>
            </div>
          </div>
        </div>
      )}

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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="open">Offen</SelectItem>
            <SelectItem value="filled">Besetzt</SelectItem>
            <SelectItem value="closed">Geschlossen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Member: my applications section */}
      {!isAdmin && myApps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> Meine Bewerbungen
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {myApps.map(p => (
              <PositionCard
                key={p.id}
                position={p}
                colors={colors}
                onClick={setSelected}
                myApplication={p.applications.find(a => a.member_id === currentMember.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All positions */}
      <div>
        <h3 className="text-sm font-semibold mb-3">
          {isAdmin ? 'Alle Posten' : 'Verfügbare Posten'} ({visible.length})
        </h3>
        {visible.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Keine Posten gefunden.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map(p => (
              <PositionCard
                key={p.id}
                position={p}
                colors={colors}
                onClick={setSelected}
                myApplication={!isAdmin ? p.applications?.find(a => a.member_id === currentMember.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <PositionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        position={editingPosition}
        teams={teams}
        onSaved={refetch}
      />
      <PositionDetailDialog
        position={selected}
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        members={members}
        colors={colors}
        currentMember={currentMember}
        isAdmin={isAdmin}
        onEdit={(pos) => { setSelected(null); setEditingPosition(pos); setFormOpen(true); }}
        onUpdate={handleUpdate}
      />
    </div>
  );
}