import concurrent.futures
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from pydantic import ValidationError
from app import main


class ComprobanteContractTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.output = patch.object(main, "OUTPUT_DIR", Path(self.directory.name))
        self.output.start()
        self.addCleanup(self.output.stop)
        self.request = main.ComprobanteRequest(
            pedidoId=uuid4(), codigoOrden="ORD-TEST", estudiante="Alumno Prueba",
            correo="alumno@example.com", curso="Curso de prueba", monto="118.00")

    def test_real_pdf_and_single_mocked_email_on_retry(self):
        with patch.object(main, "enviar_correo") as email:
            first = main.crear_y_enviar_comprobante(self.request)
            second = main.crear_y_enviar_comprobante(self.request)
        self.assertEqual(first, second)
        email.assert_called_once()
        self.assertEqual(first.estado, "ENVIADO")
        self.assertTrue((main.OUTPUT_DIR / first.archivo).read_bytes().startswith(b"%PDF"))
        self.assertEqual(main.descargar_comprobante(self.request.pedidoId).media_type, "application/pdf")

    def test_concurrent_retries_never_duplicate_dispatch(self):
        def invoke():
            try:
                return main.crear_y_enviar_comprobante(self.request).estado
            except HTTPException as error:
                return error.status_code
        with patch.object(main, "enviar_correo") as email:
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                results = list(pool.map(lambda _: invoke(), range(8)))
        email.assert_called_once()
        self.assertTrue(all(result in ("ENVIADO", 409) for result in results))

    def test_uncertain_email_is_error_and_never_automatically_retried(self):
        with patch.object(main, "enviar_correo", side_effect=TimeoutError("sensitive provider detail")) as email:
            with self.assertRaises(HTTPException) as failure:
                main.crear_y_enviar_comprobante(self.request)
            self.assertEqual(failure.exception.status_code, 502)
            self.assertNotIn("sensitive", failure.exception.detail)
            with self.assertRaises(HTTPException) as retry:
                main.crear_y_enviar_comprobante(self.request)
            self.assertEqual(retry.exception.status_code, 409)
            email.assert_called_once()

    def test_changed_payload_rejected_for_same_order(self):
        with patch.object(main, "enviar_correo"):
            main.crear_y_enviar_comprobante(self.request)
            changed = self.request.model_copy(update={"curso": "Otro curso"})
            with self.assertRaises(HTTPException) as failure:
                main.crear_y_enviar_comprobante(changed)
        self.assertEqual(failure.exception.status_code, 409)

    def test_factura_requires_actual_tax_details(self):
        with self.assertRaises(ValidationError):
            main.ComprobanteRequest(**{**self.request.model_dump(), "tipoComprobante": "FACTURA"})

    def test_missing_pdf_is_404(self):
        with self.assertRaises(HTTPException) as failure:
            main.descargar_comprobante(uuid4())
        self.assertEqual(failure.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
