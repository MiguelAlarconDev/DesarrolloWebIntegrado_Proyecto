import { Link, useParams, useSearchParams } from 'react-router-dom';

const TEXTOS = {
  exito: { h: 'Pago recibido', p: 'Estamos confirmando tu matrícula. En unos segundos recibirás por WhatsApp y correo tu acceso y tu comprobante.', cls: 'notice-ok' },
  pendiente: { h: 'Pago en proceso', p: 'Mercado Pago está validando tu pago. Te avisaremos por WhatsApp cuando se confirme; tu vacante sigue separada.', cls: 'notice-info' },
  fallo: { h: 'El pago no se completó', p: 'No se realizó ningún cobro. Puedes intentarlo de nuevo desde Mis cursos mientras tu reserva siga vigente.', cls: 'notice-error' }
};

export default function ResultadoPago() {
  const { resultado } = useParams();
  const [params] = useSearchParams();
  const t = TEXTOS[resultado] || TEXTOS.pendiente;
  const op = params.get('payment_id');
  return (
    <div className="page narrow">
      <div className={`notice ${t.cls} big`} role="status">
        <div>
          <h1>{t.h}</h1>
          <p>{t.p}</p>
          {op && /^[0-9]{1,20}$/.test(op) && <p className="muted small">Operación Mercado Pago n.º {op}</p>}
        </div>
      </div>
      <Link className="btn" to="/mis-cursos">Ir a Mis cursos</Link>
    </div>
  );
}
