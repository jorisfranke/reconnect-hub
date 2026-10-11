import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useMemberAuth } from '@/lib/MemberAuthContext';

export default function ChangePinDialog({ open, onOpenChange }) {
  const { currentMember } = useMemberAuth();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setSuccess(false);
    onOpenChange(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (currentPin !== currentMember.pin) {
      setError('Aktueller PIN ist falsch.');
      return;
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError('Neuer PIN muss genau 4 Ziffern haben.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('Neuer PIN stimmt nicht überein.');
      return;
    }

    setLoading(true);
    await base44.entities.Member.update(currentMember.id, { pin: newPin });
    // Update local storage
    const updated = { ...currentMember, pin: newPin };
    localStorage.setItem('reconnect_member', JSON.stringify(updated));
    setLoading(false);
    setSuccess(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>PIN ändern</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-600 font-medium">PIN erfolgreich geändert!</p>
            <Button className="w-full" onClick={handleClose}>Schließen</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Aktueller PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Neuer PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Neuer PIN bestätigen</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Wird gespeichert...' : 'PIN ändern'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}