import { useEffect, useMemo, useRef, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { perKm } from '../stats.js';
import { PAYMENTS, COLS, PAY_COLOR, PAY_ICON, money, num, downloadExcel, todayStr } from '../lib.js';

const MONEY_COLS = ['Valor Viaje', 'Tasa Uber (10%)', 'Propina', 'Dinero Neto Conductor'];

function useCountUp(target, ms = 700) {
  const [v, setV] = useState(0); const from = useRef(0);
  useEffect(() => {
    const start = performance.now(), a = from.current; let raf;
    const tick = (t) => { const p = Math.min(1, (t - start) / ms), e = 1 - Math.pow(1 - p, 3); setV(a + (target - a) * e); if (p < 1) raf = requestAnimationFrame(tick); else from.current = target; };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
function Kpi({ label, value, fmt, color, icon, i, loading, sub }) {
  const v = useCountUp(loading ? 0 : value);
  return (
    <div className="card lift animate-fade-up group" style={{ animationDelay: `${i * 60}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="lbl !mb-0">{label}</span>
        <span className="w-8 h-8 rounded-lg grid place-items-center transition group-hover:scale-110 group-hover:rotate-6" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}>{icon}</span>
      </div>
      <div className="kpi" style={{ color }}>{fmt(v)}</div>
      {sub && <div className="text-xs text-mute mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard({ trips, loading, error, reload, onEdit, onDelete, onStats }) {
  const [exporting, setExporting] = useState(false);
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [pay, setPay] = useState('');

  const rows = useMemo(() => trips
    .filter((t) => (!from || t.Fecha >= from) && (!to || t.Fecha <= to) && (!pay || t['Forma de Pago'] === pay))
    .sort((a, b) => b.Fecha.localeCompare(a.Fecha)), [trips, from, to, pay]);
  const exportXlsx = async () => { setExporting(true); try { await downloadExcel({ from, to, pay }); } catch (e) { alert(e.message); } setExporting(false); };
  const sum = (k, r = rows) => r.reduce((a, t) => a + num(t[k]), 0);
  const kpis = [
    ['Viajes realizados', rows.length, (v) => Math.round(v), 'var(--c4)', '🚕'],
    ['Dinero bruto', sum('Valor Viaje'), money, 'var(--c1)', '💰'],
    ['Retenido por Uber', sum('Tasa Uber (10%)'), money, 'var(--c5)', '🏦'],
    ['Neto del conductor', sum('Dinero Neto Conductor'), money, 'var(--c2)', '✅'],
    ['Ganancia por km', perKm(rows).netoKm, money, 'var(--c1)', '⛽', 'por cada km que rueda tu carro'],
    ['Km recorridos', sum('Km Recorridos'), (v) => v.toLocaleString('es-CO', { maximumFractionDigits: 1 }), 'var(--c3)', '🛣️'],
  ];
  const chart = useMemo(() => {
    const m = {}; rows.forEach((t) => { const o = (m[t.Fecha] ||= { bruto: 0, neto: 0 }); o.bruto += num(t['Valor Viaje']); o.neto += num(t['Dinero Neto Conductor']); });
    return Object.entries(m).sort().map(([d, o]) => ({ d: d.slice(5), ...o }));
  }, [rows]);
  const hoy = trips.filter((t) => t.Fecha === todayStr());
  const byPay = PAYMENTS.map((p) => [p, rows.filter((t) => t['Forma de Pago'] === p)]);
  const maxPay = Math.max(1, ...byPay.map(([, r]) => sum('Dinero Neto Conductor', r)));
  const cash = sum('Dinero Neto Conductor', rows.filter((t) => t['Forma de Pago'] === 'Efectivo'));

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 animate-fade-up">
        <div><label className="lbl">Desde</label><input className="inp !py-2" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="lbl">Hasta</label><input className="inp !py-2" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div><label className="lbl">Forma de pago</label>
          <select className="inp !py-2" value={pay} onChange={(e) => setPay(e.target.value)}><option value="">Todas</option>{PAYMENTS.map((p) => <option key={p}>{p}</option>)}</select></div>
        <button className="btn-ghost" onClick={() => { setFrom(''); setTo(''); setPay(''); }}>Limpiar</button>
        <button className="btn-ghost group" onClick={reload}><span className={`inline-block transition-transform duration-500 group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`}>↻</span> Actualizar</button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn-ghost" style={{ color: 'var(--c3)', borderColor: 'var(--c3)' }} onClick={onStats}>＋ Estadísticas</button>
          <button className="btn-acc" onClick={exportXlsx} disabled={!rows.length || exporting}>{exporting ? 'Generando…' : '⬇ Descargar Excel'}</button>
        </div>
      </div>

      {error && <div className="rounded-lg p-4 border-l-4 border-bad bg-badbg text-bad animate-pop">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(([l, v, fmt, c, ic, sub], i) => <Kpi key={l} i={i} label={l} value={v} fmt={fmt} color={c} icon={ic} sub={sub} loading={loading} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="card lg:col-span-8 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-3"><h3 className="text-base font-semibold">Ingresos por día</h3>
            <div className="flex gap-3 text-xs text-mute"><span><i className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: 'var(--c1)' }} />Bruto</span><span><i className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: 'var(--c2)' }} />Neto</span></div></div>
          <div className="h-64">
            {chart.length ? <ResponsiveContainer><AreaChart data={chart}>
              <defs>
                <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--c1)" stopOpacity=".35" /><stop offset="100%" stopColor="var(--c1)" stopOpacity="0" /></linearGradient>
                <linearGradient id="gn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--c2)" stopOpacity=".4" /><stop offset="100%" stopColor="var(--c2)" stopOpacity="0" /></linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="d" stroke="var(--mute)" tickLine={false} axisLine={false} />
              <YAxis stroke="var(--mute)" tickLine={false} axisLine={false} width={50} tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
              <Tooltip formatter={(v, n) => [money(v), n]} contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)' }} />
              <Area name="Bruto" type="monotone" dataKey="bruto" stroke="var(--c1)" strokeWidth={2} fill="url(#gb)" animationDuration={900} />
              <Area name="Neto" type="monotone" dataKey="neto" stroke="var(--c2)" strokeWidth={2} fill="url(#gn)" animationDuration={1100} />
            </AreaChart></ResponsiveContainer> : <p className="text-mute">Sin datos para graficar.</p>}
          </div>
        </div>
        <div className="card lg:col-span-4 space-y-3 animate-fade-up" style={{ animationDelay: '360ms' }}>
          <h3 className="text-base font-semibold">Hoy</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--c4) 14%, transparent)' }}><div className="lbl">Viajes</div><div className="font-mono font-bold text-xl" style={{ color: 'var(--c4)' }}>{hoy.length}</div></div>
            <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--c2) 14%, transparent)' }}><div className="lbl">Neto</div><div className="font-mono font-bold text-xl" style={{ color: 'var(--c2)' }}>{money(sum('Dinero Neto Conductor', hoy))}</div></div>
          </div>
          <h3 className="text-base font-semibold pt-1">Por forma de pago</h3>
          {byPay.map(([p, r]) => { const v = sum('Dinero Neto Conductor', r); return (
            <div key={p}><div className="flex justify-between mb-1"><span>{PAY_ICON[p]} {p} <span className="text-mute">({r.length})</span></span><span className="font-mono">{money(v)}</span></div>
              <div className="h-1.5 rounded-full bg-hov overflow-hidden"><div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(v / maxPay) * 100}%`, background: PAY_COLOR[p] }} /></div></div>); })}
          {cash > 0 && <div className="rounded-lg p-3 border-l-4 border-bad bg-badbg text-bad">💵 Efectivo en el filtro: {money(cash)}. Uber cobra su 10% aparte en estos viajes.</div>}
        </div>
      </div>

      <div className="card !p-0 overflow-hidden animate-fade-up" style={{ animationDelay: '420ms' }}>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-card"><tr>
              {COLS.map((c) => <th key={c} className="px-3 py-3 text-xs font-medium text-mute border-b border-line">{c}</th>)}
              <th className="px-3 py-3 text-xs font-medium text-mute border-b border-line sticky right-0 bg-card text-right">Acciones</th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t._row} className="group border-b border-line hover:bg-hov transition-colors">
                  {COLS.map((c) => (
                    <td key={c} className={`px-3 py-2.5 ${MONEY_COLS.includes(c) ? 'font-mono text-right' : ''} ${c === 'Dinero Neto Conductor' ? 'font-bold' : ''}`} style={c === 'Dinero Neto Conductor' ? { color: 'var(--c2)' } : c === 'Tasa Uber (10%)' ? { color: 'var(--c5)' } : null}>
                      {c === 'Forma de Pago' ? <span className="pill" style={{ color: PAY_COLOR[t[c]], background: `color-mix(in srgb, ${PAY_COLOR[t[c]] || 'var(--mute)'} 16%, transparent)` }}>{PAY_ICON[t[c]]} {t[c]}</span>
                        : MONEY_COLS.includes(c) ? money(t[c]) : t[c]}</td>))}
                  <td className="px-2 py-1 sticky right-0 bg-card group-hover:bg-hov transition-colors text-right">
                    <button className="icon-btn" title="Editar" aria-label="Editar viaje" onClick={() => onEdit(t)}>✏️</button>
                    <button className="icon-btn" title="Eliminar" aria-label="Eliminar viaje" onClick={() => onDelete(t)}>🗑️</button></td>
                </tr>))}
              {!rows.length && <tr><td colSpan={COLS.length + 1} className="p-10 text-center text-mute">{loading ? 'Cargando…' : '🚕 No hay viajes con estos filtros.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
