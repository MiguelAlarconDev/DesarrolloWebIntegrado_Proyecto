import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import { useAuth } from './auth.jsx';
import Catalogo from './pages/Catalogo.jsx';
import CursoDetalle from './pages/CursoDetalle.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import MisCursos from './pages/MisCursos.jsx';
import ResultadoPago from './pages/ResultadoPago.jsx';
import Docente from './pages/Docente.jsx';
import Admin from './pages/Admin.jsx';

function Protegida({ roles, children }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/ingresar" replace state={{ desde: location.pathname }} />;
  if (roles && !roles.includes(session.rol)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <a href="#contenido" className="skip">Saltar al contenido</a>
      <Header />
      <main id="contenido">
        <Routes>
          <Route path="/" element={<Catalogo />} />
          <Route path="/cursos/:id" element={<CursoDetalle />} />
          <Route path="/ingresar" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/mis-cursos" element={<Protegida roles={['ESTUDIANTE', 'ADMIN']}><MisCursos /></Protegida>} />
          <Route path="/pago/:resultado" element={<ResultadoPago />} />
          <Route path="/docente" element={<Protegida roles={['DOCENTE']}><Docente /></Protegida>} />
          <Route path="/admin/*" element={<Protegida roles={['ADMIN']}><Admin /></Protegida>} />
          <Route path="*" element={<div className="page narrow"><h1>Esta página no existe</h1><p><a href="/">Volver al catálogo</a></p></div>} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="page">
          <p>Pagos procesados por Mercado Pago. Precios en soles, IGV incluido.</p>
        </div>
      </footer>
    </>
  );
}
