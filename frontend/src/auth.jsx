import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSession, saveSession, clearSession } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSession);
  const [expirada, setExpirada] = useState(false);

  useEffect(() => {
    const onExpire = () => {
      setSession(null);
      setExpirada(true);
    };
    window.addEventListener('aula:sesion-expirada', onExpire);
    // cierre automatico cuando vence el token
    const t = session?.exp ? setTimeout(onExpire, Math.max(0, session.exp * 1000 - Date.now())) : null;
    return () => {
      window.removeEventListener('aula:sesion-expirada', onExpire);
      if (t) clearTimeout(t);
    };
  }, [session]);

  const login = useCallback((authResponse) => {
    setExpirada(false);
    setSession(saveSession(authResponse));
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout, expirada, setExpirada }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const inicioPorRol = (rol) =>
  rol === 'ADMIN' ? '/admin' : rol === 'DOCENTE' ? '/docente' : '/mis-cursos';
