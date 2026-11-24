import { Link } from 'react-router-dom';
import Seats from './Seats.jsx';
import { fmt } from '../api.js';

export default function CourseTicket({ curso }) {
  const virtual = curso.modalidad === 'VIRTUAL';
  return (
    <article className="ticket">
      <div className="ticket-main">
        <p className={`mode ${virtual ? 'mode-virtual' : 'mode-presencial'}`}>
          {virtual ? 'Virtual en vivo' : 'Presencial'}
        </p>
        <h3>
          <Link to={`/cursos/${curso.id}`} className="stretched">{curso.titulo}</Link>
        </h3>
        <p className="ticket-desc">{curso.descripcion}</p>
        <dl className="facts">
          <div><dt>Inicio</dt><dd>{fmt.fecha(curso.fechaInicio)}</dd></div>
          <div><dt>Horario</dt><dd>{curso.horario}</dd></div>
        </dl>
      </div>
      <div className="ticket-stub">
        <p className="price">{fmt.soles(curso.precio)}</p>
        <Seats disponible={curso.aforoDisponible} maximo={curso.aforoMaximo} compact />
      </div>
    </article>
  );
}
