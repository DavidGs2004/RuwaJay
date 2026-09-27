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
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
for default_origin in ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]:
    if default_origin not in origins:
        origins.append(default_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def sanitize_str(val: str | None) -> str | None:
    if not val:
        return val
    return re.sub(r"<[^>]*>", "", val).strip()


def validate_password(password: str):
    checks = [
        len(password) >= 8,
        any(c.isupper() for c in password),
        any(c.islower() for c in password),
        any(c.isdigit() for c in password),
        any(not c.isalnum() for c in password),
    ]
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
            CREATE TABLE IF NOT EXISTS system_updates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'novedad',
                priority TEXT NOT NULL DEFAULT 'normal',
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1
            );
        """)
        columns = {column["name"] for column in connection.execute("PRAGMA table_info(users)")}
        if "phone" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN phone TEXT")
        if "account_status" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'")
        if "avatar" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN avatar TEXT")
        if "auth_provider" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'")

        # Ensure default administrator exists
        admin_row = connection.execute("SELECT id FROM users WHERE email='admin@ruwajay.com'").fetchone()
        if not admin_row:
            admin_pw = hash_password("AdminRuwaJay2026!")
            connection.execute(
                "INSERT INTO users(name, email, password_hash, role, phone, account_status, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)",
                ("Administrador General RuwaJay", "admin@ruwajay.com", admin_pw, "admin", "+502 2222-0000", "active", datetime.now(timezone.utc).isoformat())
            )
        else:
            connection.execute("UPDATE users SET role='admin', account_status='active' WHERE email='admin@ruwajay.com'")

        # Also promote existing Alexander accounts to admin
        connection.execute("UPDATE users SET role='admin' WHERE email IN ('alexander2004deleon@gmail.com', 'xleon04gd@gmail.com', 'alexanderdeleon0431@gmail.com')")
        
        # Insert initial system update if table is empty
        update_count = connection.execute("SELECT COUNT(*) FROM system_updates").fetchone()[0]
        if update_count == 0:
            connection.execute(
                "INSERT INTO system_updates(title, content, category, priority, created_by, created_at, active) VALUES(?, ?, ?, ?, ?, ?, 1)",
                (
                    "Bienvenido a RuwaJay v2.0 - Plataforma Inmobiliaria de Guatemala",
                    "Sistema integral de alquileres con citas programadas, chat verificado entre inquilinos y propietarios, comparador inteligente de presupuestos y panel maestro de administración.",
                    "novedad",
                    "destacada",
                    "Administrador RuwaJay",
                    datetime.now(timezone.utc).isoformat()
                )
            )


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


class GoogleAuthRequest(BaseModel):
    credential: str | None = None
    email: EmailStr | None = None
    name: str | None = None
    photoURL: str | None = None
    role: str = "seeker"



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


class SystemUpdateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    content: str = Field(min_length=5, max_length=5000)
    category: str = "novedad"
    priority: str = "normal"
    active: bool = True


class SystemUpdatePatchRequest(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None
    priority: str | None = None
    active: bool | None = None


class UserRoleUpdateRequest(BaseModel):
    role: str


class UserStatusUpdateRequest(BaseModel):
    status: str



def public_user(row):
    keys = row.keys() if hasattr(row, "keys") else []
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "phone": row["phone"],
        "accountStatus": row["account_status"],
        "avatar": row["avatar"] if "avatar" in keys else None,
        "authProvider": row["auth_provider"] if "auth_provider" in keys and row["auth_provider"] else "local",
        "createdAt": row["created_at"],
    }


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


def require_admin(user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Se requieren permisos de administrador para realizar esta acción.")
    return user



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


@app.get("/api/auth/google/info")
def google_auth_info():
    client_id = os.getenv("VITE_GOOGLE_CLIENT_ID", os.getenv("GOOGLE_CLIENT_ID", ""))
    return {
        "status": "ready",
        "has_client_id": bool(client_id),
        "client_id": client_id,
        "free_service": True,
        "payment_required": False,
        "service": "RuwaJay Native Auth API"
    }


@app.post("/api/auth/google")
def google_auth(payload: GoogleAuthRequest, request: Request):
    email = None
    name = sanitize_str(payload.name) or "Usuario Google"
    avatar = sanitize_str(payload.photoURL)

    # 1. Si viene un token credential de Google (Google Identity Services / One-Tap)
    if payload.credential:
        # Intentar validar con la API pública tokeninfo de Google (100% gratuita, sin clave ni tarjeta)
        try:
            import httpx
            with httpx.Client(timeout=4.0) as client:
                res = client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}")
                if res.status_code == 200:
                    info = res.json()
                    email = info.get("email")
                    name = sanitize_str(info.get("name") or name)
                    avatar = sanitize_str(info.get("picture") or avatar)
        except Exception:
            pass

        # Respaldo: Decodificar base64 del JWT sin dependencias externas
        if not email:
            try:
                import base64
                parts = payload.credential.split(".")
                if len(parts) >= 2:
                    padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                    claims = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
                    email = claims.get("email")
                    if claims.get("name"):
                        name = sanitize_str(claims["name"])
                    if claims.get("picture"):
                        avatar = sanitize_str(claims["picture"])
            except Exception:
                pass

    if not email and payload.email:
        email = str(payload.email).lower()

    if not email:
        raise HTTPException(400, "No se proporcionó un correo electrónico válido para Google.")

    email = email.lower().strip()

    with db() as connection:
        row = connection.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        if not row:
            dummy_pw = hash_password(secrets.token_urlsafe(24))
            cursor = connection.execute(
                """INSERT INTO users(name, email, password_hash, role, phone, account_status, avatar, auth_provider, created_at)
                   VALUES(?, ?, ?, ?, ?, ?, ?, 'google', ?)""",
                (name, email, dummy_pw, payload.role or "seeker", None, "active", avatar, datetime.now(timezone.utc).isoformat()),
            )
            row = connection.execute("SELECT * FROM users WHERE id=?", (cursor.lastrowid,)).fetchone()
        else:
            if row["account_status"] != "active":
                raise HTTPException(403, "Esta cuenta se encuentra suspendida.")
            
            # Actualizar nombre y avatar si han cambiado
            updates = []
            params = []
            if name and name != "Usuario Google" and name != row["name"]:
                updates.append("name=?")
                params.append(name)
            if avatar and ("avatar" in row.keys() and avatar != row["avatar"]):
                updates.append("avatar=?")
                params.append(avatar)
            if updates:
                params.append(row["id"])
                connection.execute(f"UPDATE users SET {', '.join(updates)} WHERE id=?", params)
                row = connection.execute("SELECT * FROM users WHERE id=?", (row["id"],)).fetchone()

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


# ── System Updates & Announcements (Public & Admin) ──

@app.get("/api/system/updates")
def get_public_system_updates():
    """Public list of active platform announcements and updates."""
    with db() as connection:
        rows = connection.execute(
            "SELECT * FROM system_updates WHERE active=1 ORDER BY id DESC"
        ).fetchall()
    return {
        "updates": [
            {
                "id": str(r["id"]),
                "title": r["title"],
                "content": r["content"],
                "category": r["category"],
                "priority": r["priority"],
                "createdBy": r["created_by"],
                "createdAt": r["created_at"],
                "active": bool(r["active"]),
            }
            for r in rows
        ]
    }


@app.get("/api/admin/updates")
def get_admin_system_updates(admin=Depends(require_admin)):
    """Admin full list of announcements, both active and inactive."""
    with db() as connection:
        rows = connection.execute(
            "SELECT * FROM system_updates ORDER BY id DESC"
        ).fetchall()
    return {
        "updates": [
            {
                "id": str(r["id"]),
                "title": r["title"],
                "content": r["content"],
                "category": r["category"],
                "priority": r["priority"],
                "createdBy": r["created_by"],
                "createdAt": r["created_at"],
                "active": bool(r["active"]),
            }
            for r in rows
        ]
    }


@app.post("/api/admin/updates", status_code=201)
def create_system_update(payload: SystemUpdateRequest, admin=Depends(require_admin)):
    """Create a new system update / announcement broadcast."""
    clean_title = sanitize_str(payload.title)
    clean_content = sanitize_str(payload.content)
    if not clean_title or not clean_content:
        raise HTTPException(422, "El título y contenido no pueden estar vacíos.")
    
    category = payload.category if payload.category in {"novedad", "mantenimiento", "alerta", "mejora"} else "novedad"
    priority = payload.priority if payload.priority in {"destacada", "normal", "urgente"} else "normal"
    created_at = datetime.now(timezone.utc).isoformat()
    created_by = admin["name"]

    with db() as connection:
        cur = connection.execute(
            """INSERT INTO system_updates (title, content, category, priority, created_by, created_at, active)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (clean_title, clean_content, category, priority, created_by, created_at, 1 if payload.active else 0)
        )
        row = connection.execute("SELECT * FROM system_updates WHERE id=?", (cur.lastrowid,)).fetchone()
    
    return {
        "message": "Actualización publicada exitosamente.",
        "update": {
            "id": str(row["id"]),
            "title": row["title"],
            "content": row["content"],
            "category": row["category"],
            "priority": row["priority"],
            "createdBy": row["created_by"],
            "createdAt": row["created_at"],
            "active": bool(row["active"]),
        }
    }


@app.patch("/api/admin/updates/{update_id}")
def update_system_update(update_id: int, payload: SystemUpdatePatchRequest, admin=Depends(require_admin)):
    """Edit or toggle status of a system update."""
    with db() as connection:
        row = connection.execute("SELECT * FROM system_updates WHERE id=?", (update_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Actualización no encontrada.")
        
        updates = []
        params = []
        if payload.title is not None:
            clean = sanitize_str(payload.title)
            if not clean:
                raise HTTPException(422, "El título no puede estar vacío.")
            updates.append("title=?")
            params.append(clean)
        if payload.content is not None:
            clean = sanitize_str(payload.content)
            if not clean:
                raise HTTPException(422, "El contenido no puede estar vacío.")
            updates.append("content=?")
            params.append(clean)
        if payload.category is not None:
            updates.append("category=?")
            params.append(payload.category if payload.category in {"novedad", "mantenimiento", "alerta", "mejora"} else "novedad")
        if payload.priority is not None:
            updates.append("priority=?")
            params.append(payload.priority if payload.priority in {"destacada", "normal", "urgente"} else "normal")
        if payload.active is not None:
            updates.append("active=?")
            params.append(1 if payload.active else 0)
        
        if updates:
            params.append(update_id)
            connection.execute(f"UPDATE system_updates SET {', '.join(updates)} WHERE id=?", params)
            row = connection.execute("SELECT * FROM system_updates WHERE id=?", (update_id,)).fetchone()

    return {
        "message": "Actualización modificada correctamente.",
        "update": {
            "id": str(row["id"]),
            "title": row["title"],
            "content": row["content"],
            "category": row["category"],
            "priority": row["priority"],
            "createdBy": row["created_by"],
            "createdAt": row["created_at"],
            "active": bool(row["active"]),
        }
    }


@app.delete("/api/admin/updates/{update_id}")
def delete_system_update(update_id: int, admin=Depends(require_admin)):
    """Delete a system update."""
    with db() as connection:
        row = connection.execute("SELECT * FROM system_updates WHERE id=?", (update_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Actualización no encontrada.")
        connection.execute("DELETE FROM system_updates WHERE id=?", (update_id,))
    return {"message": "Actualización eliminada correctamente.", "id": str(update_id)}


# ── Admin User Management ──

@app.get("/api/admin/users")
def get_admin_users(admin=Depends(require_admin)):
    """List all registered users for administration."""
    with db() as connection:
        rows = connection.execute("SELECT * FROM users ORDER BY id DESC").fetchall()
    return {"users": [public_user(row) for row in rows]}


@app.patch("/api/admin/users/{user_id}/role")
def change_user_role(user_id: int, payload: UserRoleUpdateRequest, admin=Depends(require_admin)):
    """Promote or demote user role (seeker, owner, admin)."""
    if payload.role not in {"seeker", "owner", "admin"}:
        raise HTTPException(422, "Rol inválido.")
    with db() as connection:
        target = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        if not target:
            raise HTTPException(404, "Usuario no encontrado.")
        connection.execute("UPDATE users SET role=? WHERE id=?", (payload.role, user_id))
        updated = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return {"message": f"Rol cambiado a {payload.role}.", "user": public_user(updated)}


@app.patch("/api/admin/users/{user_id}/status")
def change_user_status(user_id: int, payload: UserStatusUpdateRequest, admin=Depends(require_admin)):
    """Activate or suspend a user account."""
    if payload.status not in {"active", "suspended"}:
        raise HTTPException(422, "Estado de cuenta inválido.")
    if user_id == admin["id"] and payload.status == "suspended":
        raise HTTPException(400, "No puedes suspender tu propia cuenta de administrador.")
    with db() as connection:
        target = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        if not target:
            raise HTTPException(404, "Usuario no encontrado.")
        connection.execute("UPDATE users SET account_status=? WHERE id=?", (payload.status, user_id))
        updated = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return {"message": f"Estado cambiado a {payload.status}.", "user": public_user(updated)}


@app.get("/api/admin/stats")
def get_admin_stats(admin=Depends(require_admin)):
    """Platform statistics for admin dashboard."""
    with db() as connection:
        total_users = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        owners = connection.execute("SELECT COUNT(*) FROM users WHERE role='owner'").fetchone()[0]
        seekers = connection.execute("SELECT COUNT(*) FROM users WHERE role='seeker'").fetchone()[0]
        admins = connection.execute("SELECT COUNT(*) FROM users WHERE role='admin'").fetchone()[0]
        suspended = connection.execute("SELECT COUNT(*) FROM users WHERE account_status='suspended'").fetchone()[0]
        active_updates = connection.execute("SELECT COUNT(*) FROM system_updates WHERE active=1").fetchone()[0]
        total_reviews = connection.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]

    return {
        "totalUsers": total_users,
        "owners": owners,
        "seekers": seekers,
        "admins": admins,
        "suspended": suspended,
        "activeUpdates": active_updates,
        "totalReviews": total_reviews,
    }



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
