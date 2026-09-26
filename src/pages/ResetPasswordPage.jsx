import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Firebase inyecta el código en 'oobCode'
  const oobCode = searchParams.get('oobCode');

  const [accountEmail, setAccountEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setStatusMessage({
        type: 'error',
        text: 'Enlace inválido o incompleto. Solicita uno nuevo.',
      });
      setIsValidating(false);
      return;
    }

    verifyPasswordResetCode(firebaseAuth, oobCode)
      .then((email) => {
        setAccountEmail(email);
        setIsValidating(false);
      })
      .catch((err) => {
        console.error(err);
        setStatusMessage({
          type: 'error',
          text: 'El enlace ha expirado o ya fue utilizado anteriormente.',
        });
        setIsValidating(false);
      });
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    if (newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(firebaseAuth, oobCode, newPassword);
      setStatusMessage({
        type: 'success',
        text: '¡Contraseña restablecida con éxito! Redirigiendo al login...',
      });
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: 'Ocurrió un error al actualizar la contraseña. Inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-crema px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border-t-4 border-[#ea580c] bg-white p-8 shadow-xl text-center">
        <div className="mb-3">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
            Acceso Seguro
          </span>
        </div>

        <h1 className="text-2xl font-black text-gray-900">Restablecer Contraseña</h1>
        <p className="mt-1 mb-6 text-sm text-gray-500">
          {accountEmail ? (
            <>Ingresa una nueva clave para <strong>{accountEmail}</strong></>
          ) : (
            'Tu hogar, tu camino'
          )}
        </p>

        {statusMessage.text && (
          <div className={`mb-5 rounded-xl border p-3 text-sm leading-relaxed ${
            statusMessage.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {isValidating ? (
          <p className="text-sm text-gray-400">Verificando enlace de seguridad...</p>
        ) : statusMessage.type === 'error' && !accountEmail ? (
          <Link
            to="/login"
            className="inline-block w-full rounded-xl bg-[#ea580c] py-3 text-center text-sm font-semibold text-white transition hover:bg-[#c2410c]"
          >
            Volver al inicio de sesión
          </Link>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-[#ea580c]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '👁️' : '🔒'}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Confirmar contraseña
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                required
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#ea580c]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || statusMessage.type === 'success'}
              className="mt-2 w-full rounded-xl bg-[#ea580c] py-3 text-sm font-bold text-white transition hover:bg-[#c2410c] disabled:opacity-50"
            >
              {isSubmitting ? 'Actualizando...' : 'Guardar nueva contraseña →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}