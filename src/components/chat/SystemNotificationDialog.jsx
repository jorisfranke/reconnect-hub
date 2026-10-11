import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

const NOTIFICATION_TYPES = [
  { value: 'update', label: '🔄 Update' },
  { value: 'maintenance', label: '🔧 Wartung' },
  { value: 'info', label: 'ℹ️ Info' },
  { value: 'alert', label: '🚨 Warnung' },
];

export default function SystemNotificationDialog({ open, onOpenChange, currentMember, onSent }) {
  const [text, setText] = useState('');
  const [type, setType] = useState('info');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    setLoading(true);
    // Send to system channel
    await base44.entities.ChatMessage.create({
      channel_type: 'system',
      channel_id: 'system',
      sender_id: currentMember.id,
      sender_name: currentMember.name,
      text: text.trim(),
      is_system_notification: true,
      notification_type: type,
    });
    setText('');
    setType('info');
    setLoading(false);
    onSent?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>System-Benachrichtigung senden</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Typ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nachricht</Label>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Benachrichtigungstext eingeben..."
              className="min-h-[100px]"
            />
          </div>
          <Button className="w-full" onClick={handleSend} disabled={loading || !text.trim()}>
            {loading ? 'Wird gesendet...' : 'Senden'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}