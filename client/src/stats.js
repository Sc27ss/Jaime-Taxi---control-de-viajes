// Cálculos puros de las estadísticas (sin React) — todo sale de los viajes guardados en la base de datos.
const pad = (n) => String(n).padStart(2, '0');
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const keyD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const n = (v) => Number(v) || 0;

export const FRANJAS = [
  { k: 'Madrugada', ic: '🌙', h: '0–5 h', from: 0, to: 5, color: 'var(--c3)' },
  { k: 'Mañana', ic: '🌅', h: '6–11 h', from: 6, to: 11, color: 'var(--c4)' },
  { k: 'Tarde', ic: '☀️', h: '12–17 h', from: 12, to: 17, color: 'var(--c5)' },
  { k: 'Noche', ic: '🌃', h: '18–23 h', from: 18, to: 23, color: 'var(--c1)' },
];

export function filterPeriod(trips, days, today = new Date()) {
  if (!days) return trips;
  const lim = keyD(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1));
  return trips.filter((t) => t.Fecha >= lim);
}

export function byPayment(trips) {
  const total = trips.reduce((a, t) => a + n(t['Valor Viaje']), 0);
  const names = ['App Uber', 'Efectivo', 'Transferencia QR'];
  const data = names.map((name) => {
    const r = trips.filter((t) => t['Forma de Pago'] === name);
    const value = r.reduce((a, t) => a + n(t['Valor Viaje']), 0);
    return { name, value, viajes: r.length, pct: total ? (value / total) * 100 : 0 };
  });
  return { data, total };
}

export function byFranja(trips) {
  const data = FRANJAS.map((f) => ({ ...f, viajes: 0, neto: 0 }));
  let sinHora = 0;
  trips.forEach((t) => {
    const d = t._created ? new Date(t._created) : null;
    if (!d || isNaN(d)) { sinHora++; return; }
    const f = data.find((x) => d.getHours() >= x.from && d.getHours() <= x.to);
    f.viajes++; f.neto += n(t['Dinero Neto Conductor']);
  });
  const used = data.filter((f) => f.viajes);
  const bestNeto = used.length ? used.reduce((a, b) => (b.neto > a.neto ? b : a)) : null;
  const bestViajes = used.length ? used.reduce((a, b) => (b.viajes > a.viajes ? b : a)) : null;
  return { data, sinHora, bestNeto, bestViajes };
}

export function byPeriod(trips, mode, limit = 12) {
  const m = {};
  trips.forEach((t) => {
    const d = parseD(t.Fecha); let key, label;
    if (mode === 'mes') { key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; label = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`; }
    else { const w = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); key = keyD(w); label = `${pad(w.getDate())}/${pad(w.getMonth() + 1)}`; }
    const o = (m[key] ||= { label, km: 0, neto: 0, viajes: 0 });
    o.km += n(t['Km Recorridos']); o.neto += n(t['Dinero Neto Conductor']); o.viajes++;
  });
  const data = Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).map(([, o]) => ({ ...o, km: Math.round(o.km * 10) / 10, netoKm: o.km ? o.neto / o.km : 0 })).slice(-limit);
  const km = data.reduce((a, o) => a + o.km, 0), neto = data.reduce((a, o) => a + o.neto, 0);
  return { data, netoKm: km ? neto / km : 0, km, neto };
}

export function tips(trips, limit = 14) {
  const m = {};
  trips.forEach((t) => {
    const o = (m[t.Fecha] ||= { fecha: t.Fecha, base: 0, tip: 0 });
    const tip = n(t.Propina); o.tip += tip; o.base += n(t['Dinero Neto Conductor']) - tip;
  });
  const days = Object.values(m).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const tip = days.reduce((a, o) => a + o.tip, 0), base = days.reduce((a, o) => a + o.base, 0);
  return {
    data: days.slice(-limit).map((o) => ({ ...o, d: o.fecha.slice(8) + '/' + o.fecha.slice(5, 7) })),
    tip, base, pct: base > 0 ? (tip / base) * 100 : 0,
    daysWithTip: days.filter((o) => o.tip > 0).length, days: days.length,
    cumulative: (() => { let c = 0; return days.slice(-limit).map((o) => ({ d: o.fecha.slice(8) + '/' + o.fecha.slice(5, 7), acum: (c += o.tip) })); })(),
  };
}

/* ───────── Días de la semana ───────── */
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Promedio de ganancia neta por jornada (= día con al menos un viaje), agrupado por día de la semana. */
export function weekdayStats(trips) {
  const days = {};
  trips.forEach((t) => {
    const o = (days[t.Fecha] ||= { neto: 0, viajes: 0, dow: parseD(t.Fecha).getDay() });
    o.neto += n(t['Dinero Neto Conductor']); o.viajes++;
  });
  const list = Object.values(days);
  const data = [1, 2, 3, 4, 5, 6, 0].map((dow) => {
    const ds = list.filter((o) => o.dow === dow), total = ds.reduce((a, o) => a + o.neto, 0), v = ds.reduce((a, o) => a + o.viajes, 0);
    return { dow, dia: DIAS_CORTO[dow], full: DIAS[dow], jornadas: ds.length, total, prom: ds.length ? total / ds.length : 0, viajesProm: ds.length ? v / ds.length : 0 };
  });
  const used = data.filter((d) => d.jornadas);
  const best = used.length ? used.reduce((a, b) => (b.prom > a.prom ? b : a)) : null;
  const worst = used.length > 1 ? used.reduce((a, b) => (b.prom < a.prom ? b : a)) : null;
  return { data, best, worst: worst && worst.dow !== best?.dow ? worst : null, jornadas: list.length };
}

/* ───────── Meta diaria ───────── */
export function goalProgress(trips, goal, todayKey) {
  const mine = trips.filter((t) => t.Fecha === todayKey);
  const earned = mine.reduce((a, t) => a + n(t['Dinero Neto Conductor']), 0);
  const pct = goal > 0 ? (earned / goal) * 100 : 0;
  return { earned, goal, pct, falta: Math.max(0, goal - earned), sobra: Math.max(0, earned - goal), viajes: mine.length, done: goal > 0 && earned >= goal };
}

/* ───────── Hoy vs. mismo día de la semana pasada ───────── */
export function vsLastWeek(trips, now = new Date()) {
  const todayK = keyD(now);
  const lwK = keyD(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7));
  const sum = (r) => r.reduce((a, t) => a + n(t['Dinero Neto Conductor']), 0);
  const today = trips.filter((t) => t.Fecha === todayK), last = trips.filter((t) => t.Fecha === lwK);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // Comparación justa: del lunes pasado solo cuenta lo registrado hasta la misma hora del día
  const lastSoFar = last.filter((t) => { const d = t._created ? new Date(t._created) : null; return !d || isNaN(d) || d.getHours() * 60 + d.getMinutes() <= nowMin; });
  const todayNeto = sum(today), lastNeto = sum(lastSoFar);
  return { dia: DIAS[now.getDay()], todayNeto, todayViajes: today.length, lastNeto, lastTotal: sum(last), lastViajes: last.length, hasLast: last.length > 0, diff: todayNeto - lastNeto };
}

/* ───────── Ganancia por kilómetro ───────── */
export function perKm(trips) {
  const km = trips.reduce((a, t) => a + n(t['Km Recorridos']), 0), neto = trips.reduce((a, t) => a + n(t['Dinero Neto Conductor']), 0);
  return { km, neto, netoKm: km > 0 ? neto / km : 0 };
}

/** Divide las carreras en cortas / medianas / largas (tercios por km) y compara su ganancia por km. */
export function tripLengths(trips) {
  const rows = trips.map((t) => ({ km: n(t['Km Recorridos']), neto: n(t['Dinero Neto Conductor']) })).filter((r) => r.km > 0).sort((a, b) => a.km - b.km);
  if (rows.length < 6) return null;
  const k = Math.floor(rows.length / 3);
  const parts = [['Cortas', '🏘️', rows.slice(0, k)], ['Medianas', '🛣️', rows.slice(k, rows.length - k)], ['Largas', '🌄', rows.slice(rows.length - k)]];
  const groups = parts.map(([name, ic, r]) => {
    const km = r.reduce((a, x) => a + x.km, 0), neto = r.reduce((a, x) => a + x.neto, 0);
    return { name, ic, viajes: r.length, minKm: r[0].km, maxKm: r[r.length - 1].km, netoKm: km ? neto / km : 0 };
  });
  const all = perKm(trips).netoKm, largas = groups[2];
  const diffPct = all ? ((largas.netoKm - all) / all) * 100 : 0;
  return { groups, all, diffPct, verdict: diffPct < -10 ? 'bad' : diffPct > 10 ? 'good' : 'same' };
}
