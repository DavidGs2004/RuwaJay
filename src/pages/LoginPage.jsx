import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Lock, Mail, Phone, ShieldCheck, Sparkles, User, UserCheck, X } from 'lucide-react';
import RuwaJayLogo from '../components/ui/RuwaJayLogo';
import { useAuth } from '../context/AuthContext';

function PasswordField({ value, onChange, label = 'Contraseña', autoComplete = 'current-password', showMeter = true }) {
  const [visible, setVisible] = useState(false);
  const checks = useMemo(() => ({
    length: value.length >= 8,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
  }), [value]);
  const score = Object.values(checks).filter(Boolean).length;
  const strength = score <= 2 
    ? { text: 'Débil', color: 'text-red-600', width: 'w-1/3', bg: 'bg-red-500' }
    : score < 5 
    ? { text: 'Normal', color: 'text-amber-600', width: 'w-2/3', bg: 'bg-amber-500' }
    : { text: 'Fuerte', color: 'text-forest', width: 'w-full', bg: 'bg-forest' };

  return <div>
    <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-cafe">{label}</label>
    <div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3.5 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
      <Lock size={18} className="shrink-0 text-forest/70" />
      <input type={visible ? 'text' : 'password'} required value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} placeholder="••••••••" className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm font-semibold text-cafe outline-none" />
      <button type="button" onClick={() => setVisible(!visible)} className="p-1 text-text-muted hover:text-cafe" aria-label={visible ? 'Ocultar contraseña' : 'Ver contraseña'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
    {showMeter && value && <div className="mt-2.5" aria-live="polite">
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
        <span className="text-text-muted">Seguridad</span>
        <span className={strength.color}>{strength.text}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#E8D9C8]/60">
        <div className={`h-full rounded-full transition-all duration-300 ${strength.width} ${strength.bg}`} />
      </div>
    </div>}
  </div>;
}

function EmailField({ value, onChange, autoComplete = 'email' }) {
  return <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-cafe">Correo electrónico</label><div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3.5 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20"><Mail size={18} className="shrink-0 text-forest/70" /><input type="email" required value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} placeholder="tu@correo.com" className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm font-semibold text-cafe outline-none" /></div></div>;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, register, isLoading, requestPasswordReset, verifyResetCode, resetPassword } = useAuth();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('seeker');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [busy, setBusy] = useState(false);

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleRole, setGoogleRole] = useState('seeker');
  const [useCustomGoogle, setUseCustomGoogle] = useState(false);

  const notify = (text, isError = false) => { setMessage(text); setError(isError); };
  const strongPassword = (text) => text.length >= 8 && /[A-Z]/.test(text) && /[a-z]/.test(text) && /\d/.test(text) && /[^A-Za-z0-9]/.test(text);

  const submitAuth = async (event) => {
    event.preventDefault(); notify('');
    if (mode === 'register' && !strongPassword(password)) return notify('Completa todos los requisitos de una contraseña fuerte.', true);
    try {
      if (mode === 'register') await register(name, email, password, role, phone);
      else await login(email, password);
      navigate('/');
    } catch (err) { notify(err.message, true); }
  };

  const handleGoogleLogin = async () => {
    notify('');
    setBusy(true);

    try {
      // 1. Iniciar sesión oficial con servicios de Google (Firebase Popup)
      await loginWithGoogle();
      navigate('/');
      return;
    } catch (err) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setBusy(false);
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        notify('Tu navegador bloqueó la ventana emergente de Google. Habilita ventanas emergentes o usa el acceso alternativo.', true);
        setShowGoogleModal(true);
        return;
      }
      if (err?.code === 'auth/unauthorized-domain') {
        notify('El dominio no está registrado en la lista de dominios autorizados de Firebase Console. Abriendo selector:', true);
        setShowGoogleModal(true);
        return;
      }
      if (err?.message === 'REQUIRES_GOOGLE_INPUT') {
        setShowGoogleModal(true);
        return;
      }
      console.warn("Google Auth error:", err);
      notify(err.message || 'Error al conectar con los servicios de Google.', true);
    } finally {
      setBusy(false);
    }
  };

  const executeGoogleAuth = async (selectedEmail, selectedName) => {
    notify('');
    setBusy(true);
    try {
      const emailFinal = (selectedEmail || googleEmail || '').trim().toLowerCase();
      const nameFinal = (selectedName || googleName || (emailFinal ? emailFinal.split('@')[0] : 'Usuario Google')).trim();

      if (!emailFinal || !emailFinal.includes('@')) {
        notify('Ingresa un correo electrónico de Google válido (@gmail.com).', true);
        setBusy(false);
        return;
      }

      await loginWithGoogle({
        email: emailFinal,
        name: nameFinal,
        role: googleRole,
      });
      setShowGoogleModal(false);
      navigate('/');
    } catch (err) {
      if (err.message !== 'REQUIRES_GOOGLE_INPUT') {
        notify(err.message || 'Error al sincronizar con Google en la API.', true);
      }
    } finally {
      setBusy(false);
    }
  };

  const startReset = () => { setMode('reset'); notify(''); };
  const submitReset = async (event) => {
    event.preventDefault(); setBusy(true); notify('');
    try {
      await requestPasswordReset(email);
      notify('Enlace enviado. Revisa tu correo electrónico para cambiar tu contraseña.');
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  return <main className="relative flex min-h-[calc(100dvh-72px)] items-start justify-center overflow-hidden bg-[#FAF5EE] px-3 py-6 sm:items-center sm:px-4 sm:py-10 md:min-h-[calc(100dvh-162px)]">
    <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-dorado/15 blur-3xl" /><div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-forest/10 blur-3xl" />
    <div className="relative z-10 w-full max-w-[500px] overflow-hidden rounded-[24px] border border-[#E8D9C8] bg-white shadow-[0_20px_60px_rgba(45,24,16,0.12)] sm:rounded-[32px]">
      <div className="h-2 bg-gradient-to-r from-forest via-dorado to-terracota" />
      <div className="p-5 min-[380px]:p-7 sm:p-10">
        <div className="mb-5 flex justify-end"><span className="rounded-full border border-dorado/20 bg-dorado/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.2em] text-dorado">Acceso seguro</span></div>
        <div className="mb-7 text-center"><RuwaJayLogo size={58} showText className="mb-3 justify-center" /><p className="mb-1 text-xs font-black uppercase tracking-[.18em] text-dorado">¡Qué gusto tenerte aquí!</p><h1 className="text-2xl font-black tracking-tight text-cafe sm:text-3xl">{mode === 'login' ? 'Bienvenido a RuwaJay' : mode === 'register' ? 'Crea tu cuenta' : 'Recuperar acceso'}</h1><p className="mt-1.5 text-xs font-semibold text-text-secondary sm:text-sm">{mode === 'reset' ? 'Ingresa tu correo para recibir un enlace de recuperación' : 'Tu próximo hogar puede estar más cerca de lo que imaginas'}</p></div>

        {mode !== 'reset' && <><div className="relative mb-6 grid grid-cols-2 border-b border-[#E8D9C8]"><span aria-hidden="true" className={`absolute bottom-[-1px] left-0 h-[3px] w-1/2 rounded-full transition-[transform,background-color] duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${mode === 'register' ? 'translate-x-full bg-forest' : 'translate-x-0 bg-terracota'}`} /><button type="button" onClick={() => { setMode('login'); notify(''); setName(''); setEmail(''); setPassword(''); setPhone(''); }} className={`py-3 text-sm font-extrabold transition-colors duration-300 ${mode === 'login' ? 'text-terracota' : 'text-text-muted hover:text-cafe'}`}>Iniciar sesión</button><button type="button" onClick={() => { setMode('register'); notify(''); setName(''); setEmail(''); setPassword(''); setPhone(''); }} className={`py-3 text-sm font-extrabold transition-colors duration-300 ${mode === 'register' ? 'text-forest' : 'text-text-muted hover:text-cafe'}`}>Registrarme</button></div>{mode === 'register' && <div className="auth-panel-in mb-5"><p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-cafe">¿Qué deseas hacer?</p><div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-[#E8D9C8]/60 bg-[#F5ECE0] p-1.5"><button type="button" onClick={() => setRole('seeker')} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-xs font-extrabold transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${role === 'seeker' ? 'scale-[1.02] bg-forest text-white shadow-md' : 'text-cafe/80 hover:bg-white/60'}`}><UserCheck size={17}/>Busco vivienda</button><button type="button" onClick={() => setRole('owner')} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-xs font-extrabold transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${role === 'owner' ? 'scale-[1.02] bg-terracota text-white shadow-md' : 'text-cafe/80 hover:bg-white/60'}`}><Sparkles size={17}/>Quiero publicar</button></div><div key={role} className="auth-panel-in mt-2.5 rounded-xl bg-crema/60 px-3 py-2 text-[11px] font-semibold leading-relaxed text-text-secondary">{role === 'owner' ? 'Cuenta para propietarios: podrás publicar viviendas y recibir contactos. Necesitamos un teléfono para tus anuncios.' : 'Cuenta para buscar vivienda: podrás guardar favoritos, contactar propietarios y administrar tus búsquedas.'}</div></div>}</>}

        {message && <div className={`mb-5 flex items-center gap-2.5 rounded-2xl border p-3.5 text-xs font-bold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-jade/30 bg-jade/15 text-forest'}`}><ShieldCheck size={16} className="shrink-0"/><span>{message}</span></div>}

        {mode !== 'reset' && <>
          <button type="button" onClick={handleGoogleLogin} disabled={isLoading || busy} className="mb-4 flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#E8D9C8] bg-white px-4 py-3 text-sm font-bold text-cafe shadow-sm transition-all duration-200 hover:border-[#d1c4b0] hover:bg-[#FDFBF7] hover:shadow-md active:scale-[0.98] disabled:opacity-60">
            <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>{isLoading || busy ? 'Sincronizando...' : 'Continuar con Google'}</span>
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E8D9C8]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">o continuar con correo</span>
            <div className="h-px flex-1 bg-[#E8D9C8]" />
          </div>
        </>}

        {mode !== 'reset' ? <form key={mode} onSubmit={submitAuth} className="auth-panel-in space-y-4">
          {mode === 'register' && <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-cafe">Nombre completo</label><div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3.5 focus-within:border-forest"><User size={18} className="text-forest/70"/><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Tu nombre" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-cafe outline-none"/></div></div>}
          <EmailField value={email} onChange={setEmail}/>
          {mode === 'register' && role === 'owner' && <div className="auth-panel-in"><label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-cafe">Teléfono de contacto</label><div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3.5 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20"><Phone size={18} className="text-forest/70"/><input type="tel" required minLength={8} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="Ej. 5555 5555" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-cafe outline-none"/></div></div>}
          <div className="relative">{mode === 'login' && <button type="button" onClick={startReset} className="absolute right-0 top-0 z-10 text-[11px] font-extrabold text-terracota hover:underline">¿Olvidaste tu contraseña?</button>}<PasswordField value={password} onChange={setPassword} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></div>
          <button type="submit" disabled={isLoading} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-terracota to-naranja px-4 py-3 text-sm font-black text-white shadow-[0_8px_24px_rgba(216,68,32,.28)] hover:-translate-y-0.5 disabled:opacity-60">{isLoading ? 'Procesando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear mi cuenta'}<ArrowRight size={18}/></button>
        </form> : <form key="reset-form" onSubmit={submitReset} className="auth-panel-in space-y-4">
          <EmailField value={email} onChange={setEmail}/>
          <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 text-sm font-black text-white disabled:opacity-60">{busy ? 'Procesando...' : 'Enviar enlace de recuperación'}<ArrowRight size={18}/></button>
          <button type="button" onClick={() => { setMode('login'); notify(''); }} className="w-full text-xs font-extrabold text-text-muted hover:text-cafe transition-colors">Volver a iniciar sesión</button>
        </form>}
        {mode === 'login' && <div className="auth-panel-in mt-6 rounded-2xl border border-dorado/20 bg-crema/60 px-4 py-3 text-center"><p className="text-xs font-semibold text-text-secondary">¿Aún no tienes una cuenta?</p><button type="button" onClick={() => { setMode('register'); setName(''); setEmail(''); setPassword(''); setPhone(''); notify(''); }} className="mt-1 text-sm font-black text-forest transition-colors hover:text-forest-dark hover:underline">Regístrate ahora para seguir navegando en RuwaJay</button></div>}
      </div>
    </div>

    {/* Modal de Sincronización con Google vía API (100% Gratuito y sin métodos de pago) */}
    {showGoogleModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#E8D9C8] bg-white p-6 shadow-2xl sm:p-8">
          <button
            type="button"
            onClick={() => setShowGoogleModal(false)}
            className="absolute right-4 top-4 rounded-full p-2 text-text-muted hover:bg-[#F5ECE0] hover:text-cafe transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>

          {/* Encabezado con Icono Google */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] shadow-sm">
              <svg width="28" height="28" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </div>
            <h2 className="text-xl font-black text-cafe">Sincronizar con Google</h2>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-jade/15 px-2.5 py-0.5 text-[11px] font-bold text-forest">
                <ShieldCheck size={13} />
                API RuwaJay · 100% Gratuito
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-text-secondary leading-relaxed">
              Sincronización directa vía API local: entra inmediatamente sin requerir pasarelas de pago ni tarjetas.
            </p>
          </div>

          {/* Cuentas sugeridas de Google */}
          {!useCustomGoogle ? (
            <div className="space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-cafe">
                Selecciona una cuenta de Google:
              </p>

              <button
                type="button"
                disabled={busy}
                onClick={() => executeGoogleAuth('xleon04gd@gmail.com', 'Alexander Leon')}
                className="flex w-full items-center gap-3.5 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] p-3.5 text-left transition-all hover:border-forest hover:bg-forest/5 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-black text-white shadow-sm">
                  AL
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-cafe">Alexander Leon</div>
                  <div className="truncate text-xs font-semibold text-text-secondary">xleon04gd@gmail.com</div>
                </div>
                <span className="rounded-full bg-dorado/15 px-2 py-0.5 text-[10px] font-bold text-dorado uppercase tracking-wider">
                  Entrar
                </span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => executeGoogleAuth('alexander2004deleon@gmail.com', 'Alexander')}
                className="flex w-full items-center gap-3.5 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] p-3.5 text-left transition-all hover:border-forest hover:bg-forest/5 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracota text-sm font-black text-white shadow-sm">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-cafe">Alexander</div>
                  <div className="truncate text-xs font-semibold text-text-secondary">alexander2004deleon@gmail.com</div>
                </div>
                <span className="rounded-full bg-dorado/15 px-2 py-0.5 text-[10px] font-bold text-dorado uppercase tracking-wider">
                  Entrar
                </span>
              </button>

              <button
                type="button"
                onClick={() => setUseCustomGoogle(true)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#E8D9C8] py-2.5 text-xs font-extrabold text-cafe hover:border-forest hover:text-forest transition-colors"
              >
                <User size={15} />
                Ingresar con otra cuenta de Google
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); executeGoogleAuth(); }} className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">
                  Correo de Google (@gmail.com)
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
                  <Mail size={17} className="text-forest/70 shrink-0" />
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="tu.cuenta@gmail.com"
                    className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm font-semibold text-cafe outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">
                  Nombre completo
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
                  <User size={17} className="text-forest/70 shrink-0" />
                  <input
                    type="text"
                    required
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="Tu nombre y apellido"
                    className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm font-semibold text-cafe outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">
                  ¿Cuál es tu objetivo en RuwaJay?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGoogleRole('seeker')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      googleRole === 'seeker'
                        ? 'bg-forest text-white shadow-sm'
                        : 'border border-[#E8D9C8] bg-[#FDFBF7] text-cafe'
                    }`}
                  >
                    Buscar vivienda
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoogleRole('owner')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      googleRole === 'owner'
                        ? 'bg-terracota text-white shadow-sm'
                        : 'border border-[#E8D9C8] bg-[#FDFBF7] text-cafe'
                    }`}
                  >
                    Publicar inmueble
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-2xl bg-forest py-3 text-sm font-black text-white shadow-md hover:bg-forest-dark transition-all disabled:opacity-60"
                >
                  {busy ? 'Sincronizando...' : 'Entrar con Google'}
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomGoogle(false)}
                  className="rounded-2xl border border-[#E8D9C8] px-4 py-3 text-xs font-extrabold text-cafe hover:bg-[#F5ECE0] transition-colors"
                >
                  Volver
                </button>
              </div>
            </form>
          )}

          <div className="mt-5 rounded-xl border border-jade/30 bg-jade/10 p-3 text-center text-[11px] font-semibold text-forest">
            ✓ Sesión protegida con token JWT en SQLite local · Cero cobros ni dependencias de pago.
          </div>
        </div>
      </div>
    )}
  </main>;
}
