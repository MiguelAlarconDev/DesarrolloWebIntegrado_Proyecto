# comprobantes-service

Microservicio Python/FastAPI que genera una constancia PDF academica y la envia por correo.

## Ejecucion local

```powershell
cd comprobantes-service
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:SMTP_HOST="smtp.gmail.com"
$env:SMTP_PORT="587"
$env:SMTP_USERNAME="correo@gmail.com"
$env:SMTP_PASSWORD="contrasena-de-aplicacion"
$env:SMTP_FROM="correo@gmail.com"
uvicorn app.main:app --host 0.0.0.0 --port 8084 --reload
```

Documentacion interactiva: `http://localhost:8084/docs`.

> El PDF generado es una constancia demostrativa para la POC y no un comprobante fiscal validado por SUNAT.
