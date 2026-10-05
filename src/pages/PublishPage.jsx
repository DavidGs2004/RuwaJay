import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Building2, Home, MapPin, DollarSign, Upload, CheckCircle, ArrowRight,
  ArrowLeft, AlertTriangle, Image as ImageIcon, X, Bed, Bath, Car, Ruler,
  Sparkles, ShieldCheck, Check, Plus, Trash2, Clock, CheckCircle2,
  Calendar, Eye, HelpCircle, Layers, CheckSquare, Square, Rocket, Shield,
  Award, Heart, Phone, FileText, ChevronRight, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RuwaSelect from '../components/ui/RuwaSelect';
import { GUATEMALA_DEPARTMENTS_ONLY, getZonesForDepartment, getCoordinatesForLocation } from '../data/guatemalaLocations';
import PropertyLocationPickerMap from '../components/map/PropertyLocationPickerMap';
import { sanitizeText } from '../utils/security';
import { publishPropertyToFirebase, uploadPropertyImages, updatePropertyToFirebase, getPropertyById, fetchPropertyById } from '../lib/propertyService';
import { firebaseAuth } from '../lib/firebase';
import { formatPrice } from '../data/properties';

const SAMPLE_DEMO_IMAGES = [
  { name: 'Fachada Principal', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80' },
  { name: 'Sala y Comedor', url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80' },
  { name: 'Cocina Equipada', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80' },
  { name: 'Dormitorio Principal', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80' },
];

const AVAILABLE_SERVICES = [
  'Agua potable 24/7',
  'Extracción de basura',
  'Seguridad privada y garita',
  'Internet fibra óptica',
  'Mantenimiento de áreas comunes',
  'Cable TV',
  'Energía eléctrica independiente',
  'Cisterna y bomba de agua',
];

const FIREBASE_TIMEOUT_MS = 60000;

function withTimeout(promise, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), FIREBASE_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

// Comprime y procesa de forma permanente cada fotografía seleccionada por el usuario
function compressAndReadImage(file, maxWidth = 1024, maxHeight = 768, quality = 0.76) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(event.target.result);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function dataUrlToJpegFile(dataUrl, fileName) {
  const [header, encodedData] = dataUrl.split(',');
  if (!header || !encodedData) throw new Error('No se pudo preparar una de las fotografías.');

  const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  const binary = window.atob(encodedData);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const safeName = (fileName || 'foto').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
  return new File([bytes], `${safeName || 'foto'}.jpg`, { type: mimeType });
}

export default function PublishPage() {
  const navigate = useNavigate();
  const { editId } = useParams();
  const { user, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPropertyData, setEditPropertyData] = useState(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(Boolean(editId));

  // Form State
  const [formData, setFormData] = useState({
    type: 'casa',
    title: '',
    description: '',
    price: '',
    deposit: '',
    maintenanceFee: '',
    bedrooms: 2,
    bathrooms: 1,
    area: '',
    parking: 1,
    furnished: false,
    petsAllowed: true,
    patio: false,
    servicesIncluded: ['Agua potable 24/7', 'Extracción de basura'],
    department: 'Guatemala',
    municipality: 'Guatemala',
    zone: 'Zona 10 (Zona Viva / Oakland)',
    approximateAddress: '',
    exactAddress: '',
    status: 'disponible',
    coordinates: null
  });

  const [published, setPublished] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publishStage, setPublishStage] = useState('');
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [coverIndex, setCoverIndex] = useState(0);

  // Load existing property data for edit mode
  useEffect(() => {
    if (!editId) {
      setIsEditMode(false);
      setEditPropertyData(null);
      setIsLoadingEdit(false);
      return;
    }

    let isMounted = true;
    setIsLoadingEdit(true);

    async function loadPropertyForEditing() {
      try {
        const existing = await fetchPropertyById(editId);
        if (!isMounted) return;

        if (!existing) {
          console.warn('Vivienda no encontrada para edición:', editId);
          navigate('/perfil?tab=propiedades', { replace: true });
          return;
        }

        // Verify ownership (flexible check so google users/admins aren't locked out)
        const currentUid = firebaseAuth?.currentUser?.uid;
        const currentId = user?.id;
        const currentEmail = user?.email?.toLowerCase();
        const currentName = user?.name?.trim().toLowerCase();

        const isAuthorized = Boolean(
          user?.role === 'admin' ||
          !existing.ownerId ||
          (currentId && existing.ownerId === currentId) ||
          (currentUid && existing.ownerId === currentUid) ||
          (currentEmail && existing.ownerEmail && existing.ownerEmail.toLowerCase() === currentEmail) ||
          (currentName && existing.ownerName && existing.ownerName.trim().toLowerCase() === currentName)
        );

        if (!isAuthorized) {
          console.warn('Usuario no autorizado para editar esta vivienda.');
          navigate('/perfil?tab=propiedades', { replace: true });
          return;
        }

        setIsEditMode(true);
        setEditPropertyData(existing);
        setFormData({
          type: existing.type || 'casa',
          title: existing.title || '',
          description: existing.description || '',
          price: existing.price ? String(existing.price) : '',
          deposit: existing.deposit ? String(existing.deposit) : '',
          maintenanceFee: existing.maintenanceFee ? String(existing.maintenanceFee) : '',
          bedrooms: Number(existing.bedrooms || 2),
          bathrooms: Number(existing.bathrooms || 1),
          area: existing.area ? String(existing.area) : '',
          parking: Number(existing.parking || 1),
          furnished: Boolean(existing.furnished),
          petsAllowed: existing.petsAllowed !== false,
          patio: Boolean(existing.patio),
          servicesIncluded: Array.isArray(existing.servicesIncluded) ? existing.servicesIncluded : ['Agua potable 24/7', 'Extracción de basura'],
          department: existing.department || existing.address?.department || 'Guatemala',
          municipality: existing.municipality || existing.address?.municipality || 'Guatemala',
          zone: existing.zone || existing.address?.zone || 'Zona 10 (Zona Viva / Oakland)',
          approximateAddress: existing.approximateAddress || existing.address?.approximate || '',
          exactAddress: existing.exactAddress || existing.address?.exact || '',
          status: existing.status || 'disponible',
          coordinates: existing.coordinates || existing.location?.mapCoordinates || null,
        });

        // Load existing images
        const existingImages = [];
        const rawImagesList = Array.isArray(existing.images)
          ? existing.images
          : [
              ...(Array.isArray(existing.images?.fachada) ? existing.images.fachada : []),
              ...(Array.isArray(existing.images?.general) ? existing.images.general : []),
              ...(Array.isArray(existing.thumbnails) ? existing.thumbnails : []),
              ...(existing.thumbnail ? [existing.thumbnail] : []),
            ];

        const uniqueUrls = Array.from(new Set(rawImagesList.filter((u) => u && typeof u === 'string' && !u.startsWith('blob:'))));
        uniqueUrls.forEach((url, idx) => {
          existingImages.push({ file: null, preview: url, name: `Foto ${idx + 1}` });
        });

        setSelectedImages(existingImages);
      } catch (err) {
        console.error('Error cargando vivienda para editar:', err);
      } finally {
        if (isMounted) setIsLoadingEdit(false);
      }
    }

    loadPropertyForEditing();

    return () => {
      isMounted = false;
    };
  }, [editId, user?.id, user?.email, user?.role]);

  // Auto-fill deposit if empty when price changes
  const handlePriceChange = (val) => {
    setFormData((prev) => ({
      ...prev,
      price: val,
      deposit: prev.deposit ? prev.deposit : val,
    }));
  };

  // Real-time step validations
  const validations = useMemo(() => ({
    step1: formData.title.trim().length >= 8 && Number(formData.price) > 0,
    step2: formData.approximateAddress.trim().length >= 4,
    step3: Number(formData.bedrooms) >= 1 && Number(formData.bathrooms) >= 1,
    step4: selectedImages.length >= 1,
  }), [formData, selectedImages]);

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

  const handleServiceToggle = (srv) => {
    setFormData((prev) => {
      const exists = prev.servicesIncluded.includes(srv);
      return {
        ...prev,
        servicesIncluded: exists
          ? prev.servicesIncluded.filter((s) => s !== srv)
          : [...prev.servicesIncluded, srv],
      };
    });
  };

  const addDemoPhotos = () => {
    setSelectedImages((prev) => [
      ...prev,
      ...SAMPLE_DEMO_IMAGES.map((img) => ({
        file: null,
        preview: img.url,
        name: img.name,
      })),
    ].slice(0, 8));
  };

  const removeImage = (idx) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== idx));
    if (coverIndex === idx) setCoverIndex(0);
    else if (coverIndex > idx) setCoverIndex(coverIndex - 1);
  };

  const handleFilesSelected = async (event) => {
    const rawFiles = Array.from(event.target.files || []);
    if (!rawFiles.length) return;

    const validFiles = rawFiles.filter((f) => f.type.startsWith('image/'));
    if (!validFiles.length) {
      setPublishError('Por favor selecciona archivos de imagen válidos (JPG, PNG o WebP).');
      return;
    }

    const availableSlots = 8 - selectedImages.length;
    if (availableSlots <= 0) {
      setPublishError('Ya has alcanzado el límite máximo de 8 fotografías.');
      return;
    }

    const filesToProcess = validFiles.slice(0, availableSlots);
    setIsProcessingImages(true);
    setPublishError('');

    try {
      const processed = await Promise.all(
        filesToProcess.map(async (file) => {
          const dataUrl = await compressAndReadImage(file);
          return {
            file,
            preview: dataUrl,
            name: file.name,
          };
        })
      );

      setSelectedImages((prev) => [...prev, ...processed]);
    } catch (err) {
      console.error('Error procesando fotografías seleccionadas:', err);
      setPublishError('Hubo un problema procesando las fotos. Intenta de nuevo.');
    } finally {
      setIsProcessingImages(false);
      event.target.value = '';
    }
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      selectedImages.forEach(({ preview, file }) => {
        if (file) URL.revokeObjectURL(preview);
      });
    };
  }, [selectedImages]);

  if (isLoadingEdit) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#FAF5EE] px-4 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-forest/20 border-t-forest" />
          <p className="text-sm font-extrabold text-cafe">Cargando datos de la vivienda...</p>
          <span className="text-xs text-text-muted">Preparando editor para modificar detalles y fotos</span>
        </div>
      </main>
    );
  }

  // If user is not logged in, prompt friendly login
  if (!user) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#FAF5EE] px-4 py-12">
        <div className="max-w-md w-full rounded-3xl border border-[#E8D9C8] bg-white p-8 sm:p-10 text-center shadow-card">
          <div className="w-20 h-20 bg-forest/10 text-forest rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xs">
            <Building2 size={40} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-forest bg-forest/10 px-3 py-1 rounded-full">
            RuwaJay Propietarios
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-cafe mt-3">Anuncia tu Vivienda</h1>
          <p className="mt-3 text-sm font-medium text-text-secondary leading-relaxed">
            Inicia sesión o regístrate en RuwaJay para publicar tus casas o apartamentos y recibir solicitudes de visita de inquilinos en Guatemala.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              to="/login?redirect=/publicar"
              className="w-full inline-flex min-h-12 items-center justify-center rounded-xl bg-forest px-8 text-sm font-black text-white shadow-lg hover:bg-forest-dark transition-all"
            >
              Iniciar sesión para publicar
            </Link>
            <Link
              to="/explorar"
              className="text-xs font-bold text-text-muted hover:text-cafe transition-colors py-1"
            >
              Volver a explorar viviendas
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const ownerPhoneDigits = String(user?.phone || '').replace(/\D/g, '');
  const ownerRequirementsComplete = ownerPhoneDigits.length >= 8 && Boolean(user?.dpiData?.cui);
  if (!ownerRequirementsComplete) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#FAF5EE] px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-[#E8D9C8] bg-white p-8 text-center shadow-card sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldAlert size={30} />
          </div>
          <h1 className="text-2xl font-black text-cafe">Completa tus datos de propietario</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            Para anunciar o administrar una vivienda debes registrar un teléfono válido y completar la identificación DPI.
          </p>
          <div className="mt-5 space-y-2 text-left text-sm font-bold">
            <p className={ownerPhoneDigits.length >= 8 ? 'text-jade' : 'text-red-600'}>
              {ownerPhoneDigits.length >= 8 ? '✓' : '•'} Número de teléfono
            </p>
            <p className={user?.dpiData?.cui ? 'text-jade' : 'text-red-600'}>
              {user?.dpiData?.cui ? '✓' : '•'} Identificación DPI
            </p>
          </div>
          <Link
            to="/perfil?tab=configuracion"
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-forest px-6 text-sm font-black text-white hover:bg-forest-dark"
          >
            Completar datos en mi perfil
          </Link>
        </div>
      </main>
    );
  }

  // Handle final submission (create OR update)
  const handlePublish = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const ownerPhoneDigits = String(user?.phone || '').replace(/\D/g, '');
    const hasOwnerIdentification = Boolean(user?.dpiData?.cui);
    if (ownerPhoneDigits.length < 8 || !hasOwnerIdentification) {
      setPublishError('Para publicar una vivienda debes registrar un número de teléfono válido y completar la identificación DPI en Ajustes de tu perfil.');
      return;
    }
    if (selectedImages.length === 0) {
      setPublishError('Debes agregar al menos una fotografía de la vivienda.');
      setStep(4);
      return;
    }

    setIsPublishing(true);
    setUploadProgress(3);
    setPublishStage('Preparando fotografías...');
    setPublishError('');

    try {
      // 1. Upgrade user to 'owner' in background if needed (non-blocking)
      if (user.role !== 'owner') {
        updateProfile({ role: 'owner' }).catch(() => {});
      }

      const cleanTitle = sanitizeText(formData.title);
      const ownerId = firebaseAuth?.currentUser?.uid || user?.id || 'custom-owner';

      // 2. Upload new compressed images to Firebase Storage. Persist only their URLs.
      const propertyId = isEditMode && editPropertyData ? editPropertyData.id : `custom-${Date.now()}`;
      const newImages = selectedImages.filter((image) => image.file && image.preview?.startsWith('data:'));
      const uploadFiles = newImages.map((image) => dataUrlToJpegFile(image.preview, image.name));
      if (uploadFiles.length) setPublishStage('Subiendo fotografías a la nube...');
      const uploadedUrls = uploadFiles.length
        ? await withTimeout(
            uploadPropertyImages(uploadFiles, propertyId, ownerId, (progress) => {
              setUploadProgress(5 + Math.round(progress * 0.85));
            }),
            'La subida de las fotografías tardó demasiado. Revisa tu conexión e intenta nuevamente.'
          )
        : [];

      setUploadProgress(92);
      setPublishStage('Guardando los datos de la vivienda...');

      let uploadedIndex = 0;
      const allImages = selectedImages.map((image) => {
        if (image.file && image.preview?.startsWith('data:')) {
          const uploadedUrl = uploadedUrls[uploadedIndex];
          uploadedIndex += 1;
          return uploadedUrl;
        }
        return image.preview;
      }).filter((url) => url && typeof url === 'string' && !url.startsWith('data:') && !url.startsWith('blob:'));

      if (allImages.length === 0) {
        throw new Error('No se pudieron guardar las fotografías en la nube. Intenta nuevamente.');
      }

      const primaryThumbnail = allImages[coverIndex] || allImages[0];

      const ownerPhoto = user?.avatarImage || user?.photoURL || user?.avatar || firebaseAuth?.currentUser?.photoURL || (isEditMode ? editPropertyData?.ownerPhoto : '') || '';
      const ownerEmail = user?.email || firebaseAuth?.currentUser?.email || (isEditMode ? editPropertyData?.ownerEmail : '') || '';

      const propertyPayload = {
        ...(isEditMode && editPropertyData ? editPropertyData : {}),
        id: propertyId,
        ownerId,
        ownerName: user.name || (isEditMode ? editPropertyData?.ownerName : '') || 'Arrendador RuwaJay',
        ownerEmail,
        ownerPhone: user.phone || (isEditMode ? editPropertyData?.ownerPhone : '') || '',
        ownerPhoto,
        title: cleanTitle || `${formData.type === 'casa' ? 'Casa' : 'Apartamento'} en ${formData.zone}`,
        type: formData.type,
        price: Number(formData.price),
        deposit: Number(formData.deposit) || Number(formData.price),
        maintenanceFee: Number(formData.maintenanceFee) || 0,
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        area: Number(formData.area) || 0,
        parking: Number(formData.parking) || 0,
        furnished: Boolean(formData.furnished),
        petsAllowed: Boolean(formData.petsAllowed),
        patio: Boolean(formData.patio),
        servicesIncluded: formData.servicesIncluded,
        department: formData.department,
        municipality: formData.municipality,
        zone: formData.zone,
        coordinates: formData.coordinates || getCoordinatesForLocation(formData.department, formData.zone) || { lat: 14.6349, lng: -90.5069 },
        approximateAddress: sanitizeText(formData.approximateAddress),
        exactAddress: sanitizeText(formData.exactAddress) || sanitizeText(formData.approximateAddress),
        address: {
          approximate: sanitizeText(formData.approximateAddress) || `${formData.zone}, ${formData.department}`,
          exact: sanitizeText(formData.exactAddress) || sanitizeText(formData.approximateAddress) || `${formData.zone}, ${formData.department}`,
          zone: formData.zone,
          municipality: formData.municipality,
          department: formData.department,
          coordinates: formData.coordinates || getCoordinatesForLocation(formData.department, formData.zone) || { lat: 14.6349, lng: -90.5069 },
        },
        description: sanitizeText(formData.description),
        status: formData.status || 'disponible',
        thumbnail: primaryThumbnail,
        thumbnails: allImages,
        images: allImages,
        verified: Boolean(user.verified),
        isNew: !isEditMode,
        createdAt: (isEditMode && editPropertyData?.createdAt) ? editPropertyData.createdAt : new Date().toISOString(),
      };

      if (isEditMode) {
        // ── UPDATE existing property (instant local + non-blocking cloud) ──
        try {
          const local = (() => {
            try {
              const parsed = JSON.parse(localStorage.getItem('ruwajay_custom_properties') || '[]');
              return Array.isArray(parsed) ? parsed : [];
            } catch { return []; }
          })();
          const idx = local.findIndex((p) => p.id === propertyPayload.id);
          if (idx >= 0) {
            local[idx] = { ...local[idx], ...propertyPayload, updatedAt: new Date().toISOString() };
          } else {
            local.unshift({ ...propertyPayload, updatedAt: new Date().toISOString() });
          }
          localStorage.setItem('ruwajay_custom_properties', JSON.stringify(local));
        } catch { /* ignore */ }

        publishRealtimeEvent('PROPERTIES_CHANGED', { propertyId: propertyPayload.id, action: 'updated' });
        window.dispatchEvent(new Event('ruwajay:properties-changed'));
        window.dispatchEvent(new Event('ruwajay:properties_changed'));

        await updatePropertyToFirebase(propertyPayload);
      } else {
        // ── CREATE new property in the cloud, then keep a lightweight URL cache ──
        await publishPropertyToFirebase(propertyPayload);

        const localProps = (() => {
          try {
            const parsed = JSON.parse(localStorage.getItem('ruwajay_custom_properties') || '[]');
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();

        try {
          localStorage.setItem(
            'ruwajay_custom_properties',
            JSON.stringify([propertyPayload, ...localProps.filter((item) => item?.id !== propertyPayload.id)])
          );
          publishRealtimeEvent('PROPERTIES_CHANGED', { propertyId: propertyPayload.id, action: 'created' });
          window.dispatchEvent(new Event('ruwajay:properties-changed'));
          window.dispatchEvent(new Event('ruwajay:properties_changed'));
        } catch (storageError) {
          // The cloud copy is authoritative; a full browser cache must not block publishing.
          console.warn('La vivienda se guardó en Firebase, pero no se pudo actualizar el caché local:', storageError);
        }
      }

      setUploadProgress(100);
      setPublishStage('Publicación completada');
      setPublished(true);
      setTimeout(() => {
        navigate('/perfil?tab=propiedades');
      }, 700);

    } catch (err) {
      setPublishError(err?.message || 'Error al procesar la publicación. Intenta nuevamente.');
    } finally {
      setIsPublishing(false);
      setPublishStage('');
    }
  };

  const STEPS_CONFIG = [
    { num: 1, label: 'Básicos y Precio', icon: Home },
    { num: 2, label: 'Ubicación GT', icon: MapPin },
    { num: 3, label: 'Amenidades', icon: Sparkles },
    { num: 4, label: 'Fotos', icon: Upload },
    { num: 5, label: 'Revisión y Estado', icon: CheckCircle2 },
  ];

  return (
    <main className="min-h-screen bg-[#FAF5EE] pb-24 pt-6 md:pb-16 md:pt-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">

        {/* Emprendimiento / Upgrade Notice if user is seeker */}
        {user.role !== 'owner' && !published && (
          <div className="mb-6 rounded-2xl border border-forest/20 bg-forest/5 p-4 sm:p-5 flex items-center justify-between gap-4 animate-[fade-in_0.3s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest text-white flex items-center justify-center shrink-0">
                <Rocket size={20} className="text-dorado" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black text-cafe">
                  ¡Empieza a emprender como Arrendador en RuwaJay!
                </p>
                <p className="text-[11px] text-text-secondary font-medium">
                  Al completar este formulario, tu cuenta se activará automáticamente con funciones de Propietario.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-forest bg-white px-2.5 py-1 rounded-full border border-forest/20 shrink-0 hidden sm:inline-block">
              Activación Inmediata
            </span>
          </div>
        )}

        <div className="rounded-[32px] border border-[#E8D9C8] bg-white p-5 sm:p-10 shadow-[0_20px_60px_rgba(45,24,16,0.08)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-forest via-dorado to-terracota" />

          {/* Stepper Header */}
          <div className="text-center mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-forest bg-forest/10 px-3 py-1 rounded-full">
              Paso a Paso Guiado
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-cafe mt-2">
              {isEditMode ? 'Editar mi Vivienda Publicada' : 'Publica tu Inmueble en Alquiler'}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-text-secondary mt-1">
              {isEditMode
                ? 'Actualiza la información, fotos o estado de tu propiedad'
                : 'Completa los datos para dar de alta tu propiedad en el mapa y catálogo de RuwaJay'}
            </p>
          </div>

          {/* 5-Step Visual Stepper Progress Bar */}
          <div className="mb-10 max-w-2xl mx-auto">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-5 left-6 right-6 h-1 bg-[#E8D9C8] -translate-y-1/2 z-0" />
              <div
                className="absolute top-5 left-6 h-1 bg-forest -translate-y-1/2 z-0 transition-all duration-500"
                style={{ width: `${((step - 1) / (STEPS_CONFIG.length - 1)) * 90}%` }}
              />

              {STEPS_CONFIG.map((s) => {
                const Icon = s.icon;
                const isActive = step === s.num;
                const isPassed = step > s.num;

                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => {
                      if (s.num < step) setStep(s.num);
                    }}
                    className={`relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none`}
                  >
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-300 ${
                        isActive
                          ? 'bg-terracota text-white scale-110 shadow-lg ring-4 ring-terracota/20'
                          : isPassed
                          ? 'bg-forest text-white shadow-sm'
                          : 'bg-white text-text-muted border-2 border-[#E8D9C8] group-hover:border-forest/50'
                      }`}
                    >
                      {isPassed ? <Check size={18} /> : <Icon size={16} />}
                    </div>
                    <span
                      className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider mt-2 transition-colors hidden sm:block ${
                        isActive ? 'text-terracota' : isPassed ? 'text-forest' : 'text-text-muted'
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Published Celebration Screen */}
          {published ? (
            <div className="text-center py-12 space-y-6 animate-[scale-up_0.4s_ease-out]">
              <div className="w-24 h-24 bg-jade/10 text-jade rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle size={56} />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-jade bg-jade/10 px-3 py-1 rounded-full">
                  {isEditMode ? '¡Cambios Guardados!' : '¡Enhorabuena, Arrendador!'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-cafe mt-2">
                  {isEditMode ? '¡Tu Vivienda Ha Sido Actualizada!' : '¡Tu Vivienda Ha Sido Publicada!'}
                </h2>
                <p className="mt-2 text-sm font-medium text-text-secondary max-w-md mx-auto">
                  {isEditMode
                    ? 'Los cambios ya están reflejados en el catálogo y el mapa interactivo de RuwaJay.'
                    : 'Tu propiedad ya está sincronizada con el mapa interactivo y lista para recibir solicitudes de visitas de inquilinos.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-forest font-bold text-sm">
                <div className="w-4 h-4 border-2 border-forest border-t-transparent rounded-full animate-spin" />
                Redirigiendo a tu panel de propiedades...
              </div>
            </div>
          ) : (
            <form onSubmit={handlePublish} className="space-y-6">

              {/* ════════════════════════════════════════════════════════ */}
              {/* PASO 1: BÁSICOS Y PRECIO                                */}
              {/* ════════════════════════════════════════════════════════ */}
              {step === 1 && (
                <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
                  <div className="flex items-center justify-between pb-3 border-b border-border-light">
                    <div className="flex items-center gap-2 text-forest">
                      <Home size={20} />
                      <h3 className="font-black text-base sm:text-lg">Paso 1: Tipo de Vivienda y Precio</h3>
                    </div>
                    <span className="text-xs font-bold text-text-muted">Paso 1 de 5</span>
                  </div>

                  {/* Selector de Tipo */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-3">
                      Tipo de Inmueble
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'casa', label: 'Casa', icon: Home },
                        { id: 'apartamento', label: 'Apartamento', icon: Building2 },
                        { id: 'habitacion', label: 'Habitación / Cuarto', icon: Bed },
                        { id: 'loft', label: 'Loft / Campo', icon: Sparkles },
                      ].map((t) => {
                        const Icon = t.icon;
                        const isSelected = formData.type === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, type: t.id })}
                            className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all text-center cursor-pointer ${
                              isSelected
                                ? 'border-forest bg-forest/5 text-forest shadow-xs'
                                : 'border-border-light text-cafe hover:bg-[#FAF5EE]'
                            }`}
                          >
                            <Icon size={26} />
                            <span className="font-black text-xs">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Título */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black uppercase tracking-wider text-cafe">
                        Título del Anuncio *
                      </label>
                      <span className="text-[11px] font-bold text-text-muted">
                        {formData.title.length}/60 caracteres
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      placeholder="Ej. Casa familiar con jardín y garita en Zona 10"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full rounded-2xl border border-border-light bg-[#FDFBF7] px-4 py-3.5 text-sm font-bold text-cafe outline-none focus:border-forest transition-colors"
                    />
                    <p className="mt-1.5 text-[11px] text-text-muted">
                      Un título claro con la zona y principales ventajas atrae hasta un 40% más visitas.
                    </p>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">
                      Descripción de la Vivienda
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe la iluminación, áreas comunes, seguridad del condominio, cercanía a transporte, colegios o supermercados..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-2xl border border-border-light bg-[#FDFBF7] p-4 text-sm font-medium text-cafe outline-none focus:border-forest transition-colors resize-none"
                    />
                  </div>

                  {/* Precios (Renta, Depósito, Mantenimiento) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">
                        Renta Mensual (Q) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-forest">Q</span>
                        <input
                          type="number"
                          required
                          min="100"
                          placeholder="Ej. 3,500"
                          value={formData.price}
                          onChange={(e) => handlePriceChange(e.target.value)}
                          className="w-full rounded-2xl border border-border-light bg-[#FDFBF7] py-3.5 pl-10 pr-4 text-sm font-black text-forest outline-none focus:border-forest"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-black uppercase tracking-wider text-cafe">
                          Depósito en Garantía (Q)
                        </label>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-text-muted">Q</span>
                        <input
                          type="number"
                          placeholder="Igual a la renta"
                          value={formData.deposit}
                          onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                          className="w-full rounded-2xl border border-border-light bg-[#FDFBF7] py-3.5 pl-10 pr-4 text-sm font-bold text-cafe outline-none focus:border-forest"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">
                        Mantenimiento / Garita (Q)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-text-muted">Q</span>
                        <input
                          type="number"
                          placeholder="0 si está incluido"
                          value={formData.maintenanceFee}
                          onChange={(e) => setFormData({ ...formData, maintenanceFee: e.target.value })}
                          className="w-full rounded-2xl border border-border-light bg-[#FDFBF7] py-3.5 pl-10 pr-4 text-sm font-bold text-cafe outline-none focus:border-forest"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botón Siguiente */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      disabled={!validations.step1}
                      onClick={() => setStep(2)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-xs font-black text-white shadow-md transition-all ${
                        validations.step1
                          ? 'bg-forest hover:bg-forest-dark hover:-translate-y-0.5'
                          : 'bg-text-muted/40 cursor-not-allowed'
                      }`}
                    >
                      <span>Siguiente: Ubicación en Guatemala</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════ */}
              {/* PASO 2: UBICACIÓN GEOGRÁFICA                            */}
              {/* ════════════════════════════════════════════════════════ */}
              {step === 2 && (
                <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
                  <div className="flex items-center justify-between pb-3 border-b border-border-light">
                    <div className="flex items-center gap-2 text-terracota">
                      <MapPin size={20} />
                      <h3 className="font-black text-base sm:text-lg">Paso 2: ¿Dónde está ubicada la vivienda?</h3>
                    </div>
                    <span className="text-xs font-bold text-text-muted">Paso 2 de 5</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">
                        Departamento de Guatemala *
                      </label>
                      <RuwaSelect
                        value={formData.department}
                        onChange={handlePublishDeptChange}
                        options={GUATEMALA_DEPARTMENTS_ONLY}
                        align="auto"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">
                        Zona o Municipio *
                      </label>
                      <RuwaSelect
                        value={formData.zone}
                        onChange={(val) => setFormData({ ...formData, zone: val })}
                        options={availablePublishZones}
                        align="auto"
                      />
                    </div>
                  </div>

                  {/* Mapa Interactivo con GPS y Búsqueda */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">
                      Mapear Ubicación Exacta (GPS o Búsqueda) *
                    </label>
                    <PropertyLocationPickerMap
                      coordinates={formData.coordinates}
                      department={formData.department}
                      zone={formData.zone}
                      onLocationSelected={(coords) => {
                        setFormData((prev) => ({
                          ...prev,
                          coordinates: coords,
                        }));
                      }}
                      onAddressResolved={(addrInfo) => {
                        if (addrInfo.reference && !formData.approximateAddress) {
                          setFormData((prev) => ({
                            ...prev,
                            approximateAddress: addrInfo.reference,
                          }));
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">
                      Dirección de Referencia (Pública para el Mapa) *
                    </label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Km 14.5 Carretera a El Salvador, frente a Plaza Madero"
                        value={formData.approximateAddress}
                        onChange={(e) => setFormData({ ...formData, approximateAddress: e.target.value })}
                        className="w-full rounded-2xl border border-border-light bg-[#FDFBF7] py-3.5 pl-12 pr-4 text-sm font-bold text-cafe outline-none focus:border-forest"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-text-muted">
                      Esta referencia la verán todos los usuarios en el mapa interactivo para localizar el sector.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">
                      Dirección Exacta (Privada / Solo para Citas Confirmadas)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 14 Calle 3-45 Condominio Los Eucaliptos, Casa #12"
                      value={formData.exactAddress}
                      onChange={(e) => setFormData({ ...formData, exactAddress: e.target.value })}
                      className="w-full rounded-2xl border border-border-light bg-[#FDFBF7] p-3.5 text-sm font-bold text-cafe outline-none focus:border-forest"
                    />
                    <p className="mt-1.5 text-[11px] text-text-muted">
                      🔒 Por seguridad, la dirección exacta no es pública; solo se revela al inquilino cuando tú aceptas su cita.
                    </p>
                  </div>

                  {/* Botones de Navegación */}
                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-crema px-6 py-3.5 text-xs font-black text-cafe hover:bg-crema-dark transition-all"
                    >
                      <ArrowLeft size={16} />
                      <span>Atrás</span>
                    </button>
                    <button
                      type="button"
                      disabled={!validations.step2}
                      onClick={() => setStep(3)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-xs font-black text-white shadow-md transition-all ${
                        validations.step2
                          ? 'bg-forest hover:bg-forest-dark hover:-translate-y-0.5'
                          : 'bg-text-muted/40 cursor-not-allowed'
                      }`}
                    >
                      <span>Siguiente: Distribución y Amenidades</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════ */}
              {/* PASO 3: DISTRIBUCIÓN Y AMENIDADES                       */}
              {/* ════════════════════════════════════════════════════════ */}
              {step === 3 && (
                <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
                  <div className="flex items-center justify-between pb-3 border-b border-border-light">
                    <div className="flex items-center gap-2 text-forest">
                      <Sparkles size={20} />
                      <h3 className="font-black text-base sm:text-lg">Paso 3: Distribución, Espacio y Amenidades</h3>
                    </div>
                    <span className="text-xs font-bold text-text-muted">Paso 3 de 5</span>
                  </div>

                  {/* Habitaciones, Baños, Metros, Parqueos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">
                        Habitaciones
                      </label>
                      <select
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                        className="w-full rounded-2xl border border-border-light bg-[#FDFBF7] p-3 text-sm font-bold text-cafe outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>{n} {n === 1 ? 'Habitación' : 'Habitaciones'}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">
                        Baños
                      </label>
                      <select
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                        className="w-full rounded-2xl border border-border-light bg-[#FDFBF7] p-3 text-sm font-bold text-cafe outline-none"
                      >
                        {[1, 1.5, 2, 2.5, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n} {n === 1 ? 'Baño' : 'Baños'}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">
                        Área (m²)
                      </label>
                      <input
                        type="number"
                        placeholder="Ej. 120"
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        className="w-full rounded-2xl border border-border-light bg-[#FDFBF7] p-3 text-sm font-bold text-cafe outline-none"
                      >
                      </input>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-2">
                        Parqueos
                      </label>
                      <select
                        value={formData.parking}
                        onChange={(e) => setFormData({ ...formData, parking: e.target.value })}
                        className="w-full rounded-2xl border border-border-light bg-[#FDFBF7] p-3 text-sm font-bold text-cafe outline-none"
                      >
                        {[0, 1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>{n === 0 ? 'Sin parqueo' : `${n} vehículo${n > 1 ? 's' : ''}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Toggles Rápidos */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-3">
                      Características Especiales
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { key: 'furnished', label: 'Amueblado', desc: 'Incluye muebles básicos' },
                        { key: 'petsAllowed', label: 'Pet Friendly 🐾', desc: 'Acepta mascotas' },
                        { key: 'patio', label: 'Patio / Jardín', desc: 'Área verde privada' },
                      ].map((item) => {
                        const checked = formData[item.key];
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setFormData({ ...formData, [item.key]: !checked })}
                            className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                              checked
                                ? 'border-forest bg-forest/5 text-forest'
                                : 'border-border-light bg-[#FDFBF7] text-text-secondary'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 ${
                              checked ? 'bg-forest text-white' : 'border border-border-light bg-white'
                            }`}>
                              {checked && <Check size={13} />}
                            </div>
                            <div>
                              <span className="text-xs font-black block text-cafe">{item.label}</span>
                              <span className="text-[11px] text-text-muted">{item.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Servicios Incluidos en la Renta */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-3">
                      Servicios Incluidos en la Cuota Mensual
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {AVAILABLE_SERVICES.map((srv) => {
                        const included = formData.servicesIncluded.includes(srv);
                        return (
                          <button
                            key={srv}
                            type="button"
                            onClick={() => handleServiceToggle(srv)}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                              included
                                ? 'border-jade bg-jade/10 text-jade'
                                : 'border-border-light bg-[#FDFBF7] text-text-secondary hover:bg-white'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-md flex items-center justify-center ${
                              included ? 'bg-jade text-white' : 'border border-border'
                            }`}>
                              {included && <Check size={11} />}
                            </span>
                            <span>{srv}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Botones de Navegación */}
                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-crema px-6 py-3.5 text-xs font-black text-cafe hover:bg-crema-dark transition-all"
                    >
                      <ArrowLeft size={16} />
                      <span>Atrás</span>
                    </button>
                    <button
                      type="button"
                      disabled={!validations.step3}
                      onClick={() => setStep(4)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-xs font-black text-white shadow-md transition-all ${
                        validations.step3
                          ? 'bg-forest hover:bg-forest-dark hover:-translate-y-0.5'
                          : 'bg-text-muted/40 cursor-not-allowed'
                      }`}
                    >
                      <span>Siguiente: Fotos de la Vivienda</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════ */}
              {/* PASO 4: FOTOGRAFÍAS DE LA VIVIENDA                      */}
              {/* ════════════════════════════════════════════════════════ */}
              {step === 4 && (
                <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
                  <div className="flex items-center justify-between pb-3 border-b border-border-light">
                    <div className="flex items-center gap-2 text-dorado">
                      <Upload size={20} />
                      <h3 className="font-black text-base sm:text-lg">Paso 4: Fotografías de la Vivienda</h3>
                    </div>
                    <span className="text-xs font-bold text-text-muted">Paso 4 de 5</span>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div className="space-y-4">
                    <label className={`block cursor-pointer rounded-3xl border-2 border-dashed p-8 text-center transition-all ${
                      selectedImages.length > 0 ? 'border-jade bg-jade/5' : 'border-[#E8D9C8] bg-[#FAF5EE] hover:bg-[#F0E6DA]'
                    }`}>
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center mb-3 text-forest">
                          <Upload size={28} />
                        </div>
                        <p className="font-black text-sm text-cafe">
                          {isProcessingImages ? 'Cargando y procesando fotos...' : 'Haz clic para subir fotos desde tu computadora o teléfono'}
                        </p>
                        <p className="text-[11px] font-bold text-text-muted mt-1 uppercase tracking-widest">
                          Formatos JPG, PNG, WebP (Selecciona una o varias fotos de tu vivienda)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        disabled={isProcessingImages}
                        className="sr-only"
                        onChange={handleFilesSelected}
                      />
                    </label>

                    {/* Previews Grid */}
                    {selectedImages.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-black text-cafe">
                          <div className="flex items-center gap-2">
                            <span>Fotos seleccionadas ({selectedImages.length}/8):</span>
                            <span className="text-[11px] font-bold text-forest bg-forest/10 px-2 py-0.5 rounded-md">
                              {selectedImages.length} fotos reales de tu casa
                            </span>
                          </div>
                          <span className="text-[11px] text-text-muted">
                            Haz clic en "Portada" en la foto que quieras como imagen principal
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {selectedImages.map((img, idx) => {
                            const isCover = coverIndex === idx;
                            return (
                              <div
                                key={idx}
                                className={`group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xs border-2 transition-all ${
                                  isCover ? 'border-forest ring-2 ring-forest/40 shadow-md' : 'border-border-light hover:border-dorado'
                                }`}
                              >
                                <img
                                  src={img.preview}
                                  alt={`Foto ${idx + 1}`}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                {isCover && (
                                  <div className="absolute top-2 left-2 bg-forest text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase shadow-xs">
                                    ★ Portada
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeImage(idx)}
                                  className="absolute top-2 right-2 bg-red-600/85 hover:bg-red-600 text-white p-1 rounded-full transition-colors cursor-pointer shadow-xs"
                                  title="Eliminar foto"
                                >
                                  <X size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCoverIndex(idx)}
                                  className={`absolute bottom-2 left-2 right-2 rounded-md py-1 text-[10px] font-black transition-all text-center cursor-pointer ${
                                    isCover
                                      ? 'bg-forest text-white shadow-xs'
                                      : 'bg-black/60 text-white hover:bg-forest'
                                  }`}
                                >
                                  {isCover ? '✓ Foto de Portada' : 'Elegir como Portada'}
                                </button>
                              </div>
                            );
                          })}

                          {/* Add more photos button */}
                          {selectedImages.length < 8 && (
                            <label className="flex flex-col items-center justify-center aspect-[4/3] rounded-2xl border-2 border-dashed border-[#D4962A]/60 bg-dorado/5 hover:bg-dorado/10 cursor-pointer transition-all text-center p-2 group">
                              <Plus size={24} className="text-dorado group-hover:scale-110 transition-transform mb-1" />
                              <span className="text-[11px] font-bold text-cafe">Añadir otra foto</span>
                              <span className="text-[9px] text-text-muted">({8 - selectedImages.length} restantes)</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                disabled={isProcessingImages}
                                className="sr-only"
                                onChange={handleFilesSelected}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Demo Photos Quick Add */}
                    {selectedImages.length === 0 && (
                      <div className="p-4 rounded-2xl border border-dorado/20 bg-dorado/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-cafe">
                          <p className="font-black">¿No tienes fotografías en este momento?</p>
                          <p className="text-[11px] text-text-muted">
                            Puedes cargar fotos sugeridas de demostración para probar tu publicación ahora y cambiarlas más tarde.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addDemoPhotos}
                          className="shrink-0 px-4 py-2 rounded-xl bg-dorado text-white text-xs font-black hover:bg-dorado/90 transition-all shadow-xs"
                        >
                          Cargar fotos de ejemplo
                        </button>
                      </div>
                    )}
                  </div>

                  {publishError && (
                    <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 animate-[shake_0.4s_ease-in-out]">
                      <AlertTriangle size={18} className="shrink-0" />
                      <span>{publishError}</span>
                    </div>
                  )}

                  {/* Botones de Navegación */}
                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-crema px-6 py-3.5 text-xs font-black text-cafe hover:bg-crema-dark transition-all"
                    >
                      <ArrowLeft size={16} />
                      <span>Atrás</span>
                    </button>
                    <button
                      type="button"
                      disabled={!validations.step4}
                      onClick={() => setStep(5)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-xs font-black text-white shadow-md transition-all ${
                        validations.step4
                          ? 'bg-forest hover:bg-forest-dark hover:-translate-y-0.5'
                          : 'bg-text-muted/40 cursor-not-allowed'
                      }`}
                    >
                      <span>Siguiente: Revisión y Estado</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════ */}
              {/* PASO 5: REVISIÓN, ESTADO INICIAL Y PUBLICACIÓN          */}
              {/* ════════════════════════════════════════════════════════ */}
              {step === 5 && (
                <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
                  <div className="flex items-center justify-between pb-3 border-b border-border-light">
                    <div className="flex items-center gap-2 text-forest">
                      <CheckCircle2 size={20} />
                      <h3 className="font-black text-base sm:text-lg">Paso 5: Estado Inicial y Vista Previa</h3>
                    </div>
                    <span className="text-xs font-bold text-text-muted">Paso 5 de 5</span>
                  </div>

                  {/* Selector de Estado de la Vivienda */}
                  <div className="rounded-2xl border border-border-light bg-[#FAF5EE] p-4 sm:p-5">
                    <label className="block text-xs font-black uppercase tracking-wider text-cafe mb-3">
                      Estado de Disponibilidad Inicial
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          id: 'disponible',
                          label: 'Disponible',
                          desc: 'Lista para recibir visitas y solicitudes en el catálogo',
                          color: 'border-jade bg-jade/10 text-jade',
                        },
                        {
                          id: 'en_cita',
                          label: 'En Cita / Visita Activa',
                          desc: 'Con citas programadas o en proceso de visita',
                          color: 'border-blue-400 bg-blue-50 text-blue-800',
                        },
                        {
                          id: 'pausada',
                          label: 'Pausada / Borrador',
                          desc: 'Guardada pero no visible temporalmente al público',
                          color: 'border-amber-400 bg-amber-50 text-amber-800',
                        },
                      ].map((st) => {
                        const isSelected = formData.status === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, status: st.id })}
                            className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              isSelected
                                ? `${st.color} shadow-xs font-black ring-2 ring-forest/20`
                                : 'border-border-light bg-white text-text-secondary hover:border-border'
                            }`}
                          >
                            <span className="text-xs font-black block mb-0.5">{st.label}</span>
                            <span className="text-[10px] text-text-muted leading-tight block">{st.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vista Previa en Vivo (Live Card Preview) */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                      <Eye size={14} className="text-forest" />
                      <span>Así verán los inquilinos tu anuncio en RuwaJay:</span>
                    </h4>

                    <div className="max-w-md mx-auto rounded-3xl border border-border-light bg-white shadow-card overflow-hidden">
                      <div className="relative aspect-[16/10] bg-crema">
                        <img
                          src={selectedImages[coverIndex]?.preview || selectedImages[0]?.preview || SAMPLE_DEMO_IMAGES[0].url}
                          alt="Portada"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 flex gap-1.5">
                          <span className="px-2.5 py-1 bg-forest text-white text-[10px] font-black rounded-full uppercase">
                            {formData.type}
                          </span>
                          <span className="px-2.5 py-1 bg-gradient-to-r from-naranja to-dorado text-white text-[10px] font-black rounded-full">
                            Nuevo
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-xs">
                          <span className="text-base font-black text-forest">
                            {formatPrice(formData.price || 0)}
                          </span>
                          <span className="text-[10px] text-text-muted font-bold ml-1">/mes</span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <h5 className="font-black text-sm text-cafe line-clamp-1">
                          {formData.title || 'Título de tu propiedad'}
                        </h5>
                        <p className="text-xs text-text-secondary flex items-center gap-1">
                          <MapPin size={12} className="text-terracota" />
                          <span>{formData.zone}, {formData.department}</span>
                        </p>

                        <div className="flex items-center gap-4 text-xs font-bold text-text-muted pt-2 border-t border-border-light">
                          <span>🛏️ {formData.bedrooms} hab</span>
                          <span>🚿 {formData.bathrooms} baños</span>
                          {formData.parking > 0 && <span>🚗 {formData.parking} p/q</span>}
                          {formData.area && <span>📏 {formData.area} m²</span>}
                        </div>
                      </div>

                      {/* Mini tira de todas las fotos de la vivienda */}
                      {selectedImages.length > 1 && (
                        <div className="p-3 bg-[#FAF5EE] border-t border-border-light">
                          <p className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5 flex items-center justify-between">
                            <span>Galería de fotos ({selectedImages.length} fotos):</span>
                            <span className="text-forest font-bold">Todas se guardarán</span>
                          </p>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {selectedImages.map((img, i) => (
                              <div
                                key={i}
                                className={`relative w-14 h-11 rounded-lg overflow-hidden shrink-0 border-2 ${
                                  coverIndex === i ? 'ring-2 ring-forest border-forest' : 'border-border-light'
                                }`}
                              >
                                <img src={img.preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                                {coverIndex === i && (
                                  <span className="absolute bottom-0 inset-x-0 bg-forest text-white text-[7px] font-black text-center leading-tight">
                                    Portada
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {publishError && (
                    <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
                      <AlertTriangle size={18} className="shrink-0" />
                      <span>{publishError}</span>
                    </div>
                  )}

                  {isPublishing && (
                    <div className="rounded-2xl border border-forest/15 bg-white p-4 shadow-sm" role="status" aria-live="polite">
                      <div className="mb-2 flex items-center justify-between gap-4 text-xs font-black text-forest">
                        <span>{publishStage || 'Publicando vivienda...'}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div
                        className="h-3 w-full overflow-hidden rounded-full bg-forest/10"
                        role="progressbar"
                        aria-label="Progreso de publicación"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow={uploadProgress}
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-jade to-forest transition-[width] duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] font-semibold text-text-muted">
                        No cierres esta ventana mientras termina la publicación.
                      </p>
                    </div>
                  )}

                  {/* Botones de Publicación */}
                  <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-crema px-6 py-3.5 text-xs font-black text-cafe hover:bg-crema-dark transition-all"
                    >
                      <ArrowLeft size={16} />
                      <span>Atrás: Fotos</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPublishing}
                      onClick={handlePublish}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-10 py-4 text-sm font-black text-white shadow-xl hover:bg-forest-dark hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                    >
                      {isPublishing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Publicando propiedad...</span>
                        </>
                      ) : (
                        <>
                          <Rocket size={18} className="text-dorado" />
                          <span>{isEditMode ? 'Guardar cambios' : 'Publicar mi vivienda ahora'}</span>
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
