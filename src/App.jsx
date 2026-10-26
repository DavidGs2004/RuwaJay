import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
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

function SuspendedSignOut() {
  const { logout } = useAuth();
  return (
    <button
      onClick={logout}
      className="inline-flex items-center justify-center rounded-xl bg-forest hover:bg-forest-dark px-5 py-2.5 text-xs font-black text-white transition-all cursor-pointer shadow-md"
    >
      Cerrar sesión e ir al inicio
    </button>
  );
}

function RequireSession() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function RuwaJayRoutes() {
  const { user, isInitializing, isPostAuthLoading } = useAuth();
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat';
  const isAuthRoute = ['/login', '/reset-password', '/__/auth/action'].includes(location.pathname);
  const showLayout = !isChatRoute && !isAuthRoute;
  const [mobileAppModalOpen, setMobileAppModalOpen] = useState(false);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF5EE]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-forest/20 border-t-forest" aria-label="Verificando sesión" />
      </div>
    );
  }

  if (isPostAuthLoading) return <RuwaJayLoader />;

  const userStatus = user ? resolveUserStatus(user, user.email) : 'active';
  if (user && userStatus === 'suspended') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-[#FAF5EE] text-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-red-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-cafe mb-2">Cuenta Suspendida</h2>
          <p className="text-sm text-text-muted mb-6">
            Tu cuenta ha sido suspendida por no cumplir las normas de la comunidad. Contacta al soporte si crees que esto es un error.
          </p>
          <SuspendedSignOut />
        </div>
      </div>
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
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/reset-password" element={user ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
          <Route path="/__/auth/action" element={user ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
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
