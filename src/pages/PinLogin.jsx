import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useMemberAuth } from '@/lib/MemberAuthContext';
import { Loader2, Zap, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function PinLogin() {
  const { login } = useMemberAuth();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || pin.length !== 4) {
      setError('Bitte Name und 4-stellige PIN eingeben.');
      return;
    }
    setLoading(true);
    setError('');
    const member = await login(name.trim(), pin);
    if (!member) {
      setError('Name oder PIN falsch.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">re:connect hub
</h1>
          <p className="text-muted-foreground mt-2">Projektmanagement

BETA 1.4.6.</p>
        </div>

        <Card className="shadow-xl border-0 bg-card">
          <CardContent className="pt-6 pb-6 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Dein Name" value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11" />
                
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="4-stellige PIN"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="h-11 text-center tracking-[0.5em] text-lg font-mono" />
                
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Anmelden'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Link to="/bewerbung" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border bg-card/50 p-4 text-sm font-medium hover:bg-accent transition-colors">
          <Briefcase className="w-4 h-4 text-primary" />
          Offene Posten ansehen & bewerben — ohne Konto
        </Link>
      </motion.div>
    </div>);

}