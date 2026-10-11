import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format, isToday, isPast } from 'date-fns';
import { de } from 'date-fns/locale';
import { MapPin, Clock, Users, CheckCircle2, Calendar } from 'lucide-react';

export default function PositionCard({ position, colors, onClick, myApplication }) {
  const c = colors || {};
  const apps = position.applications || [];
  const accepted = apps.filter(a => a.status === 'accepted');
  const open = position.status === 'open';
  const isToday_ = position.date && isToday(new Date(position.date));
  const isPast_ = position.date && isPast(new Date(position.date)) && !isToday_;

  return (
    <Card
      className={`p-3.5 cursor-pointer hover:shadow-md transition-all ${!open ? 'opacity-75' : ''}`}
      onClick={() => onClick?.(position)}
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold leading-tight">{position.title}</h4>
          <Badge className={`text-[10px] shrink-0 border-0 ${c.bg} ${c.text}`}>
            {position.team}
          </Badge>
        </div>

        {position.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{position.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {position.date && (
            <span className={`flex items-center gap-1 ${isPast_ ? 'text-destructive' : isToday_ ? 'text-amber-600 font-medium' : ''}`}>
              <Calendar className="w-3 h-3" />
              {format(new Date(position.date), 'dd. MMM', { locale: de })}
            </span>
          )}
          {position.start_time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {position.start_time}{position.end_time ? `–${position.end_time}` : ''}
            </span>
          )}
          {position.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {position.location}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-[11px] flex items-center gap-1 ${open ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            <Users className="w-3 h-3" />
            {accepted.length}/{position.capacity || 1} besetzt
          </span>
          {myApplication?.status === 'accepted' && (
            <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Zugesagt
            </span>
          )}
          {myApplication?.status === 'pending' && (
            <span className="text-[11px] text-amber-600 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Ausstehend
            </span>
          )}
          {myApplication?.status === 'rejected' && (
            <span className="text-[11px] text-destructive flex items-center gap-1">
              Abgelehnt
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}