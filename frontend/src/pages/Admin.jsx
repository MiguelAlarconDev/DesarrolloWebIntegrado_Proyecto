import { useEffect, useState, useCallback } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { api, fmt } from '../api.js';
import Notice from '../components/Notice.jsx';
import Seats from '../components/Seats.jsx';
import Registro from './Registro.jsx';

function useCarga(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const recargar = useCallback(() => { setError(''); api(path).then(setData).catch((e) => setError(e.message)); }, [path]);
  useEffect(recargar, [recargar]);
  return { data, error, recargar, setError };
}

function Pedidos() {
  const { data, error, recargar, setError } = useCarga('/api/pedidos');
  const [filtro, setFiltro] = useState('TODOS');
  const lista = (data || []).filter((p) => filtro === 'TODOS' || p.estado === filtro)
    .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));
  const total = (data || []).filter((p) => p.estado === 'PAGADO' || p.estado === 'CONFIRMADO').reduce((s, p) => s + Number(p.monto), 0);

  const pagar = async (p) => {
    if (!window.confirm(`¿Registrar como pagado el pedido ${p.codigoOrden}? Úsalo solo para pagos verificados fuera de Mercado Pago.`)) return;
    try { await api(`/api/pedidos/${p.id}/pagar`, { method: 'PUT', body: { tipoComprobante: 'BOLETA' } }); recargar(); }
    catch (e) { setError(e.message); }
  };

  return (
    <>
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Estado">
          {['TODOS', 'REGISTRADO', 'PAGADO', 'CANCELADO'].map((e) => (
            <button key={e} aria-pressed={filtro === e} onClick={() => setFiltro(e)}>
              {{ TODOS: 'Todos', REGISTRADO: 'Reservados', PAGADO: 'Pagados', CANCELADO: 'Cancelados' }[e]}
            </button>
          ))}
        </div>
        <p className="muted">Ventas confirmadas: <strong>{fmt.soles(total)}</strong></p>
      </div>
      <Notice tipo="error">{error}</Notice>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Orden</th><th>Estudiante</th><th>Curso</th><th>Monto</th><th>Estado</th><th>Fecha</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id}>
                <td>{p.codigoOrden}</td><td>{p.estudianteNombre || '—'}</td><td>{p.cursoTitulo || '—'}</td>
                <td>{fmt.soles(p.monto)}</td><td><span className={`status ${p.estado === 'PAGADO' ? 'st-ok' : p.estado === 'CANCELADO' ? 'st-off' : 'st-pend'}`}>{p.estado.toLowerCase().replace('_', ' ')}</span></td>
                <td>{fmt.fechaHora(p.fechaRegistro)}</td>
                <td>{p.estado === 'REGISTRADO' && <button className="link-btn" onClick={() => pagar(p)}>Marcar pagado</button>}</td>
              </tr>
            ))}
            {data && !lista.length && <tr><td colSpan="7" className="muted">No hay pedidos con este estado.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

const cursoVacio = { titulo: '', descripcion: '', docenteId: '', fechaInicio: '', fechaFin: '', horario: '', modalidad: 'VIRTUAL', aforoMaximo: 20, precio: '', enlaceClase: '', direccionClase: '', aula: '' };

function Cursos() {
  const { data, error, recargar, setError } = useCarga('/api/cursos/todos');
  const [docentes, setDocentes] = useState([]);
  const [nuevo, setNuevo] = useState(false);
  const [f, setF] = useState(cursoVacio);
  const [ok, setOk] = useState('');
  useEffect(() => { api('/api/auth/usuarios').then((u) => setDocentes(u.filter((x) => x.rol === 'DOCENTE'))).catch(() => {}); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const crear = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    try {
      const body = { ...f, aforoMaximo: Number(f.aforoMaximo), precio: Number(f.precio),
        fechaInicio: f.fechaInicio && `${f.fechaInicio}:00`, fechaFin: f.fechaFin && `${f.fechaFin}:00`,
        enlaceClase: f.enlaceClase || null, direccionClase: f.direccionClase || null, aula: f.aula || null };
      await api('/api/cursos', { method: 'POST', body });
      setOk(`Curso "${f.titulo}" creado y publicado.`); setF(cursoVacio); setNuevo(false); recargar();
    } catch (err) { setError(err.message); }
  };

  const cambiarEstado = async (c, estado) => {
    try { await api(`/api/cursos/${c.id}/estado?estado=${estado}`, { method: 'PUT' }); recargar(); }
    catch (e) { setError(e.message); }
  };

  return (
    <>
      <div className="toolbar">
        <p className="muted">{data?.length ?? 0} cursos</p>
        <button className="btn btn-small" onClick={() => setNuevo(!nuevo)} aria-expanded={nuevo}>{nuevo ? 'Cerrar formulario' : 'Crear curso'}</button>
      </div>
      <Notice tipo="ok" onClose={() => setOk('')}>{ok}</Notice>
      <Notice tipo="error">{error}</Notice>
      {nuevo && (
        <form className="panel" onSubmit={crear}>
          <label className="field">Título<input required value={f.titulo} onChange={set('titulo')} /></label>
          <label className="field">Descripción<textarea rows="3" value={f.descripcion} onChange={set('descripcion')} /></label>
          <div className="two">
            <label className="field">Docente
              <select required value={f.docenteId} onChange={set('docenteId')}>
                <option value="">Elige un docente</option>
                {docentes.map((d) => <option key={d.id} value={d.id}>{d.nombres} {d.apellidos}</option>)}
              </select>
            </label>
            <label className="field">Modalidad
              <select value={f.modalidad} onChange={set('modalidad')}><option value="VIRTUAL">Virtual</option><option value="PRESENCIAL">Presencial</option></select>
            </label>
          </div>
          <div className="two">
            <label className="field">Inicio<input type="datetime-local" required value={f.fechaInicio} onChange={set('fechaInicio')} /></label>
            <label className="field">Fin<input type="datetime-local" required value={f.fechaFin} onChange={set('fechaFin')} /></label>
          </div>
          <div className="three">
            <label className="field">Horario<input required placeholder="Lun y Mié 7–9 p. m." value={f.horario} onChange={set('horario')} /></label>
            <label className="field">Vacantes<input type="number" min="1" required value={f.aforoMaximo} onChange={set('aforoMaximo')} /></label>
            <label className="field">Precio (S/, con IGV)<input type="number" min="0" step="0.01" required value={f.precio} onChange={set('precio')} /></label>
          </div>
          {f.modalidad === 'VIRTUAL'
            ? <label className="field">Enlace de clase (opcional)<input type="url" value={f.enlaceClase} onChange={set('enlaceClase')} /></label>
            : <div className="two"><label className="field">Dirección<input required value={f.direccionClase} onChange={set('direccionClase')} /></label><label className="field">Aula<input value={f.aula} onChange={set('aula')} /></label></div>}
          <button className="btn">Crear y publicar curso</button>
        </form>
      )}
      <ul className="orders">
        {data?.map((c) => (
          <li key={c.id} className="order">
            <div className="order-head"><h2>{c.titulo}</h2>
              <label className="sr-only" htmlFor={`st-${c.id}`}>Estado de {c.titulo}</label>
              <select id={`st-${c.id}`} className="status-select" value={c.estado} onChange={(e) => cambiarEstado(c, e.target.value)}>
                <option value="BORRADOR">Borrador</option><option value="PUBLICADO">Publicado</option><option value="FINALIZADO">Finalizado</option>
              </select>
            </div>
            <p className="muted small">{c.modalidad === 'VIRTUAL' ? 'Virtual' : 'Presencial'} · {c.horario} · {fmt.soles(c.precio)} · inicia {fmt.fecha(c.fechaInicio)}</p>
            <Seats disponible={c.aforoDisponible} maximo={c.aforoMaximo} />
          </li>
        ))}
      </ul>
    </>
  );
}

function Usuarios() {
  const { data, error, recargar } = useCarga('/api/auth/usuarios');
  const [nuevo, setNuevo] = useState(false);
  const [ok, setOk] = useState('');
  return (
    <>
      <div className="toolbar">
        <p className="muted">{data?.length ?? 0} usuarios</p>
        <button className="btn btn-small" onClick={() => setNuevo(!nuevo)} aria-expanded={nuevo}>{nuevo ? 'Cerrar formulario' : 'Crear docente o admin'}</button>
      </div>
      <Notice tipo="ok" onClose={() => setOk('')}>{ok}</Notice>
      <Notice tipo="error">{error}</Notice>
      {nuevo && <div className="panel"><Registro adminMode onCreado={(r) => { setOk(`Usuario ${r.correo} creado como ${r.rol.toLowerCase()}.`); setNuevo(false); recargar(); }} /></div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Código por WhatsApp</th><th>Estado</th></tr></thead>
          <tbody>
            {data?.map((u) => (
              <tr key={u.id}>
                <td>{u.nombres} {u.apellidos}</td><td>{u.correo}</td><td>{u.rol.toLowerCase()}</td>
                <td>{u.is2faEnabled ? 'Activado' : 'No'}</td><td>{u.isActive ? 'Activo' : 'Inactivo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Seguridad() {
  const { data, error, recargar, setError } = useCarga('/api/seguridad/bloqueos');
  const [f, setF] = useState({ ip: '', minutos: 60, motivo: '' });
  const [wa, setWa] = useState(null);
  useEffect(() => { api('/api/whatsapp/estado').then(setWa).catch(() => setWa({ error: true })); }, []);

  const bloquear = async (e) => {
    e.preventDefault();
    try { await api('/api/seguridad/bloqueos', { method: 'POST', body: { ...f, minutos: Number(f.minutos) } }); setF({ ip: '', minutos: 60, motivo: '' }); recargar(); }
    catch (err) { setError(err.message); }
  };
  const desbloquear = async (ip) => {
    try { await api(`/api/seguridad/bloqueos/${encodeURIComponent(ip)}`, { method: 'DELETE' }); recargar(); }
    catch (err) { setError(err.message); }
  };

  return (
    <>
      <section className="panel">
        <h2>Protección activa</h2>
        <ul className="layers">
          <li><strong>IP:</strong> límite de solicitudes por minuto y bloqueo automático de 15 min tras 5 intentos fallidos de ingreso.</li>
          <li><strong>Cuentas:</strong> bloqueo de 15 min tras 5 contraseñas incorrectas; el código por WhatsApp se anula tras 5 intentos.</li>
          <li><strong>Acceso por rol:</strong> público, estudiante, docente y administrador; las rutas internas nunca se exponen.</li>
          <li><strong>Servicios:</strong> solo aceptan tráfico del gateway con clave interna.</li>
        </ul>
        <p className="muted small">
          WhatsApp para códigos: {wa == null ? 'consultando…' : wa.error ? 'no disponible' : wa.conectado ? 'conectado' : 'pendiente de vincular (escanee el QR del servicio)'}
        </p>
      </section>
      <h2>IPs bloqueadas</h2>
      <Notice tipo="error">{error}</Notice>
      <form className="inline-form row" onSubmit={bloquear}>
        <label className="field">IP<input required value={f.ip} onChange={(e) => setF({ ...f, ip: e.target.value.trim() })} placeholder="190.12.34.56" /></label>
        <label className="field">Minutos<input type="number" min="1" max="43200" value={f.minutos} onChange={(e) => setF({ ...f, minutos: e.target.value })} /></label>
        <label className="field grow">Motivo<input value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Intentos sospechosos" /></label>
        <button className="btn btn-small">Bloquear IP</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>IP</th><th>Motivo</th><th>Origen</th><th>Hasta</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {data?.map((b) => (
              <tr key={b.ip}><td>{b.ip}</td><td>{b.motivo}</td><td>{b.manual ? 'Manual' : 'Automático'}</td><td>{fmt.fechaHora(b.hasta)}</td>
                <td><button className="link-btn" onClick={() => desbloquear(b.ip)}>Desbloquear</button></td></tr>
            ))}
            {data && !data.length && <tr><td colSpan="5" className="muted">No hay IPs bloqueadas.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Admin() {
  return (
    <div className="page">
      <h1>Administración</h1>
      <nav className="tabs" aria-label="Secciones de administración">
        <NavLink to="/admin" end>Pedidos</NavLink>
        <NavLink to="/admin/cursos">Cursos</NavLink>
        <NavLink to="/admin/usuarios">Usuarios</NavLink>
        <NavLink to="/admin/seguridad">Seguridad</NavLink>
      </nav>
      <Routes>
        <Route index element={<Pedidos />} />
        <Route path="cursos" element={<Cursos />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="seguridad" element={<Seguridad />} />
      </Routes>
    </div>
  );
}
