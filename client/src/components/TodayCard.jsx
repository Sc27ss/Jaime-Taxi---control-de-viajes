import { useMemo, useState } from 'react';
import { money, todayStr } from '../lib.js';
import { goalProgress, vsLastWeek } from '../stats.js';

const QUICK = [100000, 150000, 200000, 300000];

export default function TodayCard({ trips, loading, goal, onGoal }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const g = useMemo(() => goalProgress(trips, goal, todayStr()), [trips, goal]);
  const v = useMemo(() => vsLastWeek(trips), [trips]);
  const dia = v.dia.toLowerCase();

  const color = g.done ? 'var(--c2)' : g.pct >= 50 ? 'var(--c1)' : 'var(--c4)';
  const msg = !goal ? 'Define tu meta diaria y mira cómo se llena con cada viaje 🚕'
    : g.done ? `🎉 ¡Meta cumplida! Ya superaste la meta de hoy por ${money(g.sobra)}`
    : g.viajes === 0 ? `Aún no registras viajes hoy. ¡Vamos por los ${money(goal)}!`
    : `Llevas el ${Math.round(g.pct)}% de la meta de hoy, te faltan ${money(g.falta)}`;

  const save = (val) => { const n = Math.round(Number(val)); if (n > 0) { onGoal(n); setEditing(false); } };
  const up = v.diff > 0, same = v.diff === 0;
  const near = v.diff < 0 && v.lastNeto > 0 && -v.diff <= v.lastNeto * 0.2;
  const vsColor = up ? 'var(--c2)' : near || same ? 'var(--c4)' : 'var(--c5)';
  const vsMsg = !v.hasLast ? `El ${dia} pasado no registraste viajes, así que hoy marcas el ritmo. ¡Hoy llevas ${money(v.todayNeto)}!`
    : up ? `Hoy vas ${money(v.diff)} arriba comparado con el ${dia} de la semana pasada 🚀`
    : same ? `Vas igualito que el ${dia} pasado a esta hora 👌`
    : near ? `Vas un poco más bajo que el ${dia} pasado (${money(-v.diff)}), ¡todavía lo alcanzas! 💪`
    : `Vas ${money(-v.diff)} por debajo del ${dia} pasado a esta hora. ¡Aún hay tiempo de recuperar! 🔥`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {/* Meta diaria */}
      <section className="card lift animate-fade-up" style={{ borderTop: `3px solid ${color}` }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">🎯 Meta de hoy</h3>
          <button className="icon-btn" title="Cambiar meta" aria-label="Cambiar meta diaria" onClick={() => { setDraft(goal ? String(goal) : ''); setEditing(!editing); }}>{goal ? '✏️' : '＋'}</button>
        </div>
        {editing && (
          <div className="mt-2 mb-3 animate-pop space-y-2">
            <div className="flex gap-2">
              <input autoFocus className="inp font-mono !py-2" type="number" inputMode="numeric" min="1" step="1000" placeholder="Ej: 200000" value={draft}
                onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(draft); if (e.key === 'Escape') setEditing(false); }} />
              <button className="btn-acc !py-2" onClick={() => save(draft)}>Guardar</button>
            </div>
            <div className="flex flex-wrap gap-2">{QUICK.map((q) => <button key={q} className="pill border border-line text-mute hover:text-ink transition active:scale-90" onClick={() => save(q)}>{money(q)}</button>)}</div>
          </div>)}
        <div className="flex items-end justify-between mt-2">
          <div key={Math.round(g.earned)} className="font-mono font-bold text-[26px] leading-none animate-pop" style={{ color }}>{loading ? '…' : money(g.earned)}</div>
          <div className="text-mute font-mono">{goal ? `/ ${money(goal)}` : 'sin meta'}</div>
        </div>
        <div className="h-3 rounded-full bg-hov overflow-hidden mt-3" role="progressbar" aria-valuenow={Math.round(g.pct)} aria-valuemin="0" aria-valuemax="100">
          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, g.pct)}%`, background: color }} />
        </div>
        <p key={msg} className="mt-3 font-medium animate-fade-up">{msg}</p>
        {goal > 0 && <p className="text-xs text-mute mt-1">Ganancia neta de hoy · {g.viajes} {g.viajes === 1 ? 'viaje' : 'viajes'} · se guarda en este dispositivo</p>}
      </section>

      {/* Hoy vs. semana pasada */}
      <section className="card lift animate-fade-up" style={{ borderTop: `3px solid ${vsColor}`, animationDelay: '80ms' }}>
        <h3 className="text-base font-semibold">📈 Hoy vs. el {dia} pasado</h3>
        <div className="flex items-end gap-3 mt-2">
          {v.hasLast && <div key={v.diff} className="font-mono font-bold text-[26px] leading-none animate-pop" style={{ color: vsColor }}>{v.diff >= 0 ? '+' : '−'}{money(Math.abs(v.diff))}</div>}
          <div className="text-xs text-mute pb-0.5">{v.hasLast ? 'a esta misma hora' : ''}</div>
        </div>
        <p className="mt-3 font-medium">{loading ? 'Cargando…' : vsMsg}</p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--c2) 12%, transparent)' }}><div className="lbl">Hoy</div><div className="font-mono font-bold">{money(v.todayNeto)}</div><div className="text-xs text-mute">{v.todayViajes} viajes</div></div>
          <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--c3) 12%, transparent)' }}><div className="lbl">{v.dia} pasado</div><div className="font-mono font-bold">{money(v.lastNeto)}</div><div className="text-xs text-mute">día completo: {money(v.lastTotal)}</div></div>
        </div>
      </section>
    </div>
  );
}
