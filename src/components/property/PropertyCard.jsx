import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Bed, Bath, Car, MapPin, CheckCircle, Sparkles, Ruler, ArrowLeftRight } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';
import { useCompare } from '../../context/CompareContext';
import { formatPrice, formatDistance, calculateDistance } from '../../data/properties';

export default function PropertyCard({ property, userPosition = null, compact = false }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInCompare, toggleCompare } = useCompare();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  const fav = isFavorite(property.id);
  const inCompare = isInCompare(property.id);

  const distance = userPosition
    ? calculateDistance(userPosition.lat, userPosition.lng, property.coordinates.lat, property.coordinates.lng)
    : null;

  const handleMouseMove = (e) => {
    if (
      !cardRef.current ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -5, y: x * 5 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="card-premium tilt-card group relative min-w-0"
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      }}
    >
      <Link
        to={`/propiedad/${property.id}`}
        className="block min-w-0 focus-visible:ring-2 focus-visible:ring-dorado"
        aria-label={`${property.title} — ${formatPrice(property.price)} por mes`}
      >
      {/* Image Container */}
      <div className="relative overflow-hidden aspect-[4/3]">
        {/* Image with zoom on hover */}
        <img
          src={property.thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full bg-[#e0d3c3] object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />

        {/* Elegant gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {property.isNew && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-naranja to-dorado text-white text-[11px] font-extrabold rounded-full shadow-sm backdrop-blur-sm">
              <Sparkles size={11} />
              Nuevo
            </span>
          )}
          {property.verified && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-forest/90 text-white text-[11px] font-extrabold rounded-full shadow-sm backdrop-blur-sm">
              <CheckCircle size={11} />
              Verificado
            </span>
          )}
        </div>

        {/* Price badge at bottom */}
        <div className="absolute bottom-3 left-3">
          <div className="px-3.5 py-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-white/50">
            <span className="text-[16px] font-extrabold tracking-tight text-forest sm:text-[18px]">
              {formatPrice(property.price)}
            </span>
            <span className="text-[11px] font-bold text-text-muted ml-0.5">/mes</span>
          </div>
        </div>

        {/* Distance badge */}
        {distance !== null && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1.5 bg-azul-ruta/90 backdrop-blur-sm text-white text-[11px] font-extrabold rounded-full shadow-sm">
            {formatDistance(distance)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        {/* Title */}
        <h3 className="font-extrabold text-[15px] text-cafe leading-snug line-clamp-2 group-hover:text-forest transition-colors duration-300 tracking-tight">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <MapPin size={13} className="text-terracota flex-shrink-0" strokeWidth={2.5} />
          <span className="text-[13px] text-text-secondary font-medium truncate">
            {property.address.approximate}
          </span>
        </div>

        {/* Divider */}
        <div className="my-3.5 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Features row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <Bed size={15} className="text-forest/70" strokeWidth={2} />
            <span className="font-extrabold text-cafe">{property.bedrooms}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Bath size={15} className="text-forest/70" strokeWidth={2} />
            <span className="font-extrabold text-cafe">{property.bathrooms}</span>
          </span>
          {property.parking > 0 && (
            <span className="flex items-center gap-1.5">
              <Car size={15} className="text-forest/70" strokeWidth={2} />
              <span className="font-extrabold text-cafe">{property.parking}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 ml-auto">
            <Ruler size={15} className="text-forest/70" strokeWidth={2} />
            <span className="font-extrabold text-cafe">{property.area}</span>
            <span className="text-[11px] text-text-muted font-semibold">m²</span>
          </span>
        </div>

        {/* Tags */}
        {!compact && (
          <div className="flex flex-wrap gap-1.5 mt-3.5">
            <span className="px-2.5 py-1 bg-crema-warm rounded-lg text-[11px] font-bold text-cafe capitalize border border-border-light">
              {property.type}
            </span>
            {property.furnished && (
              <span className="px-2.5 py-1 bg-dorado/10 rounded-lg text-[11px] font-bold text-dorado border border-dorado/15">
                Amueblado
              </span>
            )}
            {property.petsAllowed && (
              <span className="px-2.5 py-1 bg-jade/8 rounded-lg text-[11px] font-bold text-jade border border-jade/12">
                🐾 Mascotas
              </span>
            )}
          </div>
        )}
      </div>
      </Link>

      {/* Compare button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleCompare(property);
        }}
        className={`absolute right-15 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 ${
          inCompare
            ? 'scale-105 bg-forest text-white shadow-lg ring-2 ring-forest/30'
            : 'bg-white/85 text-cafe/75 hover:bg-white hover:text-forest'
        }`}
        aria-label={inCompare ? 'Quitar del comparador' : 'Agregar al comparador'}
        title={inCompare ? 'En comparador (clic para quitar)' : 'Comparar vivienda'}
      >
        <ArrowLeftRight size={17} strokeWidth={2.4} />
      </button>

      {/* Favorite button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(property.id);
        }}
        className={`absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 ${
          fav
            ? 'scale-105 bg-terracota text-white shadow-lg ring-2 ring-terracota/30'
            : 'bg-white/80 text-cafe/70 hover:bg-white hover:text-terracota'
        }`}
        aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <Heart size={18} fill={fav ? 'currentColor' : 'none'} strokeWidth={2.5} />
      </button>
    </article>
  );
}
