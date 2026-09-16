import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Home, DollarSign, RefreshCw, ChevronRight, ChevronLeft
} from 'lucide-react';

const bannerImages = [
  '/Banners/Bannder1.png',
  '/Banners/Banner2.png',
  '/Banners/Banner3.png',
  '/Banners/Banner4.png',
  '/Banners/Banner5.png',
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef(null);

  const goToSlide = useCallback((index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [isTransitioning]);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % bannerImages.length);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + bannerImages.length) % bannerImages.length);
  }, [currentSlide, goToSlide]);

  // Auto-play
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setIsTransitioning(true);
      setCurrentSlide((prev) => (prev + 1) % bannerImages.length);
      setTimeout(() => setIsTransitioning(false), 700);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Reset auto-play on manual interaction
  const handleManualNav = useCallback((action) => {
    clearInterval(intervalRef.current);
    action();
    intervalRef.current = setInterval(() => {
      setIsTransitioning(true);
      setCurrentSlide((prev) => (prev + 1) % bannerImages.length);
      setTimeout(() => setIsTransitioning(false), 700);
    }, 5000);
  }, []);

  const categories = [
    {
      title: 'Casas familiares',
      image: '/Casas/cat-familiar.jpg',
      link: '/explorar?type=casa',
    },
    {
      title: 'Casas urbanas',
      image: '/Casas/cat-urbana.jpg',
      link: '/explorar?type=apartamento',
    },
    {
      title: 'Casas acogedoras',
      image: '/Casas/cat-acogedora.jpg',
      link: '/explorar?type=amueblado',
    },
  ];

  const benefits = [
    {
      icon: Home,
      title: 'Estabilidad de un hogar',
      desc: 'Contratos y alquileres pensados para tu tranquilidad y la de tu familia.',
    },
    {
      icon: DollarSign,
      title: 'Presupuesto predecible',
      desc: 'Conoce la cuota exacta de tu mensualidad sin tarifas sorpresas ni costos ocultos.',
    },
    {
      icon: RefreshCw,
      title: 'Flexibilidad y comodidad',
      desc: 'Elige el espacio ideal con todas las comodidades cerca de tu área diaria.',
    },
  ];

  return (
    <main className="min-h-screen bg-[#FAF5EE] text-[#2D1810] font-sans">

      {/* ============================================================ */}
      {/* 1. HERO BANNER CAROUSEL                                       */}
      {/* ============================================================ */}
      <section className="w-full relative">
        <div className="relative w-full shadow-lg border-b border-[#D4962A]/40 bg-[#FAF5EE]">

          {/* === MOBILE CAROUSEL === */}
          <div className="relative min-h-[310px] overflow-hidden sm:hidden">
            {bannerImages.map((src, index) => (
              <img
                key={src}
                src={src}
                alt={`Banner ${index + 1}`}
                className="absolute inset-0 h-full w-full object-cover object-right transition-opacity duration-700 ease-in-out"
                style={{ opacity: currentSlide === index ? 1 : 0 }}
                width="1536"
                height="547"
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/5" />
            <div className="relative flex min-h-[310px] max-w-[285px] flex-col items-start justify-center px-5 py-8 text-white">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-dorado-light">Tu hogar, tu camino</p>
              <h1 className="text-[2rem] font-black leading-[1.08] drop-shadow-lg">
                Encuentra tu hogar para vivir indefinidamente
              </h1>
              <Link
                to="/explorar"
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-extrabold text-forest shadow-lg"
              >
                Explorar hogares
              </Link>
            </div>

            {/* Mobile dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {bannerImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleManualNav(() => goToSlide(index))}
                  className={`rounded-full transition-all duration-300 ${
                    currentSlide === index
                      ? 'w-7 h-2.5 bg-white shadow-md'
                      : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Ir al banner ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* === DESKTOP CAROUSEL === */}
          <div className="hidden sm:block relative overflow-hidden">
            {bannerImages.map((src, index) => (
              <img
                key={src}
                src={src}
                alt={`Banner ${index + 1}`}
                className={`h-auto w-full transition-opacity duration-700 ease-in-out ${
                  currentSlide === index ? 'relative opacity-100' : 'absolute inset-0 opacity-0'
                }`}
                width="1536"
                height="547"
              />
            ))}

            {/* Arrow buttons */}
            <button
              onClick={() => handleManualNav(prevSlide)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/60 hover:scale-110"
              aria-label="Banner anterior"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={() => handleManualNav(nextSlide)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/60 hover:scale-110"
              aria-label="Siguiente banner"
            >
              <ChevronRight size={22} />
            </button>

            {/* Desktop dots */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-10">
              {bannerImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleManualNav(() => goToSlide(index))}
                  className={`rounded-full transition-all duration-300 ${
                    currentSlide === index
                      ? 'w-8 h-3 bg-white shadow-lg'
                      : 'w-3 h-3 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Ir al banner ${index + 1}`}
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. CATEGORIES SECTION                                         */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <h2 className="mb-6 text-2xl font-black leading-tight tracking-tight text-[#0B5D3B] sm:mb-8 sm:text-3xl lg:text-4xl">
          Descubre casas para alquilar indefinidamente
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {categories.map((cat) => (
            <Link
              key={cat.title}
              to={cat.link}
              className="group relative block h-60 overflow-hidden rounded-2xl border border-[#E8D9C8] shadow-md transition-all duration-300 hover:shadow-xl sm:h-72"
            >
              {/* Category Image */}
              <img
                src={cat.image}
                alt={cat.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

              {/* Title Text Overlaid inside Bottom Left of Card */}
              <div className="absolute bottom-4 left-4 right-4 flex min-w-0 items-center justify-between gap-3 sm:bottom-5 sm:left-5 sm:right-5">
                <h3 className="min-w-0 text-xl font-black leading-tight text-white drop-shadow-md transition-colors group-hover:text-[#E6B04A] sm:text-2xl">
                  {cat.title}
                </h3>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-colors group-hover:bg-[#0B5D3B]">
                  <ChevronRight size={20} className="text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. BENEFITS SECTION                                           */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-14">
        <h2 className="mb-7 text-2xl font-black leading-tight tracking-tight text-[#0B5D3B] sm:mb-10 sm:text-3xl lg:text-4xl">
          Entendemos por qué quieres alquilar indefinidamente
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="flex items-start gap-4 rounded-2xl border border-[#E8D9C8]/80 bg-white p-5 shadow-xs transition-all hover:shadow-md sm:p-6"
              >
                {/* Circular Gold Icon Container */}
                <div className="w-14 h-14 rounded-full bg-[#F0E2CF] border-2 border-[#D4962A] flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Icon size={26} className="text-[#0B5D3B]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#2D1810] mb-1.5">
                    {b.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6B5549] leading-relaxed font-bold">
                    {b.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </main>
  );
}
