import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
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
  return <button onClick={logout}>Cerrar sesión</button>;
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
  if(user?.suspended || user?.status === 'suspended') return <div className="p-12 text-center">
    <p>Tu cuenta está suspendida. Contacta al administrador.</p>
    <SuspendedSignOut />
  </div>;

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
