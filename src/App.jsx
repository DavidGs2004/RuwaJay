import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Clock3, ArrowLeft } from 'lucide-react';
import { AuthProvider, useAuth, resolveUserStatus } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { CompareProvider } from './context/CompareContext';
import { ChatProvider } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import { ThemeProvider } from './context/ThemeContext';
import GlobalCallModal from './components/chat/GlobalCallModal';
import Header from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';
import Footer from './components/layout/Footer';
import MobileAppBanner from './components/ui/MobileAppBanner';
import MobileAppConnectModal from './components/ui/MobileAppConnectModal';

// Pages
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import RoutePage from './pages/RoutePage';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import PublishPage from './pages/PublishPage';
import ResetPasswordPage from './pages/ResetPasswordPage'; // <--- Importamos la nueva página
import RuwaJayLoader from './components/ui/RuwaJayLoader';
import PropertyCompareModal from './components/property/PropertyCompareModal';
import ChatNotificationToast from './components/chat/ChatNotificationToast';
import ErrorBoundary from './components/ui/ErrorBoundary';

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
}

function AccountBlockedScreen({ type = 'inactive', onReturnToLogin }) {
  const [isExiting, setIsExiting] = useState(false);
  const isSuspended = type === 'suspended';

  const handleReturn = () => {
    if (isExiting) return;
    setIsExiting(true);
    onReturnToLogin?.();
  };

  return (
    <div
      className={`flex min-h-screen items-center justify-center p-4 sm:p-6 bg-[#FAF5EE] text-center transition-opacity duration-300 ease-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100 animate-fade-in'
      }`}
    >
      <div
        className={`max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border ${
          isSuspended ? 'border-red-200' : 'border-amber-200'
        } overflow-hidden relative transition-all duration-300 ease-out transform ${
          isExiting ? 'scale-95 opacity-0 translate-y-3' : 'scale-100 opacity-100 translate-y-0'
        }`}
      >
        <div
          className={`h-2 bg-gradient-to-r ${
            isSuspended
              ? 'from-red-500 via-rose-500 to-red-600'
              : 'from-amber-400 via-amber-500 to-amber-600'
          } -mt-6 sm:-mt-8 -mx-6 sm:-mx-8 mb-6`}
        />

        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
            isSuspended
              ? 'bg-red-50 text-red-600 border-red-100 ring-red-50/50'
              : 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-50/50'
          } mb-4 border ring-8 shadow-sm`}
        >
          {isSuspended ? <AlertCircle size={32} /> : <Clock3 size={32} />}
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full ${
            isSuspended
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          } border text-xs font-bold`}
        >
          {isSuspended ? <AlertCircle size={13} /> : <Clock3 size={13} />}
          <span>{isSuspended ? 'Acceso Temporalmente Bloqueado' : 'Acceso en Pausa'}</span>
        </span>

        <h2 className="text-xl sm:text-2xl font-black text-cafe mb-2 tracking-tight">
          {isSuspended ? 'Cuenta Suspendida' : 'Cuenta Inactiva'}
        </h2>

        <div
          className={`rounded-2xl ${
            isSuspended
              ? 'bg-[#FFF8F7] border-red-100 text-red-950/80'
              : 'bg-[#FDFBF7] border-amber-200/80 text-amber-950/80'
          } border p-4 mb-5 text-xs leading-relaxed text-left`}
        >
          <p className={`font-bold mb-1 ${isSuspended ? 'text-red-800' : 'text-amber-900'}`}>
            {isSuspended ? 'Motivo de la restricción:' : 'Información de la cuenta:'}
          </p>
          {isSuspended
            ? 'Tu cuenta ha sido suspendida por no cumplir las normas de convivencia de RuwaJay. Cuando un administrador reactive tu cuenta, esta pantalla desaparecerá automáticamente.'
            : 'Tu cuenta se encuentra inactiva por disposición administrativa o solicitud previa. Puedes contactar al soporte o esperar a que el administrador reactive tu acceso.'}
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-text-muted mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>Monitoreando reactivación en tiempo real...</span>
        </div>

        <button
          type="button"
          onClick={handleReturn}
          disabled={isExiting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest hover:bg-forest-dark px-6 py-3 text-xs sm:text-sm font-black text-white transition-all cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-80"
        >
          {isExiting ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Regresando a iniciar sesión...</span>
            </>
          ) : (
            <>
              <ArrowLeft size={16} />
              <span>Regresar a iniciar sesión</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function RequireSession() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function RuwaJayRoutes() {
  const { user, logout, isInitializing, isPostAuthLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isChatRoute = location.pathname === '/chat';
  const isAuthRoute = ['/login', '/reset-password', '/__/auth/action'].includes(location.pathname);
  const showLayout = !isChatRoute && !isAuthRoute;
  const [mobileAppModalOpen, setMobileAppModalOpen] = useState(false);
  const [exitingStatus, setExitingStatus] = useState(null);

  useEffect(() => {
    if (isAuthRoute && exitingStatus) {
      setExitingStatus(null);
    }
  }, [isAuthRoute, exitingStatus]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF5EE]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-forest/20 border-t-forest" aria-label="Verificando sesión" />
      </div>
    );
  }

  if (isPostAuthLoading) return <RuwaJayLoader />;

  const userStatus = user ? resolveUserStatus(user, user.email) : 'active';
  const activeBlockedType = (user && (userStatus === 'suspended' || userStatus === 'inactive'))
    ? userStatus
    : exitingStatus;

  if (activeBlockedType && !isAuthRoute) {
    const handleReturnToLogin = () => {
      setExitingStatus(activeBlockedType);
      setTimeout(async () => {
        navigate('/login', { replace: true });
        try {
          await logout();
        } catch (err) {
          console.warn('Error al cerrar sesión:', err);
        }
      }, 250);
    };

    return (
      <AccountBlockedScreen
        type={activeBlockedType}
        onReturnToLogin={handleReturnToLogin}
      />
    );
  }

  return (
    <div className={`flex min-h-screen w-full min-w-0 flex-col overflow-x-clip ${isChatRoute ? 'bg-[#FAF8F5]' : 'bg-crema'} font-sans text-cafe antialiased`}>
      {showLayout && <MobileAppBanner onOpenModal={() => setMobileAppModalOpen(true)} />}
      {showLayout && <Header />}
      <div className={`min-w-0 flex-1 ${showLayout ? 'pb-20 md:pb-0' : ''}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explorar" element={<ExplorePage />} />
          <Route path="/propiedad/:id" element={<PropertyDetailPage />} />
          <Route path="/ruta" element={<RoutePage />} />
          <Route element={<RequireSession />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/publicar" element={<PublishPage />} />
            <Route path="/publicar/:editId" element={<PublishPage />} />
          </Route>
          <Route path="/login" element={user && resolveUserStatus(user, user.email) === 'active' ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/reset-password" element={user && resolveUserStatus(user, user.email) === 'active' ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
          <Route path="/__/auth/action" element={user && resolveUserStatus(user, user.email) === 'active' ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {showLayout && <Footer />}
      {showLayout && <MobileNav />}
      <PropertyCompareModal />
      <ChatNotificationToast />
      <MobileAppConnectModal
        isOpen={mobileAppModalOpen}
        onClose={() => setMobileAppModalOpen(false)}
        targetPath={location.pathname}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FavoritesProvider>
          <CompareProvider>
            <ChatProvider>
              <CallProvider>
                <Router basename={import.meta.env.BASE_URL}>
                  <ScrollToTop />
                  <ErrorBoundary>
                    <RuwaJayRoutes />
                    <GlobalCallModal />
                  </ErrorBoundary>
                </Router>
              </CallProvider>
            </ChatProvider>
          </CompareProvider>
        </FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
