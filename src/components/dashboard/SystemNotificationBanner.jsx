import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, X } from 'lucide-react';

const TYPE_STYLES = {
  update: 'bg-blue-50 border-blue-200 text-blue-800',
  maintenance: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-slate-50 border-slate-200 text-slate-700',
  alert: 'bg-red-50 border-red-200 text-red-800',
};

const TYPE_ICONS = {
  update: '🔄',
  maintenance: '🔧',
  info: 'ℹ️',
  alert: '🚨',
};

export default function SystemNotificationBanner() {
  const [dismissed, setDismissed] = useState([]);

  const { data: sysMessages = [] } = useQuery({
    queryKey: ['system-notifications'],
    queryFn: () => base44.entities.ChatMessage.filter({ channel_id: 'system', is_system_notification: true }, '-created_date', 3),
    refetchInterval: 30000,
  });

  const visible = sysMessages.filter(m => !dismissed.includes(m.id));
  if (visible.length === 0) return null;

  const latest = visible[0];
  const style = TYPE_STYLES[latest.notification_type] || TYPE_STYLES.info;
  const icon = TYPE_ICONS[latest.notification_type] || 'ℹ️';

  return (
    <div className={`flex items-start gap-2 px-4 py-2.5 rounded-lg border text-sm ${style}`}>
      <span>{icon}</span>
      <div className="flex-1">
        <span className="font-semibold">System: </span>
        {latest.text}
      </div>
      <button onClick={() => setDismissed(d => [...d, latest.id])} className="opacity-60 hover:opacity-100 shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}