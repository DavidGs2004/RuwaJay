import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X, ArrowLeftRight, Check, Trash2, Bed, Bath, Car, Ruler,
  MapPin, ShieldCheck, Sparkles, ExternalLink, Calendar, AlertCircle,
  Award, Wallet, CheckCircle2, TrendingUp, HelpCircle, DollarSign,
  ArrowRight, ShieldAlert, BadgeCheck, Lightbulb, PiggyBank, Plus, Minus,
  ChevronRight
} from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import { formatPrice } from '../../data/properties';

// Safely get the first image from a property, handles null/undefined/array/object
function getSafeImage(property) {
  if (!property) return '/Casas/cat-familiar.jpg';
  if (property.thumbnail) return property.thumbnail;
  try {
    const imgs = property.images;
    if (!imgs || typeof imgs !== 'object') return '/Casas/cat-familiar.jpg';
    if (Array.isArray(imgs)) return imgs[0] || '/Casas/cat-familiar.jpg';
    const values = Object.values(imgs).flat();
    return (values && values[0]) || '/Casas/cat-familiar.jpg';
  } catch {
    return '/Casas/cat-familiar.jpg';
  }
}

// Safely get address zone text
function getSafeZone(property) {
  if (!property) return 'Guatemala';
  const addr = property.address;
  if (!addr || typeof addr !== 'object') return 'Guatemala';
  return addr.zone || addr.approximate || addr.municipality || 'Guatemala';
}


export default function PropertyCompareModal() {
  const {
    comparedProperties,
    maxCompare,
    removeFromCompare,
    clearCompare,
    isCompareModalOpen,
    openCompareModal,
    closeCompareModal,
    compareNotice,
  } = useCompare();

  // User-defined budget for starting the rental (first month + deposit)
  const [customBudget, setCustomBudget] = useState(null);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!isCompareModalOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeCompareModal();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isCompareModalOpen, closeCompareModal]);

  // Determine best price and largest area among compared properties
  const stats = useMemo(() => {
    if (comparedProperties.length < 2) return { minPriceId: null, maxAreaId: null };

    let minPrice = Infinity;
    let minPriceId = null;
    let maxArea = -Infinity;
    let maxAreaId = null;

    comparedProperties.forEach((p) => {
      const price = Number(p.price) || 0;
      const area = Number(p.area) || 0;
      if (price < minPrice) {
        minPrice = price;
        minPriceId = p.id;
      }
      if (area > maxArea) {
        maxArea = area;
        maxAreaId = p.id;
      }
    });

    return { minPriceId, maxAreaId };
  }, [comparedProperties]);

  // Calculate detailed initial entry costs for each property (Rent + Deposit)
  const propertiesWithCosts = useMemo(() => {
    return comparedProperties.map((p) => {
      const rent = Number(p.price) || 0;
      // In Guatemala, deposit is typically 1 month of rent if not explicitly set
      const deposit = (p.deposit !== undefined && p.deposit !== null && !isNaN(Number(p.deposit)))
        ? Number(p.deposit)
        : rent;
      const initialCost = rent + deposit;
      const area = Number(p.area) || 0;
      const bedrooms = Number(p.bedrooms) || 1;
      const bathrooms = Number(p.bathrooms) || 1;
      const parking = Number(p.parking) || 0;
      const servicesCount = Array.isArray(p.servicesIncluded) ? p.servicesIncluded.length : 0;
      
      return {
        ...p,
        rent,
        deposit,
        initialCost,
        area,
        bedrooms,
        bathrooms,
        parking,
        servicesCount,
      };
    });
  }, [comparedProperties]);

  const minInitialCost = useMemo(() => {
    if (propertiesWithCosts.length === 0) return 4000;
    const costs = propertiesWithCosts.map((p) => p.initialCost).filter((c) => !isNaN(c) && isFinite(c));
    return costs.length > 0 ? Math.min(...costs) : 4000;
  }, [propertiesWithCosts]);

  const maxInitialCost = useMemo(() => {
    if (propertiesWithCosts.length === 0) return 10000;
    const costs = propertiesWithCosts.map((p) => p.initialCost).filter((c) => !isNaN(c) && isFinite(c));
    return costs.length > 0 ? Math.max(...costs) : 10000;
  }, [propertiesWithCosts]);

  // Current active budget (user entered or defaults to lowest required entry cost)
  const activeBudget = customBudget !== null ? customBudget : minInitialCost;

  // Analysis & Verdict based on user's starting budget
  const verdict = useMemo(() => {
    if (propertiesWithCosts.length < 2) return null;

    const sortedByCost = [...propertiesWithCosts].sort((a, b) => a.initialCost - b.initialCost);
    const cheapest = sortedByCost[0];
    const mostExpensive = sortedByCost[sortedByCost.length - 1];
    const maxSavings = Math.max(0, mostExpensive.initialCost - cheapest.initialCost);

    const affordable = propertiesWithCosts.filter((p) => p.initialCost <= activeBudget);

    // Scoring to balance space, rooms, parking and budget efficiency
    const scored = propertiesWithCosts.map((p) => {
      const fits = p.initialCost <= activeBudget;
      const buffer = activeBudget - p.initialCost;
      let score = 0;

      if (fits) {
        score += 60;
        if (buffer >= 500) score += Math.min(20, Math.floor(buffer / 400));
      } else {
        score -= Math.min(50, Math.floor(Math.abs(buffer) / 200));
      }

      if (p.area > 0) score += Math.min(15, Math.floor(p.area / 10));
      score += (p.bedrooms * 4) + (p.bathrooms * 3) + (p.parking * 3);
      if (p.furnished) score += 6;
      if (p.verified) score += 4;
      if (p.petsAllowed) score += 2;
      score += Math.min(6, p.servicesCount * 2);

      return {
        ...p,
        fits,
        buffer,
        score,
      };
    });

    let winner = null;
    let badgeText = '';
    let badgeColor = '';
    let verdictTitle = '';
    let verdictExplanation = '';
    let financialStatus = 'ok'; // 'ok' | 'tight' | 'insufficient'

    if (affordable.length === 0) {
      const buffer = activeBudget - cheapest.initialCost;
      winner = { ...cheapest, buffer, fits: false };
      financialStatus = 'insufficient';
      badgeText = 'Meta de Ahorro Recomendada';
      badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
      verdictTitle = `Te conviene apuntar a: ${winner.title}`;
      const deficit = Math.abs(buffer);
      verdictExplanation = `Con tu presupuesto actual de ${formatPrice(activeBudget)}, aún te hacen falta ${formatPrice(deficit)} para cubrir el costo inicial mínimo de entrada (1er mes de renta + depósito en garantía). La opción más accesible y económicamente viable es "${winner.title}", requiriendo un total inicial de ${formatPrice(winner.initialCost)} (${formatPrice(winner.rent)} de renta + ${formatPrice(winner.deposit)} de depósito). Te sugerimos priorizar esta propiedad para evitar sobreendeudamiento o consultar con el arrendador la opción de fraccionar el depósito.`;
    } else if (affordable.length === 1) {
      const buffer = activeBudget - affordable[0].initialCost;
      winner = { ...affordable[0], buffer, fits: true };
      financialStatus = buffer < 600 ? 'tight' : 'ok';
      badgeText = 'Opción Única y Segura';
      badgeColor = 'bg-jade/10 text-jade border-jade/30';
      verdictTitle = `Tu mejor elección financiera: ${winner.title}`;
      verdictExplanation = `Con base en tu presupuesto de ${formatPrice(activeBudget)}, "${winner.title}" es la única opción que entra dentro de tus posibilidades para empezar a alquilar de inmediato. Requiere un desembolso inicial de ${formatPrice(winner.initialCost)} (${formatPrice(winner.rent)} de primer mes + ${formatPrice(winner.deposit)} de depósito en garantía), dejándote un colchón de seguridad de ${formatPrice(buffer)} para gastos de mudanza, servicios o imprevistos. Las otras alternativas sobrepasan tu presupuesto de entrada.`;
    } else {
      // 2 or more fit
      const affordableScored = scored.filter((p) => p.fits).sort((a, b) => b.score - a.score);
      const bestScored = affordableScored[0];

      if (bestScored.id === cheapest.id) {
        const buffer = activeBudget - cheapest.initialCost;
        winner = { ...cheapest, buffer, fits: true };
        financialStatus = 'ok';
        badgeText = 'Ganadora en Ahorro y Confort';
        badgeColor = 'bg-forest/10 text-forest border-forest/30';
        verdictTitle = `La opción más conveniente: ${winner.title}`;
        verdictExplanation = `Para tu presupuesto de ${formatPrice(activeBudget)}, "${winner.title}" es la ganadora indiscutible. No solo representa el menor desembolso de entrada con ${formatPrice(winner.initialCost)} (${formatPrice(winner.rent)} de renta + ${formatPrice(winner.deposit)} de depósito), sino que te ahorra ${formatPrice(maxSavings)} respecto a la opción más costosa, conservando ${formatPrice(buffer)} de liquidez en tu bolsillo para otros proyectos.`;
      } else {
        const buffer = activeBudget - bestScored.initialCost;
        winner = { ...bestScored, buffer, fits: true };
        financialStatus = 'ok';
        badgeText = 'Mejor Relación Calidad-Precio';
        badgeColor = 'bg-dorado/20 text-cafe border-dorado/40';
        verdictTitle = `Opción recomendada por mayor confort: ${winner.title}`;
        verdictExplanation = `Tu presupuesto de ${formatPrice(activeBudget)} te permite acceder holgadamente a "${winner.title}", requiriendo ${formatPrice(winner.initialCost)} de costo inicial (primer mes + depósito) y dejándote un margen libre de ${formatPrice(buffer)}. Es la opción más conveniente si buscas ${winner.area ? `${winner.area} m² de espacio, ` : ''}${winner.bedrooms} hab, ${winner.bathrooms} baños y mejor ubicación. Alternativamente, si tu prioridad inmediata fuera maximizar el ahorro, "${cheapest.title}" te costaría únicamente ${formatPrice(cheapest.initialCost)} de entrada.`;
      }
    }

    return {
      winner,
      cheapest,
      mostExpensive,
      maxSavings,
      affordableCount: affordable.length,
      scored,
      badgeText,
      badgeColor,
      verdictTitle,
      verdictExplanation,
      financialStatus,
    };
  }, [propertiesWithCosts, activeBudget]);

  const budgetPresets = useMemo(() => {
    if (!verdict) return [];
    const min = minInitialCost;
    const mid = Math.round((minInitialCost + maxInitialCost) / 2 / 100) * 100;
    const max = maxInitialCost;
    const high = Math.round(maxInitialCost * 1.25 / 100) * 100;

    const list = [
      { label: `Mínimo (${formatPrice(min)})`, value: min },
      ...(mid > min && mid < max ? [{ label: `Medio (${formatPrice(mid)})`, value: mid }] : []),
      ...(max > min ? [{ label: `Superior (${formatPrice(max)})`, value: max }] : []),
      { label: `Holgado (${formatPrice(high)})`, value: high },
    ];
    return list;
  }, [verdict, minInitialCost, maxInitialCost]);

  return (
    <>
      {/* ========================================================= */}
      {/* FLOATING NOTICE TOAST                                      */}
      {/* ========================================================= */}
      {compareNotice && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 rounded-2xl bg-cafe text-white px-4 py-2.5 text-xs font-bold shadow-2xl animate-[slide-up_0.25s_ease-out] border border-dorado/30">
          <ArrowLeftRight size={14} className="text-dorado" />
          <span>{compareNotice}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* FLOATING BOTTOM BAR (DOCK)                                 */}
      {/* ========================================================= */}
      {comparedProperties.length > 0 && !isCompareModalOpen && (
        <div className="fixed bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl animate-[slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)]">
          <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-forest/20 bg-white/95 p-3 shadow-2xl backdrop-blur-md">
            
            {/* Properties Thumbnails */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {comparedProperties.map((p) => (
                <div
                  key={p.id}
                  className="relative group shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-border bg-[#FDFBF7] shadow-xs"
                >
                  <img
                    src={getSafeImage(p)}
                    alt={p.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFromCompare(p.id)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                    title="Quitar"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {/* Empty placeholder slots */}
              {Array.from({ length: maxCompare - comparedProperties.length }).map((_, i) => (
                <div
                  key={`slot-${i}`}
                  className="w-12 h-12 rounded-xl border border-dashed border-border-light bg-crema/40 flex items-center justify-center text-text-muted/50 text-[10px] font-bold"
                >
                  +{i + 1}
                </div>
              ))}
            </div>

            {/* Actions & Count */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:block text-right">
                <span className="text-xs font-black text-cafe block">
                  {comparedProperties.length} de {maxCompare}
                </span>
                <span className="text-[10px] font-semibold text-text-muted">
                  {comparedProperties.length < 2 ? 'Elige 1 más' : 'Listo para comparar'}
                </span>
              </div>

              <button
                type="button"
                onClick={openCompareModal}
                disabled={comparedProperties.length < 2}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all ${
                  comparedProperties.length >= 2
                    ? 'bg-gradient-to-r from-forest to-jade text-white shadow-md hover:opacity-95 active:scale-95'
                    : 'bg-crema text-text-muted cursor-not-allowed opacity-70'
                }`}
              >
                <ArrowLeftRight size={14} />
                <span>Comparar ({comparedProperties.length})</span>
              </button>

              <button
                type="button"
                onClick={clearCompare}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted hover:bg-crema hover:text-cafe transition-colors"
                title="Limpiar comparador"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* COMPARISON MODAL (SIDE BY SIDE TABLE)                      */}
      {/* ========================================================= */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]">
          <div className="flex flex-col max-h-[92vh] w-full max-w-5xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-border-light animate-[scale-up_0.3s_ease-out]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border-light bg-[#FAF5EE] px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center text-forest">
                  <ArrowLeftRight size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-cafe sm:text-xl">
                    Comparador de Propiedades
                  </h2>
                  <p className="text-xs text-text-secondary font-medium">
                    Analiza lado a lado las opciones seleccionadas en RuwaJay
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCompareModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-text-muted hover:bg-crema hover:text-cafe transition-colors border border-border-light"
                aria-label="Cerrar comparador"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - Comparison Table and Verdict */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="overflow-x-auto pb-2">
                <table className="w-full border-collapse min-w-[620px]">
                <thead>
                  <tr>
                    <th className="w-44 pb-4 text-left text-xs font-black uppercase tracking-wider text-text-muted">
                      Característica
                    </th>
                    {comparedProperties.map((p) => (
                      <th key={p.id} className="pb-4 px-3 text-left align-top">
                        <div className="relative rounded-2xl border border-border-light bg-[#FDFBF7] p-3 shadow-xs">
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeFromCompare(p.id)}
                            className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-text-muted hover:bg-terracota hover:text-white transition-colors"
                            title="Quitar de comparativa"
                          >
                            <X size={12} />
                          </button>

                          {/* Image */}
                          <div className="aspect-[16/10] w-full rounded-xl overflow-hidden mb-2.5 bg-crema">
                            <img
                              src={getSafeImage(p)}
                              alt={p.title}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Type & Title */}
                          <span className="inline-block px-2 py-0.5 rounded-md bg-crema text-[10px] font-extrabold uppercase text-forest mb-1">
                            {p.type}
                          </span>
                          <h4 className="text-xs font-black text-cafe line-clamp-2 leading-snug">
                            {p.title}
                          </h4>
                          <p className="text-[11px] text-text-secondary mt-1 flex items-center gap-1">
                            <MapPin size={11} className="text-terracota shrink-0" />
                            <span className="truncate">{getSafeZone(p)}</span>
                          </p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-border-light text-xs font-semibold text-cafe">
                  {/* PRECIO MENSUAL */}
                  <tr className="hover:bg-[#FAF5EE]/60 transition-colors">
                    <td className="py-3.5 pr-4 font-extrabold text-cafe flex items-center gap-1.5">
                      <span>Precio Mensual</span>
                    </td>
                    {comparedProperties.map((p) => {
                      const isBestPrice = p.id === stats.minPriceId;
                      return (
                        <td key={p.id} className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="text-base font-black text-forest">
                              {formatPrice(p.price)}/mes
                            </span>
                            {isBestPrice && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black text-jade bg-jade/10 px-2 py-0.5 rounded-md w-fit">
                                <Sparkles size={10} /> Mejor precio
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* DEPÓSITO */}
                  <tr className="hover:bg-[#FAF5EE]/60 transition-colors">
                    <td className="py-3 pr-4 font-bold text-text-secondary">Depósito en garantía</td>
                    {comparedProperties.map((p) => (
                      <td key={p.id} className="py-3 px-3">
                        {p.deposit ? formatPrice(p.deposit) : '1 mes'}
                      </td>
                    ))}
                  </tr>

                  {/* UBICACIÓN EXACTA */}
                  <tr className="hover:bg-[#FAF5EE]/60 transition-colors">
                    <td className="py-3 pr-4 font-bold text-text-secondary">Zona y Municipio</td>
                    {comparedProperties.map((p) => (
                      <td key={p.id} className="py-3 px-3 text-text-secondary">
                        {getSafeZone(p)}, {p.address?.municipality || 'Guatemala'}
                      </td>
                    ))}
                  </tr>

                  {/* HABITACIONES */}
                  <tr className="hover:bg-[#FAF5EE]/60 transition-colors">
                    <td className="py-3 pr-4 font-bold text-text-secondary flex items-center gap-1.5">
                      <Bed size={13} className="text-forest/70" /> Habitaciones
                    </td>
                    {comparedProperties.map((p) => (
                      <td key={p.id} className="py-3 px-3 font-extrabold text-cafe">
                        {p.bedrooms} hab{p.bedrooms > 1 ? 's' : ''}
                      </td>
                    ))}
                  </tr>

                  {/* BAÑOS */}
                  <tr className="hover:bg-[#FAF5EE]/60 transition-colors">
                    <td className="py-3 pr-4 font-bold text-text-secondary flex items-center gap-1.5">
                      <Bath size={13} className="text-forest/70" /> Baños
                    </td>
                    {comparedProperties.map((p) => (
                      <td key={p.id} className="py-3 px-3 font-extrabold text-cafe">
                        {p.bathrooms} baño{p.bathrooms > 1 ? 's' : ''}
                      </td>
                    ))}
                  </tr>

                  {/* ÁREA / TAMAÑO */}
                  <tr className="hover:bg-[#FAF5EE]/60 transition-colors">
                    <td className="py-3 pr-4 font-bold text-text-secondary flex items-center gap-1.5">
                      <Ruler size={13} className="text-forest/70" /> Área construida
                    </td>
                    {comparedProperties.map((p) => {
                      const isLargest = p.id === stats.maxAreaId;
                      return (
                        <td key={p.id} className="py-3 px-3">
                          <span className="font-extrabold">{p.area || '--'} m²</span>
                          {isLargest && (
                            <span className="ml-1.5 inline-block text-[10px] font-extrabold text-forest bg-forest/10 px-1.5 py-0.2 rounded">
                              Más amplio
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* PARQUEOS */}
                  <tr className="hover:bg-[#FAF5EE]/60 transition-colors">
                    <td className="py-3 pr-4 font-bold text-text-secondary flex items-center gap-1.5">
                      <Car size={13} className="text-forest/70" /> Parqueo
                    </td>
                    {comparedProperties.map((p) => (
                      <td key={p.id} className="py-3 px-3">
                        {p.parking > 0 ? `${p.parking} vehículo${p.parking > 1 ? 's' : ''}` : 'No incluye'}
                      </td>
                    ))}
                  </tr>

                  {/* AMUEBLADO */}
                  <tr className="hover:bg-[#FAF5EE]/60 transition-colors">
                    <td className="py-3 pr-4 font-bold text-text-secondary">Amueblado</td>
                    {comparedProperties.map((p) => (
                      <td key={p.id} className="py-3 px-3">
                        {p.furnished ? (
                          <span className="text-jade font-black flex items-center gap-1">
                            <Check size={14} /> Sí, equipado
                          </span>
                        ) : (
                          <span className="text-text-muted">No amueblado</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* MASCOTAS */}
                  <tr className="hover:bg-[#FAF5EE]/60 transition-colors">
                    <td className="py-3 pr-4 font-bold text-text-secondary">Mascotas (Pet friendly)</td>
                    {comparedProperties.map((p) => (
                      <td key={p.id} className="py-3 px-3">
                        {p.petsAllowed ? (
                          <span className="text-jade font-black flex items-center gap-1">
                            <Check size={14} /> Permitidas 🐾
                          </span>
                        ) : (
                          <span className="text-text-muted">No permitidas</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* PATIO / JARDÍN */}
                  <tr className="hover:bg-[#FAF5EE]/60 transition-colors">
                    <td className="py-3 pr-4 font-bold text-text-secondary">Patio / Jardín</td>
                    {comparedProperties.map((p) => (
                      <td key={p.id} className="py-3 px-3">
                        {p.patio ? (
                          <span className="text-forest font-black flex items-center gap-1">
                            <Check size={14} /> Sí tiene
                          </span>
                        ) : (
                          <span className="text-text-muted">Sin patio</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* SERVICIOS INCLUIDOS */}
                  <tr className="hover:bg-[#FAF5EE]/60 transition-colors">
                    <td className="py-3 pr-4 font-bold text-text-secondary">Servicios incluidos</td>
                    {comparedProperties.map((p) => (
                      <td key={p.id} className="py-3 px-3">
                        {p.servicesIncluded?.length > 0 ? (
                          <ul className="space-y-1 text-[11px] text-text-secondary">
                            {p.servicesIncluded.map((srv, idx) => (
                              <li key={idx} className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-forest shrink-0" />
                                <span>{srv}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-text-muted text-[11px]">Consumo independiente</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* VERIFICACIÓN DPI */}
                  <tr className="hover:bg-[#FAF5EE]/60 transition-colors">
                    <td className="py-3 pr-4 font-bold text-text-secondary flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-dorado" /> Verificación DPI
                    </td>
                    {comparedProperties.map((p) => (
                      <td key={p.id} className="py-3 px-3">
                        {p.verified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-dorado bg-dorado/10 px-2 py-0.5 rounded-full border border-dorado/20">
                            <ShieldCheck size={11} /> Verificado
                          </span>
                        ) : (
                          <span className="text-text-muted text-[11px]">En validación</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* ACCIONES */}
                  <tr>
                    <td className="pt-5 pb-2 pr-4 font-black text-cafe">Acciones</td>
                    {comparedProperties.map((p) => (
                      <td key={p.id} className="pt-5 pb-2 px-3">
                        <div className="flex flex-col gap-2">
                          <Link
                            to={`/propiedad/${p.id}`}
                            onClick={closeCompareModal}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-forest py-2.5 px-3 text-xs font-extrabold text-white hover:bg-forest-dark transition-colors shadow-xs"
                          >
                            <span>Ver ficha</span>
                            <ExternalLink size={13} />
                          </Link>
                          <Link
                            to={`/propiedad/${p.id}`}
                            onClick={closeCompareModal}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-terracota bg-terracota/10 py-2 px-3 text-xs font-black text-terracota hover:bg-terracota hover:text-white transition-all"
                          >
                            <Calendar size={12} />
                            <span>Agendar visita</span>
                          </Link>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              </div>

              {/* ========================================================= */}
              {/* CONCLUSIÓN Y VEREDICTO FINAL SEGÚN PRESUPUESTO            */}
              {/* ========================================================= */}
              {verdict && (
                <div className="rounded-3xl border-2 border-forest/20 bg-gradient-to-br from-[#FAF5EE] via-white to-[#F6EDE2] p-5 sm:p-7 shadow-elevated">
                  
                  {/* Encabezado de la Sección de Conclusión */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border-light">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center shrink-0 shadow-md">
                        <Award size={24} className="text-dorado" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black uppercase tracking-wider text-forest bg-forest/10 px-2.5 py-0.5 rounded-full border border-forest/20">
                            Asesor Financiero RuwaJay
                          </span>
                          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${verdict.badgeColor}`}>
                            {verdict.badgeText}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-cafe mt-1">
                          Conclusión y Veredicto Final
                        </h3>
                        <p className="text-xs text-text-secondary font-medium">
                          Evaluamos la opción que más te conviene para empezar a alquilar según tu presupuesto inicial.
                        </p>
                      </div>
                    </div>

                    {/* Presupuesto Interactivo */}
                    <div className="bg-white/90 backdrop-blur-xs rounded-2xl border border-border p-3 sm:p-3.5 shadow-xs shrink-0 max-w-full md:max-w-xs">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className="text-[11px] font-black text-cafe flex items-center gap-1">
                          <Wallet size={13} className="text-forest" />
                          <span>Tu presupuesto para entrar:</span>
                        </label>
                        <span className="text-[10px] font-bold text-text-muted">
                          (Renta + Depósito)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCustomBudget(Math.max(1000, activeBudget - 500))}
                          className="h-8 w-8 rounded-lg border border-border bg-crema/50 flex items-center justify-center text-cafe hover:bg-forest hover:text-white transition-colors cursor-pointer"
                          title="Restar Q500"
                        >
                          <Minus size={14} />
                        </button>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-forest">
                            Q
                          </span>
                          <input
                            type="text"
                            value={(Number(activeBudget) || 0).toLocaleString('es-GT')}
                            onChange={(e) => {
                              const num = Number(e.target.value.replace(/\D/g, ''));
                              setCustomBudget(isNaN(num) ? 0 : num);
                            }}
                            className="w-full pl-7 pr-2 py-1.5 text-center text-sm font-black text-cafe bg-[#FAF5EE] rounded-lg border border-border-light focus:outline-none focus:border-forest"
                            placeholder="Ej. 6,000"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setCustomBudget(activeBudget + 500)}
                          className="h-8 w-8 rounded-lg border border-border bg-crema/50 flex items-center justify-center text-cafe hover:bg-forest hover:text-white transition-colors cursor-pointer"
                          title="Sumar Q500"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Presets rápidos */}
                      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5">
                        {budgetPresets.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCustomBudget(preset.value)}
                            className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              activeBudget === preset.value
                                ? 'bg-forest text-white'
                                : 'bg-crema/70 text-text-secondary hover:bg-crema'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta Destacada del Veredicto (La Ganadora) */}
                  <div className="mt-5 rounded-2xl border-2 border-forest/25 bg-white p-4 sm:p-6 shadow-card">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      
                      {/* Información de la Propiedad Ganadora */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-border bg-crema">
                          <img
                            src={getSafeImage(verdict.winner)}
                            alt={verdict.winner.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 bg-forest text-white p-1 rounded-lg shadow-sm">
                            <Sparkles size={12} className="text-dorado" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-forest bg-forest/10 px-2 py-0.5 rounded-md">
                              🏆 Elección Recomendada
                            </span>
                            <span className="text-[10px] font-bold text-text-muted">
                              {getSafeZone(verdict.winner)}
                            </span>
                          </div>
                          <h4 className="text-base sm:text-lg font-black text-cafe leading-snug">
                            {verdict.verdictTitle}
                          </h4>
                          <p className="text-xs text-text-secondary font-normal mt-2 leading-relaxed bg-[#FAF5EE] p-3 rounded-xl border border-border-light">
                            {verdict.verdictExplanation}
                          </p>
                        </div>
                      </div>

                      {/* Métricas Financieras Clave de Entrada */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 shrink-0 lg:w-56">
                        <div className="rounded-xl border border-border-light bg-[#FAF5EE] p-2.5 text-center">
                          <span className="text-[10px] font-bold text-text-muted block">
                            Costo Total Entrada
                          </span>
                          <span className="text-base font-black text-forest block">
                            {formatPrice(verdict.winner.initialCost)}
                          </span>
                          <span className="text-[9px] text-text-muted font-medium">
                            1er mes + depósito
                          </span>
                        </div>

                        <div className="rounded-xl border border-border-light bg-[#FAF5EE] p-2.5 text-center">
                          <span className="text-[10px] font-bold text-text-muted block">
                            Margen tras pagar
                          </span>
                          <span className={`text-base font-black block ${
                            (verdict.winner.buffer ?? 0) >= 0 ? 'text-jade' : 'text-terracota'
                          }`}>
                            {(verdict.winner.buffer ?? 0) >= 0
                              ? `+${formatPrice(verdict.winner.buffer ?? 0)}`
                              : `-${formatPrice(Math.abs(verdict.winner.buffer ?? 0))}`}
                          </span>
                          <span className="text-[9px] text-text-muted font-medium">
                            {(verdict.winner.buffer ?? 0) >= 0 ? 'Disponible libre' : 'Monto faltante'}
                          </span>
                        </div>

                        {verdict.maxSavings > 0 && (
                          <div className="rounded-xl border border-forest/20 bg-forest/5 p-2.5 text-center col-span-2 sm:col-span-1 lg:col-span-1">
                            <span className="text-[10px] font-black text-forest block">
                              Ahorro Máximo
                            </span>
                            <span className="text-base font-black text-forest block">
                              {formatPrice(verdict.maxSavings)}
                            </span>
                            <span className="text-[9px] text-text-muted font-medium">
                              vs opción más costosa
                            </span>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Botón de acción para la ganadora */}
                    <div className="mt-4 pt-3 border-t border-border-light flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-text-secondary font-medium">
                        <CheckCircle2 size={15} className="text-jade shrink-0" />
                        <span>
                          Incluye {verdict.winner.bedrooms} hab, {verdict.winner.bathrooms} baños {verdict.winner.parking > 0 ? `y ${verdict.winner.parking} parqueo(s)` : ''}
                        </span>
                      </div>
                      <Link
                        to={`/propiedad/${verdict.winner.id}`}
                        onClick={closeCompareModal}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-black text-white hover:bg-forest-dark transition-all shadow-md active:scale-95"
                      >
                        <span>Elegir esta opción y ver ficha</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>

                  {/* Comparación de Viabilidad Lado a Lado (Todas las opciones) */}
                  <div className="mt-5">
                    <h5 className="text-xs font-black uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                      <Lightbulb size={13} className="text-dorado" />
                      <span>Desglose de Entrada según tu presupuesto de {formatPrice(activeBudget)}:</span>
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {propertiesWithCosts.map((p) => {
                        const fits = p.initialCost <= activeBudget;
                        const diff = activeBudget - p.initialCost;
                        const isWinner = p.id === verdict.winner.id;

                        return (
                          <div
                            key={p.id}
                            className={`rounded-2xl border p-3.5 transition-all bg-white flex flex-col justify-between ${
                              isWinner
                                ? 'border-forest ring-2 ring-forest/20 shadow-md'
                                : 'border-border-light hover:border-border'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                  fits
                                    ? 'bg-jade/10 text-jade border-jade/20'
                                    : 'bg-red-50 text-red-600 border-red-200'
                                }`}>
                                  {fits ? '● Entra en presupuesto' : '● Excede presupuesto'}
                                </span>
                                {isWinner && (
                                  <span className="text-[10px] font-black text-forest flex items-center gap-0.5">
                                    <Sparkles size={11} /> Recomendada
                                  </span>
                                )}
                              </div>

                              <h6 className="text-xs font-black text-cafe line-clamp-1 mb-1">
                                {p.title}
                              </h6>
                              <p className="text-[11px] text-text-muted mb-3">
                                {getSafeZone(p)}
                              </p>

                              <div className="space-y-1.5 bg-[#FAF5EE] rounded-xl p-2.5 text-[11px] font-semibold text-cafe">
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Renta 1er mes:</span>
                                  <span className="font-bold">{formatPrice(p.rent)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Depósito en garantía:</span>
                                  <span className="font-bold">{formatPrice(p.deposit)}</span>
                                </div>
                                <div className="border-t border-border-light pt-1 flex justify-between font-black text-forest">
                                  <span>Total para entrar:</span>
                                  <span>{formatPrice(p.initialCost)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-border-light flex items-center justify-between">
                              <span className={`text-[10px] font-black ${
                                fits ? 'text-jade' : 'text-red-600'
                              }`}>
                                {fits
                                  ? `Te sobran ${formatPrice(diff)}`
                                  : `Faltan ${formatPrice(Math.abs(diff))}`}
                              </span>
                              <Link
                                to={`/propiedad/${p.id}`}
                                onClick={closeCompareModal}
                                className="text-[11px] font-black text-forest hover:text-forest-dark flex items-center gap-1"
                              >
                                <span>Ver ficha</span>
                                <ChevronRight size={12} />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-border-light bg-[#FAF5EE] px-6 py-3.5 text-xs">
              <span className="text-text-muted font-medium">
                💡 Tip: Compara amenidades y costos de mantenimiento antes de tomar una decisión.
              </span>
              <button
                type="button"
                onClick={closeCompareModal}
                className="rounded-xl bg-cafe px-4 py-2 font-black text-white hover:bg-black transition-colors"
              >
                Cerrar comparativa
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
