import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Crown, User, Layers, MessageCircle, Mail } from 'lucide-react';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import { useTeams } from '@/lib/teams';

export default function MyTeam() {
  const { currentMember } = useMemberAuth();
  const { colors, teamMap } = useTeams();

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const myTeams = currentMember?.teams || [];
  const contact = members.find(m => m.id === currentMember?.contact_person_id);
  const isMulti = myTeams.length > 1;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mein Team</h1>
        <p className="text-sm text-muted-foreground">
          {isMulti ? `Du bist in ${myTeams.length} Teams` : 'Dein Team und Teammitglieder'}
        </p>
      </div>

      {/* Multi-team banner */}
      {isMulti && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Layers className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold">Du gehörst mehreren Teams an</p>
              <p className="text-xs text-muted-foreground">
                Deine Teams sind unten jeweils separat aufgeführt. Deine Aufgaben und dein Ablaufplan kombinieren alle Teams.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ansprechpartner */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Dein Ansprechpartner</h3>
          </div>
          {contact ? (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary">
                {contact.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{contact.name}</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {contact.role === 'admin' && <Badge variant="outline" className="text-[10px] py-0">Admin</Badge>}
                  {contact.teams?.map(t => {
                    const c = colors[t] || {};
                    return <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>{t}</span>;
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Dir ist noch kein Ansprechpartner zugewiesen.</p>
          )}
        </CardContent>
      </Card>

      {myTeams.length === 0 && (
        <p className="text-sm text-muted-foreground">Du bist keinem Team zugeordnet.</p>
      )}

      {/* One card per team */}
      {myTeams.map(team => {
        const c = colors[team] || {};
        const teamMembers = members.filter(m => m.teams?.includes(team) && m.id !== currentMember?.id);
        const lead = members.find(m => m.id === teamMap[team]?.lead_id);

        return (
          <Card key={team} className="overflow-hidden">
            <CardHeader className={`${c.bg} pb-3`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${c.dot}`} />
                <CardTitle className={`text-base ${c.text}`}>{team}</CardTitle>
                <Badge variant="outline" className={`text-[10px] ml-auto ${c.text} ${c.border}`}>
                  {teamMembers.length + 1} Mitglieder
                </Badge>
              </div>
              {teamMap[team]?.description && (
                <p className={`text-xs ${c.text} opacity-80 mt-1`}>{teamMap[team].description}</p>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {/* Me first */}
                <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {currentMember?.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{currentMember?.name}</span>
                  <Badge className="text-[9px] ml-auto">Du</Badge>
                </div>
                {lead && lead.id !== currentMember?.id && (
                  <div className="flex items-center gap-2 py-1.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {lead.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm">{lead.name}</span>
                    <Crown className="w-3.5 h-3.5 text-amber-500 ml-auto" />
                    <span className="text-[10px] text-muted-foreground">Teamleitung</span>
                  </div>
                )}
                {teamMembers.filter(m => m.id !== lead?.id).map(m => (
                  <div key={m.id} className="flex items-center gap-2 py-1.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {m.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm">{m.name}</span>
                    {m.role === 'admin' && <Badge variant="outline" className="text-[9px] ml-auto py-0">Admin</Badge>}
                    {(m.teams?.length || 0) > 1 && (
                      <span className="text-[10px] text-muted-foreground ml-auto">auch in {m.teams.filter(t => t !== team).length} weiteren</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}