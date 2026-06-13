#!/usr/bin/env python3
"""
Endpoint seguro do formulário de contato — grab.net.br

Modo CGI (produção):  Apache/HostGator executa o script via REQUEST_METHOD
Modo dev  (local):    python cgi-bin/contato.py  →  http://localhost:8002
"""
import sys
import os
import json
import re
import time
import configparser
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

# ── Caminhos ──────────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))   # …/cgi-bin/
PUBLIC_HTML = os.path.dirname(SCRIPT_DIR)                  # …/grab-2026/
DATA_DIR    = os.path.join(PUBLIC_HTML, '_data')
CONFIG_FILE = os.path.join(DATA_DIR, 'config.ini')
RL_FILE     = os.path.join(DATA_DIR, 'rate_limit.json')

# ── Constantes ─────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = {'https://grab.net.br', 'http://localhost:8002'}
RATE_MAX        = 3      # máximo de envios permitidos
RATE_WINDOW     = 600    # janela de tempo em segundos (10 minutos)
MAX_LEN         = {
    'nome':      100,
    'sobrenome': 100,
    'email':     200,
    'assunto':   200,
    'mensagem':  2000,
}
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
DEV_PORT = 8002

# ── Configuração ───────────────────────────────────────────────────────────────
def _load_sheets_url():
    cfg = configparser.ConfigParser()
    cfg.read(CONFIG_FILE)
    return cfg.get('email', 'sheets_url', fallback=None)

# ── Rate limiting por IP (arquivo JSON) ────────────────────────────────────────
def _check_rate_limit(ip):
    os.makedirs(DATA_DIR, exist_ok=True)
    now = time.time()
    try:
        import fcntl
        with open(RL_FILE, 'r+') as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = {}
            recent = [t for t in data.get(ip, []) if now - t < RATE_WINDOW]
            if len(recent) >= RATE_MAX:
                return False
            recent.append(now)
            data[ip] = recent
            f.seek(0)
            json.dump(data, f)
            f.truncate()
    except FileNotFoundError:
        with open(RL_FILE, 'w') as f:
            json.dump({ip: [now]}, f)
    return True

# ── Validação server-side ─────────────────────────────────────────────────────
def _validate(data):
    for field, max_len in MAX_LEN.items():
        val = data.get(field, '').strip()
        if not val:
            return False, f'Campo "{field}" é obrigatório.'
        if len(val) > max_len:
            return False, f'Campo "{field}" excede {max_len} caracteres.'
    if not EMAIL_RE.match(data.get('email', '').strip()):
        return False, 'Formato de e-mail inválido.'
    return True, None

# ── Lógica principal (compartilhada por CGI e dev server) ─────────────────────
def process_contact(raw_body, ip):
    try:
        data = json.loads(raw_body)
    except (json.JSONDecodeError, ValueError):
        return 400, {'ok': False, 'erro': 'Requisição inválida.'}

    # Honeypot: campo oculto "website" deve chegar vazio; bots costumam preenchê-lo
    if data.get('website', ''):
        return 200, {'ok': True}   # responde OK para não alertar o bot, mas descarta

    if not _check_rate_limit(ip):
        return 429, {'ok': False, 'erro': 'Muitas tentativas. Aguarde 10 minutos.'}

    ok, msg = _validate(data)
    if not ok:
        return 400, {'ok': False, 'erro': msg}

    sheets_url = _load_sheets_url()
    if not sheets_url:
        return 500, {'ok': False, 'erro': 'Erro de configuração no servidor.'}

    from datetime import datetime
    payload = {
        'nome':      data['nome'].strip(),
        'sobrenome': data['sobrenome'].strip(),
        'email':     data['email'].strip(),
        'assunto':   data['assunto'].strip(),
        'mensagem':  data['mensagem'].strip(),
        'datahora':  datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
    }

    try:
        req = urllib.request.Request(
            sheets_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        urllib.request.urlopen(req, timeout=10)
        return 200, {'ok': True}
    except Exception:
        return 502, {'ok': False, 'erro': 'Erro ao registrar mensagem. Tente novamente.'}

# ── Modo CGI (HostGator / Apache) ─────────────────────────────────────────────
def _run_as_cgi():
    method = os.environ.get('REQUEST_METHOD', 'GET')
    origin = os.environ.get('HTTP_ORIGIN', '')
    ip     = os.environ.get('REMOTE_ADDR', '0.0.0.0')

    cors_origin = origin if origin in ALLOWED_ORIGINS else 'https://grab.net.br'

    def send_headers(status_code, extra=None):
        print(f'Status: {status_code}')
        print('Content-Type: application/json; charset=utf-8')
        print(f'Access-Control-Allow-Origin: {cors_origin}')
        print('Access-Control-Allow-Methods: POST, OPTIONS')
        print('Access-Control-Allow-Headers: Content-Type')
        if extra:
            for h in extra:
                print(h)
        print()  # linha em branco obrigatória no CGI

    if method == 'OPTIONS':
        send_headers(204)
        return

    if method != 'POST':
        send_headers(405)
        print(json.dumps({'ok': False, 'erro': 'Método não permitido.'}))
        return

    try:
        length = int(os.environ.get('CONTENT_LENGTH', 0) or 0)
        body = sys.stdin.buffer.read(length)
    except Exception:
        body = b'{}'

    status, result = process_contact(body, ip)
    send_headers(status)
    print(json.dumps(result, ensure_ascii=False))

# ── Modo dev server (http://localhost:8002) ────────────────────────────────────
class _DevHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        print(f'[grab-dev] {self.address_string()} — {fmt % args}', flush=True)

    def _send_cors(self):
        self.send_header('Access-Control-Allow-Origin', f'http://localhost:{DEV_PORT}')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def do_POST(self):
        if self.path != '/api/contato':
            self.send_response(404)
            self.end_headers()
            return
        length = int(self.headers.get('Content-Length', 0) or 0)
        body = self.rfile.read(length)
        ip = self.client_address[0]
        status, result = process_contact(body, ip)
        payload = json.dumps(result, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._send_cors()
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/':
            path = '/index.html'
        file_path = os.path.join(PUBLIC_HTML, path.lstrip('/'))
        if not os.path.isfile(file_path):
            self.send_response(404)
            self.end_headers()
            return
        ext = os.path.splitext(file_path)[1].lower()
        mime = {
            '.html': 'text/html; charset=utf-8',
            '.js':   'application/javascript; charset=utf-8',
            '.css':  'text/css; charset=utf-8',
            '.png':  'image/png',
            '.jpg':  'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.svg':  'image/svg+xml',
            '.ico':  'image/x-icon',
            '.webp': 'image/webp',
            '.woff2':'font/woff2',
            '.woff': 'font/woff',
        }.get(ext, 'application/octet-stream')
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.end_headers()
        with open(file_path, 'rb') as f:
            self.wfile.write(f.read())


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    if 'REQUEST_METHOD' in os.environ:
        _run_as_cgi()
    else:
        print(f'Servidor de desenvolvimento em http://localhost:{DEV_PORT}')
        print('Pressione Ctrl+C para encerrar.')
        try:
            HTTPServer(('', DEV_PORT), _DevHandler).serve_forever()
        except KeyboardInterrupt:
            print('\nServidor encerrado.')
