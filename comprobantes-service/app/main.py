import io
import os
import smtplib
from datetime import datetime
from decimal import Decimal
from email.message import EmailMessage
from pathlib import Path
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, Field, model_validator
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


class ComprobanteRequest(BaseModel):
    pedidoId: UUID
    codigoOrden: str = Field(min_length=3, max_length=30)
    estudiante: str = Field(min_length=2, max_length=200)
    correo: EmailStr
    curso: str = Field(min_length=2, max_length=250)
    monto: Decimal = Field(gt=0, decimal_places=2)
    tipoComprobante: str = "BOLETA"
    rucCliente: str | None = None
    razonSocial: str | None = None

    @model_validator(mode="after")
    def validar_factura(self):
        self.tipoComprobante = self.tipoComprobante.upper()
        if self.tipoComprobante not in {"BOLETA", "FACTURA"}:
            raise ValueError("tipoComprobante debe ser BOLETA o FACTURA")
        if self.tipoComprobante == "FACTURA":
            if not self.rucCliente or len(self.rucCliente) != 11 or not self.rucCliente.isdigit():
                raise ValueError("Para FACTURA se requiere un RUC de 11 digitos")
            if not self.razonSocial:
                raise ValueError("Para FACTURA se requiere la razon social")
        return self


class ComprobanteResponse(BaseModel):
    success: bool
    pedidoId: UUID
    estado: str
    archivo: str
    destinatario: EmailStr
    mensaje: str


app = FastAPI(
    title="Comprobantes Service",
    version="1.0.0",
    description="Generacion y envio de constancias de pago para la POC de cursos.",
)

OUTPUT_DIR = Path(os.getenv("PDF_OUTPUT_DIR", "generated"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def generar_pdf(datos: ComprobanteRequest, destino: Path) -> None:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    subtotal = (datos.monto / Decimal("1.18")).quantize(Decimal("0.01"))
    igv = (datos.monto - subtotal).quantize(Decimal("0.01"))

    contenido = [
        Paragraph("PLATAFORMA DE CURSOS", styles["Title"]),
        Paragraph("Constancia demostrativa de pago - POC", styles["Heading2"]),
        Spacer(1, 8 * mm),
    ]

    filas = [
        ["Tipo", datos.tipoComprobante],
        ["Orden", datos.codigoOrden],
        ["Pedido", str(datos.pedidoId)],
        ["Fecha de emision", datetime.now().strftime("%d/%m/%Y %H:%M:%S")],
        ["Estudiante", datos.estudiante],
        ["Correo", str(datos.correo)],
        ["Curso", datos.curso],
    ]
    if datos.tipoComprobante == "FACTURA":
        filas.extend([
            ["RUC", datos.rucCliente or ""],
            ["Razon social", datos.razonSocial or ""],
        ])
    filas.extend([
        ["Subtotal", f"S/ {subtotal:.2f}"],
        ["IGV (18%)", f"S/ {igv:.2f}"],
        ["Total", f"S/ {datos.monto:.2f}"],
    ])

    tabla = Table(filas, colWidths=[45 * mm, 115 * mm])
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEEEEE")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#222222")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#BBBBBB")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 7),
    ]))
    contenido.extend([
        tabla,
        Spacer(1, 10 * mm),
        Paragraph(
            "Documento generado con fines academicos. No es un comprobante electronico validado por SUNAT.",
            styles["Italic"],
        ),
    ])
    doc.build(contenido)
    destino.write_bytes(buffer.getvalue())


def enviar_correo(datos: ComprobanteRequest, pdf_path: Path) -> None:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    remitente = os.getenv("SMTP_FROM", username or "")

    if not host or not username or not password or not remitente:
        raise RuntimeError("Configuracion SMTP incompleta")

    mensaje = EmailMessage()
    mensaje["Subject"] = f"Constancia de pago {datos.codigoOrden}"
    mensaje["From"] = remitente
    mensaje["To"] = str(datos.correo)
    mensaje.set_content(
        f"Hola {datos.estudiante},\n\n"
        f"Adjuntamos la constancia demostrativa de tu matricula en {datos.curso}.\n"
        f"Orden: {datos.codigoOrden}\nTotal: S/ {datos.monto:.2f}\n\n"
        "Este documento se genero como parte de una POC academica."
    )
    mensaje.add_attachment(
        pdf_path.read_bytes(),
        maintype="application",
        subtype="pdf",
        filename=pdf_path.name,
    )

    with smtplib.SMTP(host, port, timeout=20) as servidor:
        servidor.ehlo()
        servidor.starttls()
        servidor.ehlo()
        servidor.login(username, password)
        servidor.send_message(mensaje)


@app.get("/health")
def health():
    return {"status": "UP", "service": "comprobantes-service"}


@app.post("/api/comprobantes/enviar", response_model=ComprobanteResponse)
def crear_y_enviar_comprobante(datos: ComprobanteRequest):
    nombre_archivo = f"comprobante-{datos.pedidoId}.pdf"
    pdf_path = OUTPUT_DIR / nombre_archivo
    try:
        generar_pdf(datos, pdf_path)
        enviar_correo(datos, pdf_path)
    except (OSError, RuntimeError, smtplib.SMTPException) as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo enviar el comprobante: {exc}") from exc

    return ComprobanteResponse(
        success=True,
        pedidoId=datos.pedidoId,
        estado="ENVIADO",
        archivo=nombre_archivo,
        destinatario=datos.correo,
        mensaje="PDF generado y correo enviado correctamente",
    )


@app.get("/api/comprobantes/{pedido_id}/descargar")
def descargar_comprobante(pedido_id: UUID):
    pdf_path = OUTPUT_DIR / f"comprobante-{pedido_id}.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    return FileResponse(pdf_path, media_type="application/pdf", filename=pdf_path.name)
