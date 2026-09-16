import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, User, PlusCircle, Search, MapPin, Home, Building,
  Compass, Mountain, Palmtree, Landmark, Settings, Heart, LogOut, ChevronDown,
  MessageSquare, Calculator
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { AVATAR_OPTIONS } from '../../data/avatars';

/* ── Category tabs ── */
const categories = [
  { label: 'Casas', icon: '🏡', type: 'casa' },
  { label: 'Apartamentos', icon: '🏢', type: 'apartamento' },
  { label: 'Amueblados', icon: '🛋️', type: 'amueblado' },
];

/* ── Destination suggestions ── */
const destinations = [
  { name: 'Por tu zona', desc: 'Descubre qué hay a tu alrededor', icon: Compass, query: '' },
  { name: 'Zona 10, Guatemala', desc: 'Zona Viva — vida nocturna y comercio', icon: Building, query: 'Zona 10' },
  { name: 'Zona 14, Guatemala', desc: 'Zona financiera y residencial', icon: Landmark, query: 'Zona 14' },
  { name: 'Antigua Guatemala', desc: 'Colonial, turística y tranquila', icon: Landmark, query: 'Antigua Guatemala' },
  { name: 'Mixco', desc: 'Accesible y bien conectada', icon: Home, query: 'Mixco' },
  { name: 'Villa Nueva', desc: 'Opciones económicas y familiares', icon: Home, query: 'Villa Nueva' },
  { name: 'San Miguel Petapa', desc: 'Residencial y en crecimiento', icon: Home, query: 'San Miguel Petapa' },
  { name: 'Quetzaltenango', desc: 'Montañas, cultura y clima fresco', icon: Mountain, query: 'Quetzaltenango' },
  { name: 'Puerto San José', desc: 'Playa y descanso', icon: Palmtree, query: 'Puerto San José' },
];

/* ── Property types for dropdown ── */
const propertyTypes = [
  { label: 'Cualquiera', value: '', icon: '🏘️' },
  { label: 'Casas', value: 'casa', icon: '🏡' },
  { label: 'Apartamentos', value: 'apartamento', icon: '🏢' },
  { label: 'Amueblados', value: 'amueblado', icon: '🛋️' },
];

export default function Header() {
  const { user, logout } = useAuth();
  const { totalUnreadCount } = useChat();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const searchBarRef = useRef(null);
  const destinationInputRef = useRef(null);
  const typeButtonRef = useRef(null);
  const priceButtonRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setActiveField(null);
    setUserMenuOpen(false);
  }, [location]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target)) {
        setActiveField(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;

      if (activeField) {
        const activeTrigger = {
          destino: destinationInputRef,
          tipo: typeButtonRef,
          precio: priceButtonRef,
        }[activeField];

        setActiveField(null);
        window.requestAnimationFrame(() => activeTrigger?.current?.focus());
        return;
      }

      setMobileOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [activeField]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const toggleField = (field) => {
    setActiveField((current) => (current === field ? null : field));
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedType) params.set('type', selectedType);
    if (priceMin) params.set('minPrice', priceMin);
    if (priceMax) params.set('maxPrice', priceMax);
    navigate(`/explorar${params.toString() ? '?' + params.toString() : ''}`);
    setActiveField(null);
    setMobileOpen(false);
  };

  const handleDestinationSelect = (query) => {
    setSearchQuery(query);
    setActiveField(null);
    setMobileOpen(false);
    if (query) {
      navigate(`/explorar?q=${encodeURIComponent(query)}`);
    }
  };

  const filteredDestinations = destinations.filter(d =>
    !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typeLabel = propertyTypes.find(t => t.value === selectedType)?.label || 'Cualquiera';

  const priceLabel = () => {
    if (priceMin && priceMax) return `Q${Number(priceMin).toLocaleString()} – Q${Number(priceMax).toLocaleString()}`;
    if (priceMin) return `Desde Q${Number(priceMin).toLocaleString()}`;
    if (priceMax) return `Hasta Q${Number(priceMax).toLocaleString()}`;
    return 'Agregar precio';
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#EBEBEB] transition-shadow duration-300 ${scrolled ? 'shadow-sm' : ''}`}>

        {/* ═══════════ ROW 1: Logo — Categories — User ═══════════ */}
        <div className="border-b border-[#EBEBEB]">
          <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">

            {/* Logo */}
            <Link to="/" className="group flex shrink-0 items-center gap-2 md:gap-3">
              <img
                src="/logo/logo.png"
                alt="RuwaJay"
                className="h-11 w-11 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105 sm:h-14 sm:w-14"
              />
              <div className="hidden flex-col leading-none min-[390px]:flex md:flex">
                <span className="text-[22px] font-black tracking-tight text-forest sm:text-[26px]">
                  Ruwa<span className="text-terracota">Jay</span>
                </span>
                <span className="text-[9px] tracking-[0.18em] uppercase font-extrabold text-dorado mt-0.5 hidden sm:block">
                  Tu hogar, tu camino
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#DDDDDD] bg-white px-3 text-left shadow-[0_2px_10px_rgba(0,0,0,0.10)] transition-shadow hover:shadow-md md:hidden"
              aria-haspopup="dialog"
              aria-expanded={mobileOpen}
            >
              <Search size={17} strokeWidth={3} className="shrink-0 text-[#222222]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-extrabold leading-4 text-[#222222]">¿A dónde?</span>
                <span className="block truncate text-[10px] font-semibold leading-4 text-[#717171]">Destino · tipo · precio</span>
              </span>
            </button>

            {/* Mobile Messages Shortcut with Unread Badge */}
            <Link
              to="/chat"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#DDDDDD] bg-white text-[#222222] shadow-[0_2px_8px_rgba(0,0,0,0.08)] md:hidden"
              aria-label="Abrir mensajes"
            >
              <MessageSquare size={18} />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-terracota px-1 text-[9px] font-black text-white shadow-xs animate-pulse">
                  {totalUnreadCount}
                </span>
              )}
            </Link>

            {/* Center: Category tabs */}
            <div className="hidden flex-1 items-center justify-center gap-10 lg:flex">
              {categories.map(({ label, icon, type }) => (
                <button
                  key={type}
                  onClick={() => {
                    const nextType = activeCategory === type ? '' : type;
                    setActiveCategory(nextType || null);
                    setSelectedType(nextType);
                    navigate(`/explorar${nextType ? '?type=' + nextType : ''}`);
                  }}
                  className={`flex items-center gap-2.5 pb-1 border-b-[3px] transition-all duration-200 cursor-pointer ${
                    activeCategory === type
                      ? 'border-[#222222] text-[#222222] font-bold'
                      : 'border-transparent text-[#717171] hover:text-[#222222] hover:border-[#DDDDDD]'
                  }`}
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="text-[15px]">{label}</span>
                </button>
              ))}
            </div>

            {/* Right: Actions */}
            <div className="ml-auto hidden shrink-0 items-center gap-3 md:flex">
              <Link
                to="/chat"
                className="relative flex items-center gap-1.5 text-[14px] font-bold text-[#222222] hover:bg-[#F7F7F7] px-3.5 py-2.5 rounded-full transition-colors whitespace-nowrap"
                title="Mensajes en vivo"
              >
                <MessageSquare size={17} className="text-[#222222]" />
                <span>Mensajes</span>
                {totalUnreadCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-terracota px-1.5 text-[11px] font-black text-white shadow-2xs">
                    {totalUnreadCount}
                  </span>
                )}
              </Link>

              <Link
                to="/publicar"
                className="text-[14px] font-bold text-[#222222] hover:bg-[#F7F7F7] px-4 py-2.5 rounded-full transition-colors whitespace-nowrap"
              >
                Anuncia tu casa
              </Link>

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 pl-3.5 pr-2 py-1.5 rounded-full border border-[#DDDDDD] hover:shadow-[0_2px_4px_rgba(0,0,0,0.18)] transition-all duration-200 bg-white"
                    aria-haspopup="true"
                    aria-expanded={userMenuOpen}
                  >
                    <Menu size={16} className="text-[#222222]" />
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-black shadow-xs" style={{ backgroundColor: (AVATAR_OPTIONS.find(a => a.id === user.avatarId) || AVATAR_OPTIONS[0]).color }}>
                      {user.avatarImage ? (
                        <img src={user.avatarImage} alt="" className="w-full h-full object-cover" />
                      ) : user.name ? (
                        user.name.charAt(0).toUpperCase()
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-[90] w-64 overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.15)]" style={{ animation: 'slide-up 0.2s cubic-bezier(0.22, 1, 0.36, 1)' }}>
                      {/* User info header */}
                      <div className="border-b border-[#EBEBEB] px-4 py-3.5">
                        <p className="text-sm font-extrabold text-[#222222] truncate">{user.name}</p>
                        <p className="text-xs text-[#717171] truncate">{user.email}</p>
                      </div>
                      {/* Menu items */}
                      <div className="py-1.5">
                        <Link
                          to="/perfil"
                          className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-semibold text-[#222222] transition-colors hover:bg-[#F7F7F7]"
                        >
                          <User size={17} className="text-[#717171]" />
                          Mi perfil
                        </Link>
                        <Link
                          to="/chat"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center justify-between px-4 py-2.5 text-[14px] font-semibold text-[#222222] transition-colors hover:bg-[#F7F7F7]"
                        >
                          <span className="flex items-center gap-3">
                            <MessageSquare size={17} className="text-[#717171]" />
                            Mensajes
                          </span>
                          {totalUnreadCount > 0 && (
                            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-terracota px-1 text-[10px] font-black text-white">
                              {totalUnreadCount}
                            </span>
                          )}
                        </Link>
                        <Link
                          to="/perfil?tab=favoritos"
                          className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-semibold text-[#222222] transition-colors hover:bg-[#F7F7F7]"
                        >
                          <Heart size={17} className="text-[#717171]" />
                          Favoritos
                        </Link>
                        <Link
                          to="/explorar?calculator=true"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-semibold text-[#222222] transition-colors hover:bg-[#F7F7F7]"
                        >
                          <Calculator size={17} className="text-forest" />
                          Calculadora 30/70
                        </Link>
                        <Link
                          to="/perfil?tab=configuracion"
                          className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-semibold text-[#222222] transition-colors hover:bg-[#F7F7F7]"
                        >
                          <Settings size={17} className="text-[#717171]" />
                          Configuración
                        </Link>
                      </div>
                      {/* Logout */}
                      <div className="border-t border-[#EBEBEB] py-1.5">
                        <button
                          type="button"
                          onClick={() => { logout(); navigate('/login'); setUserMenuOpen(false); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-[14px] font-semibold text-[#E00B41] transition-colors hover:bg-red-50"
                        >
                          <LogOut size={17} />
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-3 pl-3.5 pr-2 py-1.5 rounded-full border border-[#DDDDDD] hover:shadow-[0_2px_4px_rgba(0,0,0,0.18)] transition-all duration-200 bg-white"
                >
                  <Menu size={16} className="text-[#222222]" />
                  <div className="w-8 h-8 rounded-full bg-[#717171] flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-forest transition-colors hover:bg-forest/10 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menú"
            >
              {mobileOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        {/* ═══════════ ROW 2: Expandable tabbed search bar ═══════════ */}
        <div className={`hidden justify-center bg-white transition-all duration-300 md:flex ${scrolled ? 'py-2.5' : 'py-3'}`}>
          <div className="relative w-[calc(100%-2rem)] max-w-[850px]" ref={searchBarRef}>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
              className={`relative grid h-[66px] grid-cols-3 items-center rounded-full border transition-[background-color,border-color,box-shadow] duration-200 ease-out ${
                activeField
                  ? 'border-[#DDDDDD] bg-[#EBEBEB] shadow-[0_3px_12px_rgba(0,0,0,0.10)]'
                  : 'border-[#DDDDDD] bg-white shadow-[0_3px_12px_rgba(0,0,0,0.10)] hover:shadow-[0_5px_16px_rgba(0,0,0,0.13)]'
              }`}
              aria-label="Buscar propiedades"
            >
              {/* Destination tab */}
              <div className={`relative h-full min-w-0 ${activeField === 'destino' ? 'z-30' : 'z-10'}`}>
                <div
                  className={`search-destination-field flex h-full w-full cursor-text items-center rounded-full px-8 transition-[background-color,box-shadow] duration-200 ${
                    activeField === 'destino'
                      ? 'bg-white shadow-[0_6px_20px_rgba(0,0,0,0.16)]'
                      : activeField ? 'hover:bg-black/[0.04]' : 'hover:bg-[#F7F7F7]'
                  }`}
                  onClick={() => {
                    setActiveField('destino');
                    destinationInputRef.current?.focus();
                  }}
                >
                  <label htmlFor="header-destination" className="flex min-w-0 w-full cursor-text flex-col justify-center select-none">
                    <span className="text-[12px] font-bold leading-4 text-[#222222]">
                      Destino
                    </span>
                    <input
                      ref={destinationInputRef}
                      id="header-destination"
                      type="text"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls="destination-search-panel"
                      aria-expanded={activeField === 'destino'}
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setActiveField('destino'); }}
                      onFocus={() => setActiveField('destino')}
                      placeholder="Buscar destinos"
                      className="search-pill-input w-full min-w-0 truncate border-none bg-transparent p-0 text-[14px] font-normal leading-[18px] text-[#222222] outline-none placeholder:text-[#717171] focus:outline-none focus:ring-0"
                    />
                  </label>
                </div>

                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute right-0 top-1/2 h-8 w-px -translate-y-1/2 bg-[#D7D7D7] transition-opacity duration-150 ${
                    activeField === 'destino' || activeField === 'tipo' ? 'opacity-0' : 'opacity-100'
                  }`}
                />

                {activeField === 'destino' && (
                  <div
                    id="destination-search-panel"
                    role="listbox"
                    aria-label="Sugerencias de destinos"
                    className="search-dropdown-panel absolute left-0 top-[78px] z-[80] flex flex-col overflow-hidden rounded-[30px] border border-[#E5E5E5] bg-white p-3 shadow-[0_18px_46px_rgba(0,0,0,0.16)]"
                    style={{
                      width: 'min(600px, calc(100vw - 2rem))',
                      maxHeight: 'min(520px, calc(100dvh - 190px))',
                    }}
                  >
                    <p className="shrink-0 px-3 pb-3 pt-2 text-[15px] font-extrabold leading-6 text-[#222222] lg:text-[16px]">
                      Sugerencias de destinos
                    </p>
                    <div className="min-h-0 space-y-1 overflow-y-auto overflow-x-hidden pr-1">
                      {filteredDestinations.length > 0 ? filteredDestinations.map(({ name, desc, icon: Icon, query }) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={searchQuery === (query || name)}
                          key={name}
                          onClick={() => handleDestinationSelect(query || name)}
                          className="group flex min-h-[64px] w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-[#F7F7F7]"
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F2F2F2] transition-colors group-hover:bg-[#EAEAEA]">
                            <Icon size={21} aria-hidden="true" className="text-[#484848]" />
                          </span>
                          <span className="min-w-0 flex-1 break-words">
                            <span className="block text-[15px] font-bold leading-[22px] text-[#222222]">{name}</span>
                            <span className="mt-0.5 block text-[13px] leading-5 text-[#717171] lg:text-[14px]">{desc}</span>
                          </span>
                        </button>
                      )) : (
                        <p className="px-3 py-5 text-[14px] leading-5 text-[#717171]">
                          No encontramos destinos con ese nombre.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Property type tab */}
              <div className={`relative h-full min-w-0 ${activeField === 'tipo' ? 'z-30' : 'z-10'}`}>
                <button
                  ref={typeButtonRef}
                  type="button"
                  onClick={() => toggleField('tipo')}
                  aria-expanded={activeField === 'tipo'}
                  aria-controls="property-type-panel"
                  className={`flex h-full w-full min-w-0 flex-col justify-center rounded-full px-6 text-left transition-[background-color,box-shadow] duration-200 focus-visible:rounded-full ${
                    activeField === 'tipo'
                      ? 'bg-white shadow-[0_6px_20px_rgba(0,0,0,0.16)]'
                      : activeField ? 'hover:bg-black/[0.04]' : 'hover:bg-[#F7F7F7]'
                  }`}
                >
                  <span className="text-[12px] font-bold leading-4 text-[#222222]">Tipo</span>
                  <span className={`block w-full truncate text-[14px] font-normal leading-[18px] ${selectedType ? 'text-[#222222]' : 'text-[#717171]'}`}>
                    {typeLabel}
                  </span>
                </button>

                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute right-0 top-1/2 h-8 w-px -translate-y-1/2 bg-[#D7D7D7] transition-opacity duration-150 ${
                    activeField === 'tipo' || activeField === 'precio' ? 'opacity-0' : 'opacity-100'
                  }`}
                />

                {activeField === 'tipo' && (
                  <div
                    id="property-type-panel"
                    role="listbox"
                    aria-label="Tipo de propiedad"
                    className="search-dropdown-panel absolute left-1/2 top-[78px] z-[80] flex -translate-x-1/2 flex-col overflow-hidden rounded-[30px] border border-[#E5E5E5] bg-white p-3 shadow-[0_18px_46px_rgba(0,0,0,0.16)]"
                    style={{
                      width: 'min(400px, calc(100vw - 2rem))',
                      maxHeight: 'min(460px, calc(100dvh - 190px))',
                    }}
                  >
                    <p className="shrink-0 px-3 pb-3 pt-2 text-[15px] font-extrabold leading-6 text-[#222222] lg:text-[16px]">
                      Tipo de propiedad
                    </p>
                    <div className="min-h-0 space-y-1 overflow-y-auto overflow-x-hidden pr-1">
                      {propertyTypes.map(({ label, value, icon }) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedType === value}
                          key={label}
                          onClick={() => {
                            setSelectedType(value);
                            setActiveCategory(value || null);
                            setActiveField(null);
                          }}
                          className={`flex min-h-[60px] w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left text-[15px] font-semibold leading-[22px] transition-colors ${
                            selectedType === value
                              ? 'bg-[#F2F2F2] font-extrabold text-[#222222]'
                              : 'text-[#222222] hover:bg-[#F7F7F7]'
                          }`}
                        >
                          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F2F2F2] text-xl">
                            {icon}
                          </span>
                          <span className="min-w-0 flex-1 break-words">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly price tab */}
              <div className={`relative h-full min-w-0 ${activeField === 'precio' ? 'z-30' : 'z-10'}`}>
                <button
                  ref={priceButtonRef}
                  type="button"
                  onClick={() => toggleField('precio')}
                  aria-expanded={activeField === 'precio'}
                  aria-controls="price-search-panel"
                  className={`flex h-full w-full min-w-0 flex-col justify-center rounded-full pl-6 pr-[72px] text-left transition-[background-color,box-shadow] duration-200 focus-visible:rounded-full ${
                    activeField === 'precio'
                      ? 'bg-white shadow-[0_6px_20px_rgba(0,0,0,0.16)]'
                      : activeField ? 'hover:bg-black/[0.04]' : 'hover:bg-[#F7F7F7]'
                  }`}
                >
                  <span className="text-[12px] font-bold leading-4 text-[#222222]">Precio</span>
                  <span className={`block w-full truncate text-[14px] font-normal leading-[18px] ${(priceMin || priceMax) ? 'text-[#222222]' : 'text-[#717171]'}`}>
                    {priceLabel()}
                  </span>
                </button>

                {activeField === 'precio' && (
                  <div
                    id="price-search-panel"
                    role="dialog"
                    aria-labelledby="price-search-title"
                    className="search-dropdown-panel absolute right-0 top-[78px] z-[80] flex flex-col overflow-hidden rounded-[30px] border border-[#E5E5E5] bg-white shadow-[0_18px_46px_rgba(0,0,0,0.16)]"
                    style={{
                      width: 'min(420px, calc(100vw - 2rem))',
                      maxHeight: 'min(510px, calc(100dvh - 190px))',
                    }}
                  >
                    <p id="price-search-title" className="shrink-0 px-6 pb-3 pt-5 text-[15px] font-extrabold leading-6 text-[#222222] lg:text-[16px]">
                      Rango de precio mensual
                    </p>
                    <div className="min-h-0 overflow-y-auto overflow-x-hidden px-6 pb-5">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2.5">
                        <div className="min-w-0">
                          <label htmlFor="header-min-price" className="mb-1 block text-[12px] font-bold uppercase tracking-wider text-[#717171]">Mínimo</label>
                          <div className="flex items-center gap-1.5 rounded-2xl border border-[#DDDDDD] bg-white px-3.5 py-2.5 transition-colors focus-within:border-[#D4962A] focus-within:ring-1 focus-within:ring-[#D4962A]">
                            <span className="text-[13px] font-bold text-[#717171]">Q</span>
                            <input
                              id="header-min-price"
                              type="number"
                              min="0"
                              inputMode="numeric"
                              value={priceMin}
                              onChange={(e) => setPriceMin(e.target.value)}
                              placeholder="0"
                              className="search-pill-input w-full min-w-0 border-none bg-transparent p-0 text-[14px] font-semibold text-[#222222] outline-none placeholder:text-[#B0B0B0] focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                        <span aria-hidden="true" className="pb-2.5 font-bold text-[#717171]">—</span>
                        <div className="min-w-0">
                          <label htmlFor="header-max-price" className="mb-1 block text-[12px] font-bold uppercase tracking-wider text-[#717171]">Máximo</label>
                          <div className="flex items-center gap-1.5 rounded-2xl border border-[#DDDDDD] bg-white px-3.5 py-2.5 transition-colors focus-within:border-[#D4962A] focus-within:ring-1 focus-within:ring-[#D4962A]">
                            <span className="text-[13px] font-bold text-[#717171]">Q</span>
                            <input
                              id="header-max-price"
                              type="number"
                              min="0"
                              inputMode="numeric"
                              value={priceMax}
                              onChange={(e) => setPriceMax(e.target.value)}
                              placeholder="10,000"
                              className="search-pill-input w-full min-w-0 border-none bg-transparent p-0 text-[14px] font-semibold text-[#222222] outline-none placeholder:text-[#B0B0B0] focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="my-4 border-t border-[#EBEBEB]" />

                      <p className="mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[#717171]">Precios rápidos</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Hasta Q3,000', min: '', max: '3000' },
                          { label: 'Q3,000 – Q5,000', min: '3000', max: '5000' },
                          { label: 'Q5,000 – Q8,000', min: '5000', max: '8000' },
                          { label: 'Q8,000+', min: '8000', max: '' },
                        ].map(({ label, min, max }) => (
                          <button
                            type="button"
                            key={label}
                            onClick={() => { setPriceMin(min); setPriceMax(max); }}
                            className={`min-h-10 whitespace-normal rounded-full border px-3.5 py-2 text-left text-[13px] font-semibold leading-5 transition-colors ${
                              priceMin === min && priceMax === max
                                ? 'border-[#222222] bg-[#222222] font-bold text-white'
                                : 'border-[#DDDDDD] text-[#222222] hover:bg-[#F7F7F7]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-[#EBEBEB] pt-4">
                        <button
                          type="button"
                          onClick={() => { setPriceMin(''); setPriceMax(''); }}
                          className="min-h-11 rounded-full px-2 text-[14px] font-bold text-[#222222] underline transition-colors hover:text-black"
                        >
                          Borrar
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveField(null)}
                          className="min-h-11 rounded-full bg-[#222222] px-6 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-black"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Airbnb-style circular action, inset 8px from the pill edge */}
              <button
                type="submit"
                aria-label="Buscar propiedades"
                className="absolute right-2 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#E00B41] text-white shadow-[0_4px_12px_rgba(224,11,65,0.24)] transition-[background-color,box-shadow,transform] duration-150 hover:bg-[#C90838] hover:shadow-[0_6px_16px_rgba(224,11,65,0.30)] active:scale-[0.96] focus-visible:rounded-full"
              >
                <Search size={16} strokeWidth={4} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Spacer to push content below fixed header */}
      <div className={`hidden md:block transition-all duration-300 ${scrolled ? 'h-[158px]' : 'h-[162px]'}`} />
      <div className="block md:hidden h-[72px]" />

      {/* Mobile search and navigation sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-search-title"
            className="absolute left-3 right-3 top-[76px] max-h-[calc(100dvh-92px)] overflow-y-auto rounded-[28px] border border-border bg-white p-4 shadow-popup sm:left-6 sm:right-6 sm:p-5"
            style={{ animation: 'slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="mobile-search-title" className="text-lg font-black leading-tight text-cafe">Busca tu próximo hogar</h2>
                <p className="mt-1 text-xs font-semibold text-text-muted">Ajusta la búsqueda sin salir del menú.</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-cafe"
                aria-label="Cerrar búsqueda"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4">
              <div>
                <label htmlFor="mobile-header-destination" className="mb-1.5 block text-xs font-extrabold text-cafe">Destino</label>
                <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-crema/50 px-4 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/10">
                  <Search size={17} className="shrink-0 text-text-muted" />
                  <input
                    id="mobile-header-destination"
                    type="text"
                    placeholder="¿Dónde quieres vivir?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-w-0 flex-1 border-none bg-transparent p-0 text-[15px] font-semibold text-cafe outline-none placeholder:text-text-muted focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              {searchQuery && filteredDestinations.length > 0 && (
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-2xl border border-border bg-white p-1.5">
                  {filteredDestinations.slice(0, 4).map(({ name, query }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleDestinationSelect(query || name)}
                      className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold text-cafe hover:bg-crema"
                    >
                      <MapPin size={16} className="shrink-0 text-terracota" />
                      <span className="min-w-0 break-words">{name}</span>
                    </button>
                  ))}
                </div>
              )}

              <fieldset>
                <legend className="mb-1.5 text-xs font-extrabold text-cafe">Tipo de propiedad</legend>
                <div className="grid grid-cols-2 gap-2">
                  {propertyTypes.map(({ label, value, icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setSelectedType(value);
                        setActiveCategory(value || null);
                      }}
                      className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-3 text-left text-xs font-extrabold transition-colors ${
                        selectedType === value
                          ? 'border-forest bg-forest text-white'
                          : 'border-border bg-white text-cafe hover:bg-crema'
                      }`}
                    >
                      <span aria-hidden="true" className="shrink-0 text-base">{icon}</span>
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                <label className="min-w-0 text-xs font-extrabold text-cafe">
                  Precio mínimo
                  <span className="mt-1.5 flex min-h-12 items-center gap-2 rounded-2xl border border-border px-3 text-sm">
                    <span className="text-text-muted">Q</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="0"
                      className="min-w-0 flex-1 border-none bg-transparent p-0 outline-none focus:ring-0"
                    />
                  </span>
                </label>
                <label className="min-w-0 text-xs font-extrabold text-cafe">
                  Precio máximo
                  <span className="mt-1.5 flex min-h-12 items-center gap-2 rounded-2xl border border-border px-3 text-sm">
                    <span className="text-text-muted">Q</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="10,000"
                      className="min-w-0 flex-1 border-none bg-transparent p-0 outline-none focus:ring-0"
                    />
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#E00B41] px-6 text-sm font-extrabold text-white shadow-[0_5px_16px_rgba(224,11,65,0.25)]"
              >
                <Search size={17} strokeWidth={3} /> Buscar propiedades
              </button>
            </form>

            <nav className="mt-4 space-y-1 border-t border-border pt-3" aria-label="Menú principal móvil">
              <Link to="/explorar" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-bold text-cafe transition-colors hover:bg-crema">
                <Search size={18} className="text-text-muted" /> Explorar viviendas
              </Link>
              <Link to="/explorar?view=map" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-bold text-cafe transition-colors hover:bg-crema">
                <MapPin size={18} className="text-text-muted" /> Mapa interactivo
              </Link>
              <Link to="/explorar?calculator=true" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-bold text-cafe transition-colors hover:bg-crema">
                <Calculator size={18} className="text-forest" /> Calculadora 30/70
              </Link>

              {user ? (
                <>
                  <Link to="/perfil" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-bold text-cafe transition-colors hover:bg-crema">
                    <User size={18} className="text-text-muted" /> Mi perfil
                  </Link>
                  <Link to="/perfil?tab=favoritos" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-bold text-cafe transition-colors hover:bg-crema">
                    <Heart size={18} className="text-text-muted" /> Favoritos
                  </Link>
                  <Link to="/perfil?tab=configuracion" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-bold text-cafe transition-colors hover:bg-crema">
                    <Settings size={18} className="text-text-muted" /> Configuración
                  </Link>
                  <button
                    type="button"
                    onClick={() => { logout(); navigate('/login'); setMobileOpen(false); }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[14px] font-bold text-[#E00B41] transition-colors hover:bg-red-50"
                  >
                    <LogOut size={18} /> Cerrar sesión
                  </button>
                </>
              ) : (
                <Link to="/login" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-bold text-cafe transition-colors hover:bg-crema">
                  <User size={18} className="text-text-muted" /> Inicia sesión
                </Link>
              )}

              <div className="pt-2">
                <Link
                  to="/publicar"
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-5 text-[14px] font-extrabold text-white shadow-md transition-all hover:bg-forest-dark"
                >
                  <PlusCircle size={18} /> Anuncia tu casa
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
