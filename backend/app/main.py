import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
import sqlite3
import sys
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from typing import Dict, List

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

APP_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("DATABASE_PATH", APP_DIR / "ruwajay.db"))
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-key-in-production")
ALGORITHM = "HS256"
TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

app = FastAPI(title="RuwaJay API", description="API para búsqueda de viviendas en Guatemala", version="2.0.0")

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=(), payment=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with db() as connection:
        connection.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'seeker',
                phone TEXT,
                account_status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS password_reset_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL COLLATE NOCASE,
                code_hash TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                verified_at TEXT,
                reset_token TEXT,
                used_at TEXT
            );
            CREATE TABLE IF NOT EXISTS favorites (
                user_id INTEGER NOT NULL,
                property_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (user_id, property_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                property_id TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
                comment TEXT NOT NULL,
                tags_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)
        columns = {column["name"] for column in connection.execute("PRAGMA table_info(users)")}
        if "phone" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN phone TEXT")
        if "account_status" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'")


init_db()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str
    role: str = "seeker"
    phone: str | None = Field(default=None, max_length=24)


class EmailRequest(BaseModel):
    email: EmailStr


class VerifyCodeRequest(EmailRequest):
    code: str = Field(min_length=6, max_length=6)


class ResetPasswordRequest(BaseModel):
    reset_token: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ReviewRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=3, max_length=2000)
    tags: list[str] = Field(default_factory=list, max_length=8)


# Anti-Brute-Force In-Memory Sliding Window Rate Limiter
class SimpleRateLimiter:
    def __init__(self):
        self.records: Dict[str, List[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        timestamps = self.records[key]
        valid = [t for t in timestamps if now - t < window_seconds]
        if len(valid) >= max_requests:
            self.records[key] = valid
            return False
        valid.append(now)
        self.records[key] = valid
        return True


rate_limiter = SimpleRateLimiter()


def sanitize_str(val: str | None) -> str | None:
    if not val:
        return val
    # Strip HTML tags and normalize whitespace
    return re.sub(r"<[^>]*>", "", val).strip()


def validate_password(password: str):
    checks = [len(password) >= 8, any(c.isupper() for c in password), any(c.islower() for c in password), any(c.isdigit() for c in password), any(not c.isalnum() for c in password)]
    if not all(checks):
        raise HTTPException(422, "La contraseña debe tener 8 caracteres e incluir mayúscula, minúscula, número y símbolo.")


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, expected = stored.split(":", 1)
        actual = hash_password(password, bytes.fromhex(salt_hex)).split(":", 1)[1]
        return hmac.compare_digest(actual, expected)
    except ValueError:
        return False


def public_user(row):
    return {"id": str(row["id"]), "name": row["name"], "email": row["email"], "role": row["role"], "phone": row["phone"], "accountStatus": row["account_status"], "avatar": None, "createdAt": row["created_at"]}


def session_for(row):
    expires = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_MINUTES)
    token = jwt.encode({"sub": str(row["id"]), "email": row["email"], "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "user": public_user(row)}


bearer = HTTPBearer(auto_error=False)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not credentials:
        raise HTTPException(401, "Debes iniciar sesión.")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(401, "Tu sesión no es válida o ya caducó.")
    with db() as connection:
        row = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if not row or row["account_status"] != "active":
        raise HTTPException(403, "Esta cuenta no está activa.")
    return row


def generate_reset_email_html(recipient: str, code: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Seguridad RuwaJay</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF5EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2D1810;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF5EE;padding:36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#FFFFFF;border-radius:24px;border:1px solid #E8D9C8;overflow:hidden;box-shadow:0 12px 36px rgba(45,24,16,0.08);">
          <tr>
            <td height="6" style="background:linear-gradient(90deg,#1B4D3E 0%,#D97706 50%,#D84420 100%);line-height:6px;font-size:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 32px 16px;text-align:center;">
              <img src="cid:ruwajay_logo" alt="RuwaJay" width="68" height="68" style="display:inline-block;width:68px;height:68px;object-fit:contain;margin-bottom:12px;border:0;border-radius:14px;" />
              <div style="font-size:26px;font-weight:900;color:#2D1810;letter-spacing:-0.5px;">
                Ruwa<span style="color:#D84420;">Jay</span>
              </div>
              <div style="font-size:10px;font-weight:800;color:#D97706;text-transform:uppercase;letter-spacing:2.5px;margin-top:4px;">
                Tu Hogar, Tu Camino · Guatemala
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;"><div style="height:1px;background-color:#F0E6DA;"></div></td>
          </tr>
          <tr>
            <td style="padding:28px 32px 20px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#2D1810;text-align:center;">
                Recuperación de Contraseña
              </h1>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#665248;text-align:center;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>RuwaJay</strong>. Utiliza el siguiente código de 6 dígitos para continuar:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="background-color:#FAF5EE;border:2px dashed #1B4D3E;border-radius:16px;padding:16px 24px;margin:8px 0 20px;display:inline-block;">
                      <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:900;letter-spacing:10px;color:#1B4D3E;display:block;text-align:center;">
                        {code}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="background-color:#FDF9F3;border-radius:12px;border:1px solid #EEDBCE;padding:12px 16px;margin-bottom:20px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#8A4B38;font-weight:600;text-align:center;">
                  ⏱️ <strong>Válido durante 10 minutos.</strong> Úsalo en la pantalla de recuperación.
                </p>
              </div>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9E8E84;text-align:center;">
                Si tú no realizaste esta solicitud, puedes ignorar este mensaje; tu cuenta permanecerá protegida.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FAF5EE;padding:18px 32px;text-align:center;border-top:1px solid #E8D9C8;">
              <p style="margin:0;font-size:11px;color:#9E8E84;line-height:1.4;">
                © 2026 RuwaJay Guatemala · Plataforma Inmobiliaria Segura
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_reset_email(recipient: str, code: str) -> dict:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=True)
    host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    username = (os.getenv("SMTP_USERNAME") or "").strip()
    password = (os.getenv("SMTP_PASSWORD") or "").replace(" ", "").strip()
    sender_name = (os.getenv("SMTP_FROM_NAME") or "RuwaJay Guatemala").strip()
    sender_email = (os.getenv("SMTP_FROM") or username).strip()

    plain_text = f"""RuwaJay Guatemala - Recuperación de Contraseña

Tu código de verificación de 6 dígitos es: {code}

Este código es válido por 10 minutos. Si no solicitaste este cambio, puedes ignorar este correo.

RuwaJay Guatemala - Tu Hogar, Tu Camino.
"""
    html_content = generate_reset_email_html(recipient, code)

    message = EmailMessage()
    message["Subject"] = f"🔐 Código de verificación RuwaJay: {code}"
    message["From"] = formataddr((sender_name, sender_email))
    message["To"] = recipient
    message.set_content(plain_text)
    message.add_alternative(html_content, subtype="html")

    logo_path = Path(__file__).resolve().parents[2] / "public" / "logo" / "logo.png"
    if logo_path.exists():
        try:
            with open(logo_path, "rb") as img_file:
                message.get_payload()[1].add_related(
                    img_file.read(),
                    maintype="image",
                    subtype="png",
                    cid="<ruwajay_logo>",
                    filename="logo.png"
                )
        except Exception as e:
            print(f"⚠️ [SMTP] No se pudo adjuntar el logo embebido: {e}")

    print(f"\n{'='*70}")
    print(f"📧 [RUWAJAY NOTIFICADOR] Procesando código de verificación...")
    print(f"   Destinatario: {recipient}")
    print(f"🔑 CÓDIGO GENERADO: >>> [ {code} ] <<< (Válido 10 min)")

    if not username or not password:
        print("⚠️ [SMTP] Variables SMTP_USERNAME o SMTP_PASSWORD no configuradas en .env.")
        print("   Utilizando código en consola de desarrollo para completar la prueba.")
        print(f"{'='*70}\n")
        return {"sent": False, "mode": "simulated", "code": code}

    try:
        print(f"📡 [SMTP] Conectando a {host}:{port} con usuario {username}...")
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=12) as smtp:
                smtp.login(username, password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=12) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.ehlo()
                smtp.login(username, password)
                smtp.send_message(message)

        print(f"✅ [RUWAJAY SMTP] ¡Correo enviado exitosamente a {recipient}!")
        print(f"{'='*70}\n")
        return {"sent": True, "mode": "smtp", "recipient": recipient}
    except smtplib.SMTPAuthenticationError as auth_err:
        print(f"⚠️ [RUWAJAY SMTP AUTH ERROR] Credenciales rechazadas por Google:")
        print(f"   {auth_err}")
        print(f"   Asegúrate de colocar tu contraseña de aplicación de 16 caracteres activa en .env")
        print(f"🔑 CÓDIGO DISPONIBLE PARA PRUEBAS: >>> [ {code} ] <<<")
        print(f"{'='*70}\n")
        # In local dev environment: allow continuing with the generated code so user is not blocked
        return {"sent": False, "mode": "auth_failed", "detail": str(auth_err), "code": code}
    except (OSError, smtplib.SMTPException) as exc:
        print(f"❌ [RUWAJAY SMTP ERROR] Fallo de conexión SMTP: {exc}")
        print(f"🔑 CÓDIGO DISPONIBLE PARA PRUEBAS: >>> [ {code} ] <<<")
        print(f"{'='*70}\n")
        return {"sent": False, "mode": "network_error", "detail": str(exc), "code": code}


@app.post("/api/auth/register", status_code=201)
def register(payload: RegisterRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.check(f"register:{client_ip}", max_requests=5, window_seconds=600):
        raise HTTPException(429, "Has alcanzado el límite de intentos de registro temporalmente. Por seguridad, espera 10 minutos.")
    validate_password(payload.password)
    clean_name = sanitize_str(payload.name)
    if not clean_name or len(clean_name) < 2:
        raise HTTPException(422, "El nombre proporcionado no es válido.")
    if payload.role not in {"seeker", "owner"}:
        raise HTTPException(422, "Tipo de cuenta inválido.")
    phone = sanitize_str((payload.phone or "").strip())
    if payload.role == "owner" and (not phone or len(phone) < 8 or not any(character.isdigit() for character in phone)):
        raise HTTPException(422, "Agrega un teléfono válido para que los interesados puedan contactarte.")
    email = str(payload.email).lower()
    try:
        with db() as connection:
            cursor = connection.execute(
                "INSERT INTO users(name,email,password_hash,role,phone,created_at) VALUES(?,?,?,?,?,?)",
                (clean_name, email, hash_password(payload.password), payload.role, phone or None, datetime.now(timezone.utc).isoformat()),
            )
            row = connection.execute("SELECT * FROM users WHERE id=?", (cursor.lastrowid,)).fetchone()
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Ya existe una cuenta con este correo.")
    return session_for(row)


@app.post("/api/auth/login")
def login(payload: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"login:{client_ip}:{str(payload.email).lower()}"
    if not rate_limiter.check(rate_key, max_requests=5, window_seconds=120):
        raise HTTPException(429, "Demasiados intentos fallidos de inicio de sesión. Por tu seguridad, espera 2 minutos.")
    with db() as connection:
        row = connection.execute("SELECT * FROM users WHERE email=?", (str(payload.email).lower(),)).fetchone()
    if not row or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(401, "Correo o contraseña incorrectos.")
    if row["account_status"] != "active":
        raise HTTPException(403, "Esta cuenta no está activa. Contacta a soporte.")
    return session_for(row)


@app.get("/api/auth/me")
def me(user=Depends(current_user)):
    return {"user": public_user(user)}


@app.get("/api/favorites")
def get_favorites(user=Depends(current_user)):
    with db() as connection:
        rows = connection.execute(
            "SELECT property_id FROM favorites WHERE user_id=? ORDER BY created_at DESC",
            (user["id"],),
        ).fetchall()
    return {"favorites": [row["property_id"] for row in rows]}


@app.put("/api/favorites/{property_id}")
def add_favorite(property_id: str, user=Depends(current_user)):
    clean_id = sanitize_str(property_id)
    if not clean_id or len(clean_id) > 160:
        raise HTTPException(422, "El identificador de la propiedad no es válido.")
    with db() as connection:
        connection.execute(
            "INSERT OR IGNORE INTO favorites(user_id, property_id, created_at) VALUES(?,?,?)",
            (user["id"], clean_id, datetime.now(timezone.utc).isoformat()),
        )
    return {"property_id": clean_id, "favorite": True}


@app.delete("/api/favorites/{property_id}")
def remove_favorite(property_id: str, user=Depends(current_user)):
    with db() as connection:
        connection.execute(
            "DELETE FROM favorites WHERE user_id=? AND property_id=?",
            (user["id"], property_id),
        )
    return {"property_id": property_id, "favorite": False}


@app.get("/api/properties/{property_id}/reviews")
def get_reviews(property_id: str):
    with db() as connection:
        rows = connection.execute(
            """SELECT reviews.id, reviews.rating, reviews.comment, reviews.tags_json,
                      reviews.created_at, users.name, users.id AS user_id
               FROM reviews JOIN users ON users.id = reviews.user_id
               WHERE reviews.property_id=? ORDER BY reviews.created_at DESC""",
            (property_id,),
        ).fetchall()
    return {
        "reviews": [
            {
                "id": f"api-{row['id']}",
                "userName": row["name"],
                "rating": row["rating"],
                "comment": row["comment"],
                "tags": json.loads(row["tags_json"]),
                "date": row["created_at"][:10],
                "verifiedTenant": False,
                "userId": str(row["user_id"]),
            }
            for row in rows
        ]
    }


@app.post("/api/properties/{property_id}/reviews", status_code=201)
def create_review(property_id: str, payload: ReviewRequest, user=Depends(current_user)):
    comment = sanitize_str(payload.comment)
    if not comment:
        raise HTTPException(422, "La reseña no puede estar vacía.")
    tags = [sanitize_str(tag) for tag in payload.tags[:8] if sanitize_str(tag)]
    created_at = datetime.now(timezone.utc).isoformat()
    with db() as connection:
        cursor = connection.execute(
            "INSERT INTO reviews(user_id, property_id, rating, comment, tags_json, created_at) VALUES(?,?,?,?,?,?)",
            (user["id"], property_id, payload.rating, comment, json.dumps(tags), created_at),
        )
    return {
        "review": {
            "id": f"api-{cursor.lastrowid}",
            "userName": user["name"],
            "rating": payload.rating,
            "comment": comment,
            "tags": tags,
            "date": created_at[:10],
            "verifiedTenant": False,
        }
    }


@app.post("/api/auth/password/change")
def change_password_endpoint(payload: ChangePasswordRequest, user=Depends(current_user)):
    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(400, "La contraseña actual es incorrecta.")
    validate_password(payload.new_password)
    new_hash = hash_password(payload.new_password)
    with db() as connection:
        connection.execute("UPDATE users SET password_hash=? WHERE id=?", (new_hash, user["id"]))
        connection.execute("UPDATE password_reset_codes SET used_at=? WHERE email=? AND used_at IS NULL", (datetime.now(timezone.utc).isoformat(), user["email"]))
    return {"message": "Contraseña actualizada exitosamente."}


@app.post("/api/auth/password/request")
def request_password_reset(payload: EmailRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    email = str(payload.email).lower()
    if not rate_limiter.check(f"reset:{client_ip}:{email}", max_requests=3, window_seconds=600):
        raise HTTPException(429, "Has solicitado demasiados códigos recientemente. Por seguridad, espera 10 minutos.")
    with db() as connection:
        user = connection.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    # A generic response prevents account enumeration.
    if not user:
        return {"message": "Si el correo está registrado, recibirás un código."}
    code = f"{secrets.randbelow(1_000_000):06d}"
    code_hash = hmac.new(SECRET_KEY.encode(), f"{email}:{code}".encode(), hashlib.sha256).hexdigest()
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    with db() as connection:
        connection.execute("UPDATE password_reset_codes SET used_at=? WHERE email=? AND used_at IS NULL", (datetime.now(timezone.utc).isoformat(), email))
        connection.execute("INSERT INTO password_reset_codes(email,code_hash,expires_at) VALUES(?,?,?)", (email, code_hash, expires.isoformat()))
    send_reset_email(email, code)
    return {"message": "Si el correo está registrado, recibirás un código."}


@app.post("/api/auth/password/verify")
def verify_reset_code(payload: VerifyCodeRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    email = str(payload.email).lower()
    if not rate_limiter.check(f"verify_code:{client_ip}:{email}", max_requests=5, window_seconds=300):
        raise HTTPException(429, "Demasiados intentos erróneos de código. Por seguridad, espera 5 minutos.")
    supplied = hmac.new(SECRET_KEY.encode(), f"{email}:{payload.code}".encode(), hashlib.sha256).hexdigest()
    with db() as connection:
        row = connection.execute("SELECT * FROM password_reset_codes WHERE email=? AND used_at IS NULL ORDER BY id DESC LIMIT 1", (email,)).fetchone()
        if not row or datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc) or not hmac.compare_digest(supplied, row["code_hash"]):
            raise HTTPException(400, "El código es incorrecto o ya caducó.")
        token = secrets.token_urlsafe(32)
        connection.execute("UPDATE password_reset_codes SET verified_at=?, reset_token=? WHERE id=?", (datetime.now(timezone.utc).isoformat(), token, row["id"]))
    return {"reset_token": token}


@app.post("/api/auth/password/reset")
def reset_password(payload: ResetPasswordRequest):
    validate_password(payload.password)
    with db() as connection:
        reset = connection.execute("SELECT * FROM password_reset_codes WHERE reset_token=? AND verified_at IS NOT NULL AND used_at IS NULL", (payload.reset_token,)).fetchone()
        if not reset or datetime.fromisoformat(reset["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(400, "La autorización para cambiar la contraseña caducó.")
        connection.execute("UPDATE users SET password_hash=? WHERE email=?", (hash_password(payload.password), reset["email"]))
        connection.execute("UPDATE password_reset_codes SET used_at=? WHERE id=?", (datetime.now(timezone.utc).isoformat(), reset["id"]))
    return {"message": "Contraseña actualizada correctamente."}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "RuwaJay API", "country": "Guatemala"}


@app.get("/api/properties")
def get_properties():
    return {"status": "success", "count": 8}


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(room_id, []).append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        if room_id in self.active_connections and websocket in self.active_connections[room_id]:
            self.active_connections[room_id].remove(websocket)

    async def broadcast(self, room_id: str, message: dict):
        for connection in self.active_connections.get(room_id, []):
            await connection.send_json(message)


manager = ConnectionManager()


@app.websocket("/ws/chat/{room_id}")
async def websocket_chat_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            await manager.broadcast(room_id, await websocket.receive_json())
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
