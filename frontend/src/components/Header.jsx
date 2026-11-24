import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth, inicioPorRol } from '../auth.jsx';

export default function Header() {
  const { session, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();
  const cerrar = () => setAbierto(false);

  return (
    <header className="topbar">
      <div className="page topbar-inner">
        <Link to="/" className="brand" onClick={cerrar}>
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#2541B2" />
            <path d="M8 22V12l8-4 8 4v10" fill="none" stroke="#FFD43B" strokeWidth="2.6" strokeLinejoin="round" />
            <circle cx="16" cy="17" r="2.6" fill="#fff" />
          </svg>
          <span>Aula Viva</span>
        </Link>
        <button className="menu-btn" aria-expanded={abierto} aria-controls="nav" onClick={() => setAbierto(!abierto)}>
          {abierto ? 'Cerrar' : 'Menú'}
        </button>
        <nav id="nav" className={abierto ? 'nav open' : 'nav'} aria-label="Principal">
          <NavLink to="/" end onClick={cerrar}>Cursos</NavLink>
          {session && (
            <NavLink to={inicioPorRol(session.rol)} onClick={cerrar}>
              {session.rol === 'ADMIN' ? 'Administración' : session.rol === 'DOCENTE' ? 'Mis clases' : 'Mis cursos'}
            </NavLink>
          )}
          {session ? (
            <span className="who">
              <span className="who-name">{session.nombre?.split(' ')[0]}</span>
              <button className="link-btn" onClick={() => { logout(); cerrar(); navigate('/'); }}>Salir</button>
            </span>
          ) : (
            <>
              <NavLink to="/ingresar" onClick={cerrar}>Ingresar</NavLink>
              <Link to="/registro" className="btn btn-small" onClick={cerrar}>Crear cuenta</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
