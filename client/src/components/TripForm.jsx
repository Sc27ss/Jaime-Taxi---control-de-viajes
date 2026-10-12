import { useState } from 'react';
import { PAYMENTS, PAY_COLOR, PAY_ICON, money, num, r2, todayStr } from '../lib.js';

export const emptyForm = () => ({ fecha: todayStr(), duracion: '', pasajero: '', recogida: '', destino: '', km: '', formaPago: '', valor: '', propina: '', descripcion: '' });
const F = ({ l, icon, children, cls = '' }) => <div className={cls}><label className="lbl">{icon && <span className="mr-1">{icon}</span>}{l}</label>{children}</div>;

export default function TripForm({ initial, onSubmit, onCancel, title = 'Registrar viaje', submitLabel = '🚕 Guardar viaje' }) {
  const [f, setF] = useState(initial || emptyForm());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const tasa = r2(num(f.valor) * 0.1);
  const neto = r2(num(f.valor) - tasa + num(f.propina));
  const pc = PAY_COLOR[f.formaPago];

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await onSubmit(f); } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="card max-w-2xl mx-auto grid grid-cols-2 gap-4 animate-fade-up !p-6" style={{ borderTop: `3px solid ${pc || 'var(--acc)'}` }}>
      <h2 className="col-span-2 text-2xl font-semibold flex items-center gap-2"><span className="inline-block animate-drive">🚕</span>{title}</h2>
      <F l="Fecha" icon="📅"><input className="inp" type="date" required value={f.fecha} onChange={set('fecha')} /></F>
      <F l="Duración del viaje (minutos)" icon="⏱️"><input className="inp font-mono" type="number" inputMode="numeric" min="1" step="1" required placeholder="Ej: 25" value={f.duracion} onChange={set('duracion')} /></F>
      <div className="col-span-2 -mt-2 flex flex-wrap gap-2">
        {[10, 20, 30, 45, 60, 90].map((m) => (
          <button type="button" key={m} onClick={() => setF({ ...f, duracion: String(m) })}
            className={`pill border transition duration-200 hover:-translate-y-0.5 active:scale-90 ${String(m) === f.duracion ? 'bg-acc text-accfg border-acc' : 'border-line text-mute hover:text-ink'}`}>{m} min</button>))}
      </div>
      <F l="Pasajero" icon="🙂" cls="col-span-2"><input className="inp" required placeholder="Nombre del pasajero" value={f.pasajero} onChange={set('pasajero')} /></F>
      <F l="Punto de recogida" icon="📍" cls="col-span-2 md:col-span-1"><input className="inp" required value={f.recogida} onChange={set('recogida')} /></F>
      <F l="Destino final" icon="🎯" cls="col-span-2 md:col-span-1"><input className="inp" required value={f.destino} onChange={set('destino')} /></F>
      <F l="Kilómetros recorridos" icon="🛣️"><input className="inp font-mono" type="number" inputMode="decimal" min="0" step="0.1" required value={f.km} onChange={set('km')} /></F>
      <F l="Forma de pago" icon={PAY_ICON[f.formaPago] || '💳'}>
        <select className="inp" required value={f.formaPago} onChange={set('formaPago')} style={pc ? { borderColor: pc } : null}>
          <option value="" disabled>Selecciona…</option>
          {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </F>
      <F l="Valor total del viaje" icon="💰"><input className="inp font-mono" type="number" inputMode="decimal" min="1" step="any" required value={f.valor} onChange={set('valor')} /></F>
      <F l="Propina (opcional)" icon="✨"><input className="inp font-mono" type="number" inputMode="decimal" min="0" step="any" value={f.propina} onChange={set('propina')} /></F>
      <F l="Descripción / observaciones (opcional)" icon="📝" cls="col-span-2"><textarea className="inp" rows="2" value={f.descripcion} onChange={set('descripcion')} /></F>

      <div className="col-span-2 grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 transition" style={{ background: 'color-mix(in srgb, var(--c5) 12%, transparent)' }}>
          <div className="lbl">Tasa Uber (10%)</div><div key={tasa} className="font-mono font-bold text-lg animate-pop" style={{ color: 'var(--c5)' }}>− {money(tasa)}</div></div>
        <div className="rounded-xl p-4 transition" style={{ background: 'color-mix(in srgb, var(--c2) 14%, transparent)' }}>
          <div className="lbl">Neto para Jaime</div><div key={neto} className="font-mono font-bold text-lg animate-pop" style={{ color: 'var(--c2)' }}>{money(neto)}</div></div>
      </div>
      {err && <div role="alert" className="col-span-2 rounded-lg p-3 border-l-4 border-bad text-bad bg-badbg animate-pop">{err}</div>}
      <div className="col-span-2 flex gap-3">
        {onCancel && <button type="button" className="btn-ghost flex-1" onClick={onCancel}>Cancelar</button>}
        <button className="btn-acc flex-[2] text-base py-3.5" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button>
      </div>
    </form>
  );
}
