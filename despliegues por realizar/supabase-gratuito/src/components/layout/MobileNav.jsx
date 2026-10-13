import { Link, useLocation } from 'react-router-dom';
import { Home, Map, MessageSquare, Heart, User } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

const tabs = [
  { label: 'Inicio', path: '/', icon: Home },
  { label: 'Mapa', path: '/explorar?view=map', icon: Map },
  { label: 'Mensajes', path: '/chat', icon: MessageSquare, hasBadge: true },
  { label: 'Favoritos', path: '/perfil?tab=favoritos', icon: Heart },
  { label: 'Perfil', path: '/perfil', icon: User },
];

export default function MobileNav() {
  const location = useLocation();
  const { totalUnreadCount } = useChat();

  const isActive = (path) => {
    const [basePath, targetSearch = ''] = path.split('?');
    if (basePath === '/') return location.pathname === '/';
    if (location.pathname !== basePath) return false;

    const currentParams = new URLSearchParams(location.search);
    const targetParams = new URLSearchParams(targetSearch);

    if (basePath === '/explorar') {
      return (targetParams.get('view') === 'map') === (currentParams.get('view') === 'map');
    }

    if (basePath === '/perfil') {
      return (targetParams.get('tab') === 'favoritos') === (currentParams.get('tab') === 'favoritos');
    }

    return true;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      role="navigation"
      aria-label="Navegación móvil"
    >
      {/* Top accent border */}
      <div className="h-[3px] bg-gradient-to-r from-forest via-dorado to-terracota" />

      <div className="bg-glass border-t border-border-light/50">
        <div className="mx-auto grid max-w-md grid-cols-5 items-center px-1 py-1.5">
          {tabs.map(({ label, path, icon: Icon, hasBadge }) => {
            const active = isActive(path);
            return (
              <Link
                key={label}
                to={path}
                className={`flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-1 pt-1.5 pb-1 transition-all duration-300 ${
                  active ? 'text-forest' : 'text-text-muted hover:text-cafe'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <div className={`relative transition-all duration-300 ${active ? 'scale-115 -translate-y-0.5' : ''}`}>
                  <Icon
                    size={21}
                    strokeWidth={active ? 2.8 : 1.8}
                  />
                  {hasBadge && totalUnreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-terracota px-1 text-[8px] font-black text-white shadow-xs animate-pulse">
                      {totalUnreadCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold mt-0.5 leading-none ${active ? 'text-forest' : ''}`}>
                  {label}
                </span>
                {/* Active indicator bar cleanly positioned BELOW the text */}
                <div
                  className={`mt-1 h-[3px] w-5 rounded-full transition-all duration-200 ${
                    active ? 'bg-gradient-to-r from-terracota to-naranja opacity-100 scale-100' : 'bg-transparent opacity-0 scale-75'
                  }`}
                />
              </Link>
            );
          })}
        </div>
        {/* Safe area */}
        <div className="bg-glass h-[env(safe-area-inset-bottom)]" />
      </div>
    </nav>
  );
}
