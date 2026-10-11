import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import { useTeams } from '@/lib/teams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Hash, Lock, Bell, Plus, Megaphone } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import SystemNotificationDialog from '@/components/chat/SystemNotificationDialog';
import BroadcastMailDialog from '@/components/chat/BroadcastMailDialog';

export default function ChatPage() {
  const { currentMember } = useMemberAuth();
  const queryClient = useQueryClient();
  const isAdmin = currentMember?.role === 'admin';
  const isJoris = currentMember?.name === 'Joris';
  const { teams, colors } = useTeams();

  const [activeChannel, setActiveChannel] = useState({ type: 'team', id: teams[0], label: teams[0] });
  const [text, setText] = useState('');
  const [sysDialogOpen, setSysDialogOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const channelId = activeChannel.id;

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['chat', channelId],
    queryFn: () => base44.entities.ChatMessage.filter({ channel_id: channelId }, 'created_date', 100),
    refetchInterval: 3000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getDmChannelId = (otherId) => {
    const ids = [currentMember.id, otherId].sort();
    return `dm_${ids[0]}_${ids[1]}`;
  };

  const teamChannels = teams.map(t => ({ type: 'team', id: t, label: t }));
  const dmChannels = members
    .filter(m => m.id !== currentMember?.id)
    .map(m => ({ type: 'private', id: getDmChannelId(m.id), label: m.name, memberId: m.id }));
  const systemChannel = { type: 'system', id: 'system', label: 'System-Benachrichtigungen' };

  const handleSend = async () => {
    if (!text.trim()) return;
    await base44.entities.ChatMessage.create({
      channel_type: activeChannel.type,
      channel_id: channelId,
      sender_id: currentMember.id,
      sender_name: currentMember.name,
      text: text.trim(),
    });
    setText('');
    refetch();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const notifTypeColors = {
    update: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-amber-100 text-amber-700',
    info: 'bg-slate-100 text-slate-700',
    alert: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-card flex flex-col shrink-0">
        <div className="p-3 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Teams</p>
          {teamChannels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-all mb-0.5 ${
                activeChannel.id === ch.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${colors[ch.id]?.dot}`} />
              <span className="truncate">{ch.label}</span>
            </button>
          ))}
        </div>

        <div className="p-3 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Direkt</p>
          {dmChannels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-all mb-0.5 ${
                activeChannel.id === ch.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                {ch.label[0]?.toUpperCase()}
              </div>
              <span className="truncate">{ch.label}</span>
            </button>
          ))}
        </div>

        <div className="p-3">
          <button
            onClick={() => setActiveChannel(systemChannel)}
            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-all ${
              activeChannel.id === 'system' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="truncate">Benachrichtigungen</span>
          </button>
        </div>

        {/* Admin / Joris actions */}
        <div className="mt-auto p-3 border-t space-y-1">
          {isAdmin && (
            <Button size="sm" variant="outline" className="w-full text-xs justify-start" onClick={() => setBroadcastOpen(true)}>
              <Megaphone className="w-3.5 h-3.5 mr-2" />
              Rundmail senden
            </Button>
          )}
          {isJoris && (
            <Button size="sm" variant="outline" className="w-full text-xs justify-start" onClick={() => setSysDialogOpen(true)}>
              <Bell className="w-3.5 h-3.5 mr-2" />
              System-Info senden
            </Button>
          )}
        </div>
      </aside>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 border-b flex items-center px-4 gap-2 bg-card">
          {activeChannel.type === 'team' && <Hash className="w-4 h-4 text-muted-foreground" />}
          {activeChannel.type === 'private' && <Lock className="w-4 h-4 text-muted-foreground" />}
          {activeChannel.type === 'system' && <Bell className="w-4 h-4 text-muted-foreground" />}
          <span className="font-semibold text-sm">{activeChannel.label}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">Noch keine Nachrichten.</p>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_id === currentMember?.id;
            if (msg.is_system_notification) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className={`max-w-lg w-full rounded-xl p-3 border ${notifTypeColors[msg.notification_type] || 'bg-slate-100 text-slate-700'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">System-Benachrichtigung</span>
                      <span className="text-[10px] ml-auto">{format(new Date(msg.created_date), 'dd.MM. HH:mm')}</span>
                    </div>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {msg.sender_name?.[0]?.toUpperCase()}
                </div>
                <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && <span className="text-[11px] text-muted-foreground mb-0.5 px-1">{msg.sender_name}</span>}
                  <div className={`rounded-2xl px-3 py-2 text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary rounded-tl-sm'}`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                    {format(new Date(msg.created_date), 'HH:mm')}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {activeChannel.type !== 'system' && (
          <div className="p-3 border-t bg-card flex gap-2">
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Nachricht an ${activeChannel.label}...`}
              className="flex-1"
            />
            <Button size="icon" onClick={handleSend} disabled={!text.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <SystemNotificationDialog open={sysDialogOpen} onOpenChange={setSysDialogOpen} currentMember={currentMember} onSent={refetch} />
      <BroadcastMailDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} members={members} currentMember={currentMember} />
    </div>
  );
}