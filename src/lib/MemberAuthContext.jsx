import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const MemberAuthContext = createContext(null);

export function MemberAuthProvider({ children }) {
  const [currentMember, setCurrentMember] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('reconnect_member');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Use cached data immediately so login is instant
      setCurrentMember(parsed);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Heartbeat: update last_login every 2 minutes to track online status
  useEffect(() => {
    if (!currentMember) return;
    const sendHeartbeat = () => {
      base44.entities.Member.update(currentMember.id, { last_login: new Date().toISOString() }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentMember?.id]);

  const login = async (name, pin) => {
    // Fetch all members (read is public per RLS) and match client-side
    const members = await base44.entities.Member.list();
    const member = members.find(
      m => m.name.toLowerCase() === name.toLowerCase() && m.pin === pin
    );
    if (!member) return null;
    
    const prevLogin = member.last_login;
    // Fire-and-forget, don't block login on this
    base44.entities.Member.update(member.id, { last_login: new Date().toISOString() }).catch(() => {});
    const updatedMember = { ...member, previous_login: prevLogin, last_login: new Date().toISOString() };
    setCurrentMember(updatedMember);
    localStorage.setItem('reconnect_member', JSON.stringify(updatedMember));
    return updatedMember;
  };

  const logout = () => {
    setCurrentMember(null);
    localStorage.removeItem('reconnect_member');
  };

  return (
    <MemberAuthContext.Provider value={{ currentMember, isLoading, login, logout }}>
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  return useContext(MemberAuthContext);
}