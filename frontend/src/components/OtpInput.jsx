// Campo unico para el codigo de 6 digitos (accesible, admite pegar y autocompletar por SMS/WhatsApp).
export default function OtpInput({ value, onChange, disabled, id = 'otp' }) {
  return (
    <div className="otp">
      <input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={value}
        disabled={disabled}
        aria-describedby={`${id}-ayuda`}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        autoFocus
      />
      <div className="otp-boxes" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={i === value.length ? 'box active' : 'box'}>{value[i] || ''}</span>
        ))}
      </div>
    </div>
  );
}
