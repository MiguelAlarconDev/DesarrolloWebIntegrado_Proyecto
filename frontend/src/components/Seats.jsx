// Fila de asientos: muestra el aforo real (ocupados vs libres). Con aforos grandes
// agrupa en 20 asientos proporcionales para que la fila siga siendo legible.
export default function Seats({ disponible = 0, maximo = 0, compact = false }) {
  const total = Math.max(0, maximo);
  const libres = Math.max(0, Math.min(disponible, total));
  const slots = Math.min(total, compact ? 12 : 20);
  const libresSlots = total === 0 ? 0 : Math.round((libres / total) * slots);
  const pocos = libres > 0 && libres / Math.max(total, 1) <= 0.2;
  const etiqueta =
    libres === 0 ? 'Sin vacantes' : libres === 1 ? 'Queda 1 vacante' : `Quedan ${libres} de ${total} vacantes`;

  return (
    <div className={`seats ${pocos ? 'seats-low' : ''} ${libres === 0 ? 'seats-out' : ''}`}>
      <div className="seat-row" role="img" aria-label={etiqueta}>
        {Array.from({ length: slots }).map((_, i) => (
          <span key={i} className={i < slots - libresSlots ? 'seat taken' : 'seat free'} />
        ))}
      </div>
      <span className="seat-label">{etiqueta}</span>
    </div>
  );
}
