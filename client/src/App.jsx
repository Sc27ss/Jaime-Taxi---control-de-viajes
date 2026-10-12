import { useCallback, useEffect, useState } from 'react';
import TripForm, { emptyForm } from './components/TripForm.jsx';
import Dashboard from './components/Dashboard.jsx';
import Stats from './components/Stats.jsx';
import TodayCard from './components/TodayCard.jsx';
import Modal from './components/Modal.jsx';
import { getTrips, addTrip, updateTrip, deleteTrip, tripToForm, money } from './lib.js';

const tabs = [['form', '➕ Registrar'], ['panel', '📊 Panel']];

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [tab, setTab] = useState(() => (window.innerWidth < 768 ? 'form' : 'panel'));
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [delBusy, setDelBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [goal, setGoal] = useState(() => Number(localStorage.getItem('goal')) || 0);
  const saveGoal = (n) => { setGoal(n); try { localStorage.setItem('goal', String(n)); } catch {} say(`🎯 Meta diaria: ${money(n)}`); };

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [tab]);
  const say = (t, ok = true) => { setToast({ t, ok, k: Date.now() }); };
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 3200); return () => clearTimeout(id); }, [toast]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#121212' : '#f6f5f4');
  }, [theme]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setTrips(await getTrips()); } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveNew = async (body) => { await addTrip(body); say('🎉 Viaje guardado'); setFormKey((k) => k + 1); load(); };
  const saveEdit = async (body) => { await updateTrip(editing, body); setEditing(null); say('✏️ Viaje actualizado'); load(); };
  const confirmDelete = async () => {
    setDelBusy(true);
    try { await deleteTrip(deleting); setDeleting(null); say('🗑️ Viaje eliminado'); load(); }
    catch (e) { say(e.message, false); setDeleting(null); }
    setDelBusy(false);
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="max-w-[1440px] mx-auto px-4 pt-5 pb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl md:text-2xl font-semibold flex-1 min-w-[260px] animate-fade-up">
          ¡Hola Jaime! <span className="inline-block origin-bottom-right animate-wave">🚕</span> ¿Listo para registrar tu próximo viaje o revisar tus ganancias de hoy?</h1>
        <nav className="hidden md:flex gap-2">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={(tab === 'stats' ? 'panel' : tab) === k ? 'btn-acc' : 'btn-ghost'}>{l}</button>)}</nav>
        <button className="btn-ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Cambiar tema">{theme === 'dark' ? '☀️' : '🌙'}</button>
      </header>
      <main className="max-w-[1440px] mx-auto px-4">
        {tab !== 'stats' && <TodayCard trips={trips} loading={loading} goal={goal} onGoal={saveGoal} />}
        {tab === 'form' && <TripForm key={formKey} onSubmit={saveNew} />}
        {tab === 'panel' && <Dashboard trips={trips} loading={loading} error={error} reload={load} onEdit={setEditing} onDelete={setDeleting} onStats={() => setTab('stats')} />}
        {tab === 'stats' && <Stats trips={trips} loading={loading} onBack={() => setTab('panel')} />}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-line grid grid-cols-2 p-2 gap-2 pb-[max(.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={(tab === 'stats' ? 'panel' : tab) === k ? 'btn-acc' : 'btn-ghost'}>{l}</button>)}
      </nav>

      {editing && <Modal wide onClose={() => setEditing(null)}>
        <TripForm initial={tripToForm(editing)} title="Editar viaje" submitLabel="💾 Guardar cambios" onSubmit={saveEdit} onCancel={() => setEditing(null)} /></Modal>}

      {deleting && <Modal onClose={() => setDeleting(null)}>
        <div className="card !p-6 space-y-4" style={{ borderTop: '3px solid var(--bad)' }}>
          <h2 className="text-xl font-semibold">¿Eliminar este viaje?</h2>
          <p className="text-mute">{deleting.Fecha} · {deleting.Pasajero} · {deleting['Punto de Recogida']} → {deleting['Destino Final']} · <span className="font-mono">{money(deleting['Valor Viaje'])}</span></p>
          <p className="text-bad">Se borrará también de la Google Sheet y no se puede deshacer.</p>
          <div className="flex gap-3"><button className="btn-ghost flex-1" onClick={() => setDeleting(null)}>Cancelar</button>
            <button className="btn-bad flex-1" disabled={delBusy} onClick={confirmDelete}>{delBusy ? 'Eliminando…' : 'Sí, eliminar'}</button></div>
        </div></Modal>}

      {toast && <div key={toast.k} role="status" className="fixed z-[60] bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 animate-toast">
        <div className={`card !py-3 !px-5 font-medium shadow-xl border-l-4 ${toast.ok ? 'border-ok' : 'border-bad text-bad'}`}>{toast.t}</div></div>}
    </div>
  );
}
