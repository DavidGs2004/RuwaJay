import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  X, ArrowLeftRight, Check, Trash2, Bed, Bath, Car, Ruler,
  MapPin, ShieldCheck, Sparkles, ExternalLink, Calendar, AlertCircle
} from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import { formatPrice } from '../../data/properties';

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
                    src={p.thumbnail || (p.images && Object.values(p.images).flat()[0]) || '/Casas/cat-familiar.jpg'}
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

            {/* Modal Body - Comparison Table */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6">
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
                              src={p.thumbnail || (p.images && Object.values(p.images).flat()[0]) || '/Casas/cat-familiar.jpg'}
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
                            <span className="truncate">{p.address?.zone || p.address?.approximate || 'Guatemala'}</span>
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
                        {p.address?.zone || 'N/A'}, {p.address?.municipality || 'Guatemala'}
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
