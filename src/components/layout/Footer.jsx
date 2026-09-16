import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, ArrowUpRight, Heart, Globe, Share2, MessageCircle } from 'lucide-react';

const footerLinks = [
  { label: 'Buscar vivienda', path: '/explorar' },
  { label: 'Mapa interactivo', path: '/explorar?view=map' },
  { label: 'Publicar propiedad', path: '/publicar' },
  { label: 'Cómo funciona', path: '/#como-funciona' },
];

const popularZones = [
  'Zona 10, Guatemala',
  'Zona 14, Guatemala',
  'Mixco',
  'Villa Nueva',
  'Antigua Guatemala',
  'San Miguel Petapa',
];

export default function Footer() {
  return (
    <footer className="bg-cafe text-white/85 mt-auto relative" role="contentinfo">
      {/* Top textile band */}
      <div className="pattern-weave-band" />

      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-9 sm:px-6 md:pb-5 lg:px-8">
        {/* ── 4-column grid — full width ── */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-14">

          {/* Brand */}
          <div>
            <Link to="/" className="inline-flex items-center gap-3 group mb-4">
              <img
                src="/logo/logo.png"
                alt="RuwaJay"
                className="h-12 w-12 object-contain rounded-full shadow-md group-hover:scale-105 transition-transform duration-300 ring-1 ring-white/10"
              />
              <div className="flex flex-col leading-none">
                <span className="font-black text-xl text-white tracking-tight">
                  Ruwa<span className="text-terracota-light">Jay</span>
                </span>
                <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-dorado-light mt-0.5">
                  Tu hogar, tu camino
                </span>
              </div>
            </Link>
            <p className="text-[13px] text-white/45 leading-relaxed mb-3">
              Encuentra casas y apartamentos en alquiler mensual en Guatemala.
              Explora, contacta y visita tu próximo hogar.
            </p>
            <div className="flex items-center gap-1.5 text-[12px] text-white/30 mb-4">
              <MapPin size={13} className="text-dorado-muted shrink-0" />
              Ciudad de Guatemala 🇬🇹
            </div>
            <div className="flex items-center gap-2.5">
              {[
                { icon: Globe, label: 'Facebook' },
                { icon: Share2, label: 'Instagram' },
                { icon: MessageCircle, label: 'WhatsApp' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/35 transition-all duration-300 hover:border-dorado/30 hover:bg-dorado/20 hover:text-dorado-light"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Explora */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-[0.18em] text-dorado-light mb-4">
              Explora
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    to={path}
                    className="group inline-flex min-h-10 items-center gap-1.5 py-1 text-sm font-semibold text-white/50 transition-colors duration-300 hover:text-white"
                  >
                    {label}
                    <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Zonas Populares */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-[0.18em] text-dorado-light mb-4">
              Zonas Populares
            </h4>
            <ul className="space-y-2.5">
              {popularZones.map((zone) => (
                <li key={zone}>
                  <Link
                    to={`/explorar?q=${encodeURIComponent(zone)}`}
                    className="inline-flex min-h-10 items-center py-1 text-sm font-semibold text-white/50 transition-colors duration-300 hover:text-white"
                  >
                    {zone}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-[0.18em] text-dorado-light mb-4">
              Contacto
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:info@ruwajay.gt" className="flex min-h-11 items-center gap-2.5 break-all text-sm font-semibold text-white/50 transition-colors duration-300 hover:text-white">
                  <Mail size={15} className="text-dorado-muted shrink-0" />
                  info@ruwajay.gt
                </a>
              </li>
              <li>
                <a href="tel:+50223456789" className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-white/50 transition-colors duration-300 hover:text-white">
                  <Phone size={15} className="text-dorado-muted shrink-0" />
                  +502 2345-6789
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-4 text-center sm:flex-row sm:text-left">
          <p className="flex flex-wrap items-center justify-center gap-1 text-[11px] font-medium text-white/30 sm:justify-start">
            © {new Date().getFullYear()} RuwaJay. Todos los derechos reservados. Hecho con
            <Heart size={10} className="text-terracota-light fill-terracota-light" />
            en Guatemala.
          </p>
          <div className="flex items-center gap-1">
            {[
              { label: 'Privacidad', href: '#' },
              { label: 'Términos', href: '#' },
              { label: 'Ayuda', href: '#' },
            ].map(({ label, href }, i, arr) => (
              <span key={label} className="flex items-center">
                <a href={href} className="text-[11px] text-white/30 font-medium hover:text-white/55 transition-colors duration-300 px-2 py-0.5 rounded hover:bg-white/[0.04]">
                  {label}
                </a>
                {i < arr.length - 1 && <span className="text-white/10 text-[9px]">•</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
