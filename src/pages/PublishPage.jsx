import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Home, MapPin, DollarSign, Upload, CheckCircle, ArrowRight, ArrowLeft, AlertTriangle, Image as ImageIcon, X } from 'lucide-react';
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

  const [published, setPublished] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  // Real-time validations
  const validations = useMemo(() => ({
    title: formData.title.length >= 10,
    price: Number(formData.price) > 0,
    address: formData.approximateAddress.length > 5,
    images: selectedImages.length >= 1
  }), [formData, selectedImages]);

  const canGoToStep2 = validations.address;
  const canGoToStep3 = validations.title && validations.price;

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

  useEffect(() => () => selectedImages.forEach(({ preview }) => URL.revokeObjectURL(preview)), [selectedImages]);

  if (!user || user.role !== 'owner') {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-[#FAF5EE] px-4 py-12">
        <div className="max-w-md rounded-3xl border border-[#E8D9C8] bg-white p-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
          <div className="w-20 h-20 bg-terracota/10 rounded-full flex items-center justify-center mx-auto mb-6">
             <Building2 size={40} className="text-terracota" />
          </div>
          <h1 className="text-2xl font-black text-cafe">Cuenta de propietario requerida</h1>
          <p className="mt-4 text-sm font-medium text-text-secondary leading-relaxed">Para publicar una vivienda debes registrarte con la opción <span className="font-bold text-terracota">“Quiero publicar”</span>. Así podremos guardar tus datos de contacto para los anuncios.</p>
          <Link to="/login" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-forest px-8 text-sm font-black text-white shadow-lg hover:bg-forest-dark transition-all">Ir al acceso seguro</Link>
        </div>
      </main>
    );
  }

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!validations.images) return setPublishError('Debes subir al menos una imagen de la propiedad.');

    setIsPublishing(true);
    setPublishError('');

    const cleanTitle = sanitizeText(formData.title);
    const newProperty = {
      id: `custom-${Date.now()}`,
      ownerId: firebaseAuth?.currentUser?.uid || user?.id || 'unknown',
      title: cleanTitle || `${formData.type === 'casa' ? 'Casa' : 'Apartamento'} en ${formData.zone}`,
      type: formData.type,
      price: Number(formData.price),
      deposit: Number(formData.deposit) || Number(formData.price),
      bedrooms: Number(formData.bedrooms),
      bathrooms: Number(formData.bathrooms),
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
      setPublished(true);
    } catch (error) {
      setPublishError(error?.message || 'Error al conectar con Firebase. Intenta de nuevo.');
    } finally {
      setIsPublishing(false);
      if (published) setTimeout(() => navigate('/perfil?tab=propiedades'), 2500);
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  return (
    <main className="min-h-screen bg-[#FAF5EE] pb-24 pt-6 md:pb-16 md:pt-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="rounded-[32px] border border-[#E8D9C8] bg-white p-6 shadow-[0_20px_60px_rgba(45,24,16,0.08)] sm:p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-forest via-dorado to-terracota" />

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-cafe mb-3">Publicar Vivienda</h1>
            <p className="text-sm font-semibold text-text-secondary">Sigue los pasos para dar de alta tu propiedad en Guatemala</p>
          </div>

          {/* Steps Progress Refinado */}
          <div className="flex items-center justify-between mb-12 relative max-w-md mx-auto">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#E8D9C8] -translate-y-1/2" />
            {[1, 2, 3].map((s) => (
              <div key={s} className="relative flex flex-col items-center">
                <div className={`z-10 w-12 h-12 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 ${
                  step === s ? 'bg-terracota text-white scale-110 shadow-lg ring-4 ring-terracota/20' :
                  step > s ? 'bg-forest text-white' : 'bg-white text-text-muted border-2 border-[#E8D9C8]'
                }`}>
                  {step > s ? <CheckCircle size={22} /> : s}
                </div>
                <span className={`absolute -bottom-7 text-[10px] font-black uppercase tracking-widest ${step >= s ? 'text-cafe' : 'text-text-muted'}`}>
                  {s === 1 ? 'Lugar' : s === 2 ? 'Detalle' : 'Fotos'}
                </span>
              </div>
            ))}
          </div>

          {published ? (
            <div className="text-center py-16 space-y-6 animate-[scale-up_0.4s_ease-out]">
              <div className="w-24 h-24 bg-jade/10 text-jade rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle size={56} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-cafe">¡Publicación Exitosa!</h2>
                <p className="mt-3 text-sm font-medium text-text-secondary max-w-xs mx-auto">Tu propiedad ha sido sincronizada con el mapa de RuwaJay correctamente.</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-forest font-bold text-sm">
                <div className="w-4 h-4 border-2 border-forest border-t-transparent rounded-full animate-spin" />
                Redirigiendo a tu perfil...
              </div>
            </div>
          ) : (
            <form onSubmit={handlePublish} className="space-y-8">
              {step === 1 && (
                <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
                  <div className="flex items-center gap-2 text-terracota">
                    <MapPin size={20} />
                    <h3 className="font-black text-lg uppercase tracking-tight">Paso 1: ¿Dónde está ubicada?</h3>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-3">Tipo de Inmueble</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'casa' })}
                        className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all ${
                          formData.type === 'casa' ? 'border-terracota bg-terracota/5 text-terracota' : 'border-[#E8D9C8] text-cafe hover:bg-[#FAF5EE]'
                        }`}
                      >
                        <Home size={32} />
                        <span className="font-black text-xs uppercase tracking-widest">Casa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'apartamento' })}
                        className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all ${
                          formData.type === 'apartamento' ? 'border-terracota bg-terracota/5 text-terracota' : 'border-[#E8D9C8] text-cafe hover:bg-[#FAF5EE]'
                        }`}
                      >
                        <Building2 size={32} />
                        <span className="font-black text-xs uppercase tracking-widest">Apartamento</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">Departamento</label>
                      <RuwaSelect
                        value={formData.department}
                        onChange={handlePublishDeptChange}
                        options={GUATEMALA_DEPARTMENTS_ONLY}
                        align="auto"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">Municipio / Zona</label>
                      <RuwaSelect
                        value={formData.zone}
                        onChange={(val) => setFormData({ ...formData, zone: val })}
                        options={availablePublishZones}
                        align="auto"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">Dirección de Referencia (Pública)</label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Km 15.5 Carretera a El Salvador, entrada a Olmeca"
                        value={formData.approximateAddress}
                        onChange={(e) => setFormData({ ...formData, approximateAddress: e.target.value })}
                        className={`w-full rounded-2xl border bg-[#FDFBF7] py-4 pl-12 pr-4 text-sm font-bold text-cafe outline-none transition-all ${
                          validations.address ? 'border-jade focus:ring-2 focus:ring-jade/10' : 'border-[#E8D9C8] focus:border-terracota focus:ring-2 focus:ring-terracota/10'
                        }`}
                      />
                    </div>
                    <p className="mt-2 text-[10px] font-bold text-text-muted italic px-1">Esta dirección aparecerá en el anuncio público para que los interesados se ubiquen.</p>
                  </div>

                  <div className="flex justify-end pt-6">
                    <button
                      type="button"
                      disabled={!canGoToStep2}
                      onClick={() => setStep(2)}
                      className={`flex min-h-14 items-center justify-center gap-3 rounded-2xl px-10 text-sm font-black text-white shadow-lg transition-all ${
                        canGoToStep2 ? 'bg-forest hover:bg-forest-dark hover:-translate-y-1' : 'bg-text-muted/40 cursor-not-allowed'
                      }`}
                    >
                      Continuar al Detalle <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
                  <div className="flex items-center gap-2 text-forest">
                    <ImageIcon size={20} />
                    <h3 className="font-black text-lg uppercase tracking-tight">Paso 2: Características y Precio</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">Título Atractivo</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Apartamento iluminado con balcón y vista a los volcanes"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className={`w-full rounded-2xl border bg-[#FDFBF7] p-4 text-sm font-bold text-cafe outline-none transition-all ${
                          validations.title ? 'border-jade' : 'border-[#E8D9C8] focus:border-forest'
                        }`}
                      />
                      {formData.title && !validations.title && <p className="mt-1.5 text-[10px] font-black text-terracota">Mínimo 10 caracteres para un buen título.</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">Renta Mensual (Q)</label>
                        <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-forest">Q</span>
                           <input
                            type="number"
                            required
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="w-full rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] py-4 pl-10 pr-4 text-sm font-black text-cafe outline-none focus:border-forest focus:ring-2 focus:ring-forest/10"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">Depósito (Q)</label>
                        <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-text-muted">Q</span>
                           <input
                            type="number"
                            placeholder="Opcional"
                            value={formData.deposit}
                            onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                            className="w-full rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] py-4 pl-10 pr-4 text-sm font-bold text-cafe outline-none focus:border-forest"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">Habitaciones</label>
                        <select
                          value={formData.bedrooms}
                          onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                          className="w-full rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] p-4 text-sm font-bold text-cafe outline-none"
                        >
                          {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n===1 ? 'Habitación' : 'Habitaciones'}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">Baños</label>
                        <select
                          value={formData.bathrooms}
                          onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                          className="w-full rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] p-4 text-sm font-bold text-cafe outline-none"
                        >
                          {[1,1.5,2,2.5,3,4].map(n => <option key={n} value={n}>{n} {n===1 ? 'Baño' : 'Baños'}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-4 pt-6 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#FAF5EE] px-8 text-sm font-black text-cafe hover:bg-[#F0E6DA] transition-all"
                    >
                      <ArrowLeft size={18} /> Atrás
                    </button>
                    <button
                      type="button"
                      disabled={!canGoToStep3}
                      onClick={() => setStep(3)}
                      className={`flex min-h-14 items-center justify-center gap-3 rounded-2xl px-10 text-sm font-black text-white shadow-lg transition-all ${
                        canGoToStep3 ? 'bg-forest hover:bg-forest-dark hover:-translate-y-1' : 'bg-text-muted/40 cursor-not-allowed'
                      }`}
                    >
                      Siguiente: Multimedia <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
                  <div className="flex items-center gap-2 text-dorado">
                    <Upload size={20} />
                    <h3 className="font-black text-lg uppercase tracking-tight">Paso 3: Fotografías</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <label className={`block cursor-pointer rounded-3xl border-2 border-dashed p-8 text-center transition-all ${
                      selectedImages.length > 0 ? 'border-jade bg-jade/5' : 'border-[#E8D9C8] bg-[#FAF5EE] hover:bg-[#F0E6DA]'
                    }`}>
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mb-4 text-forest">
                           <Upload size={32} />
                        </div>
                        <p className="font-black text-sm text-cafe tracking-tight">Haz clic para subir fotos de la vivienda</p>
                        <p className="text-[11px] font-bold text-text-muted mt-2 uppercase tracking-widest">Recomendamos: Fachada, sala, cocina y dormitorios</p>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        onChange={(event) => {
                          const files = Array.from(event.target.files || []).slice(0, 8);
                          setSelectedImages((previous) => {
                            previous.forEach(({ preview }) => URL.revokeObjectURL(preview));
                            return [...previous, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(0, 8);
                          });
                        }}
                      />
                    </label>

                    {selectedImages.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {selectedImages.map(({ file, preview }, idx) => (
                          <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm border border-[#E8D9C8]">
                            <img src={preview} alt="Vista previa" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/40 py-1 text-[9px] font-black text-white text-center">Foto {idx+1}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {publishError && (
                    <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 animate-[shake_0.4s_ease-in-out]">
                      <AlertTriangle size={18} className="shrink-0" />
                      <span>{publishError}</span>
                    </div>
                  )}

                  <div className="rounded-[24px] bg-[#FAF5EE] border border-[#E8D9C8] p-5 space-y-3">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-text-muted mb-1">Resumen del Anuncio</h4>
                    <div className="flex items-start gap-3">
                       <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0 text-terracota">
                         {formData.type === 'casa' ? <Home size={20}/> : <Building2 size={20}/>}
                       </div>
                       <div>
                         <p className="font-black text-cafe text-sm leading-tight">{formData.title || 'Vivienda sin título'}</p>
                         <p className="text-xs font-bold text-text-secondary mt-1">{formData.zone}, {formData.department} · <span className="text-forest">Q{formData.price || '0'} / mes</span></p>
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-4 pt-6 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#FAF5EE] px-8 text-sm font-black text-cafe hover:bg-[#F0E6DA] transition-all"
                    >
                      <ArrowLeft size={18} /> Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={isPublishing}
                      className="flex min-h-14 flex-1 items-center justify-center gap-3 rounded-2xl bg-terracota px-10 text-sm font-black text-white shadow-[0_10px_30px_rgba(216,68,32,0.3)] transition-all hover:bg-terracota-dark hover:-translate-y-1 active:scale-95 disabled:opacity-60"
                    >
                      {isPublishing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Subiendo propiedad...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} /> Finalizar y Publicar
                        </>
                      )}
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
