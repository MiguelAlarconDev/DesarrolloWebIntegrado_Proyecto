import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, inicioPorRol } from '../auth.jsx';
import Notice from '../components/Notice.jsx';
import OtpInput from '../components/OtpInput.jsx';

export default function Login() {
  const { login, expirada, setExpirada } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [paso, setPaso] = useState('clave');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const entrar = (resp) => {
    login(resp);
    const desde = location.state?.desde;
    navigate(desde && resp.rol === 'ESTUDIANTE' ? desde : inicioPorRol(resp.rol), { replace: true });
  };

  const enviarClave = async (e) => {
    e.preventDefault();
    setError(''); setExpirada(false); setEnviando(true);
    try {
      const resp = await api('/api/auth/login', { method: 'POST', auth: false, body: { correo: correo.trim(), password } });
      if (resp.status === 'REQUIRES_2FA') { setPaso('codigo'); setPassword(''); }
      else entrar(resp);
    } catch (err) {
      setError(err.status === 401 ? 'Correo o contraseña incorrectos.' : err.message);
    } finally { setEnviando(false); }
  };

  const enviarCodigo = async (e) => {
    e.preventDefault();
    if (codigo.length !== 6) return setError('Escribe los 6 dígitos que te enviamos.');
    setError(''); setEnviando(true);
    try {
      entrar(await api('/api/auth/verificar-2fa', { method: 'POST', auth: false, body: { correo: correo.trim(), codigo2fa: codigo } }));
    } catch (err) {
      setCodigo('');
      setError(err.message);
      if (/inicie sesion nuevamente/i.test(err.message)) setPaso('clave');
    } finally { setEnviando(false); }
  };

  return (
    <div className="page auth">
      <div className="auth-card">
        {paso === 'clave' ? (
          <form onSubmit={enviarClave} noValidate>
            <h1>Ingresar</h1>
            {expirada && <Notice>Tu sesión terminó. Ingresa de nuevo para continuar.</Notice>}
            <Notice tipo="error">{error}</Notice>
            <label className="field">Correo
              <input type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </label>
            <label className="field">Contraseña
              <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button className="btn btn-block" disabled={enviando || !correo || !password}>{enviando ? 'Verificando…' : 'Ingresar'}</button>
            <p className="muted small center">¿No tienes cuenta? <Link to="/registro">Crea una gratis</Link></p>
          </form>
        ) : (
          <form onSubmit={enviarCodigo} noValidate>
            <h1>Confirma que eres tú</h1>
            <p id="otp-ayuda" className="muted">Te enviamos un código de 6 dígitos por WhatsApp. Vence en 5 minutos.</p>
            <Notice tipo="error">{error}</Notice>
            <OtpInput value={codigo} onChange={setCodigo} disabled={enviando} />
            <button className="btn btn-block" disabled={enviando || codigo.length !== 6}>{enviando ? 'Verificando…' : 'Verificar código'}</button>
            <button type="button" className="link-btn center-block" onClick={() => { setPaso('clave'); setCodigo(''); setError(''); }}>Usar otra cuenta o pedir un código nuevo</button>
          </form>
        )}
      </div>
    </div>
  );
}
