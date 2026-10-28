import { saveSearch } from '../../lib/savedSearchService';
import { useState, useMemo, useEffect, useRef } from 'react';
import useModalFocus from '../../hooks/useModalFocus';
import { X, Bookmark, Bell, Check, Sparkles, MapPin, SlidersHorizontal } from 'lucide-react';

/**
 * SaveSearchModal — Save search criteria and activate real-time property alerts
 */
export default function SaveSearchModal({
  isOpen,
  onClose,
  filters,
  searchQuery = '',
  matchCount = 0,
  onSaveSuccess,
}) {
  // Smart suggested name based on filters
  const suggestedName = useMemo(() => {
    const parts = [];
    if (filters?.type) {
      parts.push(filters.type === 'casa' ? 'Casas' : 'Apartamentos');
    } else {
      parts.push('Viviendas');
    }

    if (filters?.department && filters.department !== 'Todos') {
      parts.push(`en ${filters.department}`);
    } else if (filters?.zone && !filters.zone.toLowerCase().startsWith('todas')) {
      parts.push(`en ${filters.zone.split('(')[0].trim()}`);
    }

    if (filters?.priceMax) {
      parts.push(`hasta Q${Number(filters.priceMax).toLocaleString('es-GT')}`);
    }

    if (searchQuery) {
      parts.push(`"${searchQuery}"`);
    }

    return parts.join(' ') || 'Mi Búsqueda Personalizada';
  }, [filters, searchQuery]);

  const [searchName, setSearchName] = useState(suggestedName);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const modalRef = useModalFocus(isOpen, onClose, saving);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen || !savedSuccess) return;
    const timer = setTimeout(() => closeRef.current(), 1200);
    return () => clearTimeout(timer);
  }, [isOpen, savedSuccess]);

  useEffect(() => {
    if (isOpen) {
      setSearchName(suggestedName);
      setSavedSuccess(false);
      setError('');
      setNotifyEmail(true);
    }
  }, [isOpen, suggestedName]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (savingRef.current || savedSuccess) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    const newSearch = {
      id: `saved-${Date.now()}`,
      name: searchName.trim() || suggestedName,
      filters: { ...filters },
      searchQuery: searchQuery || '',
      notifyPush: notifyEmail,
      matchCount,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveSearch(newSearch);
    } catch (error) {
      setError(error.message || 'No se pudo guardar la búsqueda. Revisa tu conexión y vuelve a intentarlo.');
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    setSavedSuccess(true);
    onSaveSuccess?.(newSearch);
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Guardar búsqueda" aria-busy={saving}
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-[#FDFBF7] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest text-white shadow-xs">
              <Bookmark size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-cafe">Guardar Búsqueda</h3>
              <p className="text-xs text-text-muted">Crea una alerta para no perderte nuevas opciones</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar búsqueda"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-cafe/5 hover:text-cafe transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        {savedSuccess ? (
          <div role="status" className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-jade/10 text-jade flex items-center justify-center mx-auto mb-3">
              <Check size={32} strokeWidth={3} />
            </div>
            <h4 className="text-lg font-black text-cafe">¡Búsqueda guardada!</h4>
            <p className="text-xs text-text-muted mt-1">
              Podrás verla en tu perfil y recibirás alertas cuando entren nuevas viviendas.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div>
              <label className="block text-xs font-bold text-cafe mb-1.5">Nombre de la búsqueda</label>
              <input
                type="text"
                id="saved-search-name"
                aria-label="Nombre de la búsqueda"
                maxLength={120}
                disabled={saving}
                required
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Ej. Apartamentos en Zona 14 bajo Q6,000"
                className="w-full rounded-xl border border-border bg-[#FDFBF7] px-3.5 py-2.5 text-xs font-bold text-cafe outline-none focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/15"
              />
            </div>

            {/* Criteria Preview */}
            <div className="rounded-2xl border border-border bg-crema/40 p-3.5">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2">
                Criterios a guardar ({matchCount} viviendas hoy):
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                {filters?.department && filters.department !== 'Todos' && (
                  <span className="rounded-lg bg-white border border-border px-2 py-1 text-[11px] font-bold text-forest">
                    📍 {filters.department}
                  </span>
                )}
                {filters?.zone && !filters.zone.toLowerCase().startsWith('todas') && (
                  <span className="rounded-lg bg-white border border-border px-2 py-1 text-[11px] font-bold text-forest">
                    🏙️ {filters.zone.split('(')[0].trim()}
                  </span>
                )}
                {filters?.type && (
                  <span className="rounded-lg bg-white border border-border px-2 py-1 text-[11px] font-bold text-cafe">
                    {filters.type === 'casa' ? 'Casa' : 'Apartamento'}
                  </span>
                )}
                {filters?.priceMax && (
                  <span className="rounded-lg bg-white border border-border px-2 py-1 text-[11px] font-bold text-cafe">
                    ≤ Q{filters.priceMax}
                  </span>
                )}
                {filters?.bedrooms && (
                  <span className="rounded-lg bg-white border border-border px-2 py-1 text-[11px] font-bold text-cafe">
                    {filters.bedrooms}+ Habs
                  </span>
                )}
                {filters?.security && (
                  <span className="rounded-lg bg-white border border-border px-2 py-1 text-[11px] font-bold text-forest">
                    Garita 24/7
                  </span>
                )}
                {filters?.waterGuaranteed && (
                  <span className="rounded-lg bg-white border border-border px-2 py-1 text-[11px] font-bold text-azul-ruta">
                    Agua garantizada
                  </span>
                )}
              </div>
            </div>

            {/* Notifications Checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-2xl border border-border bg-[#FDFBF7] cursor-pointer hover:bg-white transition-colors">
              <input
                type="checkbox"
                disabled={saving}
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-forest focus:ring-forest border-border"
              />
              <div className="text-xs">
                <span className="font-bold text-cafe flex items-center gap-1">
                  <Bell size={13} className="text-forest" />
                  Activar alertas de nuevas propiedades
                </span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Te avisaremos en tu perfil cuando propietarios publiquen viviendas que cumplan estos requisitos.
                </p>
              </div>
            </label>

            {/* Submit */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-text-muted hover:text-cafe"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-forest px-5 py-2.5 text-xs font-black text-white hover:bg-forest-dark transition-all shadow-xs"
              >
                {saving ? 'Guardando…' : 'Guardar búsqueda'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
