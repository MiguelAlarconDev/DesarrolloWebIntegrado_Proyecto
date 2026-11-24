import { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';
import { useAuth } from '../auth.jsx';
import Notice from '../components/Notice.jsx';
import Seats from '../components/Seats.jsx';

function EditarClase({ curso, onGuardado }) {
  const [f, setF] = useState({ modalidad: curso.modalidad, enlaceClase: curso.enlaceClase || '', direccionClase: curso.direccionClase || '', aula: curso.aula || '' });
  const [msg, setMsg] = useState({});
  const guardar = async (e) => {
    e.preventDefault();
    setMsg({});
    try {
      const body = { ...f, enlaceClase: f.enlaceClase || null, direccionClase: f.direccionClase || null, aula: f.aula || null };
      onGuardado(await api(`/api/cursos/${curso.id}/datos-clase`, { method: 'PUT', body }));
      setMsg({ ok: 'Datos de clase guardados. Los alumnos matriculados ya los ven.' });
    } catch (err) { setMsg({ error: err.message }); }
  };
  return (
    <form onSubmit={guardar} className="inline-form">
      <Notice tipo="ok">{msg.ok}</Notice>
      <Notice tipo="error">{msg.error}</Notice>
      {curso.modalidad === 'VIRTUAL' ? (
        <label className="field">Enlace de Zoom o Meet
          <input type="url" placeholder="https://meet.google.com/…" value={f.enlaceClase} onChange={(e) => setF({ ...f, enlaceClase: e.target.value })} />
        </label>
      ) : (
        <div className="two">
          <label className="field">Dirección<input value={f.direccionClase} onChange={(e) => setF({ ...f, direccionClase: e.target.value })} /></label>
          <label className="field">Aula<input value={f.aula} onChange={(e) => setF({ ...f, aula: e.target.value })} /></label>
        </div>
      )}
      <button className="btn btn-small">Guardar datos de clase</button>
    </form>
  );
}

function Participantes({ cursoId }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api(`/api/pedidos/curso/${cursoId}/participantes`).then(setLista).catch((e) => setError(e.message)); }, [cursoId]);
  if (error) return <Notice tipo="error">{error}</Notice>;
  if (!lista) return <p className="muted">Cargando participantes…</p>;
  if (!lista.length) return <p className="muted">Aún no hay alumnos matriculados.</p>;
  return (
    <ol className="people">
      {lista.map((p) => <li key={p.id}>{p.estudianteNombre || 'Alumno'} <span className="muted small">· matriculado {fmt.fecha(p.fechaActualizacion)}</span></li>)}
    </ol>
  );
}

export default function Docente() {
  const { session } = useAuth();
  const [cursos, setCursos] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api(`/api/cursos/docente/${session.id}`).then(setCursos).catch((e) => setError(e.message)); }, [session.id]);
  const actualizar = (c) => setCursos(cursos.map((x) => (x.id === c.id ? c : x)));

  return (
    <div className="page">
      <h1>Mis clases</h1>
      <Notice tipo="error">{error}</Notice>
      {cursos && !cursos.length && <div className="empty"><p>Aún no tienes cursos asignados. El administrador te los asigna al crearlos.</p></div>}
      <ul className="orders">
        {cursos?.map((c) => (
          <li key={c.id} className="order">
            <div className="order-head">
              <h2>{c.titulo}</h2>
              <span className={`status ${c.estado === 'PUBLICADO' ? 'st-ok' : 'st-off'}`}>{c.estado === 'PUBLICADO' ? 'Publicado' : c.estado === 'BORRADOR' ? 'Borrador' : 'Finalizado'}</span>
            </div>
            <p className="muted small">{c.modalidad === 'VIRTUAL' ? 'Virtual' : 'Presencial'} · {c.horario} · inicia {fmt.fecha(c.fechaInicio)}</p>
            <Seats disponible={c.aforoDisponible} maximo={c.aforoMaximo} />
            <button className="link-btn" aria-expanded={abierto === c.id} onClick={() => setAbierto(abierto === c.id ? null : c.id)}>
              {abierto === c.id ? 'Ocultar detalles' : 'Datos de clase y participantes'}
            </button>
            {abierto === c.id && (
              <div className="panel">
                <EditarClase curso={c} onGuardado={actualizar} />
                <h3>Participantes</h3>
                <Participantes cursoId={c.id} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
