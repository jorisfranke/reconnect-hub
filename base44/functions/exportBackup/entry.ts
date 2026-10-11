import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { readdir, readFile, stat } from 'node:fs/promises';

const ENTITY_NAMES = [
  'Task', 'Team', 'Member', 'Position', 'ScheduleEntry',
  'Event', 'Poll', 'ChatMessage', 'Comment', 'DatePoll', 'ConceptDocument'
];

async function readAll(base44, name) {
  const all = [];
  let cursor;
  do {
    const page = await base44.asServiceRole.entities[name].filter({}, { limit: 500, cursor, sort: '-created_date' });
    all.push(...(page.items || []));
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return all;
}

async function readAllEntities(base44) {
  const entities = {};
  const batch = 6;
  for (let i = 0; i < ENTITY_NAMES.length; i += batch) {
    const slice = ENTITY_NAMES.slice(i, i + batch);
    await Promise.allSettled(slice.map(async (name) => {
      try { entities[name] = await readAll(base44, name); }
      catch (e) { entities[name] = { __error: e.message }; }
    }));
  }
  return entities;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const mode = body?.mode || 'all';

    const result = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.full_name || user.email,
      mode
    };

    if (mode === 'data' || mode === 'all') {
      result.entities = await readAllEntities(base44);
      result.counts = Object.fromEntries(
        Object.entries(result.entities).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      );
    }

    if (mode === 'code' || mode === 'all') {
      try {
        const probe = {};
        const roots = ['/', '/app', '/home', '/home/user', '/workspace', '/project', '/repo', '/bundle', '.', '..'];
        for (const r of roots) {
          try { probe[r] = await readdir(r); } catch (e) { probe[r] = 'err: ' + e.message; }
        }
        const files = ['/app/src/App.jsx', '/src/App.jsx', './src/App.jsx', '../src/App.jsx', '/bundle/src/App.jsx'];
        const fileProbe = {};
        for (const f of files) {
          try { await readFile(f, 'utf8'); fileProbe[f] = 'OK'; } catch (e) { fileProbe[f] = 'err: ' + e.message; }
        }
        result.code = { probe, fileProbe };
      } catch (e) {
        result.code = { __error: 'Code-Export nicht verfügbar: ' + e.message };
      }
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}