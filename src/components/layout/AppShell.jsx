import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Users, ListTodo, Columns3, LogOut,
  Zap, Menu, X, User, ClipboardList, UsersRound, KeyRound,
  MessageSquare, Calendar, Vote, Briefcase, CalendarDays,
  Sun, Moon
} from 'lucide-react';
import { useTeams } from '@/lib/teams';
import ChangePinDialog from '@/components/layout/ChangePinDialog';
import { base44 } from '@/api/base44Client';

const CHAT_SEEN_KEY = 'reconnect_chat_last_seen';

export default function AppShell() {
  const { currentMember, logout } = useMemberAuth();
  const { colors } = useTeams();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const isAdmin = currentMember?.role === 'admin';

  // Track unread chat messages
  useEffect(() => {
    if (!currentMember) return;

    const checkUnread = async () => {
      const lastSeen = localStorage.getItem(CHAT_SEEN_KEY);
      const since = lastSeen ? new Date(lastSeen) : new Date(0);
      try {
        const recent = await base44.entities.ChatMessage.list('-created_date', 50);
        const unread = recent.filter(m =>
          m.sender_id !== currentMember.id &&
          new Date(m.created_date) > since
        );
        setUnreadChat(unread.length);
      } catch {}
    };

    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, [currentMember]);

  // Mark chat as seen when on chat page
  useEffect(() => {
    if (location.pathname === '/chat') {
      localStorage.setItem(CHAT_SEEN_KEY, new Date().toISOString());
      setUnreadChat(0);
    }
  }, [location.pathname]);

  const adminLinks = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tasks', label: 'Aufgaben-Board', icon: Columns3 },
    { path: '/positions', label: 'Bewerbungen', icon: Briefcase },
    { path: '/teams', label: 'Teams', icon: UsersRound },
    { path: '/members', label: 'Mitglieder', icon: Users },
    { path: '/events', label: 'Termine', icon: Calendar },
    { path: '/polls', label: 'Abstimmungen', icon: Vote },
    { path: '/schedule', label: 'Ablaufplan', icon: CalendarDays },
    { path: '/chat', label: 'Chat', icon: MessageSquare, badge: true },
  ];

  const memberLinks = [
    { path: '/', label: 'Meine Aufgaben', icon: ClipboardList },
    { path: '/schedule', label: 'Ablaufplan', icon: CalendarDays },
    { path: '/positions', label: 'Bewerbungen', icon: Briefcase },
    { path: '/my-team', label: 'Mein Team', icon: UsersRound },
    { path: '/events', label: 'Termine', icon: Calendar },
    { path: '/polls', label: 'Abstimmungen', icon: Vote },
    { path: '/chat', label: 'Chat', icon: MessageSquare, badge: true },
  ];

  const links = isAdmin ? adminLinks : memberLinks;

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight">re:connect</h2>
            <p className="text-[11px] text-muted-foreground">Event-Projekt</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {links.map(link => {
          const active = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <link.icon className="w-4 h-4" />
              <span className="flex-1">{link.label}</span>
              {link.badge && unreadChat > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadChat > 99 ? '99+' : unreadChat}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            {currentMember?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentMember?.name}</p>
            <div className="flex gap-1 flex-wrap mt-0.5">
              {currentMember?.teams?.slice(0, 2).map(t => (
                <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors[t]?.bg} ${colors[t]?.text}`}>
                  {t}
                </span>
              ))}
              {(currentMember?.teams?.length || 0) > 2 && (
                <span className="text-[10px] text-muted-foreground">+{currentMember.teams.length - 2}</span>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setPinDialogOpen(true)}>
          <KeyRound className="w-4 h-4 mr-2" />
          PIN ändern
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
          {theme === 'dark' ? 'Hell-Modus' : 'Dunkel-Modus'}
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          Abmelden
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      <ChangePinDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} />
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-card">
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card shadow-2xl">
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center px-4 gap-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">re:connect</span>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}