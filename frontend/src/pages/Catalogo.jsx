import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import CourseTicket from '../components/CourseTicket.jsx';
import Notice from '../components/Notice.jsx';

const FILTROS = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'VIRTUAL', label: 'Virtuales' },
  { id: 'PRESENCIAL', label: 'Presenciales' }
];

export default function Catalogo() {
  const [cursos, setCursos] = useState(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('TODOS');
  const [q, setQ] = useState('');

  useEffect(() => {
    api('/api/cursos', { auth: false }).then(setCursos).catch((e) => setError(e.message));
  }, []);

  const visibles = useMemo(() => {
    if (!cursos) return [];
    const t = q.trim().toLowerCase();
    return cursos
      .filter((c) => filtro === 'TODOS' || c.modalidad === filtro)
      .filter((c) => !t || `${c.titulo} ${c.descripcion || ''}`.toLowerCase().includes(t))
      .sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
  }, [cursos, filtro, q]);

  const vacantes = cursos?.reduce((s, c) => s + (c.aforoDisponible || 0), 0);

  return (
    <div className="page">
      <section className="hero">
        <h1>Elige tu curso y asegura tu vacante antes de que se llene.</h1>
        <p className="lead">
          Clases en vivo por Zoom o Meet y presenciales en aula. Reservas tu cupo por 15 minutos,
          pagas con Mercado Pago y recibes tu acceso y comprobante al instante.
        </p>
        {cursos && (
          <p className="hero-meta">Hoy hay {cursos.length} cursos abiertos y {vacantes} vacantes disponibles.</p>
        )}
      </section>

      <div className="toolbar" role="search">
        <div className="segmented" role="group" aria-label="Modalidad">
          {FILTROS.map((f) => (
            <button key={f.id} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>{f.label}</button>
          ))}
        </div>
        <label className="search">
          <span className="sr-only">Buscar curso</span>
          <input type="search" placeholder="Buscar por tema, p. ej. Excel o Python" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      <Notice tipo="error">{error}</Notice>
      {!cursos && !error && <div className="grid">{[1, 2, 3].map((i) => <div key={i} className="ticket skeleton" />)}</div>}
      {cursos && visibles.length === 0 && (
        <div className="empty">
          <p>No hay cursos que coincidan con “{q}”.</p>
          <button className="btn btn-ghost" onClick={() => { setQ(''); setFiltro('TODOS'); }}>Ver todos los cursos</button>
        </div>
      )}
      <div className="grid">
        {visibles.map((c) => <CourseTicket key={c.id} curso={c} />)}
      </div>
    </div>
  );
}
