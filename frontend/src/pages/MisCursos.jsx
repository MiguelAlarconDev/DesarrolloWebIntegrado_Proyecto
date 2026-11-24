import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, fmt, safeUrl } from '../api.js';
import { useAuth } from '../auth.jsx';
import Notice from '../components/Notice.jsx';

const ESTADOS = {
  REGISTRADO: { txt: 'Vacante reservada', cls: 'st-pend' },
  PENDIENTE_PAGO: { txt: 'Pago en revisión', cls: 'st-pend' },
  PAGADO: { txt: 'Matriculado', cls: 'st-ok' },
  CONFIRMADO: { txt: 'Matriculado', cls: 'st-ok' },
  CANCELADO: { txt: 'Cancelado', cls: 'st-off' }
};

function Cuenta({ hasta }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = new Date(hasta) - ahora;
  if (ms <= 0) return <span>La reserva venció; la vacante se liberará en breve.</span>;
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
  return <span>Tu vacante está separada por <strong>{m}:{String(s).padStart(2, '0')}</strong> min.</span>;
}

export default function MisCursos() {
  const { session } = useAuth();
  const location = useLocation();
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState(location.state?.aviso || '');

  const cargar = useCallback(() => {
    api(`/api/pedidos/estudiante/${session.id}`)
      .then((p) => setPedidos(p.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro))))
      .catch((e) => setError(e.message));
  }, [session.id]);
  useEffect(cargar, [cargar]);

  const cancelar = async (p) => {
    if (!window.confirm(`¿Cancelar la reserva de ${p.cursoTitulo}? Tu vacante quedará libre para otra persona.`)) return;
    try { await api(`/api/pedidos/${p.id}/cancelar`, { method: 'PUT' }); setAviso('Reserva cancelada.'); cargar(); }
    catch (e) { setError(e.message); }
  };

  const activos = pedidos?.filter((p) => p.estado !== 'CANCELADO') ?? [];
  const cancelados = pedidos?.filter((p) => p.estado === 'CANCELADO') ?? [];

  return (
    <div className="page">
      <h1>Mis cursos</h1>
      <Notice tipo="ok" onClose={() => setAviso('')}>{aviso}</Notice>
      <Notice tipo="error">{error}</Notice>
      {pedidos && activos.length === 0 && (
        <div className="empty">
          <p>Todavía no te has inscrito en ningún curso.</p>
          <Link className="btn" to="/">Explorar cursos</Link>
        </div>
      )}
      <ul className="orders">
        {activos.map((p) => {
          const st = ESTADOS[p.estado] || { txt: p.estado, cls: '' };
          const pagado = p.estado === 'PAGADO' || p.estado === 'CONFIRMADO';
          const enlace = safeUrl(p.enlaceClase);
          return (
            <li key={p.id} className="order">
              <div className="order-head">
                <h2>{p.cursoTitulo || 'Curso'}</h2>
                <span className={`status ${st.cls}`}>{st.txt}</span>
              </div>
              <p className="muted small">Orden {p.codigoOrden} · {fmt.soles(p.monto)} · {fmt.fechaHora(p.fechaRegistro)}</p>
              {pagado ? (
                <div className="access">
                  <p><strong>Horario:</strong> {p.horario}</p>
                  {p.modalidad === 'PRESENCIAL'
                    ? <p><strong>Lugar:</strong> {p.direccionClase || 'Por confirmar'}{p.aula ? `, aula ${p.aula}` : ''}</p>
                    : enlace ? <a className="btn btn-small" href={enlace} target="_blank" rel="noopener noreferrer">Entrar a la clase</a>
                    : <p className="muted">El docente publicará el enlace de la clase pronto.</p>}
                </div>
              ) : (
                <div className="order-actions">
                  <p className="muted small"><Cuenta hasta={p.reservaExpiraEn} /> Si cerraste la ventana de pago, cancela y vuelve a reservar.</p>
                  <button className="btn btn-ghost btn-small" onClick={() => cancelar(p)}>Cancelar reserva</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {cancelados.length > 0 && (
        <details className="history">
          <summary>Reservas canceladas ({cancelados.length})</summary>
          <ul>{cancelados.map((p) => <li key={p.id}>{p.cursoTitulo} · {p.codigoOrden} · {fmt.fechaHora(p.fechaRegistro)}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
