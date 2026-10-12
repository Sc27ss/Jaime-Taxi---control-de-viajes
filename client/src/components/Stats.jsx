import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ReferenceLine, BarChart, Bar, ComposedChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PAY_COLOR, PAY_ICON, money } from '../lib.js';
import { filterPeriod, byPayment, byFranja, byPeriod, tips, weekdayStats, perKm, tripLengths } from '../stats.js';

const tip = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)' };
const axis = { stroke: 'var(--mute)', tickLine: false, axisLine: false };
const k = (v) => (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(Math.round(v)));
const pct = (v) => `${v.toFixed(1)}%`;

function Section({ title, sub, i, children, cls = '' }) {
  return (
    <section className={`card animate-fade-up ${cls}`} style={{ animationDelay: `${i * 80}ms` }}>
      <h3 className="text-base font-semibold">{title}</h3>
      {sub && <p className="text-xs text-mute mb-3">{sub}</p>}
      {children}
    </section>
  );
}
const Empty = ({ t = 'Aún no hay datos para esta gráfica.' }) => <div className="h-56 grid place-items-center text-mute text-center px-4">🚕 {t}</div>;
const Chip = ({ color, children }) => <span className="pill" style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>{children}</span>;

export default function Stats({ trips, loading, onBack }) {
  const [days, setDays] = useState(30);
  const [mode, setMode] = useState('semana');
  const rows = useMemo(() => filterPeriod(trips, days), [trips, days]);
  const pay = useMemo(() => byPayment(rows), [rows]);
  const fr = useMemo(() => byFranja(rows), [rows]);
  const per = useMemo(() => byPeriod(rows, mode), [rows, mode]);
  const tp = useMemo(() => tips(rows), [rows]);
  const wd = useMemo(() => weekdayStats(rows), [rows]);
  const pk = useMemo(() => perKm(rows), [rows]);
  const tl = useMemo(() => tripLengths(rows), [rows]);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 animate-fade-up">
        <button className="btn-ghost" onClick={onBack}>← Panel</button>
        <h2 className="text-2xl font-semibold flex-1 min-w-[160px]">Estadísticas 📈</h2>
        <div className="flex items-center gap-2"><label className="lbl !mb-0">Periodo</label>
          <select className="inp !py-2 !w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option><option value={0}>Todo el historial</option>
          </select></div>
        <span className="text-mute">{loading ? 'Cargando…' : `${rows.length} viajes`}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Método de pago */}
        <Section i={1} title="💳 Ingresos por método de pago" sub="Porcentaje del valor de los viajes según cómo pagó la clientela">
          {pay.total ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
              <div className="relative h-56">
                <ResponsiveContainer><PieChart>
                  <Pie data={pay.data.filter((d) => d.value)} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={3} stroke="none" animationDuration={900}>
                    {pay.data.filter((d) => d.value).map((d) => <Cell key={d.name} fill={PAY_COLOR[d.name]} />)}
                  </Pie>
                  <Tooltip formatter={(v, nme) => [money(v), nme]} contentStyle={tip} itemStyle={{ color: 'var(--ink)' }} />
                </PieChart></ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
                  <div><div className="lbl !mb-0">Total</div><div className="font-mono font-bold">{money(pay.total)}</div></div></div>
              </div>
              <ul className="space-y-3">
                {[...pay.data].sort((a, b) => b.value - a.value).map((d) => (
                  <li key={d.name}><div className="flex justify-between gap-2"><span>{PAY_ICON[d.name]} {d.name}</span><span className="font-mono font-bold" style={{ color: PAY_COLOR[d.name] }}>{pct(d.pct)}</span></div>
                    <div className="h-1.5 rounded-full bg-hov overflow-hidden mt-1"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.pct}%`, background: PAY_COLOR[d.name] }} /></div>
                    <div className="text-xs text-mute mt-0.5">{d.viajes} viajes · {money(d.value)}</div></li>))}
              </ul>
            </div>) : <Empty />}
        </Section>

        {/* 2. Franjas */}
        <Section i={2} title="🕒 Franjas más productivas" sub="Viajes y ganancia neta por momento del día · según la hora en que se registró cada viaje">
          {rows.length && fr.bestNeto ? (<>
            <div className="flex flex-wrap gap-2 mb-2">
              <Chip color="var(--c2)">🏆 Más ganancia: {fr.bestNeto.ic} {fr.bestNeto.k} · {money(fr.bestNeto.neto)}</Chip>
              <Chip color="var(--c4)">🚕 Más viajes: {fr.bestViajes.ic} {fr.bestViajes.k} · {fr.bestViajes.viajes}</Chip>
            </div>
            <div className="grid grid-cols-2 gap-2 h-48">
              {[['viajes', 'Viajes', (v) => v], ['neto', 'Neto', money]].map(([key, name, f]) => (
                <div key={key} className="min-w-0"><div className="lbl text-center">{name}</div>
                  <ResponsiveContainer height="85%"><BarChart data={fr.data} margin={{ left: -18, right: 4 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="ic" {...axis} />
                    <YAxis {...axis} tickFormatter={key === 'neto' ? k : undefined} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'var(--hov)' }} formatter={(v) => [f(v), name]} labelFormatter={(_, p) => p?.[0] ? `${p[0].payload.k} (${p[0].payload.h})` : ''} contentStyle={tip} itemStyle={{ color: 'var(--ink)' }} />
                    <Bar dataKey={key} radius={[6, 6, 0, 0]} animationDuration={900}>{fr.data.map((d) => <Cell key={d.k} fill={d.color} />)}</Bar>
                  </BarChart></ResponsiveContainer></div>))}
            </div>
            <p className="text-xs text-mute mt-1">🌙 Madrugada 0–5 h · 🌅 Mañana 6–11 h · ☀️ Tarde 12–17 h · 🌃 Noche 18–23 h{fr.sinHora ? ` · ${fr.sinHora} viajes sin hora` : ''}</p>
          </>) : <Empty />}
        </Section>

        {/* 5. Días de la semana */}
        <Section i={3} title="📅 Ganancia por día de la semana" sub="Promedio de ganancia neta por jornada (cada día en que trabajaste)">
          {wd.jornadas ? (<>
            <div className="flex flex-wrap gap-2 mb-2">
              {wd.best && <Chip color="var(--c2)">💪 Mejor: {wd.best.full} · {money(wd.best.prom)}</Chip>}
              {wd.worst && <Chip color="var(--c5)">😴 Más flojo: {wd.worst.full} · {money(wd.worst.prom)}</Chip>}
            </div>
            <div className="h-56"><ResponsiveContainer><BarChart data={wd.data} margin={{ left: 0, right: 4 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="dia" {...axis} />
              <YAxis {...axis} width={50} tickFormatter={k} />
              <Tooltip cursor={{ fill: 'var(--hov)' }} contentStyle={tip} itemStyle={{ color: 'var(--ink)' }} labelFormatter={(_, p) => p?.[0]?.payload.full}
                formatter={(v, _n, p) => [`${money(v)} · ${p.payload.jornadas} jornadas · ${p.payload.viajesProm.toFixed(1)} viajes/día`, 'Promedio']} />
              <Bar dataKey="prom" radius={[6, 6, 0, 0]} animationDuration={900}>
                {wd.data.map((d) => <Cell key={d.dow} fill={wd.best && d.dow === wd.best.dow ? 'var(--c2)' : wd.worst && d.dow === wd.worst.dow ? 'var(--c5)' : d.jornadas ? 'var(--c1)' : 'var(--line)'} />)}
              </Bar>
            </BarChart></ResponsiveContainer></div>
            <p className="text-xs text-mute mt-1">Basado en {wd.jornadas} jornadas del periodo. Un día sin viajes registrados no cuenta como jornada; para más precisión elige "Todo el historial".</p>
          </>) : <Empty />}
        </Section>

        {/* 6. Ganancia por km */}
        <Section i={4} title="⛽ Ganancia por kilómetro" sub="¿Te rinden las carreras largas o pierdes plata en gasolina?">
          {pk.km > 0 ? (<>
            <div className="rounded-xl p-4 mb-3" style={{ background: 'color-mix(in srgb, var(--c1) 12%, transparent)' }}>
              <div className="kpi" style={{ color: 'var(--c1)' }}>{money(pk.netoKm)} <span className="text-sm font-sans font-medium text-mute">por km</span></div>
              <p className="mt-1">Por cada kilómetro que rueda tu carro, estás ganando en promedio <b>{money(pk.netoKm)}</b>.</p></div>
            {tl ? (<>
              <div className="h-36"><ResponsiveContainer><BarChart data={tl.groups} margin={{ left: 0, right: 4 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="name" {...axis} tickFormatter={(nme) => tl.groups.find((x) => x.name === nme).ic + ' ' + nme} />
                <YAxis {...axis} width={50} tickFormatter={k} />
                <Tooltip cursor={{ fill: 'var(--hov)' }} contentStyle={tip} itemStyle={{ color: 'var(--ink)' }}
                  formatter={(v, _n, p) => [`${money(v)} por km · ${p.payload.viajes} carreras de ${p.payload.minKm}–${p.payload.maxKm} km`, 'Rinde']} />
                <ReferenceLine y={tl.all} stroke="var(--mute)" strokeDasharray="4 4" />
                <Bar dataKey="netoKm" radius={[6, 6, 0, 0]} animationDuration={900}>{tl.groups.map((d, i) => <Cell key={d.name} fill={['var(--c4)', 'var(--c1)', 'var(--c3)'][i]} />)}</Bar>
              </BarChart></ResponsiveContainer></div>
              <div className="rounded-lg p-3 mt-2 border-l-4" style={{ borderColor: tl.verdict === 'bad' ? 'var(--bad)' : tl.verdict === 'good' ? 'var(--ok)' : 'var(--mute)', background: tl.verdict === 'bad' ? 'var(--badbg)' : 'transparent' }}>
                {tl.verdict === 'bad' && <>⚠️ Las carreras largas ({tl.groups[2].minKm}+ km) te rinden <b>{money(tl.groups[2].netoKm)}/km</b>, un {Math.abs(tl.diffPct).toFixed(0)}% menos que tu promedio. Revisa si compensan la gasolina y el desgaste.</>}
                {tl.verdict === 'good' && <>✅ Las carreras largas ({tl.groups[2].minKm}+ km) rinden <b>{money(tl.groups[2].netoKm)}/km</b>, un {tl.diffPct.toFixed(0)}% más que tu promedio. ¡Valen la pena!</>}
                {tl.verdict === 'same' && <>👌 Las carreras largas ({tl.groups[2].minKm}+ km) rinden <b>{money(tl.groups[2].netoKm)}/km</b>, parecido a tu promedio.</>}
              </div></>) : <p className="text-mute text-xs">Registra al menos 6 carreras con kilómetros para comparar cortas, medianas y largas.</p>}
            <p className="text-xs text-mute mt-2">Solo cuenta los km de carreras registradas; los km sin pasajero y la gasolina no se incluyen.</p>
          </>) : <Empty t="Registra carreras con kilómetros para ver tu ganancia por km." />}
        </Section>

        {/* 3. Rendimiento */}
        <Section i={5} cls="lg:col-span-2" title="🛣️ Rendimiento y kilometraje" sub="Kilómetros recorridos frente al dinero neto ganado">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {['semana', 'mes'].map((m) => <button key={m} onClick={() => setMode(m)} className={`pill border transition duration-200 active:scale-90 ${mode === m ? 'bg-acc text-accfg border-acc' : 'border-line text-mute hover:text-ink'}`}>{m === 'semana' ? 'Semanal' : 'Mensual'}</button>)}
            {per.data.length > 0 && <><Chip color="var(--c2)">💵 {money(per.netoKm)} netos por km</Chip><Chip color="var(--c3)">🛣️ {per.km.toLocaleString('es-CO', { maximumFractionDigits: 1 })} km</Chip></>}
          </div>
          {per.data.length ? (
            <div className="h-64"><ResponsiveContainer><ComposedChart data={per.data} margin={{ left: 0, right: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis yAxisId="km" {...axis} width={40} />
              <YAxis yAxisId="neto" orientation="right" {...axis} width={50} tickFormatter={k} />
              <Tooltip cursor={{ fill: 'var(--hov)' }} contentStyle={tip} itemStyle={{ color: 'var(--ink)' }}
                formatter={(v, nme) => [nme === 'Km' ? `${v} km` : money(v), nme]} labelFormatter={(l) => (mode === 'semana' ? `Semana del ${l}` : l)} />
              <Bar yAxisId="km" name="Km" dataKey="km" fill="var(--c3)" radius={[6, 6, 0, 0]} animationDuration={900} />
              <Line yAxisId="neto" name="Neto" dataKey="neto" stroke="var(--c2)" strokeWidth={3} dot={{ r: 4, fill: 'var(--c2)' }} type="monotone" animationDuration={1100} />
            </ComposedChart></ResponsiveContainer></div>) : <Empty />}
          <div className="flex gap-4 text-xs text-mute mt-1"><span><i className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: 'var(--c3)' }} />Km recorridos (izq.)</span><span><i className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: 'var(--c2)' }} />Dinero neto (der.)</span></div>
        </Section>

        {/* 4. Propinas */}
        <Section i={6} cls="lg:col-span-2" title="✨ Propinas acumuladas" sub="Cuánto extra aportan las propinas al neto de cada jornada (día)">
          {tp.days ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="space-y-3">
                <div className="rounded-xl p-4" style={{ background: 'color-mix(in srgb, var(--c4) 14%, transparent)' }}>
                  <div className="lbl">Total en propinas</div><div className="kpi" style={{ color: 'var(--c4)' }}>{money(tp.tip)}</div></div>
                <div><div className="flex justify-between mb-1"><span className="text-mute">Extra sobre tu neto</span><span className="font-mono font-bold" style={{ color: 'var(--c4)' }}>+{pct(tp.pct)}</span></div>
                  <div className="h-2 rounded-full bg-hov overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, tp.pct * 4)}%`, background: 'var(--c4)' }} /></div></div>
                <div className="text-xs text-mute">{tp.daysWithTip} de {tp.days} jornadas recibieron propina</div>
              </div>
              <div className="md:col-span-2 h-60"><ResponsiveContainer><ComposedChart data={tp.data.map((o, i) => ({ ...o, acum: tp.cumulative[i].acum }))} margin={{ left: 0, right: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="d" {...axis} />
                <YAxis yAxisId="d" {...axis} width={52} tickFormatter={k} />
                <YAxis yAxisId="a" orientation="right" {...axis} width={50} tickFormatter={k} />
                <Tooltip cursor={{ fill: 'var(--hov)' }} contentStyle={tip} itemStyle={{ color: 'var(--ink)' }} formatter={(v, nme) => [money(v), nme]} />
                <Bar yAxisId="d" stackId="n" name="Neto sin propina" dataKey="base" fill="var(--c2)" animationDuration={900} />
                <Bar yAxisId="d" stackId="n" name="Propina" dataKey="tip" fill="var(--c4)" radius={[6, 6, 0, 0]} animationDuration={900} />
                <Line yAxisId="a" name="Propinas acumuladas" dataKey="acum" stroke="var(--c5)" strokeWidth={2} dot={false} type="monotone" animationDuration={1100} />
              </ComposedChart></ResponsiveContainer></div>
            </div>) : <Empty />}
          <div className="flex flex-wrap gap-4 text-xs text-mute mt-1"><span><i className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: 'var(--c2)' }} />Neto sin propina</span><span><i className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: 'var(--c4)' }} />Propina</span><span><i className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: 'var(--c5)' }} />Propinas acumuladas</span></div>
        </Section>
      </div>
    </div>
  );
}
