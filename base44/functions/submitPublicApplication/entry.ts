import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { position_id, name, email, note } = body;

    if (!position_id || !name || !email) {
      return Response.json({ error: 'Position ID, Name und E-Mail sind erforderlich' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
    }

    const position = await base44.asServiceRole.entities.Position.get(position_id);
    if (!position) {
      return Response.json({ error: 'Posten nicht gefunden' }, { status: 404 });
    }
    if (position.status !== 'open') {
      return Response.json({ error: 'Dieser Posten ist nicht mehr offen für Bewerbungen' }, { status: 400 });
    }

    const acceptedCount = (position.applications || []).filter(a => a.status === 'accepted').length;
    if (acceptedCount >= (position.capacity || 1)) {
      return Response.json({ error: 'Alle Plätze für diesen Posten sind bereits besetzt' }, { status: 400 });
    }

    const newApp = {
      member_id: null,
      member_name: name.trim(),
      email: email.trim(),
      status: 'pending',
      applied_at: new Date().toISOString(),
      note: (note || '').trim(),
    };

    const updatedApps = [...(position.applications || []), newApp];
    await base44.asServiceRole.entities.Position.update(position_id, { applications: updatedApps });

    return Response.json({ ok: true, message: 'Bewerbung eingegangen' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}