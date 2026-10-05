import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  User, Heart, Clock, Building2, LogOut, ShieldCheck, MapPin, Settings,
  Mail, Phone, Lock, Edit3, Check, X, Eye, EyeOff, BadgeCheck, Camera,
  Home, PlusCircle, ToggleLeft, ToggleRight, TrendingUp, Users, Calendar,
  FileText, AlertTriangle, Sparkles, ChevronDown, ChevronUp,
  Upload, Trash2, Shield, CheckCircle2, FileCheck, Bookmark, Calculator,
  RotateCcw, ArrowRight, AlertCircle, Clock3, MessageCircle, Megaphone, Radio, Bell, Send, Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AVATAR_OPTIONS } from '../data/avatars';
import { useFavorites } from '../context/FavoritesContext';
import { demoProperties } from '../data/properties';
import PropertyCard from '../components/property/PropertyCard';
import RuwaDatePicker from '../components/ui/RuwaDatePicker';
import RentAffordabilityModal from '../components/property/RentAffordabilityModal';
import EditPropertyModal from '../components/property/EditPropertyModal';
import { sanitizeText, validateImageFile, maskSensitive } from '../utils/security';
import { firebaseAuth } from '../lib/firebase';
import { deleteOwnedProperty, subscribeToProperties, updatePropertyStatus } from '../lib/propertyService';
import { changeVisitStatus, deleteVisit, setVisitConversationId, subscribeToUserVisits } from '../lib/visitService';
import { getOrCreateConversation } from '../lib/chatService';
import {
  subscribeToUsers,
  updateUserRole,
  updateUserStatus,
  subscribeToSystemUpdates,
  createSystemUpdate,
  updateSystemUpdate,
  deleteSystemUpdate,
} from '../lib/adminService';

/* ── Guatemalan Departments list ── */
const GT_DEPARTMENTS = [
  'Guatemala', 'Sacatepéquez', 'Quetzaltenango', 'Chimaltenango',
  'Escuintla', 'Alta Verapaz', 'Petén', 'San Marcos', 'Huehuetenango',
  'Izabal', 'Jalapa', 'Jutiapa', 'Zacapa', 'Chiquimula', 'El Progreso',
  'Retalhuleu', 'Suchitepéquez', 'Sololá', 'Totonicapán', 'Quiché', 'Santa Rosa'
];

/* ── DPI Formatting helpers ── */
function formatDpiCui(cuiStr) {
  if (!cuiStr) return '';
  const digits = cuiStr.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 4) return digits;
  if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 9)} ${digits.slice(9)}`;
}

function maskDpiCui(cuiStr) {
  if (!cuiStr) return '•••• ••••• ••••';
  const clean = cuiStr.replace(/\D/g, '');
  if (clean.length < 13) return clean;
  return `•••• ••••• ${clean.slice(-4)}`;
}

/* ── Password Strength helpers ── */
function getPasswordChecks(pw) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}
function isStrongPassword(pw) {
  const c = getPasswordChecks(pw);
  return c.length && c.upper && c.lower && c.number && c.symbol;
}

/* ── WhatsApp Icon ── */
function WhatsAppIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.84a8.17 8.17 0 0 1-5.82 2.41h-.01c-1.49 0-2.95-.4-4.23-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.19 8.19 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.25-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.49-1.39-1.74-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.3 3.79.6.26 1.07.41 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.21-.17-.46-.3z" />
    </svg>
  );
}

/* ── Avatar Component (supports custom gallery photo, Google photo or color preset) ── */
function UserAvatar({ user, size = 80, className = '' }) {
  const photo = user?.avatarImage || user?.avatar || user?.photoURL;
  if (photo) {
    return (
      <div
        className={`overflow-hidden rounded-full shadow-lg border-2 border-white ring-2 ring-forest/30 transition-all ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={photo}
          alt={user?.name || 'Usuario'}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  const avatarOption = AVATAR_OPTIONS.find((a) => a.id === user?.avatarId);
  const bgColor = avatarOption?.color || '#2D6A4F';
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div
      className={`flex items-center justify-center rounded-full font-extrabold text-white shadow-lg transition-all ${className}`}
      style={{ width: size, height: size, backgroundColor: bgColor, fontSize: size * 0.38 }}
    >
      {initial}
    </div>
  );
}

/* ── Section card wrapper ── */
function SectionCard({ children, className = '', danger = false }) {
  return (
    <div className={`rounded-3xl border ${danger ? 'border-red-100' : 'border-border'} bg-white p-5 shadow-card sm:p-7 ${className}`}>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'perfil';
  const { user, logout, updateProfile, changePassword, requestVerification, purgeDpiData, isAdmin } = useAuth();
  const { favorites, recentSearches } = useFavorites();
  const [editingProperty, setEditingProperty] = useState(null);
  const [myProperties, setMyProperties] = useState([]);
  const isOwner = user?.role === 'owner' || user?.role === 'admin' || myProperties.length > 0;
  const currentUserId = firebaseAuth?.currentUser?.uid || user?.id;
  const currentUserPhone = String(user?.phone || '').replace(/\D/g, '');
  const currentUserEmail = String(user?.email || firebaseAuth?.currentUser?.email || '').trim().toLowerCase();

  const favProperties = demoProperties.filter((p) => favorites.includes(p.id));

  /* ── Edit Profile State ── */
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarId, setEditAvatarId] = useState('forest-initial');
  const [editAvatarImage, setEditAvatarImage] = useState(null);
  const [profileSaved, setProfileSaved] = useState(false);

  /* ── Change Password State ── */
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showAffordabilityModal, setShowAffordabilityModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  /* ── Verification State ── */
  const [showDpiModal, setShowDpiModal] = useState(false);
  const [showDpiDetailsModal, setShowDpiDetailsModal] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyDone, setVerifyDone] = useState(false);
  const [dpiError, setDpiError] = useState('');
  const [unmaskCui, setUnmaskCui] = useState(false);
  const [blurDpiPhoto, setBlurDpiPhoto] = useState(true);
  const [dpiPurgedNotice, setDpiPurgedNotice] = useState(false);
  const [dpiForm, setDpiForm] = useState({
    cui: '',
    department: 'Guatemala',
    municipality: 'Guatemala',
    birthDate: '',
    expirationDate: '',
    legalAddress: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: 'Familiar',
    documentPhoto: null,
    swornDeclaration: false,
  });

  /* ── My Properties State (declared above) ── */

  /* ── Admin State ── */
  const [allUsers, setAllUsers] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [systemUpdates, setSystemUpdates] = useState([]);
  const [newUpdateTitle, setNewUpdateTitle] = useState('');
  const [newUpdateContent, setNewUpdateContent] = useState('');
  const [newUpdateCategory, setNewUpdateCategory] = useState('novedad');
  const [newUpdatePriority, setNewUpdatePriority] = useState('normal');
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [adminNotice, setAdminNotice] = useState('');

  // Load edit form with current user data
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditBio(user.bio || '');
      setEditAvatarId(user.avatarId || 'forest-initial');
      setEditAvatarImage(user?.avatarImage || user?.avatar || user?.photoURL || null);
      if (user.dpiData) {
        setDpiForm((prev) => ({
          ...prev,
          ...user.dpiData,
          cui: formatDpiCui(user.dpiData.cui || ''),
          swornDeclaration: true,
        }));
      }
    }
  }, [user, editingProfile]);

  // Keep owner properties backed by the shared Firestore collection & local storage.
  useEffect(() => {
    const ownerId = user?.id || firebaseAuth?.currentUser?.uid;
    const currentEmail = user?.email?.toLowerCase();
    const currentName = user?.name?.trim().toLowerCase();

    if (!ownerId && !currentEmail && !currentName) {
      setMyProperties([]);
      return undefined;
    }

    return subscribeToProperties((properties) => {
      const filtered = properties.filter((property) => {
        if (!property) return false;
        return (
          (ownerId && property.ownerId === ownerId) ||
          (user?.id && property.ownerId === user.id) ||
          (firebaseAuth?.currentUser?.uid && property.ownerId === firebaseAuth.currentUser.uid) ||
          (currentEmail && property.ownerEmail && property.ownerEmail.toLowerCase() === currentEmail) ||
          (currentName && property.ownerName && property.ownerName.trim().toLowerCase() === currentName)
        );
      });
      setMyProperties(filtered);
    });
  }, [user?.id, user?.email, user?.name, activeTab]);

  /* ── Visits State & Persistence ── */
  const [visits, setVisits] = useState([]);
  const [visitSubTab, setVisitSubTab] = useState('todas'); // 'todas' | 'recibidas' | 'solicitadas'

  const loadVisits = () => {
    try {
      const parsedVisits = JSON.parse(localStorage.getItem('ruwajay_visits') || '[]');
      const stored = Array.isArray(parsedVisits) ? parsedVisits : [];
      const now = Date.now();

      // Rule: If an appointment has been pending for more than 7 days (1 week) without being accepted,
      // mark it as expired ('vencida') so the tenant must schedule a new appointment.
      const cleaned = stored.filter((v) => v?.id !== 'visit-seed-1').map((v) => {
        if (v.status === 'pendiente') {
          const created = new Date(v.createdAt || Date.now()).getTime();
          const diffDays = (now - created) / (1000 * 60 * 60 * 24);
          if (diffDays >= 7) {
            return { ...v, status: 'vencida', expiredAt: new Date().toISOString() };
          }
        }
        return v;
      });

      localStorage.setItem('ruwajay_visits', JSON.stringify(cleaned));
      localStorage.setItem('ruwajay_visits_seeded', 'true');
      setVisits(cleaned);
    } catch {
      setVisits([]);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [activeTab]);

  const myPropertyIds = useMemo(() => myProperties.map((p) => p.id), [myProperties]);
  const myPropertySet = useMemo(() => new Set(myPropertyIds), [myPropertyIds]);

  useEffect(() => {
    if (!currentUserId) return undefined;
    return subscribeToUserVisits(
      currentUserId,
      setVisits,
      (error) => console.warn('No se pudieron sincronizar las citas en tiempo real:', error),
      { userPhone: currentUserPhone, userName: user?.name, myPropertyIds }
    );
  }, [currentUserId, currentUserPhone, user?.name, myPropertyIds]);

  useEffect(() => {
    const refreshVisits = () => loadVisits();
    window.addEventListener('storage', refreshVisits);
    window.addEventListener('ruwajay:visits-changed', refreshVisits);
    return () => {
      window.removeEventListener('storage', refreshVisits);
      window.removeEventListener('ruwajay:visits-changed', refreshVisits);
    };
  }, [user?.id]);

  const handleUpdateVisitStatus = async (visitId, newStatus) => {
    try {
      await changeVisitStatus(visitId, newStatus);
      const visitObj = visits.find((v) => v.id === visitId);
      if (visitObj && (newStatus === 'confirmada' || newStatus === 'aceptada')) {
        try {
          const canonicalOwnerId = firebaseAuth?.currentUser?.uid || currentUserId || visitObj.ownerId;
          const roomId = await getOrCreateConversation(
            visitObj.tenantId || 'tenant',
            canonicalOwnerId || 'owner',
            visitObj.propertyId,
            visitObj.propertyTitle || 'Vivienda',
            { ...visitObj, ownerId: canonicalOwnerId }
          );
          await setVisitConversationId(visitObj.id, roomId).catch(() => {});
        } catch { /* chat fallback */ }
      }
      window.dispatchEvent(new Event('ruwajay:visits-changed'));
    } catch (error) {
      console.warn('No se pudo actualizar la cita:', error);
    }
  };

  const handleDeleteVisit = async (visitId) => {
    if (!window.confirm('¿Deseas eliminar esta cita del historial para ambos participantes?')) return;
    try {
      await deleteVisit(visitId);
    } catch (error) {
      console.warn('No se pudo eliminar la cita:', error);
    }
  };

  const handleDeleteOwnedProperty = async (property) => {
    const confirmed = window.confirm(
      `¿Eliminar permanentemente "${property.title || 'esta vivienda'}"? Dejará de aparecer para todos los usuarios.`
    );
    if (!confirmed) return;

    try {
      await deleteOwnedProperty(property.id, currentUserId);
    } catch (error) {
      window.alert(error?.message || 'No se pudo eliminar la vivienda.');
    }
  };

  const handleOpenVisitChat = async (visit) => {
    try {
      const activeUid = firebaseAuth?.currentUser?.uid || currentUserId;
      const ownsVisitedProperty = myPropertySet.has(visit.propertyId)
        || visit.ownerId === activeUid
        || (currentUserName && String(visit.ownerName || '').trim().toLowerCase() === currentUserName);
      const effectiveOwnerId = ownsVisitedProperty ? activeUid : visit.ownerId;
      const effectiveTenantId = ownsVisitedProperty ? visit.tenantId : activeUid;

      const roomId = await getOrCreateConversation(
        effectiveTenantId,
        effectiveOwnerId,
        visit.propertyId,
        visit.propertyTitle || 'Vivienda',
        visit
      );

      await setVisitConversationId(visit.id, roomId).catch(() => {});
      navigate(`/chat?conversation=${encodeURIComponent(roomId)}&property=${encodeURIComponent(visit.propertyId)}`);
    } catch (error) {
      window.alert(error?.message || 'No se pudo abrir el chat privado. Verifica que hayas iniciado sesión con Firebase.');
    }
  };

  const currentUserName = useMemo(() => String(user?.name || '').trim().toLowerCase(), [user?.name]);

  const receivedVisits = useMemo(() => {
    const fbUid = firebaseAuth?.currentUser?.uid;
    return visits.filter((v) => {
      if (currentUserId && v.ownerId === currentUserId) return true;
      if (fbUid && v.ownerId === fbUid) return true;
      if (currentUserPhone && v.ownerPhone && String(v.ownerPhone).replace(/\D/g, '') === currentUserPhone) return true;
      if (currentUserName && v.ownerName && String(v.ownerName).trim().toLowerCase() === currentUserName) return true;
      if (v.propertyId && myPropertySet.has(v.propertyId)) return true;
      return false;
    });
  }, [visits, currentUserId, currentUserPhone, currentUserName, myPropertySet]);

  const requestedVisits = useMemo(() => {
    return visits.filter((v) => {
      if (currentUserId && v.tenantId === currentUserId) return true;
      if (firebaseAuth?.currentUser?.uid && v.tenantId === firebaseAuth.currentUser.uid) return true;
      if (currentUserPhone && v.tenantPhone && String(v.tenantPhone).replace(/\D/g, '') === currentUserPhone) return true;
      return false;
    });
  }, [visits, currentUserId, currentUserPhone]);

  const relevantVisits = useMemo(() => {
    const relevantIds = new Set([...receivedVisits, ...requestedVisits].map((visit) => visit.id));
    return visits.filter((visit) => relevantIds.has(visit.id));
  }, [visits, receivedVisits, requestedVisits]);

  const displayedVisits = useMemo(() => {
    if (visitSubTab === 'recibidas') return receivedVisits;
    if (visitSubTab === 'solicitadas') return requestedVisits;
    return relevantVisits;
  }, [relevantVisits, visitSubTab, receivedVisits, requestedVisits]);

  /* ── Saved Searches State ── */
  const [savedSearches, setSavedSearches] = useState([]);

  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem('ruwajay_saved_searches') || '[]');
      setSavedSearches(items);
    } catch {
      setSavedSearches([]);
    }
  }, [activeTab]);

  const handleDeleteSavedSearch = (searchId) => {
    try {
      const updated = savedSearches.filter((s) => s.id !== searchId);
      localStorage.setItem('ruwajay_saved_searches', JSON.stringify(updated));
      setSavedSearches(updated);
    } catch { /* ignore */ }
  };

  const pwChecks = useMemo(() => getPasswordChecks(newPw), [newPw]);
  const pwScore = Object.values(pwChecks).filter(Boolean).length;
  const pwStrength = pwScore <= 2
    ? { text: 'Débil', color: 'text-red-600', width: 'w-1/3', bg: 'bg-red-500' }
    : pwScore < 5
    ? { text: 'Normal', color: 'text-amber-600', width: 'w-2/3', bg: 'bg-amber-500' }
    : { text: 'Fuerte', color: 'text-forest', width: 'w-full', bg: 'bg-forest' };

  /* ── Handlers ── */
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditAvatarImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    updateProfile({
      name: sanitizeText(editName.trim() || user.name),
      phone: sanitizeText(editPhone.trim()),
      bio: sanitizeText(editBio.trim()),
      avatarId: editAvatarId,
      avatarImage: editAvatarImage,
    });
    setEditingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleDpiPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setDpiError(validation.error);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDpiForm((prev) => ({ ...prev, documentPhoto: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDpiVerification = async (e) => {
    e.preventDefault();
    setDpiError('');
    const cleanCui = dpiForm.cui.replace(/\s/g, '');
    if (cleanCui.length !== 13 || !/^\d{13}$/.test(cleanCui)) {
      setDpiError('El CUI / DPI debe contener exactamente 13 dígitos numéricos.');
      return;
    }
    if (!dpiForm.birthDate) {
      setDpiError('Por favor ingresa tu fecha de nacimiento.');
      return;
    }
    if (!dpiForm.emergencyName || !dpiForm.emergencyPhone) {
      setDpiError('Ingresa un contacto de referencia o emergencia para respaldar tu verificación.');
      return;
    }
    if (!dpiForm.swornDeclaration) {
      setDpiError('Debes aceptar la declaración jurada de veracidad de los datos.');
      return;
    }

    setVerifyBusy(true);
    try {
      await requestVerification({
        cui: cleanCui,
        department: sanitizeText(dpiForm.department),
        municipality: sanitizeText(dpiForm.municipality),
        birthDate: sanitizeText(dpiForm.birthDate),
        expirationDate: sanitizeText(dpiForm.expirationDate),
        legalAddress: sanitizeText(dpiForm.legalAddress),
        emergencyName: sanitizeText(dpiForm.emergencyName),
        emergencyPhone: sanitizeText(dpiForm.emergencyPhone),
        emergencyRelation: sanitizeText(dpiForm.emergencyRelation),
        documentPhoto: dpiForm.documentPhoto,
      });
      setVerifyBusy(false);
      setVerifyDone(true);
      setShowDpiModal(false);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3500);
    } catch {
      setVerifyBusy(false);
      setDpiError('Hubo un problema al procesar la verificación. Intenta nuevamente.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage(''); setPwError(false);
    if (!currentPw) { setPwMessage('Ingresa tu contraseña actual.'); setPwError(true); return; }
    if (!isStrongPassword(newPw)) { setPwMessage('Tu nueva contraseña no cumple todos los requisitos.'); setPwError(true); return; }
    if (newPw !== confirmPw) { setPwMessage('Las contraseñas nuevas no coinciden.'); setPwError(true); return; }
    setPwBusy(true);
    try {
      await changePassword(currentPw, newPw);
      setPwMessage('¡Contraseña actualizada correctamente!');
      setPwError(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setShowPasswordForm(false); setPwMessage(''); }, 2500);
    } catch (err) {
      setPwMessage(err.message || 'Error al cambiar la contraseña.');
      setPwError(true);
    } finally { setPwBusy(false); }
  };

  const handleRequestVerification = async () => {
    setVerifyBusy(true);
    await requestVerification();
    setVerifyBusy(false);
    setVerifyDone(true);
  };

  const handleSetPropertyStatus = async (propertyId, newStatus) => {
    try {
      await updatePropertyStatus(propertyId, newStatus);
    } catch (error) {
      console.warn('Firestore updatePropertyStatus fallback:', error);
    }
    try {
      const localProps = JSON.parse(localStorage.getItem('ruwajay_custom_properties') || '[]');
      const updated = localProps.map((p) => (p.id === propertyId ? { ...p, status: newStatus } : p));
      localStorage.setItem('ruwajay_custom_properties', JSON.stringify(updated));
    } catch { /* ignore */ }
    setMyProperties((prev) =>
      prev.map((p) => (p.id === propertyId ? { ...p, status: newStatus } : p))
    );
  };

  const isVerified = user?.verified || verifyDone;

  /* ── Admin: subscribe to all users, properties, and system updates ── */
  useEffect(() => {
    if (!isAdmin) return;
    const unsubUsers = subscribeToUsers(setAllUsers);
    const unsubProps = subscribeToProperties(setAllProperties);
    const unsubUpdates = subscribeToSystemUpdates(setSystemUpdates, true);
    return () => {
      unsubUsers();
      unsubProps();
      unsubUpdates();
    };
  }, [isAdmin]);

  /* ── Tabs config ── */
  const tabs = [
    { key: 'perfil', label: 'Mi Perfil', icon: User },
    { key: 'favoritos', label: 'Favoritos', count: favorites.length, icon: Heart },
    { key: 'busquedas', label: 'Búsquedas', count: savedSearches.length > 0 ? savedSearches.length : undefined, icon: Bookmark },
    { key: 'visitas', label: 'Citas y Visitas', count: relevantVisits.length, icon: Calendar },
    ...(isOwner ? [{ key: 'propiedades', label: 'Mis Propiedades', count: myProperties.length, icon: Building2 }] : []),
    ...(isAdmin ? [{ key: 'admin', label: 'Administración', icon: Shield }] : []),
    { key: 'configuracion', label: 'Ajustes', icon: Settings },
  ];

  return (
    <main className="min-h-screen bg-crema/30 pb-24 pt-4 md:pb-12 md:pt-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* ═══════ Profile Header ═══════ */}
        <div className="mb-6 rounded-3xl border border-border bg-white p-5 shadow-card sm:mb-8 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <UserAvatar user={user} size={80} />
              {!editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-border text-forest shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Editar perfil"
                >
                  <Camera size={14} />
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <h1 className="break-words text-2xl font-extrabold text-cafe">{user?.name}</h1>
                {isVerified && (
                  <button
                    type="button"
                    onClick={() => setShowDpiDetailsModal(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-dorado/20 to-dorado/10 px-2.5 py-0.5 text-[11px] font-black text-dorado hover:ring-2 hover:ring-dorado/40 transition-all cursor-pointer"
                    title="Ver credencial de verificación"
                  >
                    <BadgeCheck size={14} className="text-dorado" /> Verificado con DPI
                  </button>
                )}
              </div>
              <p className="break-all text-sm text-text-secondary">{user?.email}</p>
              {user?.bio && <p className="mt-1.5 text-xs text-text-muted italic">"{user.bio}"</p>}
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => (isVerified ? setShowDpiDetailsModal(true) : setShowDpiModal(true))}
                  className="flex items-center gap-1 rounded-full bg-dorado/10 px-3 py-1 text-xs font-bold text-cafe hover:bg-dorado/20 transition-colors"
                >
                  {isVerified ? '✓ Identidad DPI validada' : '🛡️ Verificar identidad con DPI'}
                </button>
                <span className="rounded-full bg-crema px-3 py-1 text-xs font-bold text-cafe">
                  {user?.role === 'owner' ? 'Casero' : 'Inquilino'}
                </span>
              </div>
              <p className="mt-3 text-center text-xs font-semibold text-text-muted sm:text-left">
                {isVerified ? 'Cuenta verificada con DPI' : 'Sin verificar todavía'} · {user?.role === 'owner' ? 'Propietario activo' : 'Buscando vivienda'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowAffordabilityModal(true)}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-forest/10 px-4 py-2 text-xs font-bold text-forest transition-all hover:bg-forest/20"
              >
                <Calculator size={16} /> Calculadora 30/70
              </button>
              <button
                onClick={() => setEditingProfile(true)}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-crema px-4 py-2 text-xs font-bold text-cafe transition-all hover:bg-crema/80"
              >
                <Edit3 size={16} /> Editar perfil
              </button>
              <button
                type="button"
                onClick={async () => { await logout(); navigate('/login', { replace: true }); }}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-terracota transition-all hover:bg-red-100 cursor-pointer"
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          </div>

          {/* Success toast */}
          {profileSaved && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-jade/30 bg-jade/10 p-3 text-xs font-bold text-forest" style={{ animation: 'slide-up 0.3s ease-out' }}>
              <Check size={16} /> Perfil actualizado correctamente.
            </div>
          )}
        </div>

        {/* ═══════ Edit Profile Modal ═══════ */}
        {editingProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setEditingProfile(false)}>
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-white shadow-popup"
              style={{ animation: 'slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-1.5 bg-gradient-to-r from-forest via-dorado to-terracota" />
              <div className="max-h-[calc(100dvh-120px)] overflow-y-auto p-6 sm:p-8">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-cafe">Editar mi perfil</h2>
                    <p className="text-xs text-text-muted mt-0.5">Actualiza tu información personal</p>
                  </div>
                  <button onClick={() => setEditingProfile(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-muted hover:text-cafe hover:bg-crema transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {/* Custom Photo or Avatar Selector */}
                <div className="mb-6 rounded-2xl border border-border-light bg-[#FDFBF7] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-cafe flex items-center gap-1.5">
                      <Camera size={15} className="text-forest" />
                      Foto de perfil
                    </p>
                    {editAvatarImage && (
                      <button
                        type="button"
                        onClick={() => setEditAvatarImage(null)}
                        className="text-[11px] font-bold text-terracota hover:underline flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Quitar foto
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Avatar Preview */}
                    <div className="relative shrink-0 w-20 h-20 rounded-full overflow-hidden border-2 border-forest shadow-md bg-crema flex items-center justify-center">
                      {editAvatarImage ? (
                        <img src={editAvatarImage} alt="Vista previa" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white text-2xl font-black"
                          style={{ backgroundColor: (AVATAR_OPTIONS.find((a) => a.id === editAvatarId) || AVATAR_OPTIONS[0]).color }}
                        >
                          {(editName || user?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* File Input button */}
                    <div className="flex-1">
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-black text-white hover:bg-forest-dark transition-all shadow-xs"
                      >
                        <Upload size={14} /> Elegir foto de mi galería
                      </label>
                      <p className="text-[11px] text-text-muted mt-1.5 leading-tight">
                        Sube una foto desde tus archivos o galería (JPG, PNG o WebP, máx 5MB).
                      </p>
                    </div>
                  </div>

                  {/* Color presets alternative */}
                  <div className="mt-4 pt-3 border-t border-border-light/60">
                    <p className="text-[11px] font-bold text-text-muted mb-2">O elige un color con tus iniciales:</p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                      {AVATAR_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setEditAvatarId(opt.id);
                            setEditAvatarImage(null);
                          }}
                          className={`relative flex h-10 w-10 items-center justify-center rounded-full text-white font-extrabold text-sm transition-all ${
                            !editAvatarImage && editAvatarId === opt.id
                              ? 'ring-3 ring-forest ring-offset-2 scale-110'
                              : 'hover:scale-105 opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: opt.color }}
                          title={opt.label}
                        >
                          {(editName || user?.name || 'U').charAt(0).toUpperCase()}
                          {!editAvatarImage && editAvatarId === opt.id && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-forest text-white">
                              <Check size={9} />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="mb-4">
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-cafe">Nombre completo</label>
                  <div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3.5 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
                    <User size={18} className="shrink-0 text-forest/70" />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Tu nombre"
                      className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm font-semibold text-cafe outline-none"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="mb-4">
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-cafe">Teléfono</label>
                  <div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3.5 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
                    <Phone size={18} className="shrink-0 text-forest/70" />
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Ej. 5555 5555"
                      className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm font-semibold text-cafe outline-none"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="mb-6">
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-cafe">Biografía / Presentación</label>
                  <div className="rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3.5 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      maxLength={200}
                      rows={3}
                      placeholder="Cuéntanos algo sobre ti... (máx. 200 caracteres)"
                      className="w-full resize-none border-none bg-transparent p-0 text-sm font-semibold text-cafe outline-none placeholder:text-text-muted"
                    />
                    <p className="mt-1 text-right text-[10px] text-text-muted">{editBio.length}/200</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-bold text-cafe transition-colors hover:bg-crema"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-forest to-forest-dark px-4 py-3 text-sm font-black text-white shadow-lg transition-transform hover:-translate-y-0.5"
                  >
                    <Check size={18} /> Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ Tab Selection ═══════ */}
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border sm:gap-2 pb-0 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.key}
                to={`/perfil?tab=${tab.key}`}
                className={`flex min-h-12 shrink-0 items-center gap-1.5 border-b-2 px-3 pb-3 text-xs font-bold transition-all sm:gap-2 sm:px-4 sm:text-sm whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-terracota text-terracota'
                    : 'border-transparent text-text-muted hover:text-cafe'
                }`}
              >
                <Icon size={18} />
                {tab.label}
                {tab.count != null && <span className="text-[10px]">({tab.count})</span>}
              </Link>
            );
          })}
        </div>

        {/* ═══════ Tab Contents ═══════ */}

        {/* ── Mi Perfil (Datos y Resumen) ── */}
        {activeTab === 'perfil' && (
          <div className="space-y-6">
            {/* Tarjeta de Datos Personales */}
            <SectionCard>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-extrabold text-cafe">
                    <User size={20} className="text-forest" /> Datos de mi Cuenta
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">Información principal de contacto y credenciales</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProfile(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-black text-white hover:bg-forest-dark transition-all shadow-xs cursor-pointer w-fit"
                >
                  <Edit3 size={15} /> Editar datos
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-border/80 bg-[#FAF8F5] p-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-text-muted block mb-1">Nombre Completo</span>
                  <p className="text-sm font-black text-cafe break-words">{user?.name || 'Sin nombre'}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-[#FAF8F5] p-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-text-muted block mb-1">Correo Electrónico</span>
                  <p className="text-sm font-black text-cafe break-all">{user?.email || 'Sin correo'}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-[#FAF8F5] p-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-text-muted block mb-1">Teléfono</span>
                  <p className="text-sm font-black text-cafe">{user?.phone || 'No registrado'}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-[#FAF8F5] p-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-text-muted block mb-1">Tipo de Usuario</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-2.5 py-1 text-xs font-black text-forest">
                    {user?.role === 'admin' ? '🛡️ Administrador' : user?.role === 'owner' ? '🏡 Propietario' : '👤 Inquilino'}
                  </span>
                </div>
                <div className="rounded-2xl border border-border/80 bg-[#FAF8F5] p-4 sm:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-text-muted block mb-1">Biografía / Presentación</span>
                  <p className="text-xs font-semibold text-cafe italic">
                    {user?.bio ? `"${user.bio}"` : 'Sin biografía añadida. Añade una descripción para mayor confianza.'}
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Resumen de Actividad */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Link
                to="/perfil?tab=favoritos"
                className="group rounded-2xl border border-border bg-white p-4 text-center transition-all hover:border-forest/50 hover:shadow-sm"
              >
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 group-hover:scale-110 transition-transform">
                  <Heart size={20} />
                </div>
                <p className="text-2xl font-black text-cafe">{favorites.length}</p>
                <p className="text-[11px] font-bold text-text-muted">Favoritos guardados</p>
              </Link>

              <Link
                to="/perfil?tab=visitas"
                className="group rounded-2xl border border-border bg-white p-4 text-center transition-all hover:border-forest/50 hover:shadow-sm"
              >
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-forest/10 text-forest group-hover:scale-110 transition-transform">
                  <Calendar size={20} />
                </div>
                <p className="text-2xl font-black text-cafe">{visits.length}</p>
                <p className="text-[11px] font-bold text-text-muted">Citas y Visitas</p>
              </Link>

              <Link
                to="/perfil?tab=busquedas"
                className="group rounded-2xl border border-border bg-white p-4 text-center transition-all hover:border-forest/50 hover:shadow-sm"
              >
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                  <Bookmark size={20} />
                </div>
                <p className="text-2xl font-black text-cafe">{savedSearches.length}</p>
                <p className="text-[11px] font-bold text-text-muted">Búsquedas y Alertas</p>
              </Link>

              {isOwner ? (
                <Link
                  to="/perfil?tab=propiedades"
                  className="group rounded-2xl border border-border bg-white p-4 text-center transition-all hover:border-forest/50 hover:shadow-sm"
                >
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-terracota/10 text-terracota group-hover:scale-110 transition-transform">
                    <Building2 size={20} />
                  </div>
                  <p className="text-2xl font-black text-cafe">{myProperties.length}</p>
                  <p className="text-[11px] font-bold text-text-muted">Mis Propiedades</p>
                </Link>
              ) : (
                <Link
                  to="/chat"
                  className="group rounded-2xl border border-border bg-white p-4 text-center transition-all hover:border-forest/50 hover:shadow-sm"
                >
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-jade/10 text-forest group-hover:scale-110 transition-transform">
                    <Mail size={20} />
                  </div>
                  <p className="text-2xl font-black text-cafe">Chat</p>
                  <p className="text-[11px] font-bold text-text-muted">Mensajes directos</p>
                </Link>
              )}
            </div>

            {/* Validación e Identidad DPI */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-base font-extrabold text-cafe">
                  <ShieldCheck size={20} className="text-dorado" /> Validación de Identidad con DPI
                </h3>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-dorado/20 px-2.5 py-0.5 text-[10px] font-black text-dorado">
                    <BadgeCheck size={13} /> Certificado Oficial
                  </span>
                )}
              </div>

              {isVerified ? (
                <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-dorado/30 bg-gradient-to-br from-dorado/10 via-[#FAF5EE] to-dorado/5 p-4 sm:p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dorado/20 text-dorado">
                    <BadgeCheck size={28} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-cafe">Tu cuenta cuenta con insignia de DPI Validado</p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Tu documento oficial de identificación de Guatemala ha sido registrado correctamente para garantizar la máxima seguridad en transacciones.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDpiDetailsModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-black text-white hover:bg-forest-dark transition-colors cursor-pointer"
                      >
                        <FileCheck size={14} /> Ver credencial oficial
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDpiModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-cafe hover:bg-crema transition-colors cursor-pointer"
                      >
                        <Edit3 size={13} /> Modificar datos de DPI
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-[#E8D9C8]/80 bg-[#FDFBF7] p-4 sm:p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dorado/10 text-dorado">
                    <ShieldCheck size={28} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-cafe">Aumenta tu confianza validando tu DPI</p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Registra tu CUI de 13 dígitos y datos oficiales para obtener la insignia dorada de verificación.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDpiModal(true)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-dorado to-[#C5850F] px-4 py-2.5 text-xs font-black text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
                    >
                      <Sparkles size={14} /> Iniciar verificación con DPI
                    </button>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── Favoritos ── */}
        {activeTab === 'favoritos' && (
          <div>
            {favProperties.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favProperties.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-border bg-white p-6 py-12 text-center sm:p-8 sm:py-16">
                <Heart size={48} className="text-text-muted/30 mx-auto mb-3" />
                <h3 className="font-extrabold text-cafe text-lg mb-1">Aún no tienes favoritos</h3>
                <p className="text-xs text-text-muted mb-4">Guarda casas y apartamentos para verlos más tarde.</p>
                <Link to="/explorar" className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-forest px-6 py-2.5 text-sm font-bold text-white sm:w-auto">
                  Explorar propiedades
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Búsquedas ── */}
        {activeTab === 'busquedas' && (
          <div className="space-y-6">
            {/* Saved Searches Card */}
            <div className="bg-white rounded-3xl p-6 shadow-card border border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center text-forest">
                    <Bookmark size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-cafe text-base sm:text-lg">Búsquedas Guardadas y Alertas</h3>
                    <p className="text-xs text-text-muted">Tus criterios frecuentes con alertas activas para el mercado guatemalteco</p>
                  </div>
                </div>

                <Link
                  to="/explorar"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-black text-white hover:bg-forest-dark transition-all shadow-xs"
                >
                  <PlusCircle size={14} /> Nueva búsqueda
                </Link>
              </div>

              {savedSearches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedSearches.map((saved) => (
                    <div
                      key={saved.id}
                      className="flex flex-col justify-between p-4 rounded-2xl border border-border/80 bg-[#FAF8F5] hover:border-forest/40 transition-all shadow-2xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-black text-cafe text-sm">{saved.name}</h4>
                          {saved.notifyEmail && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-extrabold text-forest">
                              <Sparkles size={11} /> Alertas activas
                            </span>
                          )}
                        </div>

                        {/* Badges preview */}
                        <div className="flex flex-wrap gap-1.5 text-[11px] mb-3">
                          {saved.filters?.department && saved.filters.department !== 'Todos' && (
                            <span className="rounded-lg bg-white border border-border px-2 py-0.5 font-bold text-forest">
                              📍 {saved.filters.department}
                            </span>
                          )}
                          {saved.filters?.zone && !saved.filters.zone.toLowerCase().startsWith('todas') && (
                            <span className="rounded-lg bg-white border border-border px-2 py-0.5 font-bold text-forest">
                              🏙️ {saved.filters.zone.split('(')[0].trim()}
                            </span>
                          )}
                          {saved.filters?.type && (
                            <span className="rounded-lg bg-white border border-border px-2 py-0.5 font-bold text-cafe">
                              {saved.filters.type === 'casa' ? 'Casa' : 'Apto'}
                            </span>
                          )}
                          {saved.filters?.priceMax && (
                            <span className="rounded-lg bg-white border border-border px-2 py-0.5 font-bold text-cafe">
                              ≤ Q{Number(saved.filters.priceMax).toLocaleString('es-GT')}
                            </span>
                          )}
                          {saved.filters?.bedrooms && (
                            <span className="rounded-lg bg-white border border-border px-2 py-0.5 font-bold text-cafe">
                              {saved.filters.bedrooms}+ habs
                            </span>
                          )}
                          {saved.filters?.security && (
                            <span className="rounded-lg bg-white border border-border px-2 py-0.5 font-bold text-forest">
                              Garita 24/7
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-border/50 text-xs">
                        <span className="text-[11px] text-text-muted font-medium">
                          {new Date(saved.createdAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' })}
                        </span>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedSearch(saved.id)}
                            className="text-text-muted hover:text-terracota font-bold text-xs transition-colors"
                          >
                            Eliminar
                          </button>
                          <Link
                            to={`/explorar?${new URLSearchParams({
                              ...(saved.filters?.department && saved.filters.department !== 'Todos' ? { dept: saved.filters.department } : {}),
                              ...(saved.filters?.type ? { type: saved.filters.type } : {}),
                              ...(saved.filters?.priceMax ? { maxPrice: saved.filters.priceMax } : {}),
                              ...(saved.searchQuery ? { q: saved.searchQuery } : {}),
                            }).toString()}`}
                            className="font-black text-forest hover:underline"
                          >
                            Ver propiedades →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-border rounded-2xl bg-[#FAF8F5]">
                  <Bookmark size={30} className="text-text-muted/40 mx-auto mb-2" />
                  <p className="text-xs font-bold text-cafe">No tienes búsquedas guardadas aún</p>
                  <p className="text-[11px] text-text-muted mt-0.5 mb-3.5">
                    Al explorar propiedades puedes guardar cualquier combinación de filtros para volver a consultarla al instante.
                  </p>
                  <Link
                    to="/explorar"
                    className="inline-flex items-center justify-center rounded-xl bg-forest px-4 py-2 text-xs font-black text-white hover:bg-forest-dark transition-all"
                  >
                    Explorar y guardar una búsqueda
                  </Link>
                </div>
              )}
            </div>

            {/* Recent Searches */}
            <div className="bg-white rounded-3xl p-6 shadow-card border border-border">
              <h3 className="font-extrabold text-cafe text-base mb-3">Historial de búsquedas recientes</h3>
              {recentSearches.length > 0 ? (
                <ul className="divide-y divide-border">
                  {recentSearches.map((s, i) => (
                    <li key={i} className="flex flex-col items-start gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex min-w-0 items-start gap-2 text-sm font-semibold text-cafe">
                        <MapPin size={16} className="mt-0.5 shrink-0 text-terracota" /> <span className="min-w-0 break-words">{s.query}</span>
                      </span>
                      <Link to={`/explorar?q=${encodeURIComponent(s.query)}`} className="inline-flex min-h-10 shrink-0 items-center text-xs font-bold text-forest hover:underline">
                        Buscar de nuevo
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-text-muted text-center py-6">No hay búsquedas recientes registradas.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Citas y Visitas ── */}
        {activeTab === 'visitas' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-3xl border border-border bg-white p-5 sm:p-6 shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-forest/10 flex items-center justify-center text-forest shadow-xs">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-cafe sm:text-xl">
                      Citas y Visitas Presenciales
                    </h2>
                    <p className="text-xs text-text-muted font-medium">
                      Control de visitas, estados de vivienda y coordinación directa por WhatsApp
                    </p>
                  </div>
                </div>

                <Link
                  to="/explorar"
                  className="btn-primary inline-flex items-center justify-center gap-2 !rounded-xl !py-2.5 !px-4 text-xs shadow-sm"
                >
                  <Home size={14} /> Explorar y agendar cita
                </Link>
              </div>

              {/* Policy Banner: 7-day rule & property state management */}
              <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200/70 p-3.5 flex items-start gap-3 text-xs text-amber-900">
                <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-amber-950">
                    Reglas del sistema de citas y disponibilidad
                  </p>
                  <p className="text-amber-900/90 leading-relaxed text-[11px]">
                    • <strong>Expiración en 7 días:</strong> Las solicitudes de visita no aceptadas dentro de 1 semana caducan automáticamente para mantener agendas actualizadas y el interesado deberá solicitar una nueva cita.<br />
                    • <strong>Protección contra empalmes:</strong> Los horarios ya apartados se bloquean automáticamente. Como arrendador puedes marcar tu casa como <em>«En Cita»</em> o <em>«Ocupada»</em> para evitar citas duplicadas.
                  </p>
                </div>
              </div>

              {/* Subtabs Filter */}
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border-light pt-4">
                <button
                  type="button"
                  onClick={() => setVisitSubTab('todas')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                    visitSubTab === 'todas'
                      ? 'bg-forest text-white shadow-xs'
                      : 'bg-crema/60 text-cafe hover:bg-forest/10'
                  }`}
                >
                  Todas las citas ({relevantVisits.length})
                </button>
                {(isOwner || receivedVisits.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setVisitSubTab('recibidas')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                      visitSubTab === 'recibidas'
                        ? 'bg-forest text-white shadow-xs'
                        : 'bg-crema/60 text-cafe hover:bg-forest/10'
                    }`}
                  >
                    📥 Citas Recibidas en mis Inmuebles ({receivedVisits.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setVisitSubTab('solicitadas')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                    visitSubTab === 'solicitadas'
                      ? 'bg-forest text-white shadow-xs'
                      : 'bg-crema/60 text-cafe hover:bg-forest/10'
                  }`}
                >
                  📤 Mis Solicitudes como Inquilino ({requestedVisits.length})
                </button>
              </div>
            </div>

            {/* List of Visits */}
            {displayedVisits.length === 0 ? (
              <div className="rounded-3xl border border-border bg-white p-8 py-16 text-center shadow-card">
                <Calendar size={48} className="text-text-muted/30 mx-auto mb-3" />
                <h3 className="font-extrabold text-cafe text-lg mb-1">
                  {visitSubTab === 'recibidas'
                    ? 'No has recibido solicitudes de cita en tus propiedades'
                    : visitSubTab === 'solicitadas'
                    ? 'No tienes solicitudes de visita enviadas'
                    : 'No tienes citas agendadas'}
                </h3>
                <p className="text-xs text-text-muted mb-5 max-w-sm mx-auto">
                  {visitSubTab === 'recibidas'
                    ? 'Cuando las personas vean tus anuncios de vivienda en RuwaJay, podrán solicitar citas para conocerlas en persona.'
                    : 'Explora casas o apartamentos disponibles y agenda una cita presencial en el horario que mejor te convenga.'}
                </p>
                <Link
                  to="/explorar"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-forest-light"
                >
                  Explorar catálogo de viviendas
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedVisits.map((v) => {
                  const isPending = v.status === 'pendiente';
                  const isAccepted = v.status === 'confirmada';
                  const isRejected = v.status === 'rechazada';
                  const isCancelled = v.status === 'cancelada';
                  const isExpired = v.status === 'vencida';

                  // Expiration calculations
                  const rawCreatedAt = v.createdAtIso || v.createdAt;
                  const createdTime = rawCreatedAt?.toDate
                    ? rawCreatedAt.toDate().getTime()
                    : new Date(rawCreatedAt || Date.now()).getTime();
                  const daysPassed = (Date.now() - createdTime) / (1000 * 60 * 60 * 24);
                  const daysLeft = Math.max(0, Math.ceil(7 - daysPassed));

                  // Determine if current user is owner of the visited property
                  const isOwnerOfThisVisit =
                    (currentUserId && v.ownerId === currentUserId) ||
                    (currentUserPhone && v.ownerPhone && String(v.ownerPhone).replace(/\D/g, '') === currentUserPhone) ||
                    (currentUserEmail && v.ownerEmail && String(v.ownerEmail).trim().toLowerCase() === currentUserEmail) ||
                    (currentUserName && v.ownerName && String(v.ownerName).trim().toLowerCase() === currentUserName) ||
                    (v.propertyId && myPropertySet.has(v.propertyId));

                  const visitProperty = myProperties.find((property) => property.id === v.propertyId)
                    || demoProperties.find((property) => property.id === v.propertyId);
                  const visitImage = visitProperty?.thumbnail
                    || visitProperty?.thumbnails?.[0]
                    || (Array.isArray(visitProperty?.images) ? visitProperty.images[0] : null)
                    || v.propertyImage
                    || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80';

                  // Determine target phone for WhatsApp
                  const targetPhone = isOwnerOfThisVisit ? (v.tenantPhone || '50255551234') : (v.ownerPhone || '50255551234');
                  const cleanPhone = String(targetPhone).replace(/\D/g, '');
                  const waGreeting = isOwnerOfThisVisit
                    ? `¡Hola ${v.tenantName || 'inquilino'}! Te escribo respecto a tu solicitud de visita a "${v.propertyTitle}" en RuwaJay para el día ${v.date} a las ${v.time}. ¿Coordinamos los detalles?`
                    : `¡Hola ${v.ownerName || 'propietario'}! Te escribo por la visita a "${v.propertyTitle}" agendada en RuwaJay para el día ${v.date} a las ${v.time}. ¿Podemos coordinar la hora exacta?`;
                  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waGreeting)}`;

                  return (
                    <div
                      key={v.id}
                      className={`rounded-3xl border bg-white p-4 sm:p-6 shadow-card transition-all flex flex-col md:flex-row gap-5 ${
                        isExpired
                          ? 'border-red-200/80 bg-red-50/20'
                          : isAccepted
                          ? 'border-emerald-200/80'
                          : 'border-border-light hover:border-forest/20'
                      }`}
                    >
                      {/* Property Thumbnail */}
                      <div className="relative w-full md:w-52 h-40 md:h-auto rounded-2xl overflow-hidden bg-stone-100 flex-shrink-0">
                        <img
                          src={visitImage}
                          alt={v.propertyTitle}
                          className="w-full h-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80';
                          }}
                        />
                        <div className="absolute top-2 left-2 rounded-lg bg-black/70 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur-xs">
                          Q{Number(v.propertyPrice || 0).toLocaleString()}/mes
                        </div>
                        {isOwnerOfThisVisit ? (
                          <div className="absolute bottom-2 left-2 rounded-md bg-forest/90 px-2 py-0.5 text-[10px] font-extrabold text-white">
                            Tu vivienda
                          </div>
                        ) : (
                          <div className="absolute bottom-2 left-2 rounded-md bg-cafe/80 px-2 py-0.5 text-[10px] font-extrabold text-white">
                            Tu solicitud
                          </div>
                        )}
                      </div>

                      {/* Content Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <h3 className="text-base font-black text-cafe hover:text-forest transition-colors">
                              <Link to={`/propiedad/${v.propertyId}`}>{v.propertyTitle}</Link>
                            </h3>

                            {/* Status Badges */}
                            {isPending && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                                  <Clock size={13} /> Pendiente de confirmación
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
                                  ⏳ Expira en {daysLeft === 1 ? '1 día' : `${daysLeft} días`}
                                </span>
                              </div>
                            )}
                            {isAccepted && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                                <CheckCircle2 size={13} /> Visita Confirmada
                              </span>
                            )}
                            {isExpired && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
                                <AlertTriangle size={13} /> Cita Vencida (7 días)
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-700">
                                <X size={13} /> {isOwnerOfThisVisit ? 'Cita rechazada' : 'El propietario negó la cita'}
                              </span>
                            )}
                            {isCancelled && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-600">
                                <X size={13} /> Cancelada
                              </span>
                            )}
                          </div>

                          {/* Date and Location */}
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-semibold text-text-secondary mb-3">
                            <span className="flex items-center gap-1">
                              <MapPin size={14} className="text-terracota" /> {v.propertyZone || 'Guatemala'}
                            </span>
                            <span className="flex items-center gap-1 text-forest font-bold">
                              <Calendar size={14} /> {v.date}
                            </span>
                            <span className="flex items-center gap-1 text-cafe font-bold">
                              <Clock size={14} /> {v.time} hrs
                            </span>
                          </div>

                          {/* Notes */}
                          {v.notes && (
                            <p className="rounded-xl bg-[#FAF5EE] p-2.5 text-xs text-text-secondary italic mb-3">
                              "{v.notes}"
                            </p>
                          )}

                          {/* Expired Callout */}
                          {isExpired && (
                            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 flex items-start gap-2">
                              <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-extrabold text-red-900">Esta cita expiró automáticamente tras 1 semana sin confirmación.</p>
                                <p className="text-[11px] text-red-700 mt-0.5">
                                  Para no mantener bloqueada la agenda, esta cita ya no es válida. Puedes solicitar una nueva cita en la ficha de la vivienda.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Contact details */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                            <span className="font-bold">{isOwnerOfThisVisit ? 'Solicitante interesado:' : 'Propietario / Anfitrión:'}</span>
                            <span className="text-cafe font-extrabold">{isOwnerOfThisVisit ? v.tenantName : v.ownerName}</span>
                            <span>•</span>
                            <span>{isOwnerOfThisVisit ? (v.tenantPhone || 'Sin teléfono') : v.ownerPhone}</span>
                          </div>

                          {/* Owner Live Property Control Toolbar for this visit */}
                          {isOwnerOfThisVisit && (isAccepted || isPending) && (
                            <div className="mt-3 rounded-2xl bg-[#FAF7F2] border border-[#E9E1D6] p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-extrabold text-cafe flex items-center gap-1.5">
                                  <Building2 size={13} className="text-forest" /> Estado de la vivienda para esta cita:
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSetPropertyStatus(v.propertyId, 'en_cita')}
                                    className="rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 px-2.5 py-1 text-[11px] font-bold transition-colors"
                                    title="Indica que la propiedad está siendo visitada ahora"
                                  >
                                    🟠 Marcar En Cita
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetPropertyStatus(v.propertyId, 'alquilada')}
                                    className="rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 px-2.5 py-1 text-[11px] font-bold transition-colors"
                                    title="Indica que ya se alquiló para deshabilitar solicitudes"
                                  >
                                    🟣 Marcar Ocupada
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetPropertyStatus(v.propertyId, 'disponible')}
                                    className="rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-2.5 py-1 text-[11px] font-bold transition-colors"
                                    title="Restablece la vivienda a disponible para más visitas"
                                  >
                                    🟢 Disponible
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 pt-4 border-t border-border-light flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {/* WhatsApp Direct */}
                            {!isExpired && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white px-3.5 py-2 text-xs font-extrabold shadow-sm transition-all"
                              >
                                <WhatsAppIcon size={15} /> Contactar por WhatsApp
                              </a>
                            )}

                            {/* Chat button: only available on confirmed visits */}
                            {isAccepted && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenVisitChat(v)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-forest hover:bg-forest-dark text-white px-3.5 py-2 text-xs font-extrabold shadow-sm transition-all"
                                >
                                  <MessageCircle size={15} /> 💬 Abrir Chat en Tiempo Real
                                </button>
                                <Link
                                  to={`/ruta?property=${v.propertyId}`}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-forest hover:bg-forest-dark text-white px-3.5 py-2 text-xs font-black shadow-sm transition-all"
                                >
                                  <Navigation size={14} /> Trazar Ruta RuwaJay
                                </Link>
                              </>
                            )}

                            <Link
                              to={`/propiedad/${v.propertyId}`}
                              className="inline-flex items-center gap-1 rounded-xl bg-crema text-cafe hover:bg-forest/10 px-3 py-2 text-xs font-bold transition-colors"
                            >
                              Ver ficha
                            </Link>

                            {/* Re-request button for expired or rejected visits */}
                            {(isExpired || isRejected) && (
                              <Link
                                to={`/propiedad/${v.propertyId}`}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-forest hover:bg-forest-dark text-white px-3.5 py-2 text-xs font-extrabold shadow-sm transition-all"
                              >
                                <RotateCcw size={14} /> Pedir de nuevo una cita
                              </Link>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Owner Acceptance Actions */}
                            {isOwnerOfThisVisit && isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateVisitStatus(v.id, 'confirmada')}
                                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 text-white px-3 py-2 text-xs font-black hover:bg-emerald-700 shadow-xs transition-colors"
                                >
                                  <Check size={14} /> Confirmar cita
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateVisitStatus(v.id, 'rechazada')}
                                  className="inline-flex items-center gap-1 rounded-xl bg-stone-100 text-stone-600 hover:bg-red-50 hover:text-red-600 px-2.5 py-2 text-xs font-bold transition-colors"
                                >
                                  Negar cita
                                </button>
                              </>
                            )}

                            {!isCancelled && !isRejected && !isExpired && (
                              <button
                                type="button"
                                onClick={() => handleUpdateVisitStatus(v.id, 'cancelada')}
                                className="text-xs font-bold text-text-muted hover:text-terracota transition-colors px-2 py-1"
                              >
                                Cancelar visita
                              </button>
                            )}

                            {(isCancelled || isRejected || isExpired) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteVisit(v.id)}
                                title="Eliminar del historial"
                                className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Mis Propiedades (Arrendador) ── */}
        {activeTab === 'propiedades' && isOwner && (
          <div className="space-y-5">
            {/* Quick stats */}
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Total publicadas', value: myProperties.length, icon: Building2, color: 'text-forest bg-forest/10' },
                { label: 'Disponibles', value: myProperties.filter((p) => p.status === 'disponible').length, icon: Home, color: 'text-jade bg-jade/10' },
                { label: 'En Cita / Visita', value: myProperties.filter((p) => p.status === 'en_cita').length, icon: Clock3, color: 'text-amber-600 bg-amber-500/10' },
                { label: 'Ocupadas / Alquiladas', value: myProperties.filter((p) => p.status === 'alquilada' || p.status === 'ocupada').length, icon: Check, color: 'text-dorado bg-dorado/10' },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl border border-border bg-white p-4 shadow-card">
                    <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                      <Icon size={20} />
                    </div>
                    <p className="text-2xl font-extrabold text-cafe">{stat.value}</p>
                    <p className="text-[11px] font-bold text-text-muted">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Properties list */}
            {myProperties.length > 0 ? (
              <div className="space-y-3">
                {myProperties.map((property) => (
                  <SectionCard key={property.id}>
                    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center">
                      {/* Property image */}
                      <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-2xl bg-crema sm:h-48 lg:h-24 lg:w-36">
                        {property.images?.[0] ? (
                          <img src={property.images[0]} alt={property.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-text-muted">
                            <Home size={28} />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-black text-white backdrop-blur-xs">
                          Q{Number(property.price || 0).toLocaleString()}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <h4 className="break-words text-sm font-extrabold text-cafe">{property.title}</h4>
                        <p className="mt-0.5 break-words text-xs text-text-muted">{property.zone || property.municipality || 'Guatemala'}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-forest">Q{Number(property.price || 0).toLocaleString()}/mes</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            property.status === 'disponible'
                              ? 'bg-emerald-100 text-emerald-800'
                              : property.status === 'en_cita'
                              ? 'bg-amber-100 text-amber-800'
                              : property.status === 'alquilada' || property.status === 'ocupada'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}>
                            {property.status === 'disponible' && '● Disponible'}
                            {property.status === 'en_cita' && '● En Cita / Visita activa'}
                            {(property.status === 'alquilada' || property.status === 'ocupada') && '● Ocupada / Alquilada'}
                            {property.status === 'pausada' && '● Pausada'}
                          </span>
                        </div>
                      </div>
                      {/* Actions: Live status selector and Link */}
                      <div className="grid w-full min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 xl:flex xl:w-auto xl:flex-wrap xl:items-center">
                        <div className="flex min-w-0 items-center gap-1 rounded-xl border border-border-light bg-[#FAF7F2] p-1 min-[430px]:col-span-2 xl:col-span-1">
                          <label className="text-[10px] font-bold text-text-muted px-1 hidden sm:inline">Estado:</label>
                          <select
                            value={property.status || 'disponible'}
                            onChange={(e) => handleSetPropertyStatus(property.id, e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border-0 bg-white px-2.5 py-2 text-xs font-black text-cafe shadow-xs focus:ring-2 focus:ring-forest cursor-pointer"
                          >
                            <option value="disponible">🟢 Disponible</option>
                            <option value="en_cita">🟠 En Cita</option>
                            <option value="alquilada">🟣 Ocupada / Alquilada</option>
                            <option value="pausada">⚪ Pausada</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingProperty(property)}
                          className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-dorado/15 px-3 py-2 text-center text-xs font-black text-[#976008] shadow-2xs transition-colors hover:bg-dorado/25"
                        >
                          <Edit3 size={13} /> Editar vivienda
                        </button>
                        <Link
                          to={`/propiedad/${property.id}`}
                          className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-xl bg-forest/10 px-3 py-2 text-center text-xs font-bold text-forest transition-colors hover:bg-forest/20"
                        >
                          <Eye size={13} /> Ver ficha
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteOwnedProperty(property)}
                          className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-black text-red-600 transition-colors hover:bg-red-100 min-[430px]:col-span-2 xl:col-span-1"
                          title="Eliminar permanentemente mi vivienda"
                        >
                          <Trash2 size={13} /> Eliminar vivienda
                        </button>
                      </div>
                    </div>
                  </SectionCard>
                ))}
              </div>
            ) : (
              <SectionCard>
                <div className="py-10 text-center">
                  <Building2 size={48} className="mx-auto mb-3 text-text-muted/30" />
                  <h3 className="text-lg font-extrabold text-cafe mb-1">No tienes propiedades publicadas</h3>
                  <p className="text-xs text-text-muted mb-5">Publica tu primera vivienda y encuentra inquilinos confiables.</p>
                  <Link
                    to="/publicar"
                    className="inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-forest to-forest-dark px-6 py-3 text-sm font-black text-white shadow-lg transition-transform hover:-translate-y-0.5"
                  >
                    <PlusCircle size={18} /> Publicar mi propiedad
                  </Link>
                </div>
              </SectionCard>
            )}

            {/* Quick publish CTA */}
            {myProperties.length > 0 && (
              <div className="text-center">
                <Link
                  to="/publicar"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-forest/10 px-6 py-3 text-sm font-bold text-forest transition-all hover:bg-forest/20"
                >
                  <PlusCircle size={18} /> Publicar otra propiedad
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Panel de Administración ── */}
        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6">
            {/* Feedback alert message */}
            {adminNotice && (
              <div className="flex items-center justify-between rounded-2xl bg-forest/10 border border-forest/30 p-4 text-forest font-bold text-sm">
                <span>{adminNotice}</span>
                <button onClick={() => setAdminNotice('')} className="text-forest hover:opacity-75">
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Banner Maestro */}
            <div className="rounded-3xl border border-forest/20 bg-gradient-to-r from-forest via-[#1E3A2F] to-[#152B23] p-6 text-white shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/20 text-gold text-lg">🛡️</span>
                    <h2 className="text-xl font-extrabold tracking-tight">Panel Maestro de Administración RuwaJay</h2>
                  </div>
                  <p className="text-xs text-white/80 max-w-xl">
                    Administra usuarios, emite comunicados y novedades en tiempo real a la web y a la app móvil, y modera el catálogo de propiedades de Guatemala.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gold">Tu Rol</p>
                  <p className="text-sm font-extrabold text-white">Super Administrador</p>
                </div>
              </div>
            </div>

            {/* Métricas Generales */}
            <SectionCard>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Usuarios Registrados', value: allUsers.length, icon: Users, color: 'text-forest bg-forest/10' },
                  { label: 'Propiedades Totales', value: allProperties.length, icon: Building2, color: 'text-terracota bg-terracota/10' },
                  { label: 'Propietarios Activos', value: allUsers.filter((u) => u.role === 'owner').length, icon: Home, color: 'text-dorado bg-dorado/10' },
                  { label: 'Comunicados Activos', value: systemUpdates.filter((u) => u.active !== false).length, icon: Megaphone, color: 'text-jade bg-jade/10' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-border bg-white p-4 text-center">
                    <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                      <stat.icon size={20} />
                    </div>
                    <p className="text-2xl font-black text-cafe">{stat.value}</p>
                    <p className="text-[11px] font-bold text-text-muted">{stat.label}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* ── SECCIÓN: Publicar y Gestionar Actualizaciones del Sistema ── */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest/10 text-forest">
                    <Megaphone size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-cafe">Comunicados y Actualizaciones del Sistema</h3>
                    <p className="text-xs text-text-muted">Publica avisos globales que aparecerán en la web y en la app móvil</p>
                  </div>
                </div>
                <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-black text-forest">
                  {systemUpdates.length} publicados
                </span>
              </div>

              {/* Formulario de nueva actualización */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newUpdateTitle.trim() || !newUpdateContent.trim()) {
                    setAdminNotice('Por favor escribe un título y contenido para el comunicado.');
                    return;
                  }
                  setIsPostingUpdate(true);
                  try {
                    await createSystemUpdate({
                      title: newUpdateTitle,
                      content: newUpdateContent,
                      category: newUpdateCategory,
                      priority: newUpdatePriority,
                      active: true,
                      createdBy: user?.name || 'Administrador RuwaJay',
                    });
                    setNewUpdateTitle('');
                    setNewUpdateContent('');
                    setAdminNotice('¡Comunicado publicado con éxito! Ahora es visible en Web y Móvil.');
                  } catch (err) {
                    setAdminNotice(err.message || 'Error al publicar comunicado.');
                  } finally {
                    setIsPostingUpdate(false);
                  }
                }}
                className="mb-6 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] p-4 sm:p-5 space-y-4"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-cafe uppercase tracking-wider">
                  <Sparkles size={14} className="text-dorado" /> Nuevo Comunicado para toda la comunidad
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1">Título del comunicado</label>
                    <input
                      type="text"
                      placeholder="Ej: Mantenimiento programado / Nueva función..."
                      value={newUpdateTitle}
                      onChange={(e) => setNewUpdateTitle(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-cafe outline-none focus:border-forest"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">Categoría</label>
                      <select
                        value={newUpdateCategory}
                        onChange={(e) => setNewUpdateCategory(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-cafe outline-none cursor-pointer"
                      >
                        <option value="novedad">🚀 Novedad</option>
                        <option value="mantenimiento">🛠️ Mantenimiento</option>
                        <option value="alerta">⚠️ Alerta</option>
                        <option value="mejora">✨ Mejora</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">Prioridad</label>
                      <select
                        value={newUpdatePriority}
                        onChange={(e) => setNewUpdatePriority(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-cafe outline-none cursor-pointer"
                      >
                        <option value="normal">🟢 Normal</option>
                        <option value="destacada">🌟 Destacada</option>
                        <option value="urgente">🚨 Urgente</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Contenido del comunicado</label>
                  <textarea
                    rows={3}
                    placeholder="Escribe el mensaje detallado que verán todos los usuarios..."
                    value={newUpdateContent}
                    onChange={(e) => setNewUpdateContent(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white p-3 text-sm text-cafe outline-none focus:border-forest"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isPostingUpdate}
                    className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-forest/90 transition-all disabled:opacity-50"
                  >
                    <Send size={14} />
                    {isPostingUpdate ? 'Publicando...' : 'Publicar Comunicado'}
                  </button>
                </div>
              </form>

              {/* Lista de comunicados emitidos */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
                  Historial de Actualizaciones Emitidas
                </h4>
                {systemUpdates.length === 0 ? (
                  <p className="text-center text-sm text-text-muted py-6">No hay comunicados publicados aún.</p>
                ) : (
                  <div className="max-h-[360px] overflow-y-auto space-y-2.5 pr-1">
                    {systemUpdates.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 transition-all ${
                          item.active !== false
                            ? 'border-border bg-white shadow-sm'
                            : 'border-dashed border-gray-200 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                item.category === 'alerta'
                                  ? 'bg-red-100 text-red-700'
                                  : item.category === 'mantenimiento'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.category === 'mejora'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-forest/10 text-forest'
                              }`}
                            >
                              {item.category || 'novedad'}
                            </span>
                            {item.priority === 'urgente' && (
                              <span className="rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                                Urgente
                              </span>
                            )}
                            <h4 className="text-sm font-extrabold text-cafe">{item.title}</h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                const nextState = item.active === false;
                                try {
                                  await updateSystemUpdate(item.id, { active: nextState });
                                  setAdminNotice(`Comunicado marcado como ${nextState ? 'Activo' : 'Inactivo'}.`);
                                } catch (err) {
                                  setAdminNotice(err.message);
                                }
                              }}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                item.active !== false
                                  ? 'bg-jade/10 text-jade hover:bg-jade/20'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {item.active !== false ? '● Activo' : '○ Oculto'}
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm('¿Deseas eliminar este comunicado?')) {
                                  try {
                                    await deleteSystemUpdate(item.id);
                                    setAdminNotice('Comunicado eliminado.');
                                  } catch (err) {
                                    setAdminNotice(err.message);
                                  }
                                }
                              }}
                              className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100 transition-colors"
                              title="Eliminar comunicado"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-text-secondary leading-relaxed mb-2">{item.content}</p>

                        <div className="flex items-center justify-between text-[11px] text-text-muted">
                          <span>Por: <strong>{item.createdBy || 'Administrador'}</strong></span>
                          <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Gestión de Usuarios */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest/10 text-forest">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-cafe">Gestión de Usuarios</h3>
                    <p className="text-xs text-text-muted">Asigna roles de Administrador, Propietario o Inquilino y modera accesos</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-text-muted">{allUsers.length} registrados</span>
              </div>
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-2.5">
                <Mail size={16} className="text-text-muted" />
                <input
                  type="text"
                  placeholder="Buscar usuario por nombre o correo..."
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-cafe outline-none"
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {allUsers
                  .filter((u) => {
                    if (!adminSearchQuery) return true;
                    const q = adminSearchQuery.toLowerCase();
                    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                  })
                  .map((u) => (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-border bg-crema/30 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-cafe truncate">{u.name || 'Sin nombre'}</p>
                          {u.role === 'admin' && (
                            <span className="rounded-md bg-forest text-white px-1.5 py-0.5 text-[9px] font-black uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={u.role || 'seeker'}
                          onChange={async (e) => {
                            try {
                              await updateUserRole(u.id, e.target.value);
                              setAdminNotice(`Rol de ${u.email} actualizado a ${e.target.value}.`);
                            } catch (err) {
                              window.alert(err.message);
                            }
                          }}
                          className="rounded-lg border border-border bg-white px-2 py-1 text-xs font-bold text-cafe outline-none cursor-pointer"
                        >
                          <option value="seeker">👤 Inquilino</option>
                          <option value="owner">🏡 Propietario</option>
                          <option value="admin">🛡️ Administrador</option>
                        </select>
                        <button
                          onClick={async () => {
                            const newStatus = (u.accountStatus || 'active') === 'active' ? 'suspended' : 'active';
                            try {
                              await updateUserStatus(u.id, newStatus);
                              setAdminNotice(`Estado de cuenta actualizado a ${newStatus}.`);
                            } catch (err) {
                              window.alert(err.message);
                            }
                          }}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                            (u.accountStatus || 'active') === 'active'
                              ? 'bg-jade/10 text-jade hover:bg-jade/20'
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          {(u.accountStatus || 'active') === 'active' ? '● Activo' : '● Suspendido'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </SectionCard>

            {/* Moderación de Propiedades */}
            <SectionCard>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-terracota/10 text-terracota">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-cafe">Moderación de Propiedades</h3>
                  <p className="text-xs text-text-muted">Supervisa y actualiza el estado de los inmuebles publicados en toda Guatemala</p>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {allProperties.length === 0 ? (
                  <p className="text-center text-sm text-text-muted py-8">No hay propiedades publicadas aún.</p>
                ) : allProperties.map((prop) => (
                  <div key={prop.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-border bg-crema/30 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-cafe truncate">{prop.title || 'Propiedad'}</p>
                      <p className="text-xs text-text-muted truncate">
                        {prop.address?.approximate || prop.address?.zone || 'Guatemala'} • Q {prop.price}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={prop.status || 'disponible'}
                        onChange={async (e) => {
                          try {
                            await updatePropertyStatus(prop.id, e.target.value);
                            setAdminNotice(`Estado del inmueble cambiado a ${e.target.value}.`);
                          } catch (err) {
                            window.alert(err.message);
                          }
                        }}
                        className="rounded-lg border border-border bg-white px-2 py-1 text-xs font-bold text-cafe outline-none cursor-pointer"
                      >
                        <option value="disponible">Disponible</option>
                        <option value="alquilada">Alquilada</option>
                        <option value="pausada">Pausada</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── Configuración / Ajustes ── */}
        {activeTab === 'configuracion' && (
          <div className="space-y-5">

            {/* Account Information */}
            <SectionCard>
              <div className="flex items-center justify-between mb-5">
                <h3 className="flex items-center gap-2 text-base font-extrabold text-cafe">
                  <User size={20} className="text-forest" /> Información de la cuenta
                </h3>
                <button
                  onClick={() => setEditingProfile(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-forest/10 px-3 py-1.5 text-[11px] font-bold text-forest transition-all hover:bg-forest/20"
                >
                  <Edit3 size={13} /> Editar
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { icon: User, label: 'Nombre', value: user?.name || 'Sin nombre', iconBg: 'bg-forest/10' },
                  { icon: Mail, label: 'Correo electrónico', value: user?.email || 'Sin correo', iconBg: 'bg-forest/10' },
                  { icon: Phone, label: 'Teléfono', value: user?.phone || 'No registrado', iconBg: 'bg-forest/10' },
                  { icon: ShieldCheck, label: 'Tipo de cuenta', value: user?.role === 'owner' ? 'Propietario / Casero' : 'Inquilino / Buscador', iconBg: 'bg-dorado/10', iconColor: 'text-dorado' },
                  { icon: FileText, label: 'Biografía', value: user?.bio || 'Sin biografía — edita tu perfil para agregar una', iconBg: 'bg-forest/10' },
                ].map(({ icon: Icon, label, value, iconBg, iconColor }) => (
                  <div key={label} className="flex items-center gap-4 rounded-2xl border border-[#E8D9C8]/60 bg-[#FDFBF7] p-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                      <Icon size={18} className={iconColor || 'text-forest'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
                      <p className="text-sm font-bold text-cafe truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Security — Change Password */}
            <SectionCard>
              <h3 className="flex items-center gap-2 text-base font-extrabold text-cafe mb-5">
                <Lock size={20} className="text-forest" /> Seguridad
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-[#E8D9C8]/60 bg-[#FDFBF7] p-4">
                  <div className="flex items-center gap-3">
                    <Lock size={18} className="text-text-muted" />
                    <div>
                      <p className="text-sm font-bold text-cafe">Contraseña</p>
                      <p className="text-[11px] text-text-muted">Última actualización: reciente</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowPasswordForm(!showPasswordForm); setPwMessage(''); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
                    className="flex items-center gap-1.5 rounded-xl bg-crema px-4 py-2 text-xs font-bold text-cafe transition-colors hover:bg-[#E8D9C8]"
                  >
                    {showPasswordForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showPasswordForm ? 'Cerrar' : 'Cambiar'}
                  </button>
                </div>

                {/* Password change form */}
                {showPasswordForm && (
                  <form onSubmit={handleChangePassword} className="rounded-2xl border border-forest/20 bg-forest/5 p-5 space-y-4" style={{ animation: 'slide-up 0.3s ease-out' }}>
                    {pwMessage && (
                      <div className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${pwError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-jade/15 text-forest border border-jade/30'}`}>
                        {pwError ? <AlertTriangle size={14} /> : <Check size={14} />}
                        {pwMessage}
                      </div>
                    )}

                    {/* Current password */}
                    <div>
                      <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">Contraseña actual</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-white px-4 py-3 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
                        <Lock size={16} className="text-forest/70" />
                        <input
                          type={showCurrentPw ? 'text' : 'password'}
                          value={currentPw}
                          onChange={(e) => setCurrentPw(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-cafe outline-none"
                        />
                        <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="text-text-muted hover:text-cafe">
                          {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* New password */}
                    <div>
                      <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">Nueva contraseña</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-white px-4 py-3 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
                        <Lock size={16} className="text-forest/70" />
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-cafe outline-none"
                        />
                        <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="text-text-muted hover:text-cafe">
                          {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {/* Strength meter */}
                      {newPw && (
                        <div className="mt-2.5" aria-live="polite">
                          <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
                            <span className="text-text-muted">Seguridad</span>
                            <span className={pwStrength.color}>{pwStrength.text}</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[#E8D9C8]/60">
                            <div className={`h-full rounded-full transition-all duration-300 ${pwStrength.width} ${pwStrength.bg}`} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">Confirmar nueva contraseña</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-white px-4 py-3 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
                        <Lock size={16} className="text-forest/70" />
                        <input
                          type="password"
                          value={confirmPw}
                          onChange={(e) => setConfirmPw(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-cafe outline-none"
                        />
                      </div>
                      {confirmPw && newPw && (
                        <p className={`mt-1.5 text-[11px] font-bold ${confirmPw === newPw ? 'text-forest' : 'text-red-600'}`}>
                          {confirmPw === newPw ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={pwBusy}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-forest to-forest-dark px-4 py-3 text-sm font-black text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      {pwBusy ? 'Procesando...' : 'Actualizar contraseña'}
                    </button>
                  </form>
                )}
              </div>
            </SectionCard>

            {/* Identity Verification */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-base font-extrabold text-cafe">
                  <BadgeCheck size={20} className="text-dorado" /> Verificación oficial de identidad
                </h3>
                {isVerified && (
                  <button
                    type="button"
                    onClick={() => setShowDpiModal(true)}
                    className="text-xs font-bold text-forest hover:underline"
                  >
                    Actualizar datos
                  </button>
                )}
              </div>

              {isVerified ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-dorado/30 bg-gradient-to-br from-dorado/10 via-[#FAF5EE] to-dorado/5 p-5 shadow-xs">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-dorado/20 text-dorado shadow-xs">
                      <BadgeCheck size={32} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-cafe">¡Identidad validada con DPI de Guatemala!</p>
                        <span className="rounded-full bg-dorado/20 px-2.5 py-0.5 text-[10px] font-black text-dorado">
                          Certificado Activo
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        Tus datos oficiales y contacto de referencia han sido registrados para generar la máxima confianza con inquilinos y propietarios.
                      </p>

                      {/* Details summary */}
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div className="rounded-xl bg-white/80 p-2.5 border border-dorado/20 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-text-muted block">CUI / DPI Registrado</span>
                            <span className="font-extrabold text-cafe tracking-wider font-mono">
                              {unmaskCui ? formatDpiCui(user?.dpiData?.cui) : maskDpiCui(user?.dpiData?.cui || '2450123450101')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUnmaskCui(!unmaskCui)}
                            className="p-1 text-text-muted hover:text-cafe transition-colors"
                            title={unmaskCui ? 'Ocultar CUI' : 'Mostrar CUI completo'}
                          >
                            {unmaskCui ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <div className="rounded-xl bg-white/80 p-2.5 border border-dorado/20">
                          <span className="text-[10px] font-extrabold uppercase text-text-muted block">Lugar de Emisión</span>
                          <span className="font-extrabold text-cafe truncate block">
                            {user?.dpiData?.municipality || 'Guatemala'}, {user?.dpiData?.department || 'Guatemala'}
                          </span>
                        </div>
                        {user?.dpiData?.emergencyName && (
                          <div className="rounded-xl bg-white/80 p-2.5 border border-dorado/20 sm:col-span-2">
                            <span className="text-[10px] font-extrabold uppercase text-text-muted block">Contacto de Respaldo Validado</span>
                            <span className="font-bold text-cafe">
                              {user.dpiData.emergencyName} ({user.dpiData.emergencyRelation || 'Referencia'}) · Tel: {user.dpiData.emergencyPhone}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDpiDetailsModal(true)}
                          className="flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-black text-white hover:bg-forest-dark transition-colors shadow-xs"
                        >
                          <FileCheck size={14} /> Ver credencial oficial de identidad
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDpiModal(true)}
                          className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-cafe hover:bg-crema transition-colors"
                        >
                          <Edit3 size={13} /> Modificar datos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('¿Estás seguro de purgar y eliminar tus datos de verificación de DPI de este dispositivo?')) {
                              purgeDpiData();
                              setDpiPurgedNotice(true);
                              setTimeout(() => setDpiPurgedNotice(false), 4000);
                            }
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
                          title="Eliminar datos de DPI del dispositivo"
                        >
                          <Trash2 size={13} /> Purgar datos de DPI
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-4 rounded-2xl border border-[#E8D9C8]/60 bg-[#FDFBF7] p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dorado/10">
                      <ShieldCheck size={26} className="text-dorado" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-cafe">Valida tu identidad con DPI oficial</p>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        Ingresa tus datos personales oficiales de DPI para obtener la insignia dorada de <strong>"Verificado con DPI"</strong>.
                        Los perfiles verificados reciben hasta <strong>3x más solicitudes y confianza</strong> en RuwaJay.
                      </p>
                      <ul className="mt-3 space-y-1.5 text-[11px] font-semibold text-text-muted">
                        <li className="flex items-center gap-1.5"><Check size={13} className="text-forest" /> Registro de CUI oficial de 13 dígitos y lugar de emisión</li>
                        <li className="flex items-center gap-1.5"><Check size={13} className="text-forest" /> Contacto de referencia familiar o laboral para respaldo</li>
                        <li className="flex items-center gap-1.5"><Check size={13} className="text-forest" /> Subida opcional de fotografía del documento</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDpiModal(true)}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-dorado to-[#C5850F] px-4 py-3 text-sm font-black text-white shadow-lg transition-transform hover:-translate-y-0.5 active:scale-98 cursor-pointer"
                  >
                    <Sparkles size={18} /> Iniciar verificación oficial con DPI
                  </button>
                </div>
              )}
            </SectionCard>

            {/* Security Shield & Active Protections Card */}
            <SectionCard>
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-base font-extrabold text-cafe">
                  <ShieldCheck size={20} className="text-forest" /> Blindaje y Ciberseguridad Activa
                </h3>
                <span className="flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-0.5 text-[11px] font-black text-forest border border-forest/20">
                  <span className="w-2 h-2 rounded-full bg-forest animate-pulse" /> Sistema Protegido
                </span>
              </div>
              <p className="text-xs text-text-muted mb-4 leading-relaxed">
                Tu cuenta y tus datos en RuwaJay están resguardados por protocolos de seguridad multicapa para prevenir accesos no autorizados e inyecciones maliciosas:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-border bg-[#FDFBF7] p-3.5 space-y-1">
                  <div className="flex items-center gap-2 font-black text-cafe">
                    <Lock size={15} className="text-forest" /> Cifrado PBKDF2 SHA-256
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Contraseñas procesadas con 310,000 iteraciones criptográficas y sal única de 16 bytes.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-[#FDFBF7] p-3.5 space-y-1">
                  <div className="flex items-center gap-2 font-black text-cafe">
                    <Shield size={15} className="text-forest" /> Rate Limiting Anti-Fuerza Bruta
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Bloqueo temporal automático tras 5 intentos fallidos para mitigar ataques de diccionario.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-[#FDFBF7] p-3.5 space-y-1">
                  <div className="flex items-center gap-2 font-black text-cafe">
                    <CheckCircle2 size={15} className="text-forest" /> Sanitización XSS Estricta
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Filtro automático que neutraliza scripts, iframes y vectores de inyección en tiempo real.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-[#FDFBF7] p-3.5 space-y-1">
                  <div className="flex items-center gap-2 font-black text-cafe">
                    <FileCheck size={15} className="text-forest" /> Cabeceras HTTP Anti-Clickjacking
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Protección X-Frame-Options SAMEORIGIN y X-Content-Type-Options nosniff activadas.
                  </p>
                </div>
              </div>
            </SectionCard>

            {dpiPurgedNotice && (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-800" style={{ animation: 'slide-up 0.3s ease-out' }}>
                <Check size={16} /> Datos de DPI purgados y eliminados exitosamente del almacenamiento.
              </div>
            )}

            {/* Danger Zone */}
            <SectionCard danger>
              <h3 className="flex items-center gap-2 text-base font-extrabold text-[#E00B41] mb-4">
                <LogOut size={20} /> Sesión
              </h3>
              <p className="text-xs text-text-muted mb-4">Al cerrar sesión deberás ingresar tus credenciales nuevamente para acceder a tu cuenta.</p>
              <button
                type="button"
                onClick={async () => { await logout(); navigate('/login', { replace: true }); }}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-[#E00B41]/10 px-5 py-2.5 text-sm font-bold text-[#E00B41] transition-all hover:bg-[#E00B41] hover:text-white cursor-pointer"
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            </SectionCard>
          </div>
        )}
      </div>

      {/* ═══════ Modal de Formulario de Verificación de DPI ═══════ */}
      {showDpiModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-[fade-in_0.2s_ease-out]">
          <div
            className="relative flex flex-col max-h-[92vh] w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-border-light animate-[scale-up_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top golden accent line */}
            <div className="h-2 bg-gradient-to-r from-dorado via-amber-400 to-[#996515]" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-light bg-[#FAF5EE] px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-dorado/20 flex items-center justify-center text-dorado shadow-xs">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-cafe sm:text-xl flex items-center gap-2">
                    Verificación de Identidad con DPI
                    <span className="text-[10px] uppercase font-black bg-dorado/20 text-dorado px-2 py-0.5 rounded-full">Oficial</span>
                  </h2>
                  <p className="text-xs text-text-secondary font-medium">
                    Datos personales para generar máxima confianza en la comunidad RuwaJay
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDpiModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-text-muted hover:bg-crema hover:text-cafe transition-colors border border-border-light"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmitDpiVerification} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
              {dpiError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
                  <AlertTriangle size={15} />
                  <span>{dpiError}</span>
                </div>
              )}

              {/* CUI Input */}
              <div>
                <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">
                  Número de CUI / DPI (13 dígitos) *
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
                  <FileCheck size={18} className="text-dorado" />
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={dpiForm.cui}
                    onChange={(e) => setDpiForm({ ...dpiForm, cui: formatDpiCui(e.target.value) })}
                    placeholder="Ej. 2450 12345 0101"
                    className="min-w-0 flex-1 bg-transparent text-sm font-extrabold tracking-wider text-cafe outline-none"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1">El número único de identificación de tu DPI emitido por RENAP.</p>
              </div>

              {/* Lugar de Emisión (Departamento y Municipio) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">
                    Departamento de emisión *
                  </label>
                  <select
                    value={dpiForm.department}
                    onChange={(e) => setDpiForm({ ...dpiForm, department: e.target.value })}
                    className="w-full rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3 text-xs font-bold text-cafe outline-none focus:border-forest"
                  >
                    {GT_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">
                    Municipio de emisión *
                  </label>
                  <input
                    type="text"
                    required
                    value={dpiForm.municipality}
                    onChange={(e) => setDpiForm({ ...dpiForm, municipality: e.target.value })}
                    placeholder="Ej. Ciudad de Guatemala, Mixco..."
                    className="w-full rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3 text-xs font-bold text-cafe outline-none focus:border-forest"
                  />
                </div>
              </div>

              {/* Fechas de Nacimiento y Vencimiento */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <RuwaDatePicker
                  label="Fecha de nacimiento"
                  required
                  isBirthDate={true}
                  placeholder="dd / mm / aaaa"
                  maxDate={new Date().toISOString().split('T')[0]}
                  value={dpiForm.birthDate}
                  onChange={(val) => setDpiForm({ ...dpiForm, birthDate: val })}
                />

                <RuwaDatePicker
                  label="Fecha de vencimiento del DPI"
                  placeholder="dd / mm / aaaa"
                  value={dpiForm.expirationDate}
                  onChange={(val) => setDpiForm({ ...dpiForm, expirationDate: val })}
                />
              </div>

              {/* Dirección Actual */}
              <div>
                <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">
                  Dirección residencial declarada
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-3 focus-within:border-forest">
                  <MapPin size={17} className="text-text-muted" />
                  <input
                    type="text"
                    value={dpiForm.legalAddress}
                    onChange={(e) => setDpiForm({ ...dpiForm, legalAddress: e.target.value })}
                    placeholder="Ej. 10 avenida 12-40, Zona 10, Guatemala"
                    className="min-w-0 flex-1 bg-transparent text-xs font-bold text-cafe outline-none"
                  />
                </div>
              </div>

              {/* Contacto de Referencia / Emergencia para Confianza */}
              <div className="rounded-2xl border border-dorado/25 bg-[#FAF5EE]/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-dorado" />
                  <h4 className="text-xs font-black text-cafe uppercase tracking-wider">
                    Contacto de Referencia o Respaldo (Garantía de Confianza)
                  </h4>
                </div>
                <p className="text-[11px] text-text-muted">
                  Un contacto de confianza permite a arrendadores e inquilinos validar tu solvencia y confiabilidad personal.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Nombre completo *</label>
                    <input
                      type="text"
                      required
                      value={dpiForm.emergencyName}
                      onChange={(e) => setDpiForm({ ...dpiForm, emergencyName: e.target.value })}
                      placeholder="Nombre de referencia"
                      className="w-full rounded-xl border border-[#E8D9C8] bg-white px-3 py-2 text-xs font-semibold text-cafe outline-none focus:border-forest"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Teléfono *</label>
                    <input
                      type="tel"
                      required
                      value={dpiForm.emergencyPhone}
                      onChange={(e) => setDpiForm({ ...dpiForm, emergencyPhone: e.target.value })}
                      placeholder="Ej. 5555 1234"
                      className="w-full rounded-xl border border-[#E8D9C8] bg-white px-3 py-2 text-xs font-semibold text-cafe outline-none focus:border-forest"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Relación / Parentesco</label>
                    <select
                      value={dpiForm.emergencyRelation}
                      onChange={(e) => setDpiForm({ ...dpiForm, emergencyRelation: e.target.value })}
                      className="w-full rounded-xl border border-[#E8D9C8] bg-white px-3 py-2 text-xs font-semibold text-cafe outline-none focus:border-forest"
                    >
                      <option value="Familiar">Familiar directo</option>
                      <option value="Cónyuge">Cónyuge / Pareja</option>
                      <option value="Laboral">Referencia Laboral</option>
                      <option value="Arrendador Anterior">Arrendador anterior</option>
                      <option value="Amigo personal">Amigo personal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Subida de Foto del DPI (Opcional / Recomendada) */}
              <div>
                <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">
                  Fotografía frontal del DPI (Opcional)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-dashed border-[#D4962A]/50 bg-[#FAF5EE]/40 p-4">
                  {dpiForm.documentPhoto ? (
                    <div className="relative w-36 h-24 rounded-xl overflow-hidden border border-dorado shadow-xs bg-black">
                      <img src={dpiForm.documentPhoto} alt="DPI" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setDpiForm({ ...dpiForm, documentPhoto: null })}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-sm"
                        title="Quitar imagen"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-28 items-center justify-center rounded-xl bg-white border border-border text-dorado">
                      <FileCheck size={32} />
                    </div>
                  )}
                  <div className="flex-1 text-center sm:text-left">
                    <input
                      type="file"
                      id="dpi-photo-upload"
                      accept="image/*"
                      onChange={handleDpiPhotoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="dpi-photo-upload"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-dorado hover:bg-[#C5850F] px-4 py-2 text-xs font-black text-white shadow-xs transition-colors"
                    >
                      <Upload size={14} /> Subir foto del documento
                    </label>
                    <p className="text-[11px] text-text-muted mt-1.5">
                      Fotografía nítida del frente de tu DPI para certificar tu documento.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sworn Declaration */}
              <div className="flex items-start gap-3 rounded-2xl bg-forest/5 p-4 border border-forest/15">
                <input
                  type="checkbox"
                  id="sworn"
                  required
                  checked={dpiForm.swornDeclaration}
                  onChange={(e) => setDpiForm({ ...dpiForm, swornDeclaration: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-border text-forest focus:ring-forest cursor-pointer"
                />
                <label htmlFor="sworn" className="text-xs font-semibold text-cafe leading-relaxed cursor-pointer">
                  Declaro bajo juramento que los datos proporcionados corresponden fielmente a mi Documento Personal de Identificación (DPI) y autorizo a RuwaJay a validar la autenticidad con fines de seguridad de la comunidad.
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDpiModal(false)}
                  className="rounded-xl px-5 py-3 text-xs font-bold text-text-muted hover:text-cafe transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={verifyBusy}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-dorado to-[#C5850F] px-6 py-3 text-xs font-black text-white shadow-lg hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {verifyBusy ? 'Guardando...' : 'Validar y Obtener Insignia Oficial'}
                  <CheckCircle2 size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ Modal de Credencial Digital de Verificación ═══════ */}
      {showDpiDetailsModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-[fade-in_0.2s_ease-out]">
          <div
            className="relative flex flex-col max-h-[90vh] w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-dorado/40 animate-[scale-up_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-2 bg-gradient-to-r from-dorado via-amber-400 to-forest" />
            <div className="p-6 sm:p-8">
              {/* Seal Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-dorado to-amber-300 text-white flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-dorado/20">
                  <BadgeCheck size={36} />
                </div>
                <h3 className="text-xl font-black text-cafe">Certificado de Identidad Oficial</h3>
                <p className="text-xs text-dorado font-extrabold uppercase tracking-widest mt-0.5">RuwaJay Confianza Garantizada</p>
              </div>

              {/* Data Card */}
              <div className="rounded-2xl border border-dorado/30 bg-[#FAF5EE] p-5 space-y-3.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-dorado/15">
                  <span className="text-text-muted font-bold">Titular Verificado:</span>
                  <span className="font-extrabold text-cafe text-sm">{user?.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-dorado/15">
                  <span className="text-text-muted font-bold">CUI / DPI:</span>
                  <span className="font-black text-forest font-mono tracking-wider">
                    {maskDpiCui(user?.dpiData?.cui || '2450123450101')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-dorado/15">
                  <span className="text-text-muted font-bold">Lugar de Emisión:</span>
                  <span className="font-bold text-cafe">
                    {user?.dpiData?.municipality || 'Guatemala'}, {user?.dpiData?.department || 'Guatemala'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-dorado/15">
                  <span className="text-text-muted font-bold">Contacto de Referencia:</span>
                  <span className="font-bold text-cafe">
                    {user?.dpiData?.emergencyName || 'Validado'} ({user?.dpiData?.emergencyRelation || 'Referencia'})
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-text-muted font-bold">Fecha de Validación:</span>
                  <span className="font-bold text-jade">{user?.dpiData?.verifiedAt || 'Vigente'}</span>
                </div>
                {user?.dpiData?.documentPhoto && (
                  <div className="pt-2 border-t border-dorado/15">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-text-muted font-bold">Documento Adjunto:</span>
                      <button
                        type="button"
                        onClick={() => setBlurDpiPhoto(!blurDpiPhoto)}
                        className="text-[11px] font-extrabold text-forest hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {blurDpiPhoto ? <><Eye size={12} /> Desproteger / Ver foto</> : <><EyeOff size={12} /> Desenfocar / Proteger</>}
                      </button>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-dorado/20 bg-black/5 max-h-40 flex items-center justify-center">
                      <img
                        src={user.dpiData.documentPhoto}
                        alt="Documento DPI"
                        className={`w-full max-h-40 object-contain transition-all duration-300 ${blurDpiPhoto ? 'blur-md select-none pointer-events-none' : 'blur-0'}`}
                      />
                      {blurDpiPhoto && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-[11px] font-bold">
                          🔒 Foto protegida para evitar miradas indiscretas
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Safe Note */}
              <p className="text-[11px] text-text-muted text-center mt-4 leading-normal">
                🛡️ Esta insignia certifica que el usuario ha completado el proceso de validación oficial de identidad en Guatemala con documento DPI y contacto de respaldo.
              </p>

              {/* Footer */}
              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { setShowDpiDetailsModal(false); setShowDpiModal(true); }}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-cafe hover:bg-crema transition-colors"
                >
                  Editar datos
                </button>
                <button
                  type="button"
                  onClick={() => setShowDpiDetailsModal(false)}
                  className="rounded-xl bg-forest px-6 py-2.5 text-xs font-black text-white hover:bg-forest-dark transition-colors shadow-xs"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Rent Affordability Calculator Modal */}
      <RentAffordabilityModal
        isOpen={showAffordabilityModal}
        onClose={() => setShowAffordabilityModal(false)}
        onApplyBudgetFilter={(maxBudget) => {
          navigate(`/explorar?maxPrice=${maxBudget}`);
        }}
        onSelectSuggestedLocation={(loc, maxBudget) => {
          navigate(
            `/explorar?maxPrice=${maxBudget}&department=${encodeURIComponent(loc.dept || 'Todos')}&zone=${encodeURIComponent(loc.zone || '')}`
          );
        }}
      />
      {/* Modal para Editar Vivienda */}
      <EditPropertyModal
        property={editingProperty}
        isOpen={Boolean(editingProperty)}
        onClose={() => setEditingProperty(null)}
        onSaved={(updated) => {
          setMyProperties((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          );
        }}
      />
    </main>
  );
}
