export default function Notice({ tipo = 'info', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`notice notice-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <div>{children}</div>
      {onClose && <button className="link-btn" onClick={onClose} aria-label="Cerrar aviso">Cerrar</button>}
    </div>
  );
}
