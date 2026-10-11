import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { MemberAuthProvider, useMemberAuth } from '@/lib/MemberAuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';

import PinLogin from '@/pages/PinLogin';
import AppShell from '@/components/layout/AppShell';
import AdminDashboard from '@/pages/AdminDashboard';
import TaskBoard from '@/pages/TaskBoard';
import TeamsPage from '@/pages/TeamsPage';
import MembersPage from '@/pages/MembersPage';
import MyTasks from '@/pages/MyTasks';
import MyTeam from '@/pages/MyTeam';
import ChatPage from '@/pages/ChatPage';
import EventsPage from '@/pages/EventsPage';
import PollsPage from '@/pages/PollsPage';
import PositionsPage from '@/pages/PositionsPage';
import SchedulePage from '@/pages/SchedulePage';
import PublicApplicationPortal from '@/pages/PublicApplicationPortal';

const AppContent = () => {
  const { currentMember, isLoading } = useMemberAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentMember) {
    return (
      <Routes>
        <Route path="/bewerbung" element={<PublicApplicationPortal />} />
        <Route path="*" element={<PinLogin />} />
      </Routes>
    );
  }

  const isAdmin = currentMember.role === 'admin';

  return (
    <Routes>
      <Route path="/bewerbung" element={<PublicApplicationPortal />} />
      <Route element={<AppShell />}>
        {isAdmin ? (
          <>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/tasks" element={<TaskBoard />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/polls" element={<PollsPage />} />
            <Route path="/positions" element={<PositionsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/chat" element={<ChatPage />} />
          </>
        ) : (
          <>
            <Route path="/" element={<MyTasks />} />
            <Route path="/my-team" element={<MyTeam />} />
            <Route path="/positions" element={<PositionsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/polls" element={<PollsPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </>
        )}
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <MemberAuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AppContent />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </MemberAuthProvider>
    </ThemeProvider>
  );
}

export default App