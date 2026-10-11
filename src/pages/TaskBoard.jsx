import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS } from '@/lib/constants';
import { useTeams } from '@/lib/teams';
import TaskCard from '@/components/tasks/TaskCard';
import TaskFormDialog from '@/components/tasks/TaskFormDialog';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';

const COLUMNS = ['open', 'in_progress', 'done'];

export default function TaskBoard() {
  const { teams } = useTeams();
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [search, setSearch] = useState('');
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const { data: tasks = [], refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const filtered = tasks.filter(t => {
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTeam !== 'all' && t.assigned_team !== filterTeam) {
      const teamMembers = members.filter(m => m.teams?.includes(filterTeam));
      if (!t.assigned_member_ids?.some(id => teamMembers.some(m => m.id === id))) return false;
    }
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    await base44.entities.Task.update(taskId, { status: newStatus });
    refetch();
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Aufgaben-Board</h1>
        <Button onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Neue Aufgabe
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen..." className="pl-9" />
        </div>
        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Team" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Teams</SelectItem>
            {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priorität" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
          {COLUMNS.map(status => {
            const columnTasks = filtered.filter(t => t.status === status);
            return (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-xl border p-3 flex flex-col ${
                      snapshot.isDraggingOver ? 'bg-accent/50' : 'bg-card/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          status === 'open' ? 'bg-blue-500' : status === 'in_progress' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        <h3 className="text-sm font-semibold">{STATUS_LABELS[status]}</h3>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {columnTasks.length}
                      </span>
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto">
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                              <TaskCard task={task} members={members} onClick={handleTaskClick} compact />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      <TaskFormDialog open={taskFormOpen} onOpenChange={setTaskFormOpen} task={editingTask} members={members} onSaved={refetch} />
      <TaskDetailDialog task={selectedTask} open={!!selectedTask} onOpenChange={() => setSelectedTask(null)} members={members} onUpdate={() => { refetch(); setSelectedTask(null); }} />
    </div>
  );
}