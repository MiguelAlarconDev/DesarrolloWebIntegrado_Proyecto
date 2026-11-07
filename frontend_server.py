import http.server
import os
import sys

PORT = 3000
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def address_string(self):
        # Desactivar lookup DNS inverso que bloquea 2 segundos en Windows
        return self.client_address[0]

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        # Soporte para URLs limpias sin .html (ej. /cursos, /checkout, /carrito, /mis-cursos)
        url_parts = self.path.split("?", 1)
        clean_path = url_parts[0].rstrip("/")
        query = ("?" + url_parts[1]) if len(url_parts) > 1 else ""

        if clean_path and not os.path.splitext(clean_path)[1]:
            candidate = os.path.join(DIRECTORY, clean_path.lstrip("/\\")) + ".html"
            if os.path.isfile(candidate):
                self.path = clean_path + ".html" + query

        return super().do_GET()

if __name__ == "__main__":
    httpd = http.server.ThreadingHTTPServer(("", PORT), CleanURLHandler)
    httpd.daemon_threads = True
    print(f"Frontend running on http://localhost:{PORT} (Serving {DIRECTORY})", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
