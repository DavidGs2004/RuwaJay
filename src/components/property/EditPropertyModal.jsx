import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Check, Building2, Home, DollarSign, Bed, Bath, Car, Ruler,
  Trash2, Plus, Image as ImageIcon, Sparkles, ExternalLink, AlertTriangle,
  CheckCircle2, Clock
} from 'lucide-react';
import { updatePropertyToFirebase } from '../../lib/propertyService';
import { sanitizeText } from '../../utils/security';
import PropertyLocationPickerMap from '../map/PropertyLocationPickerMap';
import { MapPin } from 'lucide-react';

export default function EditPropertyModal({ property, isOpen, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'casa',
    price: '',
    deposit: '',
    maintenanceFee: '',
    status: 'disponible',
    bedrooms: 2,
    bathrooms: 1,
    parking: 1,
    area: '',
    description: '',
    coordinates: null,
  });

  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when property prop changes
  useEffect(() => {
    if (!property) return;

    setFormData({
      title: property.title || '',
      type: property.type || 'casa',
      price: property.price !== undefined ? String(property.price) : '',
      deposit: property.deposit !== undefined ? String(property.deposit) : '',
      maintenanceFee: property.maintenanceFee !== undefined ? String(property.maintenanceFee) : '',
      status: property.status || 'disponible',
      bedrooms: Number(property.bedrooms || 2),
      bathrooms: Number(property.bathrooms || 1),
      parking: Number(property.parking || 1),
      area: property.area !== undefined ? String(property.area) : '',
      description: property.description || '',
      coordinates: property.coordinates || property.location?.mapCoordinates || null,
    });

    // Extract images list
    const rawImagesList = Array.isArray(property.images)
      ? property.images
      : [
          ...(Array.isArray(property.images?.fachada) ? property.images.fachada : []),
          ...(Array.isArray(property.images?.general) ? property.images.general : []),
          ...(Array.isArray(property.thumbnails) ? property.thumbnails : []),
          ...(property.thumbnail ? [property.thumbnail] : []),
        ];

    const uniqueImages = Array.from(new Set(rawImagesList.filter(Boolean)));
    setImages(uniqueImages);
    setSaveError('');
    setSaveSuccess(false);
  }, [property]);

  if (!isOpen || !property) return null;

  const handleAddImageUrl = (e) => {
    e.preventDefault();
    const url = newImageUrl.trim();
    if (!url) return;
    if (images.includes(url)) {
      setSaveError('Esta fotografía ya está en la lista.');
      return;
    }
    setImages((prev) => [...prev, url]);
    setNewImageUrl('');
    setSaveError('');
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const result = loadEvent.target.result;
        if (result && typeof result === 'string') {
          setImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetCover = (index) => {
    setImages((prev) => {
      const copy = [...prev];
      const selected = copy.splice(index, 1)[0];
      return [selected, ...copy];
    });
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaveError('');

    if (!formData.title.trim()) {
      setSaveError('Por favor ingresa un título para la vivienda.');
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      setSaveError('Ingresa un precio mensual válido.');
      return;
    }
    if (images.length === 0) {
      setSaveError('Debes conservar al menos una fotografía de la vivienda.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedPayload = {
        ...property,
        title: sanitizeText(formData.title.trim()),
        type: formData.type,
        price: Number(formData.price),
        deposit: Number(formData.deposit) || Number(formData.price),
        maintenanceFee: Number(formData.maintenanceFee) || 0,
        status: formData.status,
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        parking: Number(formData.parking),
        area: Number(formData.area) || 0,
        description: sanitizeText(formData.description),
        coordinates: formData.coordinates || property.coordinates || property.location?.mapCoordinates || null,
        location: {
          ...(property.location || {}),
          mapCoordinates: formData.coordinates || property.coordinates || property.location?.mapCoordinates || null,
        },
        thumbnail: images[0],
        thumbnails: images,
        images: {
          fachada: [images[0]],
          general: images,
        },
      };

      await updatePropertyToFirebase(updatedPayload);
      setSaveSuccess(true);

      if (onSaved) {
        onSaved(updatedPayload);
      }

      window.setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error guardando cambios de la vivienda:', err);
      setSaveError('Hubo un problema guardando los cambios. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-border-light my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border-light bg-[#FAF7F2] px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest/10 text-forest">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-cafe">Editar Vivienda Publicada</h2>
              <p className="text-xs text-text-muted truncate max-w-xs sm:max-w-md">
                {property.title || 'Modifica los datos y fotografías de tu propiedad'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-text-muted hover:bg-crema hover:text-cafe transition-colors border border-border-light cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {saveError && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700 animate-[shake_0.3s_ease-in-out]">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-black text-emerald-800">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <span>¡Vivienda actualizada exitosamente en tiempo real!</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-black tracking-wider uppercase text-forest flex items-center gap-1.5">
              <Home size={14} /> Información General
            </h3>

            <div>
              <label className="block text-xs font-extrabold text-cafe mb-1.5">
                Título del anuncio <span className="text-terracota">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej. Casa familiar con jardín en Zona 14"
                required
                className="w-full rounded-xl border border-border-light bg-[#FDFBF7] px-3.5 py-2.5 text-sm font-semibold text-cafe outline-none transition-all focus:border-forest focus:ring-2 focus:ring-forest/10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-extrabold text-cafe mb-1.5">
                  Tipo de inmueble
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-xl border border-border-light bg-[#FDFBF7] px-3.5 py-2.5 text-sm font-bold text-cafe outline-none transition-all focus:border-forest"
                >
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="habitacion">Habitación / Cuarto</option>
                  <option value="loft">Loft / Estudio</option>
                  <option value="comercial">Local Comercial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-cafe mb-1.5">
                  Estado de disponibilidad
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-xl border border-border-light bg-[#FDFBF7] px-3.5 py-2.5 text-sm font-extrabold text-cafe outline-none transition-all focus:border-forest"
                >
                  <option value="disponible">🟢 Disponible para visitas</option>
                  <option value="en_cita">🟠 En Cita / Visita activa</option>
                  <option value="alquilada">🟣 Ocupada / Alquilada</option>
                  <option value="pausada">⚪ Pausada (oculta)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Interactive GPS Map & Search */}
          <div className="space-y-3 pt-2 border-t border-border-light">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-forest flex items-center gap-1.5">
                <MapPin size={14} /> Ubicación en el Mapa (GPS y Búsqueda)
              </h3>
              <span className="text-[11px] text-text-muted">
                {property.zone || property.department || 'Guatemala'}
              </span>
            </div>
            <PropertyLocationPickerMap
              coordinates={formData.coordinates}
              department={property.department || property.address?.department || 'Guatemala'}
              zone={property.zone || property.address?.zone || 'Zona 10'}
              onLocationSelected={(coords) => {
                setFormData((prev) => ({
                  ...prev,
                  coordinates: coords,
                }));
              }}
            />
          </div>

          {/* Section 2: Pricing */}
          <div className="space-y-4 pt-2 border-t border-border-light">
            <h3 className="text-xs font-black tracking-wider uppercase text-forest flex items-center gap-1.5">
              <DollarSign size={14} /> Precios y Pagos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-extrabold text-cafe mb-1.5">
                  Alquiler mensual (Q) <span className="text-terracota">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">Q</span>
                  <input
                    type="number"
                    min="1"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    className="w-full rounded-xl border border-border-light bg-[#FDFBF7] pl-8 pr-3 py-2.5 text-sm font-extrabold text-forest outline-none transition-all focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-cafe mb-1.5">
                  Depósito garantía (Q)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">Q</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                    className="w-full rounded-xl border border-border-light bg-[#FDFBF7] pl-8 pr-3 py-2.5 text-sm font-bold text-cafe outline-none transition-all focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-cafe mb-1.5">
                  Mantenimiento (Q)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">Q</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.maintenanceFee}
                    onChange={(e) => setFormData({ ...formData, maintenanceFee: e.target.value })}
                    className="w-full rounded-xl border border-border-light bg-[#FDFBF7] pl-8 pr-3 py-2.5 text-sm font-bold text-cafe outline-none transition-all focus:border-forest"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Spaces */}
          <div className="space-y-4 pt-2 border-t border-border-light">
            <h3 className="text-xs font-black tracking-wider uppercase text-forest flex items-center gap-1.5">
              <Bed size={14} /> Distribución y Espacios
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-extrabold text-text-secondary mb-1">
                  Habitaciones
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  className="w-full rounded-xl border border-border-light bg-[#FDFBF7] px-3 py-2 text-sm font-bold text-cafe"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-text-secondary mb-1">
                  Baños
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  className="w-full rounded-xl border border-border-light bg-[#FDFBF7] px-3 py-2 text-sm font-bold text-cafe"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-text-secondary mb-1">
                  Parqueos
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.parking}
                  onChange={(e) => setFormData({ ...formData, parking: e.target.value })}
                  className="w-full rounded-xl border border-border-light bg-[#FDFBF7] px-3 py-2 text-sm font-bold text-cafe"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-text-secondary mb-1">
                  Área (m²)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="Ej. 120"
                  className="w-full rounded-xl border border-border-light bg-[#FDFBF7] px-3 py-2 text-sm font-bold text-cafe"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Photographs Gallery Management */}
          <div className="space-y-3 pt-2 border-t border-border-light">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-forest flex items-center gap-1.5">
                <ImageIcon size={14} /> Fotografías ({images.length})
              </h3>
              <span className="text-[11px] text-text-muted">
                La primera foto es la portada principal
              </span>
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-4/3 overflow-hidden rounded-2xl border border-border-light bg-crema shadow-2xs"
                >
                  <img
                    src={imgUrl}
                    alt={`Foto ${idx + 1}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 rounded-md bg-forest/90 px-1.5 py-0.5 text-[9px] font-black text-white shadow-xs">
                      Portada
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetCover(idx)}
                        className="rounded-lg bg-white/90 p-1.5 text-cafe hover:bg-white text-[10px] font-black cursor-pointer shadow-xs"
                        title="Establecer como foto de portada"
                      >
                        Portada
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="rounded-lg bg-red-600/90 p-1.5 text-white hover:bg-red-600 cursor-pointer shadow-xs"
                      title="Eliminar foto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Image Inputs */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <div className="flex-1 flex gap-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Pegar enlace de imagen (https://...)"
                  className="flex-1 rounded-xl border border-border-light bg-[#FDFBF7] px-3 py-2 text-xs font-semibold text-cafe outline-none focus:border-forest"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="inline-flex items-center gap-1 rounded-xl bg-forest/10 hover:bg-forest/20 text-forest px-3 py-2 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Añadir enlace
                </button>
              </div>

              <label className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white hover:bg-crema text-cafe px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer">
                <ImageIcon size={14} className="text-forest" />
                <span>Subir de tu dispositivo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Section 5: Description */}
          <div className="space-y-2 pt-2 border-t border-border-light">
            <label className="block text-xs font-extrabold text-cafe">
              Descripción de la vivienda
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe detalles atractivos, servicios cercanos, seguridad o requisitos..."
              className="w-full rounded-xl border border-border-light bg-[#FDFBF7] p-3 text-xs font-medium text-cafe outline-none transition-all focus:border-forest resize-none"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-light bg-[#FAF7F2] px-6 py-4">
          <Link
            to={`/publicar/${property.id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:underline"
          >
            <ExternalLink size={13} /> Abrir asistente paso a paso
          </Link>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-bold text-cafe hover:bg-crema transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-forest hover:bg-forest-dark text-white px-5 py-2.5 text-xs font-black transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
