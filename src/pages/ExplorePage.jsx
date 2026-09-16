import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X, MapPin, List, Map as MapIcon, Navigation,
  Home, Building2, PawPrint, Car, Sofa, CheckCircle, Eye, TreePine,
  Shield, Droplets, ArrowUpDown, BookmarkPlus, Bookmark, Calculator, Sparkles
} from 'lucide-react';
import PropertyCard from '../components/property/PropertyCard';
import { demoProperties, calculateDistance, popularMunicipalities } from '../data/properties';
import { useGeolocation } from '../hooks/useGeolocation';
import RuwaSelect from '../components/ui/RuwaSelect';
import { GUATEMALA_DEPARTMENTS, getZonesForDepartment, getCoordinatesForDepartment, getCoordinatesForLocation } from '../data/guatemalaLocations';
import SaveSearchModal from '../components/property/SaveSearchModal';
import RentAffordabilityModal from '../components/property/RentAffordabilityModal';

const MapView = lazy(() => import('../components/map/MapView'));

// Filter options
const RADIUS_OPTIONS = [
  { value: 2, label: '2 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: null, label: 'Todas' },
];

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recomendados' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'area_desc', label: 'Mayor área (m²)' },
  { value: 'bedrooms_desc', label: 'Más habitaciones' },
  { value: 'closest', label: 'Más cercanos' },
];

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = searchParams.get('view') === 'map' ? 'map' : 'list';
  const nearbyMode = searchParams.get('nearby') === 'true';
  const urlQuery = searchParams.get('q') || '';
  const urlType = searchParams.get('type') || null;
  const urlPriceMin = searchParams.get('minPrice') || '';
  const urlPriceMax = searchParams.get('maxPrice') || '';
  const urlDept = searchParams.get('department') || 'Todos';
  const urlZone = searchParams.get('zone') || 'Todas las zonas y sectores';

  const { position, requestPosition, setManualPosition, loading: geoLoading, permissionState } = useGeolocation();
  const [showLocationPrompt, setShowLocationPrompt] = useState(nearbyMode && !position);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [radarRadius, setRadarRadius] = useState(10);
  const [radarActive, setRadarActive] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');

  // Filters state
  const [filters, setFilters] = useState({
    type: urlType,
    priceMin: urlPriceMin,
    priceMax: urlPriceMax,
    bedrooms: null,
    bathrooms: null,
    furnished: false,
    petsAllowed: false,
    parking: false,
    patio: false,
    verified: false,
    visitAvailable: false,
    department: urlDept,
    zone: urlZone,
    security: false,
    waterGuaranteed: false,
  });

  // Dynamically calculate available zones based on selected department
  const availableZones = useMemo(() => {
    return getZonesForDepartment(filters.department);
  }, [filters.department]);

  // Geographic center for auto-centering map based on Department AND Zone
  const focusCoordinates = useMemo(() => {
    return getCoordinatesForLocation(filters.department, filters.zone);
  }, [filters.department, filters.zone]);

  // Modals and Saved Searches state
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [showAffordabilityModal, setShowAffordabilityModal] = useState(
    searchParams.get('calculator') === 'true' || searchParams.get('calculadora') === 'true'
  );
  const [savedSearches, setSavedSearches] = useState([]);

  useEffect(() => {
    if (searchParams.get('calculator') === 'true' || searchParams.get('calculadora') === 'true') {
      setShowAffordabilityModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem('ruwajay_saved_searches') || '[]');
      setSavedSearches(items);
    } catch {
      setSavedSearches([]);
    }
  }, []);

  const refreshSavedSearches = () => {
    try {
      const items = JSON.parse(localStorage.getItem('ruwajay_saved_searches') || '[]');
      setSavedSearches(items);
    } catch {}
  };

  const handleApplySavedSearch = (saved) => {
    if (!saved?.filters) return;
    setFilters({ ...saved.filters });
    if (saved.searchQuery) setSearchQuery(saved.searchQuery);
  };

  // Handle department change with cascading zone reset
  const handleDepartmentChange = (newDept) => {
    const newZones = getZonesForDepartment(newDept);
    const isStillValid = newZones.includes(filters.zone);
    setFilters((prev) => ({
      ...prev,
      department: newDept,
      zone: isStillValid ? prev.zone : newZones[0],
    }));
  };

  // Active filter pills with 1-click removal
  const activeFilterPills = useMemo(() => {
    const pills = [];

    if (filters.department && filters.department !== 'Todos') {
      pills.push({
        id: 'dept',
        label: `Depto: ${filters.department}`,
        onRemove: () => handleDepartmentChange('Todos'),
      });
    }

    if (
      filters.zone &&
      !filters.zone.toLowerCase().startsWith('todas') &&
      !filters.zone.toLowerCase().startsWith('todos')
    ) {
      pills.push({
        id: 'zone',
        label: `Zona: ${filters.zone.split('(')[0].trim()}`,
        onRemove: () => setFilters((f) => ({ ...f, zone: availableZones[0] })),
      });
    }

    if (filters.type) {
      pills.push({
        id: 'type',
        label: filters.type === 'casa' ? 'Casa' : 'Apartamento',
        onRemove: () => setFilters((f) => ({ ...f, type: null })),
      });
    }

    if (filters.priceMin) {
      pills.push({
        id: 'priceMin',
        label: `Min: Q${Number(filters.priceMin).toLocaleString('es-GT')}`,
        onRemove: () => setFilters((f) => ({ ...f, priceMin: '' })),
      });
    }

    if (filters.priceMax) {
      pills.push({
        id: 'priceMax',
        label: `Max: Q${Number(filters.priceMax).toLocaleString('es-GT')}`,
        onRemove: () => setFilters((f) => ({ ...f, priceMax: '' })),
      });
    }

    if (filters.bedrooms) {
      pills.push({
        id: 'bedrooms',
        label: `${filters.bedrooms}+ Habs`,
        onRemove: () => setFilters((f) => ({ ...f, bedrooms: null })),
      });
    }

    if (filters.bathrooms) {
      pills.push({
        id: 'bathrooms',
        label: `${filters.bathrooms}+ Baños`,
        onRemove: () => setFilters((f) => ({ ...f, bathrooms: null })),
      });
    }

    if (filters.furnished) {
      pills.push({
        id: 'furnished',
        label: 'Amueblado',
        onRemove: () => setFilters((f) => ({ ...f, furnished: false })),
      });
    }

    if (filters.petsAllowed) {
      pills.push({
        id: 'pets',
        label: 'Mascotas permitidas',
        onRemove: () => setFilters((f) => ({ ...f, petsAllowed: false })),
      });
    }

    if (filters.parking) {
      pills.push({
        id: 'parking',
        label: 'Con Parqueo',
        onRemove: () => setFilters((f) => ({ ...f, parking: false })),
      });
    }

    if (filters.patio) {
      pills.push({
        id: 'patio',
        label: 'Patio / Jardín',
        onRemove: () => setFilters((f) => ({ ...f, patio: false })),
      });
    }

    if (filters.verified) {
      pills.push({
        id: 'verified',
        label: 'DPI Verificado',
        onRemove: () => setFilters((f) => ({ ...f, verified: false })),
      });
    }

    if (filters.security) {
      pills.push({
        id: 'security',
        label: 'Garita 24/7',
        onRemove: () => setFilters((f) => ({ ...f, security: false })),
      });
    }

    if (filters.waterGuaranteed) {
      pills.push({
        id: 'water',
        label: 'Agua garantizada',
        onRemove: () => setFilters((f) => ({ ...f, waterGuaranteed: false })),
      });
    }

    if (filters.visitAvailable) {
      pills.push({
        id: 'visit',
        label: 'Visita disponible',
        onRemove: () => setFilters((f) => ({ ...f, visitAvailable: false })),
      });
    }

    return pills;
  }, [filters, availableZones]);

  useEffect(() => {
    setSearchQuery(urlQuery);
    setFilters((current) => ({
      ...current,
      type: urlType,
      priceMin: urlPriceMin,
      priceMax: urlPriceMax,
    }));
  }, [urlQuery, urlType, urlPriceMin, urlPriceMax]);

  // Request location on mount if nearby mode
  useEffect(() => {
    if (nearbyMode && !position && permissionState === 'granted') {
      requestPosition();
    }
  }, [nearbyMode, permissionState]);

  // Start radar animation when position is obtained
  useEffect(() => {
    if (position) {
      setRadarActive(true);
      setShowLocationPrompt(false);
      const timer = setTimeout(() => setRadarActive(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [position]);

  // Combine demo properties and user custom properties from localStorage
  const allProperties = useMemo(() => {
    let custom = [];
    try {
      const stored = JSON.parse(localStorage.getItem('ruwajay_custom_properties') || '[]');
      custom = stored.map((item) => ({
        id: item.id,
        type: item.type || 'casa',
        title: item.title,
        description: item.description || '',
        price: Number(item.price) || 3500,
        deposit: Number(item.deposit) || Number(item.price) || 3500,
        currency: 'Q',
        bedrooms: Number(item.bedrooms) || 2,
        bathrooms: Number(item.bathrooms) || 1,
        area: 120,
        areaUnit: 'm²',
        parking: 1,
        furnished: false,
        petsAllowed: true,
        patio: true,
        servicesIncluded: ['Agua', 'Seguridad 24/7'],
        address: {
          approximate: item.approximateAddress || `${item.zone || 'Zona 10'}, ${item.municipality || 'Guatemala'}`,
          exact: item.exactAddress || item.approximateAddress || '',
          department: item.department || 'Guatemala',
          municipality: item.municipality || 'Guatemala',
          zone: item.zone || 'Zona 10',
        },
        coordinates: {
          lat: 14.6000 + (Math.random() * 0.04 - 0.02),
          lng: -90.5100 + (Math.random() * 0.04 - 0.02),
        },
        images: {
          fachada: ['/Casas/cat-familiar.jpg'],
        },
        thumbnail: '/Casas/cat-familiar.jpg',
        thumbnails: ['/Casas/cat-familiar.jpg'],
        status: item.status || 'disponible',
        verified: true,
        visitAvailable: true,
        availableDate: 'Inmediata',
        ownerId: item.ownerId || 'current-user',
        isNew: true,
        createdAt: item.createdAt || new Date().toISOString(),
      }));
    } catch {
      custom = [];
    }
    return [...demoProperties, ...custom];
  }, []);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let props = [...allProperties];

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      props = props.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.address.approximate.toLowerCase().includes(q) ||
          p.address.municipality.toLowerCase().includes(q) ||
          p.address.department.toLowerCase().includes(q) ||
          (p.address.zone && p.address.zone.toLowerCase().includes(q))
      );
    }

    // Type filter
    if (filters.type) {
      props = filters.type === 'amueblado'
        ? props.filter((p) => p.furnished)
        : props.filter((p) => p.type === filters.type);
    }

    // Price range
    if (filters.priceMin) {
      props = props.filter((p) => p.price >= Number(filters.priceMin));
    }
    if (filters.priceMax) {
      props = props.filter((p) => p.price <= Number(filters.priceMax));
    }

    // Bedrooms
    if (filters.bedrooms) {
      props = props.filter((p) => p.bedrooms >= filters.bedrooms);
    }

    // Bathrooms
    if (filters.bathrooms) {
      props = props.filter((p) => p.bathrooms >= filters.bathrooms);
    }

    // Guatemala Department filter
    if (filters.department && filters.department !== 'Todos') {
      props = props.filter(
        (p) => p.address?.department?.toLowerCase() === filters.department.toLowerCase()
      );
    }

    // Guatemala Zone / Sector filter (cascading matching)
    if (
      filters.zone &&
      !filters.zone.toLowerCase().startsWith('todas') &&
      !filters.zone.toLowerCase().startsWith('todos')
    ) {
      props = props.filter((p) => {
        const cleanZone = filters.zone.split('(')[0].trim().toLowerCase();
        const addressZone = (p.address?.zone || '').trim().toLowerCase();
        const addressMuni = (p.address?.municipality || '').trim().toLowerCase();
        const addressApprox = (p.address?.approximate || '').trim().toLowerCase();
        const title = (p.title || '').toLowerCase();

        if (addressZone === cleanZone) return true;

        const zoneNumMatch = cleanZone.match(/^zona\s*(\d+)$/);
        if (zoneNumMatch) {
          const targetNum = zoneNumMatch[1];
          const addrMatch = addressZone.match(/^zona\s*(\d+)$/);
          if (addrMatch) return addrMatch[1] === targetNum;
          const wordRegex = new RegExp(`\\bzona\\s*${targetNum}\\b`, 'i');
          return wordRegex.test(addressZone) || wordRegex.test(addressApprox) || wordRegex.test(title);
        }

        return (
          addressZone.includes(cleanZone) ||
          addressMuni.includes(cleanZone) ||
          addressApprox.includes(cleanZone) ||
          title.includes(cleanZone)
        );
      });
    }

    // Boolean filters
    if (filters.furnished) props = props.filter((p) => p.furnished);
    if (filters.petsAllowed) props = props.filter((p) => p.petsAllowed);
    if (filters.parking) props = props.filter((p) => p.parking > 0);
    if (filters.patio) props = props.filter((p) => p.patio);
    if (filters.verified) props = props.filter((p) => p.verified);
    if (filters.visitAvailable) props = props.filter((p) => p.visitAvailable);

    // Guatemala Security / Garita filter
    if (filters.security) {
      props = props.filter((p) =>
        p.servicesIncluded?.some(
          (s) =>
            s.toLowerCase().includes('seguridad') ||
            s.toLowerCase().includes('garita') ||
            s.toLowerCase().includes('vigilancia')
        )
      );
    }

    // Water guaranteed filter
    if (filters.waterGuaranteed) {
      props = props.filter((p) =>
        p.servicesIncluded?.some(
          (s) =>
            s.toLowerCase().includes('agua') ||
            s.toLowerCase().includes('cisterna') ||
            s.toLowerCase().includes('pozo')
        )
      );
    }

    // Distance filter
    if (position && radarRadius) {
      props = props.filter((p) => {
        const dist = calculateDistance(
          position.lat, position.lng,
          p.coordinates.lat, p.coordinates.lng
        );
        return dist <= radarRadius;
      });
    }

    // Sorting
    if (sortBy === 'price_asc') {
      props.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      props.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'area_desc') {
      props.sort((a, b) => (b.area || 0) - (a.area || 0));
    } else if (sortBy === 'bedrooms_desc') {
      props.sort((a, b) => (b.bedrooms || 0) - (a.bedrooms || 0));
    } else if (sortBy === 'closest' && position) {
      props.sort((a, b) => {
        const distA = calculateDistance(position.lat, position.lng, a.coordinates.lat, a.coordinates.lng);
        const distB = calculateDistance(position.lat, position.lng, b.coordinates.lat, b.coordinates.lng);
        return distA - distB;
      });
    } else if (position) {
      props.sort((a, b) => {
        const distA = calculateDistance(position.lat, position.lng, a.coordinates.lat, a.coordinates.lng);
        const distB = calculateDistance(position.lat, position.lng, b.coordinates.lat, b.coordinates.lng);
        return distA - distB;
      });
    }

    return props;
  }, [allProperties, searchQuery, filters, position, radarRadius, sortBy]);

  // Split nearby / farther
  const nearbyProps = position
    ? filteredProperties.filter((p) => calculateDistance(position.lat, position.lng, p.coordinates.lat, p.coordinates.lng) <= 5)
    : [];
  const fartherProps = position
    ? filteredProperties.filter((p) => calculateDistance(position.lat, position.lng, p.coordinates.lat, p.coordinates.lng) > 5)
    : [];

  const handleLocationAllow = () => {
    requestPosition();
    setShowLocationPrompt(false);
  };

  const handleManualLocation = (muni) => {
    setManualPosition(muni.lat, muni.lng);
    setSearchQuery(muni.name);
    setShowLocationPrompt(false);
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'department') return v && v !== 'Todos';
    if (k === 'zone') return v && !v.toLowerCase().startsWith('todas') && !v.toLowerCase().startsWith('todos');
    return v !== null && v !== '' && v !== false;
  }).length;

  const clearFilters = () => {
    setFilters({
      type: null,
      priceMin: '',
      priceMax: '',
      bedrooms: null,
      bathrooms: null,
      furnished: false,
      petsAllowed: false,
      parking: false,
      patio: false,
      verified: false,
      visitAvailable: false,
      department: 'Todos',
      zone: 'Todas las zonas y sectores',
      security: false,
      waterGuaranteed: false,
    });
  };

  return (
    <main className="min-h-screen bg-crema pb-24 pt-4 sm:pt-6 md:pb-12 lg:pt-8">
      {/* Location prompt modal */}
      {showLocationPrompt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/40 p-3 sm:p-4">
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-popup animate-[slide-up_0.4s_ease-out] sm:max-h-[calc(100dvh-2rem)] sm:p-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-jade/10 flex items-center justify-center mx-auto mb-4">
                <MapPin size={32} className="text-jade" />
              </div>
              <h3 className="text-xl font-extrabold text-cafe mb-2">
                ¿Dónde buscamos tu hogar?
              </h3>
              <p className="text-sm text-text-secondary mb-6">
                Usaremos tu ubicación únicamente para mostrarte viviendas cercanas y calcular la ruta. Tú decides cuándo compartirla.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleLocationAllow}
                  className="w-full py-3 bg-terracota hover:bg-terracota-dark text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <MapPin size={18} />
                  Permitir ubicación
                </button>
                <div className="text-xs text-text-muted font-semibold mt-1 mb-2">
                  O elige una ubicación:
                </div>
                <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto min-[360px]:grid-cols-2">
                  {popularMunicipalities.map((muni) => (
                    <button
                      key={muni.name}
                      onClick={() => handleManualLocation(muni)}
                      className="min-h-11 rounded-lg bg-crema px-3 py-2 text-left text-sm font-semibold text-cafe transition-colors hover:bg-forest/10"
                    >
                      {muni.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowLocationPrompt(false)}
                  className="mt-2 text-sm font-semibold text-text-muted hover:text-cafe transition-colors"
                >
                  Ahora no
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and filter bar */}
      <div className="mx-auto mb-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-stretch gap-3">
          {/* Search input */}
          <div className="relative w-full min-w-0 lg:min-w-[300px] lg:flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por zona, municipio o departamento..."
              className="w-full rounded-xl border border-border bg-white py-3 pl-11 pr-14 text-sm font-medium text-cafe outline-none transition-all focus:border-forest focus:ring-2 focus:ring-forest/20"
              id="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-text-muted hover:bg-crema hover:text-cafe"
                aria-label="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Radius selector (only when position is available) */}
          {position && (
            <div className="no-scrollbar flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-white px-2 py-1 sm:w-auto">
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setRadarRadius(opt.value)}
                  className={`min-h-11 shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                    radarRadius === opt.value
                      ? 'bg-forest text-white'
                      : 'text-cafe hover:bg-forest/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Sort selector */}
          <div className="flex min-h-12 items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-cafe shadow-xs sm:flex-none">
            <ArrowUpDown size={15} className="text-forest shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent font-extrabold text-cafe outline-none cursor-pointer pr-1 text-xs"
              aria-label="Ordenar resultados"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all sm:flex-none ${
              showFilters || activeFilterCount > 0
                ? 'bg-forest text-white border-forest'
                : 'bg-white text-cafe border-border hover:border-forest'
            }`}
          >
            <SlidersHorizontal size={18} />
            Filtros
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-terracota text-white text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View toggle */}
          <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-border bg-white sm:flex-none">
            <button
              onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), view: 'list' })}
              className={`flex min-h-12 flex-1 items-center justify-center gap-1.5 px-3 py-3 text-sm font-bold transition-all sm:px-4 ${
                viewMode === 'list' ? 'bg-forest text-white' : 'text-cafe hover:bg-forest/10'
              }`}
            >
              <List size={18} />
              Lista
            </button>
            <button
              onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), view: 'map' })}
              className={`flex min-h-12 flex-1 items-center justify-center gap-1.5 px-3 py-3 text-sm font-bold transition-all sm:px-4 ${
                viewMode === 'map' ? 'bg-forest text-white' : 'text-cafe hover:bg-forest/10'
              }`}
            >
              <MapIcon size={18} />
              Mapa
            </button>
          </div>

          {/* Location button */}
          {!position && (
            <button
              onClick={() => setShowLocationPrompt(true)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracota px-4 py-3 text-sm font-bold text-white transition-all hover:bg-terracota-dark sm:w-auto"
            >
              <MapPin size={18} />
              Mi ubicación
            </button>
          )}
        </div>

        {/* Quick Actions Bar (Save Search & Rent Affordability Calculator) */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSaveSearchModal(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-bold text-cafe hover:border-forest/50 hover:bg-[#FDFBF7] transition-all shadow-2xs"
            >
              <BookmarkPlus size={15} className="text-forest" />
              Guardar esta búsqueda
            </button>

            <button
              type="button"
              onClick={() => setShowAffordabilityModal(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-dorado/30 bg-dorado/10 px-3.5 py-2 text-xs font-bold text-cafe hover:bg-dorado/15 transition-all shadow-2xs"
            >
              <Calculator size={15} className="text-dorado" />
              Calculadora 30/70
            </button>
          </div>

          {/* Quick chip links for saved searches if any */}
          {savedSearches.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar">
              <span className="text-[11px] font-bold text-text-muted shrink-0">Guardadas:</span>
              {savedSearches.slice(0, 3).map((saved) => (
                <button
                  key={saved.id}
                  type="button"
                  onClick={() => handleApplySavedSearch(saved)}
                  className="shrink-0 rounded-full border border-forest/20 bg-forest/5 px-2.5 py-1 text-[11px] font-bold text-forest hover:bg-forest hover:text-white transition-all"
                >
                  ★ {saved.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Filter Pills Bar with 1-click removal */}
        {activeFilterPills.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-white border border-border/80 shadow-2xs animate-[fade-in_0.2s_ease-out]">
            <span className="text-xs font-black text-cafe flex items-center gap-1.5 mr-1">
              <SlidersHorizontal size={14} className="text-forest" />
              Filtros activos ({activeFilterPills.length}):
            </span>

            {activeFilterPills.map((pill) => (
              <span
                key={pill.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 border border-forest/20 px-3 py-1 text-xs font-bold text-forest hover:bg-forest/15 transition-colors"
              >
                <span>{pill.label}</span>
                <button
                  type="button"
                  onClick={pill.onRemove}
                  className="rounded-full p-0.5 text-forest/70 hover:bg-forest hover:text-white transition-colors"
                  aria-label={`Eliminar filtro ${pill.label}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            {activeFilterPills.length > 1 && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto text-xs font-extrabold text-terracota hover:text-terracota-dark hover:underline py-1 px-2"
              >
                Limpiar todos
              </button>
            )}
          </div>
        )}

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-4 rounded-2xl border border-border bg-white p-4 shadow-card animate-[slide-up_0.3s_ease-out] sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-cafe">Filtros de búsqueda avanzados</h3>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-sm font-semibold text-terracota hover:underline">
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {/* Type */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">Tipo</label>
                <div className="flex min-w-0 gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, type: filters.type === 'casa' ? null : 'casa' })}
                    className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-bold transition-all ${
                      filters.type === 'casa' ? 'bg-forest text-white' : 'bg-crema text-cafe hover:bg-forest/10'
                    }`}
                  >
                    <Home size={14} /> Casa
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, type: filters.type === 'apartamento' ? null : 'apartamento' })}
                    className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-bold transition-all ${
                      filters.type === 'apartamento' ? 'bg-forest text-white' : 'bg-crema text-cafe hover:bg-forest/10'
                    }`}
                  >
                    <Building2 size={14} /> Apto
                  </button>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">Precio (Q)</label>
                <div className="flex min-w-0 gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.priceMin}
                    onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                    className="min-h-11 min-w-0 w-full rounded-lg border border-border px-2 py-2 text-xs font-medium outline-none focus:border-forest"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.priceMax}
                    onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                    className="min-h-11 min-w-0 w-full rounded-lg border border-border px-2 py-2 text-xs font-medium outline-none focus:border-forest"
                  />
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">Habitaciones</label>
                <div className="flex gap-1">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFilters({ ...filters, bedrooms: filters.bedrooms === n ? null : n })}
                      className={`min-h-11 flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                        filters.bedrooms === n ? 'bg-forest text-white' : 'bg-crema text-cafe hover:bg-forest/10'
                      }`}
                    >
                      {n}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Bathrooms */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">Baños</label>
                <div className="flex gap-1">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFilters({ ...filters, bathrooms: filters.bathrooms === n ? null : n })}
                      className={`min-h-11 flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                        filters.bathrooms === n ? 'bg-forest text-white' : 'bg-crema text-cafe hover:bg-forest/10'
                      }`}
                    >
                      {n}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Guatemala Department */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">Departamento</label>
                <RuwaSelect
                  id="filter-department"
                  value={filters.department}
                  onChange={handleDepartmentChange}
                  options={GUATEMALA_DEPARTMENTS}
                  searchPlaceholder="Buscar departamento..."
                  align="auto"
                />
              </div>

              {/* Guatemala Zone / Sector */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">Zona / Sector</label>
                <RuwaSelect
                  id="filter-zone"
                  value={filters.zone}
                  onChange={(val) => setFilters({ ...filters, zone: val })}
                  options={availableZones}
                  searchPlaceholder="Buscar zona o sector..."
                  align="right"
                />
              </div>

              {/* Boolean & GT filters */}
              <div className="sm:col-span-2 lg:col-span-6">
                <label className="block text-xs font-bold text-text-muted mb-1.5">Características y Servicios en Guatemala</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'security', label: 'Garita 24/7 / Seguridad', icon: Shield },
                    { key: 'waterGuaranteed', label: 'Agua constante / Cisterna', icon: Droplets },
                    { key: 'furnished', label: 'Amueblado', icon: Sofa },
                    { key: 'petsAllowed', label: 'Mascotas permitidas', icon: PawPrint },
                    { key: 'parking', label: 'Parqueo incluido', icon: Car },
                    { key: 'patio', label: 'Patio / Jardín', icon: TreePine },
                    { key: 'verified', label: 'DPI Verificado', icon: CheckCircle },
                    { key: 'visitAvailable', label: 'Visita disponible', icon: Eye },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setFilters({ ...filters, [key]: !filters[key] })}
                      className={`flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                        filters[key]
                          ? 'bg-forest text-white shadow-xs'
                          : 'bg-crema text-cafe hover:bg-forest/10 border border-border-light'
                      }`}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results count and radar animation */}
      <div className="mx-auto mb-4 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {radarActive && (
            <div className="relative w-6 h-6 flex-shrink-0">
              <div className="absolute inset-0 rounded-full border border-jade animate-[radar_1.5s_ease-out_infinite]" />
              <div className="absolute inset-[calc(50%-3px)] w-1.5 h-1.5 bg-jade rounded-full" />
            </div>
          )}
          <p className="text-sm font-semibold text-text-muted">
            {filteredProperties.length} vivienda{filteredProperties.length !== 1 ? 's' : ''} encontrada{filteredProperties.length !== 1 ? 's' : ''}
            {position && radarRadius && ` en un radio de ${radarRadius} km`}
          </p>
        </div>
      </div>

      {/* Content area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {viewMode === 'map' ? (
          <div className="flex h-[min(68dvh,640px)] min-h-[420px] gap-6 lg:h-[calc(100dvh-250px)] lg:min-h-[520px]">
            {/* Property list sidebar (desktop only) */}
            <div className="hidden lg:block w-[380px] flex-shrink-0 overflow-y-auto pr-2 space-y-4 no-scrollbar">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  userPosition={position}
                  compact
                />
              ))}
              {filteredProperties.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-text-muted font-semibold">No hay propiedades con estos filtros</p>
                </div>
              )}
            </div>
            {/* Map */}
            <div className="flex-1 rounded-2xl overflow-hidden shadow-card">
              <Suspense fallback={
                <div className="w-full h-full bg-crema flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-10 h-10 border-4 border-forest/30 border-t-forest rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm font-semibold text-text-muted">Cargando mapa...</p>
                  </div>
                </div>
              }>
                <MapView
                  properties={filteredProperties}
                  userPosition={position}
                  radarRadius={radarRadius}
                  radarActive={radarActive}
                  focusCoordinates={focusCoordinates}
                />
              </Suspense>
            </div>
          </div>
        ) : (
          <div>
            {/* Nearby section */}
            {position && nearbyProps.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-extrabold text-cafe mb-4 flex items-center gap-2">
                  <MapPin size={20} className="text-terracota" />
                  Cerca de ti
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {nearbyProps.map((property) => (
                    <PropertyCard key={property.id} property={property} userPosition={position} />
                  ))}
                </div>
              </div>
            )}

            {/* Farther section */}
            {position && fartherProps.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-extrabold text-cafe mb-4 flex items-center gap-2">
                  <Navigation size={20} className="text-azul-ruta" />
                  Un poco más lejos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {fartherProps.map((property) => (
                    <PropertyCard key={property.id} property={property} userPosition={position} />
                  ))}
                </div>
              </div>
            )}

            {/* All properties (no position) */}
            {!position && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}

            {filteredProperties.length === 0 && (
              <div className="text-center py-20">
                <Search size={48} className="text-text-muted/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-cafe mb-2">No encontramos viviendas</h3>
                <p className="text-text-muted">Intenta cambiar los filtros o buscar en otra zona</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 px-6 py-2 bg-forest text-white font-bold rounded-full hover:bg-forest-dark transition-all"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Save Search Modal */}
      <SaveSearchModal
        isOpen={showSaveSearchModal}
        onClose={() => setShowSaveSearchModal(false)}
        filters={filters}
        searchQuery={searchQuery}
        matchCount={filteredProperties.length}
        onSaveSuccess={refreshSavedSearches}
      />

      {/* Rent Affordability Modal */}
      <RentAffordabilityModal
        isOpen={showAffordabilityModal}
        onClose={() => setShowAffordabilityModal(false)}
        onApplyBudgetFilter={(maxBudget) => {
          setFilters((prev) => ({ ...prev, priceMax: maxBudget }));
        }}
        onSelectSuggestedLocation={(loc, maxBudget) => {
          setFilters((prev) => ({
            ...prev,
            priceMax: maxBudget,
            department: loc.dept || 'Todos',
            zone: loc.zone || 'Todas las zonas y sectores',
          }));
        }}
      />
    </main>
  );
}
