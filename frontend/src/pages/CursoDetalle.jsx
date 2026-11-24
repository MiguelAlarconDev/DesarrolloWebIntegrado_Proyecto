import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fmt, safeUrl } from '../api.js';
import { useAuth } from '../auth.jsx';
import Seats from '../components/Seats.jsx';
import Notice from '../components/Notice.jsx';

export default function CursoDetalle() {
  const { id } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [curso, setCurso] = useState(null);
  const [error, setError] = useState('');
  const [reservando, setReservando] = useState(false);

  useEffect(() => {
    api(`/api/cursos/${id}`, { auth: false }).then(setCurso).catch((e) => setError(e.message));
  }, [id]);

  const reservar = async () => {
    if (!session) return navigate('/ingresar', { state: { desde: `/cursos/${id}` } });
    setReservando(true);
    setError('');
    try {
      const pedido = await api('/api/pedidos/checkout', { method: 'POST', body: { cursoId: id, estudianteId: session.id } });
      const destino = safeUrl(pedido.initPoint);
      if (destino) {
        window.location.assign(destino);
      } else {
        navigate('/mis-cursos', { state: { aviso: `Reservaste tu vacante en ${curso.titulo}. Completa el pago antes de: ${fmt.fechaHora(pedido.reservaExpiraEn)}` } });
      }
    } catch (e) {
      if (e.status === 409 && /Mis cursos/.test(e.message)) {
        navigate('/mis-cursos', { state: { aviso: e.message } });
        return;
      }
      setError(e.message);
      api(`/api/cursos/${id}`, { auth: false }).then(setCurso).catch(() => {});
    } finally {
      setReservando(false);
    }
  };

  if (error && !curso) return <div className="page narrow"><Notice tipo="error">{error}</Notice><Link to="/">Volver al catálogo</Link></div>;
  if (!curso) return <div className="page narrow"><div className="ticket skeleton tall" /></div>;

  const igv = Number(curso.precio) - Number(curso.precio) / 1.18;
  const sinCupo = curso.aforoDisponible <= 0;
  const puedeComprar = !session || session.rol === 'ESTUDIANTE';

  return (
    <div className="page detail">
      <Link to="/" className="back">Volver al catálogo</Link>
      <div className="detail-grid">
        <section>
          <p className={`mode ${curso.modalidad === 'VIRTUAL' ? 'mode-virtual' : 'mode-presencial'}`}>
            {curso.modalidad === 'VIRTUAL' ? 'Virtual en vivo' : 'Presencial'}
          </p>
          <h1>{curso.titulo}</h1>
          <p className="lead">{curso.descripcion}</p>
          <dl className="facts facts-lg">
            <div><dt>Empieza</dt><dd>{fmt.fecha(curso.fechaInicio)}</dd></div>
            <div><dt>Termina</dt><dd>{fmt.fecha(curso.fechaFin)}</dd></div>
            <div><dt>Horario</dt><dd>{curso.horario}</dd></div>
            <div><dt>{curso.modalidad === 'VIRTUAL' ? 'Dónde' : 'Sede'}</dt>
              <dd>{curso.modalidad === 'VIRTUAL' ? 'Recibirás el enlace por WhatsApp y correo al pagar' : (curso.direccionClase || 'Se confirma al matricularte')}</dd></div>
          </dl>
          <h2>Cómo funciona</h2>
          <ol className="steps">
            <li>Reservas tu vacante: queda separada a tu nombre por 15 minutos.</li>
            <li>Pagas con tarjeta, Yape u otros medios en Mercado Pago.</li>
            <li>Recibes por WhatsApp y correo tu acceso y tu comprobante con IGV.</li>
          </ol>
        </section>

        <aside className="buy" aria-label="Reserva">
          <div className="buy-card">
            <p className="price price-lg">{fmt.soles(curso.precio)}</p>
            <p className="muted small">Incluye IGV de {fmt.soles(igv)}</p>
            <Seats disponible={curso.aforoDisponible} maximo={curso.aforoMaximo} />
            <Notice tipo="error">{error}</Notice>
            {puedeComprar ? (
              <button className="btn btn-block" onClick={reservar} disabled={sinCupo || reservando}>
                {sinCupo ? 'Sin vacantes' : reservando ? 'Reservando…' : session ? 'Reservar y pagar' : 'Ingresa para reservar'}
              </button>
            ) : (
              <p className="muted small">Las inscripciones se hacen con una cuenta de estudiante.</p>
            )}
            {curso.modalidad === 'VIRTUAL' && safeUrl(curso.enlaceClase) && session?.rol === 'DOCENTE' && (
              <a className="btn btn-ghost btn-block" href={safeUrl(curso.enlaceClase)} target="_blank" rel="noopener noreferrer">Abrir aula virtual</a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
