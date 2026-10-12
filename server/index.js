import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || '';
const TABLE = 'trips';
const PAYMENTS = ['App Uber', 'Efectivo', 'Transferencia QR'];

/** Nombre en la app  →  columna en tu tabla public.trips de Supabase. */
const CORE_MAP = {
  'Fecha': 'date', 'Duración': 'duration', 'Pasajero': 'passenger', 'Punto de Recogida': 'pickup', 'Destino Final': 'dropoff',
  'Km Recorridos': 'km', 'Forma de Pago': 'payment_method', 'Valor Viaje': 'bruto', 'Tasa Uber (10%)': 'tasa_uber',
  'Propina': 'tip', 'Dinero Neto Conductor': 'neto', 'Descripcion': 'description',
};
const COLS = ['Fecha', 'Duración', 'Pasajero', 'Punto de Recogida', 'Destino Final', 'Km Recorridos', 'Forma de Pago', 'Valor Viaje', 'Tasa Uber (10%)', 'Propina', 'Dinero Neto Conductor', 'Descripcion'];
const NUMERIC = ['Km Recorridos', 'Valor Viaje', 'Tasa Uber (10%)', 'Propina', 'Dinero Neto Conductor'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fmtDur = (m) => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`; };
const parseMin = (t) => {
  const s = String(t ?? ''), h = /(\d+)\s*h/.exec(s), m = /(\d+)\s*m/.exec(s);
  if (h || m) return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
  const n = parseFloat(s); return Number.isFinite(n) ? n : 0;
};
const r2 = (n) => Math.round(n * 100) / 100;
const toDb = (t) => Object.fromEntries(Object.entries(CORE_MAP).map(([c, col]) => [col, t[c]]));
const fromDb = (row) => {
  const o = { _row: row.id, _created: row.created_at || null };
  for (const c of COLS) {
    let v = row[CORE_MAP[c]];
    if (c === 'Fecha') v = String(v ?? '').slice(0, 10);
    else if (NUMERIC.includes(c)) v = Number(v) || 0;
    else v = v ?? '';
    o[c] = v;
  }
  o['Duración (min)'] = parseMin(o['Duración']);
  return o;
};

/** Valida y calcula: Tasa = valor*0.10 ; Neto = (valor - tasa) + propina */
function buildTrip(b) {
  const s = (v) => String(v ?? '').trim();
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s(b.fecha))) errors.push('Fecha inválida');
  const dur = Number(b.duracion);
  if (!(dur > 0)) errors.push('La duración del viaje debe ser mayor a 0 minutos');
  if (!s(b.pasajero)) errors.push('Falta el pasajero');
  if (!s(b.recogida)) errors.push('Falta el punto de recogida');
  if (!s(b.destino)) errors.push('Falta el destino');
  const km = Number(b.km), valor = Number(b.valor), propina = Number(b.propina || 0);
  if (b.km === '' || b.km == null || !(km >= 0)) errors.push('Km inválidos');
  if (!(valor > 0)) errors.push('El valor del viaje debe ser mayor a 0');
  if (!(propina >= 0)) errors.push('Propina inválida');
  if (!PAYMENTS.includes(b.formaPago)) errors.push('Forma de pago inválida');
  if (errors.length) return { errors };
  const tasa = r2(valor * 0.1);
  return { trip: {
    'Fecha': s(b.fecha), 'Duración': fmtDur(dur), 'Pasajero': s(b.pasajero),
    'Punto de Recogida': s(b.recogida), 'Destino Final': s(b.destino), 'Km Recorridos': km, 'Forma de Pago': b.formaPago,
    'Valor Viaje': valor, 'Tasa Uber (10%)': tasa, 'Propina': propina,
    'Dinero Neto Conductor': r2(valor - tasa + propina), 'Descripcion': s(b.descripcion) } };
}

/* ---------- Repositorios: Supabase (real) o archivo local (solo pruebas, sin credenciales) ---------- */
function supabaseRepo() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const fail = (error) => { if (error) throw new Error(`Supabase: ${error.message}`); };
  return {
    mode: 'supabase',
    async list() {
      const out = []; const size = 1000;
      for (let from = 0; ; from += size) {   // pagina de 1000 en 1000 (límite por defecto de Supabase)
        const { data, error } = await sb.from(TABLE).select('*')
          .order('date', { ascending: false }).order('created_at', { ascending: false }).range(from, from + size - 1);
        fail(error); out.push(...data); if (data.length < size) break;
      }
      return out.map(fromDb);
    },
    async insert(trip) { const { data, error } = await sb.from(TABLE).insert(toDb(trip)).select().single(); fail(error); return fromDb(data); },
    async update(id, trip) {
      const { data, error } = await sb.from(TABLE).update(toDb(trip)).eq('id', id).select();
      fail(error); if (!data.length) return null; return fromDb(data[0]);
    },
    async remove(id) { const { data, error } = await sb.from(TABLE).delete().eq('id', id).select('id'); fail(error); return data.length > 0; },
  };
}
function localRepo() {
  const file = path.join(__dirname, 'data', 'trips.json');
  const read = () => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
  const write = (a) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(a, null, 2)); };
  return {
    mode: 'local-prueba',
    async list() { return read().reverse(); },
    async insert(trip) { const a = read(); const t = { ...trip, _row: randomUUID(), _created: new Date().toISOString() }; write([...a, t]); return t; },
    async update(id, trip) { const a = read(); const i = a.findIndex((x) => x._row === id); if (i < 0) return null; a[i] = { ...trip, _row: id, _created: a[i]._created }; write(a); return a[i]; },
    async remove(id) { const a = read(); const n = a.filter((x) => x._row !== id); write(n); return n.length !== a.length; },
  };
}
const repo = SUPABASE_URL && SUPABASE_KEY ? supabaseRepo() : localRepo();

/* ---------- Excel ---------- */
const applyFilters = (rows, { from, to, pay }) =>
  rows.filter((t) => (!from || t.Fecha >= from) && (!to || t.Fecha <= to) && (!pay || t['Forma de Pago'] === pay));

async function buildWorkbook(rows) {
  const wb = new ExcelJS.Workbook(); wb.creator = 'Jaime Taxi';
  const ws = wb.addWorksheet('Viajes', { views: [{ state: 'frozen', ySplit: 1 }] });
  const widths = { 'Fecha': 12, 'Duración': 14, 'Pasajero': 22, 'Punto de Recogida': 26, 'Destino Final': 26, 'Km Recorridos': 14, 'Forma de Pago': 18, 'Valor Viaje': 14, 'Tasa Uber (10%)': 16, 'Propina': 12, 'Dinero Neto Conductor': 22, 'Descripcion': 34 };
  ws.columns = COLS.map((c) => ({ header: c, key: c, width: widths[c], style: NUMERIC.includes(c) && c !== 'Km Recorridos' ? { numFmt: '#,##0' } : {} }));
  rows.forEach((t) => ws.addRow(COLS.map((c) => t[c])));
  const head = ws.getRow(1); head.height = 22;
  head.eachCell((cell) => { cell.font = { bold: true, color: { argb: 'FF001014' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00E5FF' } }; cell.alignment = { vertical: 'middle' }; });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLS.length } };
  if (rows.length) {  // fila de totales
    const n = rows.length + 1; const col = (c) => ws.getColumn(c).letter;
    const tot = ws.addRow(COLS.map((c) => (c === 'Pasajero' ? `TOTAL (${rows.length} viajes)` : ['Km Recorridos', 'Valor Viaje', 'Tasa Uber (10%)', 'Propina', 'Dinero Neto Conductor'].includes(c) ? { formula: `SUM(${col(c)}2:${col(c)}${n})` } : null)));
    tot.font = { bold: true }; tot.eachCell((c) => { c.border = { top: { style: 'thin' } }; });
  }
  return wb;
}

/* ---------- API ---------- */
const app = express();
app.use(cors());
app.use(express.json());
const wrap = (fn) => async (req, res) => { try { await fn(req, res); } catch (e) { console.error(e); res.status(502).json({ error: e.message }); } };
const idOf = (req) => (UUID.test(req.params.id) ? req.params.id : null);

app.get('/api/health', (_req, res) => res.json({ ok: true, mode: repo.mode }));
app.get('/api/trips', wrap(async (_req, res) => res.json({ trips: await repo.list() })));

app.post('/api/trips', wrap(async (req, res) => {
  const { trip, errors } = buildTrip(req.body || {});
  if (errors) return res.status(400).json({ error: errors.join(', ') });
  res.status(201).json({ ok: true, trip: await repo.insert(trip) });
}));
app.put('/api/trips/:id', wrap(async (req, res) => {
  const id = idOf(req); if (!id) return res.status(400).json({ error: 'ID inválido' });
  const { trip, errors } = buildTrip(req.body || {});
  if (errors) return res.status(400).json({ error: errors.join(', ') });
  const saved = await repo.update(id, trip);
  if (!saved) return res.status(404).json({ error: 'Ese viaje ya no existe. Actualiza el panel.' });
  res.json({ ok: true, trip: saved });
}));
app.delete('/api/trips/:id', wrap(async (req, res) => {
  const id = idOf(req); if (!id) return res.status(400).json({ error: 'ID inválido' });
  if (!(await repo.remove(id))) return res.status(404).json({ error: 'Ese viaje ya no existe. Actualiza el panel.' });
  res.json({ ok: true });
}));

app.get('/api/export.xlsx', wrap(async (req, res) => {
  const rows = applyFilters(await repo.list(), req.query).sort((a, b) => a.Fecha.localeCompare(b.Fecha));
  const wb = await buildWorkbook(rows);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="viajes-jaime-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  await wb.xlsx.write(res); res.end();
}));

const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html'))); }
if (repo.mode === 'supabase') await repo.list().then((r) => console.log(`✔ Conectado a Supabase (${r.length} viajes)`)).catch((e) => console.error('✘ No se pudo leer la tabla trips:', e.message));
app.listen(PORT, () => console.log(`API lista en http://localhost:${PORT}  |  base de datos: ${repo.mode === 'supabase' ? 'Supabase ✔' : 'LOCAL de prueba (faltan credenciales)'}`));
