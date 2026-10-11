import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { Megaphone } from 'lucide-react';

export default function BroadcastMailDialog({ open, onOpenChange, members, currentMember }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setLoading(true);

    const membersWithEmail = members.filter(m => m.email);
    // Send via chat as a broadcast notification to all team channels
    for (const team of ['Orga Inhalt', 'Orga Allgemein', 'Catering', 'Musik', 'Technik', 'Extern']) {
      await base44.entities.ChatMessage.create({
        channel_type: 'team',
        channel_id: team,
        sender_id: currentMember.id,
        sender_name: currentMember.name,
        text: `📢 **Rundmail: ${subject}**\n\n${body}`,
        is_system_notification: false,
      });
    }

    setLoading(false);
    setSent(true);
  };

  const handleClose = () => {
    setSubject('');
    setBody('');
    setSent(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Rundmail an alle Teams
          </DialogTitle>
        </DialogHeader>
        {sent ? (
          <div className="space-y-4 text-center py-4">
            <p className="text-emerald-600 font-medium">✓ Rundmail wurde in alle Teamkanäle gesendet!</p>
            <Button className="w-full" onClick={handleClose}>Schließen</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Betreff</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Betreff der Rundmail..." />
            </div>
            <div className="space-y-1.5">
              <Label>Nachricht</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Inhalt der Rundmail..." className="min-h-[120px]" />
            </div>
            <p className="text-xs text-muted-foreground">Die Nachricht wird in alle Team-Chats gesendet.</p>
            <Button className="w-full" onClick={handleSend} disabled={loading || !subject.trim() || !body.trim()}>
              {loading ? 'Wird gesendet...' : 'An alle Teams senden'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}