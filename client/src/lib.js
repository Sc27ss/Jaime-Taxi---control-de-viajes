import { createClient } from '@supabase/supabase-js';

export const PAYMENTS = ['App Uber', 'Efectivo', 'Transferencia QR'];
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = 'trips';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const getClient = () => {
  if (!supabase) {
    throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en client/.env.local.');
  }
  return supabase;
};

export const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
export const num = (n) => Number(n) || 0;
export const r2 = (n) => Math.round(n * 100) / 100;
export const todayStr = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
export const nowHM = () => new Date().toTimeString().slice(0, 5);

const fmtDur = (minutes) => {
  const value = Math.round(minutes), hours = Math.floor(value / 60), remainder = value % 60;
  return hours ? (remainder ? `${hours} h ${remainder} min` : `${hours} h`) : `${remainder} min`;
};
const parseMin = (duration) => {
  const value = String(duration ?? ''), hours = /(\d+)\s*h/.exec(value), minutes = /(\d+)\s*m/.exec(value);
  if (hours || minutes) return (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  const numeric = parseFloat(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const CORE_MAP = {
  Fecha: 'date',
  Duración: 'duration',
  Pasajero: 'passenger',
  'Punto de Recogida': 'pickup',
  'Destino Final': 'dropoff',
  'Km Recorridos': 'km',
  'Forma de Pago': 'payment_method',
  'Valor Viaje': 'bruto',
  'Tasa Uber (10%)': 'tasa_uber',
  Propina: 'tip',
  'Dinero Neto Conductor': 'neto',
  Descripcion: 'description',
};
export const COLS = Object.keys(CORE_MAP);
const NUMERIC_COLS = new Set(['Km Recorridos', 'Valor Viaje', 'Tasa Uber (10%)', 'Propina', 'Dinero Neto Conductor']);

const fromDb = (row) => {
  const trip = { _row: row.id, _created: row.created_at || null };
  for (const column of COLS) {
    let value = row[CORE_MAP[column]];
    if (column === 'Fecha') value = String(value ?? '').slice(0, 10);
    else if (NUMERIC_COLS.has(column)) value = Number(value) || 0;
    else value = value ?? '';
    trip[column] = value;
  }
  trip['Duración (min)'] = parseMin(trip.Duración);
  return trip;
};

const toDb = (body) => {
  const text = (value) => String(value ?? '').trim();
  const duration = Number(body.duracion), km = Number(body.km), value = Number(body.valor);
  const tip = Number(body.propina || 0);
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(body.fecha))) errors.push('Fecha inválida');
  if (!(duration > 0)) errors.push('La duración del viaje debe ser mayor a 0 minutos');
  if (!text(body.pasajero)) errors.push('Falta el pasajero');
  if (!text(body.recogida)) errors.push('Falta el punto de recogida');
  if (!text(body.destino)) errors.push('Falta el destino');
  if (body.km === '' || body.km == null || !(km >= 0)) errors.push('Km inválidos');
  if (!(value > 0)) errors.push('El valor del viaje debe ser mayor a 0');
  if (!(tip >= 0)) errors.push('Propina inválida');
  if (!PAYMENTS.includes(body.formaPago)) errors.push('Forma de pago inválida');
  if (errors.length) throw new Error(errors.join(', '));

  const tasa = r2(value * 0.1);
  return {
    date: text(body.fecha),
    duration: fmtDur(duration),
    passenger: text(body.pasajero),
    pickup: text(body.recogida),
    dropoff: text(body.destino),
    km,
    payment_method: body.formaPago,
    bruto: value,
    tasa_uber: tasa,
    tip,
    neto: r2(value - tasa + tip),
    description: text(body.descripcion),
  };
};

const throwSupabaseError = (error) => {
  if (error) throw new Error(`Supabase: ${error.message}`);
};

export async function getTrips() {
  const client = getClient(), trips = [], pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client.from(TABLE).select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    throwSupabaseError(error);
    trips.push(...data);
    if (data.length < pageSize) break;
  }
  return trips.map(fromDb);
}

export async function addTrip(body) {
  const { data, error } = await getClient().from(TABLE).insert(toDb(body)).select('*').single();
  throwSupabaseError(error);
  return { ok: true, trip: fromDb(data) };
}

export async function updateTrip(trip, body) {
  const { data, error } = await getClient().from(TABLE).update(toDb(body)).eq('id', trip._row).select('*').maybeSingle();
  throwSupabaseError(error);
  if (!data) throw new Error('Ese viaje ya no existe. Actualiza el panel.');
  return { ok: true, trip: fromDb(data) };
}

export async function deleteTrip(trip) {
  const { data, error } = await getClient().from(TABLE).delete().eq('id', trip._row).select('id').maybeSingle();
  throwSupabaseError(error);
  if (!data) throw new Error('Ese viaje ya no existe. Actualiza el panel.');
  return { ok: true };
}

export const tripToForm = (trip) => ({
  fecha: trip.Fecha,
  duracion: String(trip['Duración (min)'] || ''),
  pasajero: trip.Pasajero,
  recogida: trip['Punto de Recogida'],
  destino: trip['Destino Final'],
  km: String(trip['Km Recorridos'] ?? ''),
  formaPago: trip['Forma de Pago'],
  valor: String(trip['Valor Viaje'] ?? ''),
  propina: trip.Propina ? String(trip.Propina) : '',
  descripcion: trip.Descripcion || '',
});
export const PAY_COLOR = { 'App Uber': 'var(--c1)', 'Efectivo': 'var(--c2)', 'Transferencia QR': 'var(--c3)' };
export const PAY_ICON = { 'App Uber': '📱', 'Efectivo': '💵', 'Transferencia QR': '🔳' };
export async function downloadExcel({ from, to, pay }) {
  const { default: ExcelJS } = await import('exceljs');
  const rows = (await getTrips())
    .filter((trip) => (!from || trip.Fecha >= from) && (!to || trip.Fecha <= to) && (!pay || trip['Forma de Pago'] === pay))
    .sort((a, b) => a.Fecha.localeCompare(b.Fecha));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Jaime Taxi';
  const worksheet = workbook.addWorksheet('Viajes', { views: [{ state: 'frozen', ySplit: 1 }] });
  const widths = { Fecha: 12, Duración: 14, Pasajero: 22, 'Punto de Recogida': 26, 'Destino Final': 26, 'Km Recorridos': 14, 'Forma de Pago': 18, 'Valor Viaje': 14, 'Tasa Uber (10%)': 16, Propina: 12, 'Dinero Neto Conductor': 22, Descripcion: 34 };
  worksheet.columns = COLS.map((column) => ({
    header: column,
    key: column,
    width: widths[column],
    style: NUMERIC_COLS.has(column) && column !== 'Km Recorridos' ? { numFmt: '#,##0' } : {},
  }));
  rows.forEach((trip) => worksheet.addRow(COLS.map((column) => trip[column])));

  const header = worksheet.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF001014' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00E5FF' } };
    cell.alignment = { vertical: 'middle' };
  });
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLS.length } };
  if (rows.length) {
    const totalRow = rows.length + 1;
    worksheet.addRow(COLS.map((column) => (
      column === 'Pasajero' ? `TOTAL (${rows.length} viajes)`
        : NUMERIC_COLS.has(column) ? { formula: `SUM(${worksheet.getColumn(column).letter}2:${worksheet.getColumn(column).letter}${totalRow})` }
          : null
    )));
    const total = worksheet.getRow(totalRow + 1);
    total.font = { bold: true };
    total.eachCell((cell) => { cell.border = { top: { style: 'thin' } }; });
  }

  const content = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `viajes-jaime-${todayStr()}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
