import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Users, ListTodo, Plus, Edit2, Trash2, UserCheck, Crown, Layers
} from 'lucide-react';
import { useTeams } from '@/lib/teams';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import TaskCard from '@/components/tasks/TaskCard';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';
import TaskFormDialog from '@/components/tasks/TaskFormDialog';
import TeamFormDialog from '@/components/teams/TeamFormDialog';

export default function TeamsPage() {
  const { currentMember } = useMemberAuth();
  const { teams, colors, teamRecords, teamMap, refetch: refetchTeams } = useTeams();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [deleteTeam, setDeleteTeam] = useState(null);

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const isAdmin = currentMember?.role === 'admin';

  React.useEffect(() => {
    if (!selectedTeam && teams.length > 0) setSelectedTeam(teams[0]);
  }, [teams, selectedTeam]);

  const teamMembers = members.filter(m => m.teams?.includes(selectedTeam));
  const teamTasks = tasks.filter(t =>
    t.assigned_team === selectedTeam ||
    t.assigned_member_ids?.some(id => teamMembers.some(m => m.id === id))
  );
  const teamDone = teamTasks.filter(t => t.status === 'done').length;
  const progress = teamTasks.length > 0 ? Math.round((teamDone / teamTasks.length) * 100) : 0;
  const colors_ = colors[selectedTeam] || {};
  const lead = teamMembers.find(m => m.id === teamMap[selectedTeam]?.lead_id) || members.find(m => m.id === teamMap[selectedTeam]?.lead_id);

  // Members in multiple teams (across all)
  const multiTeamMembers = members.filter(m => (m.teams?.length || 0) > 1);

  const handleDeleteTeam = async () => {
    if (!deleteTeam) return;
    await base44.entities.Team.delete(deleteTeam.id);
    setDeleteTeam(null);
    if (selectedTeam === deleteTeam.name) setSelectedTeam(null);
    refetchTeams();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground">{isAdmin ? 'Teams verwalten und Mitglieder zuordnen' : 'Deine Teams und Teammitglieder'}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => { setEditingTeam(null); setTeamFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />Neues Team
            </Button>
          )}
          <Button onClick={() => setTaskFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Aufgabe
          </Button>
        </div>
      </div>

      {/* Team selector / cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map(team => {
          const c = colors[team] || {};
          const tMembers = members.filter(m => m.teams?.includes(team));
          const tTasks = tasks.filter(t => t.assigned_team === team || t.assigned_member_ids?.some(id => tMembers.some(m => m.id === id)));
          const tDone = tTasks.filter(t => t.status === 'done').length;
          const tProgress = tTasks.length > 0 ? Math.round((tDone / tTasks.length) * 100) : 0;
          const tLead = members.find(m => m.id === teamMap[team]?.lead_id);
          return (
            <Card
              key={team}
              className={`cursor-pointer hover:shadow-md transition-all ${selectedTeam === team ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedTeam(team)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${c.dot}`} />
                    <h3 className="text-sm font-semibold">{team}</h3>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="w-6 h-6" onClick={(e) => { e.stopPropagation(); setEditingTeam(teamMap[team] || { name: team, color: 'slate' }); setTeamFormOpen(true); }}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      {teamMap[team] && (
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTeam(teamMap[team]); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {teamMap[team]?.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{teamMap[team].description}</p>
                )}
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{tMembers.length}</span>
                  {tLead && <span className="flex items-center gap-1"><Crown className="w-3 h-3" />{tLead.name}</span>}
                </div>
                <div className="mt-2">
                  <Progress value={tProgress} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground text-right mt-0.5">{tDone}/{tTasks.length} erledigt</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Multi-team members highlight */}
      {multiTeamMembers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Mitglieder in mehreren Teams
            </h3>
            <div className="flex flex-wrap gap-2">
              {multiTeamMembers.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {m.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight">{m.name}</p>
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {m.teams?.map(t => {
                        const c = colors[t] || {};
                        return <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>{t}</span>;
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected team detail */}
      {selectedTeam && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Users className={`w-5 h-5 ${colors_.text}`} />
                <div>
                  <p className="text-2xl font-bold">{teamMembers.length}</p>
                  <p className="text-xs text-muted-foreground">Mitglieder</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <ListTodo className={`w-5 h-5 ${colors_.text}`} />
                <div>
                  <p className="text-2xl font-bold">{teamTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Aufgaben</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Fortschritt</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Mitglieder in „{selectedTeam}"</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map(m => {
                const otherTeams = (m.teams || []).filter(t => t !== selectedTeam);
                const isLead = lead?.id === m.id;
                return (
                  <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border ${colors_.bg}`}>
                    <div className={`w-9 h-9 rounded-full bg-white/60 flex items-center justify-center text-sm font-bold ${colors_.text}`}>
                      {m.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-medium truncate ${colors_.text}`}>{m.name}</span>
                        {m.role === 'admin' && <Badge variant="outline" className="text-[9px] py-0">Admin</Badge>}
                        {isLead && <Crown className={`w-3.5 h-3.5 ${colors_.text}`} />}
                      </div>
                      {otherTeams.length > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">auch:</span>
                          {otherTeams.map(t => {
                            const c = colors[t] || {};
                            return <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>{t}</span>;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {teamMembers.length === 0 && (
                <p className="text-sm text-muted-foreground">Keine Mitglieder in diesem Team.</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Aufgaben ({teamTasks.length})</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teamTasks.map(t => (
                <TaskCard key={t.id} task={t} members={members} onClick={setSelectedTask} />
              ))}
              {teamTasks.length === 0 && (
                <p className="text-sm text-muted-foreground">Keine Aufgaben für dieses Team.</p>
              )}
            </div>
          </div>
        </>
      )}

      <TaskFormDialog open={taskFormOpen} onOpenChange={setTaskFormOpen} members={members} onSaved={refetchTasks} />
      <TaskDetailDialog task={selectedTask} open={!!selectedTask} onOpenChange={() => setSelectedTask(null)} members={members} onUpdate={() => { refetchTasks(); setSelectedTask(null); }} />
      <TeamFormDialog open={teamFormOpen} onOpenChange={setTeamFormOpen} team={editingTeam} members={members} onSaved={refetchTeams} />

      <AlertDialog open={!!deleteTeam} onOpenChange={() => setDeleteTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Team löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteTeam?.name}" wird entfernt. Mitglieder bleiben erhalten, aber verlieren diese Teamzuordnung nicht automatisch (die Zuordnung erfolgt über das Mitglieder-Formular).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive text-destructive-foreground">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}