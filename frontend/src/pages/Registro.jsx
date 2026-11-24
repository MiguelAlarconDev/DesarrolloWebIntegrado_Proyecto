import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Notice from '../components/Notice.jsx';

const vacio = { nombres: '', apellidos: '', dni: '', correo: '', whatsapp: '', password: '', is2faEnabled: false };

export function validarRegistro(f) {
  const e = {};
  if (!f.nombres.trim()) e.nombres = 'Escribe tus nombres.';
  if (!f.apellidos.trim()) e.apellidos = 'Escribe tus apellidos.';
  if (!/^[0-9A-Za-z]{8,15}$/.test(f.dni)) e.dni = 'El DNI debe tener 8 dígitos (o hasta 15 para carné de extranjería).';
  if (!/^\S+@\S+\.\S+$/.test(f.correo)) e.correo = 'Escribe un correo válido.';
  if (!/^\+?[0-9]{9,15}$/.test(f.whatsapp.replace(/\s/g, ''))) e.whatsapp = 'Incluye el código de país, p. ej. 51987654321.';
  if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/[0-9]/.test(f.password)) e.password = 'Usa 8 caracteres o más, con letras y números.';
  return e;
}

export default function Registro({ adminMode = false, onCreado }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ ...vacio, rol: adminMode ? 'DOCENTE' : 'ESTUDIANTE' });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    const v = validarRegistro(f);
    setErrores(v);
    if (Object.keys(v).length) return;
    setError(''); setEnviando(true);
    try {
      const body = { ...f, correo: f.correo.trim().toLowerCase(), whatsapp: f.whatsapp.replace(/\s/g, '') };
      if (!adminMode) delete body.rol;
      const resp = await api('/api/auth/registro', { method: 'POST', auth: adminMode, body });
      if (adminMode) { onCreado?.(resp); setF({ ...vacio, rol: 'DOCENTE' }); }
      else { login(resp); navigate('/', { replace: true }); }
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  };

  const campo = (k, label, props = {}) => (
    <label className={`field ${errores[k] ? 'has-error' : ''}`}>{label}
      <input value={f[k]} onChange={set(k)} aria-invalid={!!errores[k]} aria-describedby={errores[k] ? `${k}-err` : undefined} {...props} />
      {errores[k] && <span id={`${k}-err`} className="field-error">{errores[k]}</span>}
    </label>
  );

  const form = (
    <form onSubmit={enviar} noValidate>
      {!adminMode && <h1>Crea tu cuenta</h1>}
      <Notice tipo="error">{error}</Notice>
      <div className="two">
        {campo('nombres', 'Nombres', { autoComplete: 'given-name' })}
        {campo('apellidos', 'Apellidos', { autoComplete: 'family-name' })}
      </div>
      <div className="two">
        {campo('dni', 'DNI', { inputMode: 'numeric', maxLength: 15 })}
        {campo('whatsapp', 'WhatsApp', { inputMode: 'tel', placeholder: '51987654321', autoComplete: 'tel' })}
      </div>
      {campo('correo', 'Correo', { type: 'email', autoComplete: 'email' })}
      {campo('password', 'Contraseña', { type: 'password', autoComplete: 'new-password' })}
      {adminMode ? (
        <label className="field">Rol
          <select value={f.rol} onChange={set('rol')}>
            <option value="DOCENTE">Docente</option>
            <option value="ADMIN">Administrador</option>
            <option value="ESTUDIANTE">Estudiante</option>
          </select>
          <span className="muted small">Docentes y administradores ingresan siempre con código por WhatsApp.</span>
        </label>
      ) : (
        <label className="check">
          <input type="checkbox" checked={f.is2faEnabled} onChange={set('is2faEnabled')} />
          <span>Pedir también un código por WhatsApp al ingresar (recomendado)</span>
        </label>
      )}
      <button className="btn btn-block" disabled={enviando}>{enviando ? 'Creando…' : adminMode ? 'Crear usuario' : 'Crear cuenta'}</button>
      {!adminMode && <p className="muted small center">¿Ya tienes cuenta? <Link to="/ingresar">Ingresa</Link></p>}
    </form>
  );

  return adminMode ? form : <div className="page auth"><div className="auth-card wide">{form}</div></div>;
}
