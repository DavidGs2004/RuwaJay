import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Home, MapPin, DollarSign, Upload, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RuwaSelect from '../components/ui/RuwaSelect';
import { GUATEMALA_DEPARTMENTS_ONLY, getZonesForDepartment } from '../data/guatemalaLocations';
import { sanitizeText } from '../utils/security';
import { publishPropertyToFirebase, uploadPropertyImages } from '../lib/propertyService';
import { firebaseAuth } from '../lib/firebase';

export default function PublishPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: 'casa',
    title: '',
    description: '',
    price: '',
    deposit: '',
    bedrooms: 2,
    bathrooms: 1,
    department: 'Guatemala',
    municipality: 'Guatemala',
    zone: 'Zona 10 (Zona Viva / Oakland)',
    approximateAddress: '',
    exactAddress: '',
  });

  const availablePublishZones = useMemo(() => {
    return getZonesForDepartment(formData.department)
      .filter((z) => !z.toLowerCase().startsWith('todas') && !z.toLowerCase().startsWith('todos'));
  }, [formData.department]);

  const handlePublishDeptChange = (dept) => {
    const newZones = getZonesForDepartment(dept)
      .filter((z) => !z.toLowerCase().startsWith('todas') && !z.toLowerCase().startsWith('todos'));
    setFormData((prev) => ({
      ...prev,
      department: dept,
      zone: newZones[0] || `${dept} Centro`,
    }));
  };

  const [published, setPublished] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  useEffect(() => () => selectedImages.forEach(({ preview }) => URL.revokeObjectURL(preview)), [selectedImages]);

  if (!user || user.role !== 'owner') {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-crema/30 px-4 py-12">
        <div className="max-w-md rounded-3xl border border-border bg-white p-8 text-center shadow-card">
          <Building2 size={46} className="mx-auto mb-4 text-terracota" />
          <h1 className="text-2xl font-extrabold text-cafe">Cuenta de propietario requerida</h1>
          <p className="mt-2 text-sm text-text-secondary">Para publicar una vivienda debes registrarte con la opción “Quiero publicar”. Así podremos guardar tus datos de contacto para los anuncios.</p>
          <Link to="/login" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-forest px-6 text-sm font-bold text-white">Ir al acceso</Link>
        </div>
      </main>
    );
  }

  const handlePublish = async (e) => {
    e.preventDefault();
    setIsPublishing(true);
    setPublishError('');

    // Persist the new property to localStorage so it shows in "Mis Propiedades"
    const cleanTitle = sanitizeText(formData.title);
    const newProperty = {
      id: `custom-${Date.now()}`,
      ownerId: firebaseAuth?.currentUser?.uid || user?.id || 'unknown',
      title: cleanTitle || `${formData.type === 'casa' ? 'Casa' : 'Apartamento'} en ${formData.zone}`,
      type: formData.type,
      price: formData.price,
      deposit: formData.deposit,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      department: formData.department,
      municipality: formData.municipality,
      zone: formData.zone,
      approximateAddress: sanitizeText(formData.approximateAddress),
      exactAddress: sanitizeText(formData.exactAddress),
      description: sanitizeText(formData.description),
      status: 'disponible',
      images: [],
      views: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const imageUrls = await uploadPropertyImages(
        selectedImages.map(({ file }) => file),
        newProperty.id
      );
      newProperty.images = imageUrls;
      await publishPropertyToFirebase(newProperty);
    } catch (error) {
      setPublishError(error?.message || 'No se pudo subir la propiedad. Revisa la configuración de Firebase.');
      setIsPublishing(false);
      return;
    }

    setPublished(true);
    setIsPublishing(false);
    setTimeout(() => {
      navigate('/perfil?tab=propiedades');
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-crema/30 pb-24 pt-4 md:pb-12 md:pt-6">
      <div className="mx-auto max-w-3xl px-3 sm:px-6">
        <div className="rounded-3xl border border-border bg-white p-5 shadow-card sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-cafe mb-2">Publicar tu propiedad</h1>
            <p className="text-sm text-text-secondary">Encuentra inquilinos confiables para tu vivienda en Guatemala</p>
          </div>

          {/* Steps Progress */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-0" />
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm transition-all ${
                  step >= s ? 'bg-forest text-white shadow-md' : 'bg-crema text-text-muted border border-border'
                }`}
              >
                {s}
              </div>
            ))}
          </div>

          {published ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-20 h-20 bg-jade/10 text-jade rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={48} />
              </div>
              <h2 className="text-2xl font-extrabold text-cafe">¡Propiedad publicada con éxito!</h2>
              <p className="text-sm text-text-secondary">Tu propiedad ya está disponible para explorarse en el mapa.</p>
            </div>
          ) : (
            <form onSubmit={handlePublish} className="space-y-6">
              {step === 1 && (
                <div className="space-y-4 animate-[fade-in_0.3s_ease-out]">
                  <h3 className="font-bold text-cafe text-base mb-2">Paso 1: Tipo y Ubicación</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-cafe mb-1.5">Tipo de Vivienda</label>
                    <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'casa' })}
                         className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition-all sm:p-4 ${
                          formData.type === 'casa'
                            ? 'border-forest bg-forest/10 text-forest'
                            : 'border-border text-cafe hover:bg-crema'
                        }`}
                      >
                        <Home size={20} /> Casa
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'apartamento' })}
                         className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition-all sm:p-4 ${
                          formData.type === 'apartamento'
                            ? 'border-forest bg-forest/10 text-forest'
                            : 'border-border text-cafe hover:bg-crema'
                        }`}
                      >
                        <Building2 size={20} /> Apartamento
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-cafe mb-1">Departamento</label>
                      <RuwaSelect
                        value={formData.department}
                        onChange={handlePublishDeptChange}
                        options={GUATEMALA_DEPARTMENTS_ONLY}
                        searchPlaceholder="Buscar departamento..."
                        align="auto"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-cafe mb-1">Municipio / Zona</label>
                      <RuwaSelect
                        value={formData.zone}
                        onChange={(val) => setFormData({ ...formData, zone: val })}
                        options={availablePublishZones}
                        searchPlaceholder="Buscar municipio o zona..."
                        align="auto"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-cafe mb-1">Dirección Aproximada (Pública)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Zona 10, cerca de Pradera"
                      value={formData.approximateAddress}
                      onChange={(e) => setFormData({ ...formData, approximateAddress: e.target.value })}
                      className="min-h-12 w-full min-w-0 rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-forest"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest px-6 py-3 text-sm font-bold text-white transition-all hover:bg-forest-dark sm:w-auto"
                    >
                      Siguiente <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-[fade-in_0.3s_ease-out]">
                  <h3 className="font-bold text-cafe text-base mb-2">Paso 2: Detalles y Precio</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-cafe mb-1">Título de la publicación</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Casa amplia de 3 habitaciones con jardín"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="min-h-12 w-full min-w-0 rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-forest"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-cafe mb-1">Precio mensual (Q)</label>
                      <input
                        type="number"
                        required
                        placeholder="4500"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="min-h-12 w-full min-w-0 rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-forest"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-cafe mb-1">Depósito (Q)</label>
                      <input
                        type="number"
                        required
                        placeholder="4500"
                        value={formData.deposit}
                        onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                        className="min-h-12 w-full min-w-0 rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-forest"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-cafe mb-1">Habitaciones</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                        className="min-h-12 w-full min-w-0 rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-forest"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-cafe mb-1">Baños</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                        className="min-h-12 w-full min-w-0 rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-forest"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-crema px-6 py-3 text-sm font-bold text-cafe transition-all hover:bg-forest/10 sm:w-auto"
                    >
                      <ArrowLeft size={18} /> Atrás
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest px-6 py-3 text-sm font-bold text-white transition-all hover:bg-forest-dark sm:w-auto"
                    >
                      Siguiente <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 animate-[fade-in_0.3s_ease-out]">
                  <h3 className="font-bold text-cafe text-base mb-2">Paso 3: Fotografías y Confirmación</h3>
                  
                  <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-border bg-crema/30 p-5 text-center transition-colors hover:bg-crema/60 sm:p-8">
                    <Upload size={36} className="mx-auto text-forest mb-2" />
                    <p className="font-bold text-sm text-cafe">Sube las fotos de la vivienda</p>
                    <p className="text-xs text-text-muted mt-1">Fachada, sala, cocina, habitaciones y baño</p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      onChange={(event) => {
                        const files = Array.from(event.target.files || []).slice(0, 8);
                        setSelectedImages((previous) => {
                          previous.forEach(({ preview }) => URL.revokeObjectURL(preview));
                          return files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
                        });
                      }}
                    />
                  </label>

                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {selectedImages.map(({ file, preview }) => (
                        <img key={`${file.name}-${file.lastModified}`} src={preview} alt={file.name} className="aspect-square w-full rounded-xl object-cover" />
                      ))}
                    </div>
                  )}

                  {publishError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{publishError}</p>}

                  <div className="p-4 bg-crema/50 rounded-2xl space-y-1 text-xs text-text-secondary">
                    <p className="font-bold text-cafe">Resumen de publicación:</p>
                    <p>• {formData.title || 'Propiedad de demostración'}</p>
                    <p>• Q{formData.price || '4,500'} / mes ({formData.type})</p>
                    <p>• Ubicación: {formData.zone}, {formData.department}</p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-crema px-6 py-3 text-sm font-bold text-cafe transition-all hover:bg-forest/10 sm:w-auto"
                    >
                      <ArrowLeft size={18} /> Atrás
                    </button>
                    <button
                      type="submit"
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracota px-8 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-terracota-dark sm:w-auto"
                    >
                      <CheckCircle size={18} /> {isPublishing ? 'Publicando...' : 'Publicar propiedad'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
