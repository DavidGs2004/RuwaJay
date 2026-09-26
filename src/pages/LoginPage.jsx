import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Lock, Mail, Phone, ShieldCheck, Sparkles, User, UserCheck } from 'lucide-react';
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
  const { login, register, isLoading, requestPasswordReset, verifyResetCode, resetPassword } = useAuth();
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
  </main>;
}
