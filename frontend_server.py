import http.server
import socketserver
import os
import sys

PORT = 3000
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

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
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CleanURLHandler) as httpd:
        print(f"Frontend running on http://localhost:{PORT} (Serving {DIRECTORY})", flush=True)
        httpd.serve_forever()
