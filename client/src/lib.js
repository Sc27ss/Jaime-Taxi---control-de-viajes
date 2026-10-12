export const PAYMENTS = ['App Uber', 'Efectivo', 'Transferencia QR'];
const API = import.meta.env.VITE_API_URL || '';
export const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
export const num = (n) => Number(n) || 0;
export const r2 = (n) => Math.round(n * 100) / 100;
export const todayStr = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
export const nowHM = () => new Date().toTimeString().slice(0, 5);
export async function getTrips() {
  const r = await fetch(`${API}/api/trips`); const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'No se pudo leer la hoja'); return d.trips;
}
export async function addTrip(body) {
  const r = await fetch(`${API}/api/trips`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json(); if (!r.ok) throw new Error(d.error || 'No se pudo guardar'); return d;
}
const send = async (url, method, body) => {
  const r = await fetch(`${API}${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d;
};
export const updateTrip = (t, body) => send(`/api/trips/${t._row}`, 'PUT', body);
export const deleteTrip = (t) => send(`/api/trips/${t._row}`, 'DELETE', {});
export const tripToForm = (t) => ({ fecha: t.Fecha, duracion: String(t['Duración (min)'] || ''), pasajero: t.Pasajero, recogida: t['Punto de Recogida'],
  destino: t['Destino Final'], km: String(t['Km Recorridos'] ?? ''), formaPago: t['Forma de Pago'], valor: String(t['Valor Viaje'] ?? ''),
  propina: t.Propina ? String(t.Propina) : '', descripcion: t.Descripcion || '' });
export const PAY_COLOR = { 'App Uber': 'var(--c1)', 'Efectivo': 'var(--c2)', 'Transferencia QR': 'var(--c3)' };
export const PAY_ICON = { 'App Uber': '📱', 'Efectivo': '💵', 'Transferencia QR': '🔳' };
export const COLS = ['Fecha','Duración','Pasajero','Punto de Recogida','Destino Final','Km Recorridos','Forma de Pago','Valor Viaje','Tasa Uber (10%)','Propina','Dinero Neto Conductor','Descripcion'];
export async function downloadExcel({ from, to, pay }) {
  const q = new URLSearchParams({ ...(from && { from }), ...(to && { to }), ...(pay && { pay }) });
  const r = await fetch(`${API}/api/export.xlsx?${q}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No se pudo generar el Excel');
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement('a'); a.href = url; a.download = `viajes-jaime-${todayStr()}.xlsx`; a.click(); URL.revokeObjectURL(url);
}
