import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { CompareProvider } from './context/CompareContext';
import { ChatProvider } from './context/ChatContext';
import Header from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';
import Footer from './components/layout/Footer';

// Pages
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import RoutePage from './pages/RoutePage';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import PublishPage from './pages/PublishPage';
import RuwaJayLoader from './components/ui/RuwaJayLoader';
import PropertyCompareModal from './components/property/PropertyCompareModal';
import ChatNotificationToast from './components/chat/ChatNotificationToast';

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
}

function RuwaJayRoutes() {
  const { user, isInitializing, isPostAuthLoading } = useAuth();
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat';

  if (isInitializing) {
    return <div className="flex min-h-screen items-center justify-center bg-[#FAF5EE]"><div className="h-10 w-10 animate-spin rounded-full border-4 border-forest/20 border-t-forest" aria-label="Verificando sesión" /></div>;
  }

  if (isPostAuthLoading) return <RuwaJayLoader />;

  if (!user) {
    return (
      <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-crema font-sans text-cafe antialiased">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen w-full min-w-0 flex-col overflow-x-clip ${isChatRoute ? 'bg-[#FAF8F5]' : 'bg-crema'} font-sans text-cafe antialiased`}>
      {!isChatRoute && <Header />}
      <div className="min-w-0 flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explorar" element={<ExplorePage />} />
          <Route path="/propiedad/:id" element={<PropertyDetailPage />} />
          <Route path="/ruta" element={<RoutePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/publicar" element={<PublishPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!isChatRoute && <Footer />}
      {!isChatRoute && <MobileNav />}
      <PropertyCompareModal />
      <ChatNotificationToast />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <CompareProvider>
          <ChatProvider>
            <Router>
              <ScrollToTop />
              <RuwaJayRoutes />
            </Router>
          </ChatProvider>
        </CompareProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
