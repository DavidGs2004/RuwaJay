import PrivateMedia from '../components/chat/PrivateMedia';
import { subscribeSavedSearches, deleteSavedSearch } from '../lib/savedSearchService';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  User, Heart, Clock, Building2, LogOut, ShieldCheck, MapPin, Settings,
  Mail, Phone, Lock, Edit3, Check, X, Eye, EyeOff, BadgeCheck, Camera,
  Home, PlusCircle, ToggleLeft, ToggleRight, TrendingUp, Users, Calendar,
  FileText, AlertTriangle, Sparkles, ChevronDown, ChevronUp,
  Upload, Trash2, Shield, CheckCircle2, FileCheck, Bookmark, Calculator,
  RotateCcw, ArrowRight, AlertCircle, Clock3, MessageCircle, Megaphone, Radio, Bell, Send, Navigation,
  Search, ExternalLink, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import RuwaPagination from '../components/ui/RuwaPagination';
import { useAuth, resolveUserStatus } from '../context/AuthContext';
import { AVATAR_OPTIONS } from '../data/avatars';
import { useFavorites } from '../context/FavoritesContext';
import { demoProperties } from '../data/properties';
import PropertyCard from '../components/property/PropertyCard';
import RuwaDatePicker from '../components/ui/RuwaDatePicker';
import RentAffordabilityModal from '../components/property/RentAffordabilityModal';
import EditPropertyModal from '../components/property/EditPropertyModal';
import LogoutConfirmModal from '../components/ui/LogoutConfirmModal';
import { sanitizeText, validateImageFile, maskSensitive } from '../utils/security';
import { firebaseAuth } from '../lib/firebase';
import { deleteOwnedProperty, subscribeToProperties, updatePropertyStatus } from '../lib/propertyService';
import { changeVisitStatus, deleteVisit, hideVisitLocally, setVisitConversationId, subscribeToUserVisits } from '../lib/visitService';
import { getOrCreateConversation } from '../lib/chatService';
import {
  subscribeToUsers,
  updateUserRole,
  updateUserStatus,
  subscribeToSystemUpdates,
  createSystemUpdate,
  updateSystemUpdate,
  deleteSystemUpdate,
  subscribeVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
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
  const { user, logout, updateProfile, changePassword, requestPasswordReset, requestVerification, updateDpiData, purgeDpiData, isAdmin } = useAuth();
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
  const [resetEmailBusy, setResetEmailBusy] = useState(false);

  /* ── Verification State ── */
  const [showDpiModal, setShowDpiModal] = useState(false);
  const [showDpiDetailsModal, setShowDpiDetailsModal] = useState(false);
  const [showDpiSuccessModal, setShowDpiSuccessModal] = useState(false);
  const [showDpiEditSuccessModal, setShowDpiEditSuccessModal] = useState(false);
  const [showPurgeDpiModal, setShowPurgeDpiModal] = useState(false);
  const [purgingDpi, setPurgingDpi] = useState(false);
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
  const [adminUserRoleFilter, setAdminUserRoleFilter] = useState('todos'); // 'todos' | 'seeker' | 'owner' | 'admin'
  const [adminUserStatusFilter, setAdminUserStatusFilter] = useState('todos'); // 'todos' | 'active' | 'suspended'
  const [adminUserPage, setAdminUserPage] = useState(1);

  const [adminPropertySearch, setAdminPropertySearch] = useState('');
  const [adminPropertyStatusFilter, setAdminPropertyStatusFilter] = useState('todas'); // 'todas' | 'disponible' | 'alquilada' | 'pausada'
  const [adminPropertyPage, setAdminPropertyPage] = useState(1);

  const [systemUpdates, setSystemUpdates] = useState([]);
  const [newUpdateTitle, setNewUpdateTitle] = useState('');
  const [newUpdateContent, setNewUpdateContent] = useState('');
  const [newUpdateCategory, setNewUpdateCategory] = useState('novedad');
  const [newUpdatePriority, setNewUpdatePriority] = useState('normal');
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [adminNotice, setAdminNotice] = useState('');
  const [deletingUpdate, setDeletingUpdate] = useState(null);
  const [isDeletingUpdateBusy, setIsDeletingUpdateBusy] = useState(false);
  const [statusModalTarget, setStatusModalTarget] = useState(null);
  const [isUpdatingStatusBusy, setIsUpdatingStatusBusy] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      navigate('/login', { replace: true });
    } catch (err) {
      console.warn('Error al cerrar sesión:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  /* ── Admin Verification Requests State ── */
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [verificationFilter, setVerificationFilter] = useState('pendientes'); // 'pendientes' | 'aprobadas' | 'rechazadas' | 'todas'
  const [verificationSearch, setVerificationSearch] = useState('');
  const [verificationPage, setVerificationPage] = useState(1);
  const [approvingRequest, setApprovingRequest] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [viewingDpiPhoto, setViewingDpiPhoto] = useState(null);
  const [isProcessingVerifAction, setIsProcessingVerifAction] = useState(false);

  const handleOpenDpiModal = () => {
    setDpiError('');
    if (user?.dpiData) {
      setDpiForm({
        cui: formatDpiCui(user.dpiData.cui || ''),
        department: user.dpiData.department || 'Guatemala',
        municipality: user.dpiData.municipality || 'Guatemala',
        birthDate: user.dpiData.birthDate || '',
        expirationDate: user.dpiData.expirationDate || '',
        legalAddress: user.dpiData.legalAddress || '',
        emergencyName: user.dpiData.emergencyName || '',
        emergencyPhone: user.dpiData.emergencyPhone || '',
        emergencyRelation: user.dpiData.emergencyRelation || 'Familiar',
        documentPhoto: user.dpiData.documentPhoto || null,
        swornDeclaration: true,
      });
    } else {
      setDpiForm({
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
    }
    setShowDpiModal(true);
  };

  // Auto-open DPI modal if coming with ?openDpi=true
  useEffect(() => {
    if (searchParams.get('openDpi') === 'true') {
      handleOpenDpiModal();
    }
  }, [searchParams]);

  const handleOpenApproveModal = (req) => {
    setApprovingRequest(req);
  };

  const handleConfirmApprove = async () => {
    if (!approvingRequest) return;
    const req = approvingRequest;
    const targetUser = allUsers.find(
      (u) => (u.id && (u.id === req.userId || u.id === req.id)) ||
             (u.email && req.userEmail && u.email.toLowerCase() === req.userEmail.toLowerCase())
    );
    const targetName = targetUser?.name || req.userName || targetUser?.email || req.userEmail || 'este usuario';
    setIsProcessingVerifAction(true);
    try {
      await approveVerificationRequest(req, user);
      setAdminNotice(`¡Solicitud de ${targetName} aprobada con éxito! Se le otorgó rol de casero y se le notificó en tiempo real.`);
      setApprovingRequest(null);
    } catch (err) {
      window.alert(err.message || 'Error al aprobar la solicitud.');
    } finally {
      setIsProcessingVerifAction(false);
    }
  };

  const handleOpenRejectModal = (req) => {
    setRejectingRequest(req);
    setRejectionReasonInput('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    if (!rejectionReasonInput.trim()) {
      window.alert('Por favor especifica o selecciona el motivo del rechazo para orientar al usuario.');
      return;
    }
    setIsProcessingVerifAction(true);
    try {
      const targetUser = allUsers.find(
        (u) => (u.id && (u.id === rejectingRequest.userId || u.id === rejectingRequest.id)) ||
               (u.email && rejectingRequest.userEmail && u.email.toLowerCase() === rejectingRequest.userEmail.toLowerCase())
      );
      const targetName = targetUser?.name || rejectingRequest.userName || targetUser?.email || rejectingRequest.userEmail || 'el usuario';
      await rejectVerificationRequest(rejectingRequest, rejectionReasonInput.trim(), user);
      setAdminNotice(`Solicitud de ${targetName} rechazada exitosamente. Se movió al apartado de rechazadas y se le notificó al usuario.`);
      setRejectingRequest(null);
      setRejectionReasonInput('');
    } catch (err) {
      window.alert(err.message || 'Error al rechazar la solicitud.');
    } finally {
      setIsProcessingVerifAction(false);
    }
  };

  // Load edit form with current user data
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditBio(user.bio || '');
      setEditAvatarId(user.avatarId || 'forest-initial');
      setEditAvatarImage(user?.avatarImage || user?.avatar || user?.photoURL || null);
      if (user.verificationStatus === 'rechazada') {
        setDpiForm({
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
      } else if (user.dpiData) {
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
          false
        );
      });
      setMyProperties(filtered);
    });
  }, [user?.id, user?.email, user?.name, activeTab]);

  /* ── Visits State & Persistence ── */
  const [visits, setVisits] = useState([]);
  const [visitSubTab, setVisitSubTab] = useState('todas'); // 'todas' | 'recibidas' | 'solicitadas'

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

  const handleUpdateVisitStatus = async (visitId, newStatus) => {
    try {
      await changeVisitStatus(visitId, newStatus);
      const visitObj = visits.find((v) => v.id === visitId);
      window.dispatchEvent(new Event('ruwajay:visits-changed'));
    } catch (error) {
      window.alert(error.message || 'No se pudo actualizar la cita.');
    }
  };

  const [deletingVisitId, setDeletingVisitId] = useState(null);
  const [isDeletingVisitBusy, setIsDeletingVisitBusy] = useState(false);
  const [deletingPropertyTarget, setDeletingPropertyTarget] = useState(null);
  const [isDeletingPropertyBusy, setIsDeletingPropertyBusy] = useState(false);

  const handleConfirmDeleteVisit = async () => {
    if (!deletingVisitId) return;
    const targetId = deletingVisitId;
    setIsDeletingVisitBusy(true);
    try {
      await deleteVisit(targetId);
    } catch (error) {
      console.warn('No se pudo eliminar la cita:', error);
      hideVisitLocally(targetId);
    } finally {
      setVisits((prev) => prev.filter((v) => v.id !== targetId));
      setDeletingVisitId(null);
      setIsDeletingVisitBusy(false);
      window.dispatchEvent(new Event('ruwajay:visits-changed'));
    }
  };

  const handleConfirmDeleteProperty = async () => {
    if (!deletingPropertyTarget) return;
    const targetId = deletingPropertyTarget.id;
    setIsDeletingPropertyBusy(true);
    try {
      await deleteOwnedProperty(targetId, currentUserId);
    } catch (error) {
      console.warn('No se pudo eliminar la vivienda:', error);
    } finally {
      setMyProperties((prev) => prev.filter((p) => p.id !== targetId));
      setDeletingPropertyTarget(null);
      setIsDeletingPropertyBusy(false);
    }
  };

  const handleOpenVisitChat = async (visit) => {
    try {
      const activeUid = firebaseAuth?.currentUser?.uid || currentUserId;
      const effectiveOwnerId = visit.ownerId;
      const effectiveTenantId = visit.tenantId;

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


      if (v.propertyId && myPropertySet.has(v.propertyId)) return true;
      return false;
    });
  }, [visits, currentUserId, currentUserPhone, currentUserName, myPropertySet]);

  const requestedVisits = useMemo(() => {
    return visits.filter((v) => {
      if (currentUserId && v.tenantId === currentUserId) return true;
      if (firebaseAuth?.currentUser?.uid && v.tenantId === firebaseAuth.currentUser.uid) return true;

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

  useEffect(()=>subscribeSavedSearches(user?.id,setSavedSearches),[user?.id]);
  const handleDeleteSavedSearch = async (id) => {
    try { await deleteSavedSearch(id); } catch(error) { window.alert(error.message); }
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

  const handleSaveProfile = async () => {
    try { await updateProfile({
      name: sanitizeText(editName.trim() || user.name),
      phone: sanitizeText(editPhone.trim()),
      bio: sanitizeText(editBio.trim()),
      avatarId: editAvatarId,
      avatarImage: editAvatarImage,
    });
    } catch (error) { window.alert(error.message || 'No se pudo guardar el perfil.'); return; }
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
      if (isVerified) {
        // Para usuario ya verificado: actualización directa de datos de contacto sin revocar certificación
        await updateDpiData({
          cui: cleanCui,
          department: sanitizeText(dpiForm.department),
          municipality: sanitizeText(dpiForm.municipality),
          birthDate: sanitizeText(dpiForm.birthDate),
          expirationDate: sanitizeText(dpiForm.expirationDate),
          legalAddress: sanitizeText(dpiForm.legalAddress),
          emergencyName: sanitizeText(dpiForm.emergencyName),
          emergencyPhone: sanitizeText(dpiForm.emergencyPhone),
          emergencyRelation: sanitizeText(dpiForm.emergencyRelation),
          ...(dpiForm.documentPhoto ? { documentPhoto: dpiForm.documentPhoto } : {}),
        });
        setVerifyBusy(false);
        setShowDpiModal(false);
        setShowDpiEditSuccessModal(true);
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3500);
        return;
      }

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
      setShowDpiSuccessModal(true);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3500);
    } catch {
      setVerifyBusy(false);
      setDpiError('Hubo un problema al procesar la verificación. Intenta nuevamente.');
    }
  };

  const handleSendResetEmail = async () => {
    const targetEmail = user?.email || firebaseAuth?.currentUser?.email;
    if (!targetEmail) {
      setPwMessage('No se encontró un correo electrónico asociado a la cuenta.');
      setPwError(true);
      return;
    }
    setResetEmailBusy(true);
    setPwMessage('');
    try {
      await requestPasswordReset(targetEmail);
      setPwMessage(`Hemos enviado un enlace seguro para restablecer o crear tu contraseña a: ${targetEmail}. Revisa tu bandeja de entrada o spam.`);
      setPwError(false);
    } catch (err) {
      setPwMessage(err.message || 'No se pudo enviar el correo de recuperación.');
      setPwError(true);
    } finally {
      setResetEmailBusy(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage(''); setPwError(false);
    if (!currentPw) { setPwMessage('Ingresa tu contraseña actual.'); setPwError(true); return; }
    if (!isStrongPassword(newPw)) { setPwMessage('Tu nueva contraseña debe tener al menos 8 caracteres con mayúsculas, minúsculas, números y símbolos.'); setPwError(true); return; }
    if (newPw !== confirmPw) { setPwMessage('Las contraseñas nuevas no coinciden.'); setPwError(true); return; }
    setPwBusy(true);
    try {
      await changePassword(currentPw, newPw);
      setPwMessage('¡Contraseña actualizada exitosamente!');
      setPwError(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setShowPasswordForm(false); setPwMessage(''); }, 3000);
    } catch (err) {
      const raw = err?.message || '';
      let cleanMsg = 'Error al cambiar la contraseña.';
      if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password') || raw.includes('incorrecta')) {
        cleanMsg = 'La contraseña actual ingresada es incorrecta. Por favor verifícala.';
      } else if (raw.includes('auth/requires-recent-login')) {
        cleanMsg = 'Por motivos de seguridad, debes cerrar sesión y volver a entrar antes de cambiar tu contraseña.';
      } else if (raw.includes('auth/weak-password')) {
        cleanMsg = 'La nueva contraseña debe tener al menos 8 caracteres combinando mayúsculas, números y símbolos.';
      } else if (raw.includes('auth/too-many-requests')) {
        cleanMsg = 'Demasiados intentos fallidos. Por tu seguridad, espera unos minutos antes de intentar de nuevo.';
      } else if (raw && !raw.startsWith('Firebase:')) {
        cleanMsg = raw;
      }
      setPwMessage(cleanMsg);
      setPwError(true);
    } finally { setPwBusy(false); }
  };

  const handleRequestVerification = async () => {
    setVerifyBusy(true);
    await requestVerification();
    setVerifyBusy(false);
    setVerifyDone(true);
  };

  const handleSetPropertyStatus = async (propertyId, status) => {
    try { await updatePropertyStatus(propertyId,status); }
    catch(error) { window.alert(error.message || 'No se pudo actualizar la vivienda.'); }
  };

  const isVerified = Boolean(user?.verified && user?.dpiData?.cui && user?.verificationStatus === 'aprobada');

  /* ── Admin: subscribe to all users, properties, system updates, and verification requests ── */
  useEffect(() => {
    if (!isAdmin) return;
    const unsubUsers = subscribeToUsers(setAllUsers);
    const unsubProps = subscribeToProperties(setAllProperties);
    const unsubUpdates = subscribeToSystemUpdates(setSystemUpdates, true);
    const unsubVerifications = subscribeVerificationRequests(setVerificationRequests, (err) => {
      console.warn('Error al suscribir solicitudes de verificación:', err);
    });
    return () => {
      unsubUsers();
      unsubProps();
      unsubUpdates();
      if (unsubVerifications) unsubVerifications();
    };
  }, [isAdmin]);

  const pendingRequestsCount = useMemo(() => {
    return verificationRequests.filter((r) => r.status === 'pendiente').length;
  }, [verificationRequests]);

  const filteredVerificationRequests = useMemo(() => {
    return verificationRequests.filter((req) => {
      if (verificationFilter === 'pendientes' && req.status !== 'pendiente') return false;
      if (verificationFilter === 'aprobadas' && req.status !== 'aprobada') return false;
      if (verificationFilter === 'rechazadas' && req.status !== 'rechazada') return false;

      if (verificationSearch.trim()) {
        const q = verificationSearch.toLowerCase();
        const targetUser = allUsers.find(
          (u) => (u.id && (u.id === req.userId || u.id === req.id)) ||
                 (u.email && req.userEmail && u.email.toLowerCase() === req.userEmail.toLowerCase())
        );
        const matchName = (targetUser?.name || req.userName || '').toLowerCase().includes(q);
        const matchEmail = (targetUser?.email || req.userEmail || '').toLowerCase().includes(q);
        const matchPhone = (targetUser?.phone || req.userPhone || req.emergencyPhone || '').toLowerCase().includes(q);
        const matchCui = (req.cui || '').toLowerCase().includes(q);
        const matchDept = (req.department || '').toLowerCase().includes(q);
        const matchMuni = (req.municipality || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchCui && !matchDept && !matchMuni) {
          return false;
        }
      }
      return true;
    });
  }, [verificationRequests, verificationFilter, verificationSearch, allUsers]);

  /* ── Admin: Pagination resets on filter / search changes ── */
  useEffect(() => {
    setAdminUserPage(1);
  }, [adminUserRoleFilter, adminUserStatusFilter, adminSearchQuery]);

  useEffect(() => {
    setAdminPropertyPage(1);
  }, [adminPropertyStatusFilter, adminPropertySearch]);

  useEffect(() => {
    setVerificationPage(1);
  }, [verificationFilter, verificationSearch]);

  /* ── Admin: Users Filtering & Pagination ── */
  const USERS_PER_PAGE = 6;
  const userRoleCounts = useMemo(() => ({
    todos: allUsers.length,
    seeker: allUsers.filter((u) => !u.role || u.role === 'seeker').length,
    owner: allUsers.filter((u) => u.role === 'owner').length,
    admin: allUsers.filter((u) => u.role === 'admin').length,
    active: allUsers.filter((u) => resolveUserStatus(u, u.email) === 'active').length,
    inactive: allUsers.filter((u) => resolveUserStatus(u, u.email) === 'inactive').length,
    suspended: allUsers.filter((u) => resolveUserStatus(u, u.email) === 'suspended').length,
  }), [allUsers]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const role = u.role || 'seeker';
      if (adminUserRoleFilter !== 'todos' && role !== adminUserRoleFilter) return false;

      const st = resolveUserStatus(u, u.email);
      if (adminUserStatusFilter !== 'todos' && st !== adminUserStatusFilter) return false;

      if (adminSearchQuery.trim()) {
        const q = adminSearchQuery.toLowerCase().trim();
        const matchName = (u.name || '').toLowerCase().includes(q);
        const matchEmail = (u.email || '').toLowerCase().includes(q);
        const matchPhone = (u.phone || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone) return false;
      }
      return true;
    });
  }, [allUsers, adminUserRoleFilter, adminUserStatusFilter, adminSearchQuery]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const paginatedUsers = useMemo(() => {
    const start = (adminUserPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, adminUserPage]);

  /* ── Admin: Properties Filtering & Pagination ── */
  const PROPERTIES_PER_PAGE = 5;
  const propertyStatusCounts = useMemo(() => ({
    todas: allProperties.length,
    disponible: allProperties.filter((p) => (p.status || 'disponible') === 'disponible').length,
    alquilada: allProperties.filter((p) => p.status === 'alquilada').length,
    pausada: allProperties.filter((p) => p.status === 'pausada').length,
  }), [allProperties]);

  const filteredProperties = useMemo(() => {
    return allProperties.filter((p) => {
      const st = (p.status || 'disponible').toLowerCase();
      if (adminPropertyStatusFilter !== 'todas' && st !== adminPropertyStatusFilter) return false;

      if (adminPropertySearch.trim()) {
        const q = adminPropertySearch.toLowerCase().trim();
        const title = (p.title || '').toLowerCase();
        const zone = (p.zone || p.address?.zone || '').toLowerCase();
        const muni = (p.municipality || p.address?.municipality || '').toLowerCase();
        const dept = (p.department || p.address?.department || '').toLowerCase();
        const addr = (p.approximateAddress || p.address?.approximate || '').toLowerCase();
        const owner = (p.ownerName || p.ownerEmail || '').toLowerCase();
        if (
          !title.includes(q) &&
          !zone.includes(q) &&
          !muni.includes(q) &&
          !dept.includes(q) &&
          !addr.includes(q) &&
          !owner.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [allProperties, adminPropertyStatusFilter, adminPropertySearch]);

  const totalPropertyPages = Math.max(1, Math.ceil(filteredProperties.length / PROPERTIES_PER_PAGE));
  const paginatedProperties = useMemo(() => {
    const start = (adminPropertyPage - 1) * PROPERTIES_PER_PAGE;
    return filteredProperties.slice(start, start + PROPERTIES_PER_PAGE);
  }, [filteredProperties, adminPropertyPage]);

  /* ── Admin: Verification Requests Pagination ── */
  const VERIFICATIONS_PER_PAGE = 3;
  const totalVerificationPages = Math.max(1, Math.ceil(filteredVerificationRequests.length / VERIFICATIONS_PER_PAGE));
  const paginatedVerificationRequests = useMemo(() => {
    const start = (verificationPage - 1) * VERIFICATIONS_PER_PAGE;
    return filteredVerificationRequests.slice(start, start + VERIFICATIONS_PER_PAGE);
  }, [filteredVerificationRequests, verificationPage]);

  /* ── Tabs config ── */
  const tabs = [
    { key: 'perfil', label: 'Mi Perfil', icon: User },
    { key: 'favoritos', label: 'Favoritos', count: favorites.length, icon: Heart },
    { key: 'busquedas', label: 'Búsquedas', count: savedSearches.length > 0 ? savedSearches.length : undefined, icon: Bookmark },
    { key: 'visitas', label: 'Citas y Visitas', count: relevantVisits.length, icon: Calendar },
    ...(isOwner ? [{ key: 'propiedades', label: 'Mis Propiedades', count: myProperties.length, icon: Building2 }] : []),
    ...(isAdmin ? [{ key: 'admin', label: 'Administración', count: pendingRequestsCount > 0 ? pendingRequestsCount : undefined, icon: Shield }] : []),
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
                {isAdmin ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-forest/15 px-3 py-1 text-xs font-black text-forest border border-forest/30 shadow-xs"
                    title="Cuenta con permisos de super administrador"
                  >
                    <ShieldCheck size={14} className="text-forest" /> Administrador Verificado
                  </span>
                ) : (
                  <>
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
                    {!isVerified && user?.verificationStatus === 'pendiente' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-black text-amber-700 border border-amber-300">
                        <Clock3 size={13} className="text-amber-600 animate-pulse" /> Verificación DPI en revisión
                      </span>
                    )}
                    {!isVerified && user?.verificationStatus === 'rechazada' && (
                      <button
                        type="button"
                        onClick={() => handleOpenDpiModal()}
                        className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-black text-red-700 border border-red-300 hover:bg-red-500/25 transition-all cursor-pointer"
                        title="Ver motivo y corregir"
                      >
                        <AlertTriangle size={13} className="text-red-600" /> Solicitud DPI rechazada (Corregir)
                      </button>
                    )}
                  </>
                )}
              </div>
              <p className="break-all text-sm text-text-secondary">{user?.email}</p>
              {user?.bio && <p className="mt-1.5 text-xs text-text-muted italic">"{user.bio}"</p>}
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => (isVerified || user?.verificationStatus === 'pendiente' ? setShowDpiDetailsModal(true) : handleOpenDpiModal())}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                      isVerified
                        ? 'bg-dorado/10 text-cafe hover:bg-dorado/20'
                        : user?.verificationStatus === 'pendiente'
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : user?.verificationStatus === 'rechazada'
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-dorado/10 text-cafe hover:bg-dorado/20'
                    }`}
                  >
                    {isVerified
                      ? '✓ Identidad DPI validada'
                      : user?.verificationStatus === 'pendiente'
                      ? '⏳ Solicitud en revisión'
                      : user?.verificationStatus === 'rechazada'
                      ? '⚠️ Solicitud rechazada (Reintentar)'
                      : '🛡️ Solicitar verificación con DPI'}
                  </button>
                )}
                <span className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  isAdmin ? 'bg-forest text-white shadow-xs' : 'bg-crema text-cafe'
                }`}>
                  {isAdmin ? '🛡️ Super Administrador' : user?.role === 'owner' ? 'Casero' : 'Inquilino'}
                </span>
              </div>
              <p className="mt-3 text-center text-xs font-semibold text-text-muted sm:text-left">
                {isAdmin
                  ? 'Cuenta con acceso administrativo global de RuwaJay'
                  : isVerified
                  ? 'Cuenta verificada con DPI'
                  : user?.verificationStatus === 'pendiente'
                  ? 'Solicitud de casero en revisión por el administrador'
                  : user?.verificationStatus === 'rechazada'
                  ? 'Solicitud rechazada · Requiere corrección de datos'
                  : 'Sin verificar todavía'} · {isAdmin ? 'Panel maestro activo' : user?.role === 'owner' ? 'Propietario activo' : 'Buscando vivienda'}
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
                onClick={() => setShowLogoutModal(true)}
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

            {/* Validación e Identidad DPI / Estado Administrador */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-base font-extrabold text-cafe">
                  <ShieldCheck size={20} className={isAdmin ? 'text-forest' : 'text-dorado'} />
                  {isAdmin ? 'Cuenta de Administrador Autorizada' : 'Validación de Identidad con DPI'}
                </h3>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-forest/20 px-2.5 py-0.5 text-[10px] font-black text-forest">
                    <BadgeCheck size={13} /> Acceso Maestro Total
                  </span>
                ) : isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-dorado/20 px-2.5 py-0.5 text-[10px] font-black text-dorado">
                    <BadgeCheck size={13} /> Certificado Oficial
                  </span>
                ) : user?.verificationStatus === 'pendiente' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
                    <Clock3 size={12} className="text-amber-600 animate-pulse" /> Verificación en Proceso
                  </span>
                ) : user?.verificationStatus === 'rechazada' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-300 px-2.5 py-0.5 text-[10px] font-black text-red-800">
                    <AlertTriangle size={12} /> Solicitud Rechazada
                  </span>
                ) : null}
              </div>

              {isAdmin ? (
                <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-forest/30 bg-gradient-to-br from-forest/10 via-[#FAF5EE] to-forest/5 p-4 sm:p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest/20 text-forest shadow-xs">
                    <ShieldCheck size={28} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-cafe">Permisos y Privilegios Plenos de Administrador</p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Como administrador del sistema RuwaJay, tu cuenta posee permisos globales y acceso irrestricto para publicar inmuebles, gestionar citas y administrar la plataforma sin requerimiento de validación de DPI.
                    </p>
                  </div>
                </div>
              ) : isVerified ? (
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
              ) : user?.verificationStatus === 'pendiente' ? (
                <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/90 via-[#FAF5EE] to-amber-50/50 p-4 sm:p-5 shadow-xs">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 shadow-xs">
                    <Clock3 size={28} className="animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-cafe">Tu verificación de DPI está en proceso</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/90 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                        En revisión por administración
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                      Tu documento oficial y datos de DPI fueron recibidos y están siendo revisados por el equipo administrativo. En cuanto sea aprobada, obtendrás automáticamente tu insignia oficial de verificación y se habilitarán los permisos de casero.
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {user?.dpiData?.cui && (
                        <div className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 border border-amber-200 text-cafe shadow-2xs">
                          <span className="text-[10px] font-extrabold uppercase text-amber-800">CUI:</span>
                          <span className="font-mono font-bold">{formatDpiCui(user.dpiData.cui)}</span>
                        </div>
                      )}
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100/60 px-2.5 py-1 rounded-lg border border-amber-200/60">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span>Monitoreando aprobación en tiempo real...</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDpiDetailsModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2 text-xs font-black text-white transition-colors cursor-pointer shadow-xs"
                      >
                        <FileCheck size={14} /> Ver estado de solicitud
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDpiModal()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 transition-colors cursor-pointer"
                      >
                        <Edit3 size={13} /> Modificar datos enviados
                      </button>
                    </div>
                  </div>
                </div>
              ) : user?.verificationStatus === 'rechazada' ? (
                <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-red-300 bg-gradient-to-br from-red-50/90 via-[#FAF5EE] to-red-50/50 p-4 sm:p-5 shadow-xs">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700 border border-red-200 shadow-xs">
                    <AlertTriangle size={28} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-cafe">Solicitud de verificación rechazada</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-200/90 px-2 py-0.5 text-[10px] font-black text-red-900 border border-red-300/60">
                        Requiere corrección
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                      El administrador revisó tu solicitud y requiere que corrijas los datos o adjuntes una fotografía más legible.
                    </p>
                    {user?.verificationRejectionReason && (
                      <div className="mt-2.5 rounded-xl bg-white p-3 border border-red-200 text-xs">
                        <span className="text-[10px] font-extrabold uppercase text-red-700 block mb-0.5">Motivo del rechazo:</span>
                        <p className="font-semibold text-cafe">"{user.verificationRejectionReason}"</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenDpiModal()}
                      className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-black text-white transition-colors cursor-pointer shadow-xs"
                    >
                      <Edit3 size={13} /> Corregir y reenviar solicitud
                    </button>
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
                          {saved.notifyPush && (
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
                  const isOwnerOfThisVisit = Boolean(currentUserId && v.ownerId === currentUserId);

                  const visitProperty = myProperties.find((property) => property.id === v.propertyId)
                    || demoProperties.find((property) => property.id === v.propertyId);
                  const visitImage = visitProperty?.thumbnail
                    || visitProperty?.thumbnails?.[0]
                    || (Array.isArray(visitProperty?.images) ? visitProperty.images[0] : null)
                    || v.propertyImage
                    || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80';

                  // Determine target phone for WhatsApp
                  const targetPhone = isOwnerOfThisVisit ? (v.tenantPhone || '') : (v.ownerPhone || '');
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
                              <MapPin size={14} className="text-terracota" /> {v.propertyZone || 'Ubicación no indicada'}
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
                                onClick={() => setDeletingVisitId(v.id)}
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
                        <p className="mt-0.5 break-words text-xs text-text-muted">{property.zone || property.municipality || 'Ubicación no indicada'}</p>
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
                          onClick={() => setDeletingPropertyTarget(property)}
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Usuarios Registrados', value: allUsers.length, icon: Users, color: 'text-forest bg-forest/10' },
                  { label: 'Solicitudes DPI', value: pendingRequestsCount, icon: ShieldCheck, color: 'text-amber-600 bg-amber-500/10' },
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

            {/* ── SECCIÓN: Solicitudes de Verificación de Caseros (DPI) ── */}
            <SectionCard>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-dorado/15 text-dorado shadow-xs">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-cafe">
                        Solicitudes de Verificación de Caseros (DPI)
                      </h3>
                      {pendingRequestsCount > 0 && (
                        <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black text-white animate-pulse">
                          {pendingRequestsCount} {pendingRequestsCount === 1 ? 'pendiente' : 'pendientes'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">
                      Revisa en tiempo real las solicitudes de usuarios que desean ser propietarios para anunciar viviendas
                    </p>
                  </div>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-crema/60 p-1 border border-border">
                  {[
                    { id: 'pendientes', label: 'Pendientes', count: pendingRequestsCount },
                    { id: 'aprobadas', label: 'Aprobadas', count: verificationRequests.filter((r) => r.status === 'aprobada').length },
                    { id: 'rechazadas', label: 'Rechazadas', count: verificationRequests.filter((r) => r.status === 'rechazada').length },
                    { id: 'todas', label: 'Todas', count: verificationRequests.length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setVerificationFilter(tab.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                        verificationFilter === tab.id
                          ? 'bg-white text-forest shadow-xs font-extrabold'
                          : 'text-text-muted hover:text-cafe'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Search input */}
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-2.5">
                <Search size={16} className="text-text-muted shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar solicitud por nombre, correo, teléfono o CUI..."
                  value={verificationSearch}
                  onChange={(e) => setVerificationSearch(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-cafe outline-none"
                />
                {verificationSearch && (
                  <button onClick={() => setVerificationSearch('')} className="text-text-muted hover:text-cafe">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Solicitudes List */}
              {filteredVerificationRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-[#FDFBF7] py-10 text-center">
                  <ShieldCheck size={40} className="mx-auto mb-2 text-text-muted/40" />
                  <p className="text-sm font-bold text-cafe">No hay solicitudes en esta sección</p>
                  <p className="text-xs text-text-muted mt-1">
                    {verificationFilter === 'pendientes'
                      ? 'No hay solicitudes de verificación pendientes por revisar.'
                      : 'No se encontraron solicitudes con los filtros aplicados.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedVerificationRequests.map((req) => {
                    const targetUser = allUsers.find(
                      (u) => (u.id && (u.id === req.userId || u.id === req.id)) ||
                             (u.email && req.userEmail && u.email.toLowerCase() === req.userEmail.toLowerCase())
                    );
                    const effectiveName =
                      targetUser?.name ||
                      targetUser?.displayName ||
                      req.userName ||
                      req.fullName ||
                      targetUser?.dpiData?.fullName ||
                      (targetUser?.email ? targetUser.email.split('@')[0] : (req.userEmail ? req.userEmail.split('@')[0] : 'Usuario'));

                    const effectiveAvatar =
                      targetUser?.avatarImage ||
                      targetUser?.avatar ||
                      targetUser?.photoURL ||
                      req.userAvatar ||
                      null;

                    const effectiveEmail = targetUser?.email || req.userEmail || '';
                    const effectivePhone = targetUser?.phone || req.userPhone || req.emergencyPhone || '';

                    const displayUser = {
                      ...targetUser,
                      name: effectiveName,
                      avatarImage: effectiveAvatar,
                      avatarId: targetUser?.avatarId || req.avatarId,
                    };

                    return (
                      <div
                        key={req.id || req.userId}
                        className="rounded-3xl border border-border bg-[#FDFBF7] p-4 sm:p-5 shadow-xs transition-all hover:border-dorado/40"
                      >
                        {/* Solicitud Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={displayUser} size={46} className="shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-cafe truncate">
                                  {effectiveName}
                                </h4>
                                {req.status === 'pendiente' && (
                                  <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black">
                                    ● Pendiente
                                  </span>
                                )}
                                {req.status === 'aprobada' && (
                                  <span className="rounded-full bg-green-100 text-green-800 border border-green-300 px-2.5 py-0.5 text-[10px] font-black">
                                    ✓ Aprobada / Casero
                                  </span>
                                )}
                                {req.status === 'rechazada' && (
                                  <span className="rounded-full bg-red-100 text-red-800 border border-red-300 px-2.5 py-0.5 text-[10px] font-black">
                                    ✗ Rechazada
                                  </span>
                                )}
                                {resolveUserStatus(targetUser, targetUser?.email) === 'suspended' && (
                                  <span className="rounded-full bg-red-100 text-red-700 border border-red-300 px-2.5 py-0.5 text-[10px] font-black">
                                    🔴 Cuenta Suspendida
                                  </span>
                                )}
                                {resolveUserStatus(targetUser, targetUser?.email) === 'inactive' && (
                                  <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black">
                                    🟡 Cuenta Inactiva
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                                {effectiveEmail && <span>{effectiveEmail}</span>}
                                {effectivePhone && (
                                  <>
                                    <span>•</span>
                                    <a href={`tel:${effectivePhone}`} className="font-bold text-cafe hover:text-forest">
                                      Tel: {effectivePhone}
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                        <div className="text-right text-[11px] text-text-muted shrink-0">
                          <span className="block font-semibold">
                            {req.createdAt
                              ? new Date(req.createdAt).toLocaleDateString('es-GT', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Reciente'}
                          </span>
                        </div>
                      </div>

                      {/* Solicitud Data Grid */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        {/* CUI */}
                        <div className="rounded-2xl bg-white p-3 border border-[#E8D9C8]">
                          <span className="block text-[10px] font-extrabold uppercase text-text-muted">CUI / DPI Declarado</span>
                          <span className="font-mono text-sm font-black text-cafe tracking-wider">
                            {formatDpiCui(req.cui)}
                          </span>
                        </div>

                        {/* Lugar emisión */}
                        <div className="rounded-2xl bg-white p-3 border border-[#E8D9C8]">
                          <span className="block text-[10px] font-extrabold uppercase text-text-muted">Lugar de Emisión</span>
                          <span className="font-bold text-cafe truncate block">
                            {req.municipality || 'N/A'}, {req.department || 'Guatemala'}
                          </span>
                        </div>

                        {/* Nacimiento y vencimiento */}
                        <div className="rounded-2xl bg-white p-3 border border-[#E8D9C8]">
                          <span className="block text-[10px] font-extrabold uppercase text-text-muted">Fechas DPI</span>
                          <span className="font-semibold text-cafe block text-[11px]">
                            Nacimiento: <strong>{req.birthDate || 'No indicada'}</strong>
                          </span>
                          <span className="font-semibold text-cafe block text-[11px]">
                            Vencimiento: <strong>{req.expirationDate || 'No indicada'}</strong>
                          </span>
                        </div>

                        {/* Dirección */}
                        <div className="rounded-2xl bg-white p-3 border border-[#E8D9C8] sm:col-span-2 md:col-span-1">
                          <span className="block text-[10px] font-extrabold uppercase text-text-muted">Dirección Residencial</span>
                          <span className="font-semibold text-cafe block truncate" title={req.legalAddress}>
                            {req.legalAddress || 'No especificada'}
                          </span>
                        </div>

                        {/* Contacto de respaldo */}
                        <div className="rounded-2xl bg-white p-3 border border-[#E8D9C8] sm:col-span-2">
                          <span className="block text-[10px] font-extrabold uppercase text-text-muted">Contacto de Respaldo / Referencia</span>
                          <span className="font-bold text-cafe">
                            {req.emergencyName || 'No indicado'}
                            {req.emergencyRelation ? ` (${req.emergencyRelation})` : ''}
                            {req.emergencyPhone ? ` · Tel: ${req.emergencyPhone}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Foto del DPI adjunta */}
                      {req.documentPhoto && (
                        <div className="mt-3 flex items-center justify-between rounded-2xl bg-amber-500/10 border border-amber-300/40 p-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={req.documentPhoto}
                              alt="Miniatura DPI"
                              className="h-12 w-18 object-cover rounded-xl border border-amber-300 shadow-xs"
                            />
                            <div>
                              <p className="text-xs font-black text-amber-950">Foto de Documento Adjunta</p>
                              <p className="text-[11px] text-amber-800">El usuario adjuntó imagen frontal de su DPI.</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewingDpiPhoto(req.documentPhoto)}
                            className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-950 shadow-xs transition-colors cursor-pointer"
                          >
                            <Eye size={14} /> Ver en grande
                          </button>
                        </div>
                      )}

                      {/* Rejection reason box if rejected */}
                      {req.status === 'rechazada' && req.rejectionReason && (
                        <div className="mt-3 rounded-2xl bg-red-50 p-3 border border-red-200 text-xs">
                          <span className="font-bold text-red-900 block">Motivo del rechazo notificado:</span>
                          <p className="text-red-800 font-medium mt-0.5">{req.rejectionReason}</p>
                          {req.reviewedBy && (
                            <span className="block text-[10px] text-red-600 mt-1">
                              Revisado por: {req.reviewedBy} {req.reviewedAt ? `el ${new Date(req.reviewedAt).toLocaleDateString('es-GT')}` : ''}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Approval details if approved */}
                      {req.status === 'aprobada' && (
                        <div className="mt-3 rounded-2xl bg-green-50 p-3 border border-green-200 text-xs flex items-center justify-between">
                          <span className="font-bold text-green-900">
                            ✓ Solicitud aprobada y permisos de casero activados.
                          </span>
                          {req.reviewedBy && (
                            <span className="text-[11px] text-green-800">
                              Por: {req.reviewedBy}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-4 flex items-center justify-end gap-2.5 pt-3 border-t border-border/50 flex-wrap">
                        {req.status === 'pendiente' && (
                          <>
                            <button
                              type="button"
                              disabled={isProcessingVerifAction}
                              onClick={() => handleOpenRejectModal(req)}
                              className="flex items-center gap-1.5 rounded-xl border border-red-300 bg-white hover:bg-red-50 px-4 py-2 text-xs font-black text-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <X size={15} /> Rechazar solicitud...
                            </button>
                            <button
                              type="button"
                              disabled={isProcessingVerifAction}
                              onClick={() => handleOpenApproveModal(req)}
                              className="flex items-center gap-1.5 rounded-xl bg-forest hover:bg-forest-dark px-5 py-2 text-xs font-black text-white shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
                            >
                              <Check size={16} /> Aprobar y habilitar como casero
                            </button>
                          </>
                        )}

                        {req.status === 'rechazada' && (
                          <button
                            type="button"
                            disabled={isProcessingVerifAction}
                            onClick={() => handleOpenApproveModal(req)}
                            className="flex items-center gap-1.5 rounded-xl bg-forest/10 hover:bg-forest/20 px-3 py-1.5 text-xs font-bold text-forest transition-colors cursor-pointer"
                          >
                            <Check size={14} /> Reconsiderar y aprobar
                          </button>
                        )}

                        {req.status === 'aprobada' && (
                          <button
                            type="button"
                            disabled={isProcessingVerifAction}
                            onClick={() => handleOpenRejectModal(req)}
                            className="flex items-center gap-1.5 rounded-xl bg-red-50 hover:bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors cursor-pointer"
                          >
                            <X size={14} /> Revocar aprobación...
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              )}

              {/* Paginación de solicitudes */}
              <RuwaPagination
                currentPage={verificationPage}
                totalPages={totalVerificationPages}
                totalItems={filteredVerificationRequests.length}
                itemsPerPage={VERIFICATIONS_PER_PAGE}
                onPageChange={setVerificationPage}
                label="solicitudes"
              />
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
                              type="button"
                              onClick={() => setDeletingUpdate(item)}
                              className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest/10 text-forest">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-cafe">Gestión de Usuarios</h3>
                    <p className="text-xs text-text-muted">Asigna roles de Administrador, Propietario o Inquilino y modera accesos</p>
                  </div>
                </div>
                <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-black text-forest self-start sm:self-auto">
                  {allUsers.length} registrados
                </span>
              </div>

              {/* Filtros por Rol y Estado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                {/* Tabs de roles */}
                <div className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-crema/60 p-1 border border-border">
                  {[
                    { id: 'todos', label: 'Todos', count: userRoleCounts.todos },
                    { id: 'seeker', label: 'Inquilinos', count: userRoleCounts.seeker },
                    { id: 'owner', label: 'Propietarios', count: userRoleCounts.owner },
                    { id: 'admin', label: 'Admins', count: userRoleCounts.admin },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAdminUserRoleFilter(tab.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        adminUserRoleFilter === tab.id
                          ? 'bg-white text-forest shadow-xs font-extrabold'
                          : 'text-text-muted hover:text-cafe'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                {/* Filtro de estado */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-muted hidden md:inline">Estado:</span>
                  <select
                    value={adminUserStatusFilter}
                    onChange={(e) => setAdminUserStatusFilter(e.target.value)}
                    className="rounded-xl border border-border bg-[#FDFBF7] px-3 py-1.5 text-xs font-bold text-cafe outline-none cursor-pointer"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="active">🟢 Solo Activos ({userRoleCounts.active})</option>
                    <option value="inactive">🟡 Solo Inactivos ({userRoleCounts.inactive})</option>
                    <option value="suspended">🔴 Solo Suspendidos ({userRoleCounts.suspended})</option>
                  </select>
                </div>
              </div>

              {/* Buscador de usuarios */}
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-2.5">
                <Search size={16} className="text-text-muted shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar usuario por nombre, correo o teléfono..."
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-cafe outline-none"
                />
                {adminSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAdminSearchQuery('')}
                    className="text-text-muted hover:text-cafe p-1"
                    title="Limpiar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Lista de usuarios con paginación */}
              {filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-[#FDFBF7] py-10 text-center">
                  <Users size={36} className="mx-auto mb-2 text-text-muted/40" />
                  <p className="text-sm font-bold text-cafe">No se encontraron usuarios</p>
                  <p className="text-xs text-text-muted mt-1">
                    No hay resultados para los filtros o término de búsqueda ingresado.
                  </p>
                  {(adminSearchQuery || adminUserRoleFilter !== 'todos' || adminUserStatusFilter !== 'todos') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdminSearchQuery('');
                        setAdminUserRoleFilter('todos');
                        setAdminUserStatusFilter('todos');
                      }}
                      className="mt-3 text-xs font-extrabold text-forest hover:underline cursor-pointer"
                    >
                      Restablecer filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {paginatedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-crema/30 p-3 sm:p-3.5 transition-all hover:bg-white hover:border-[#E8D9C8]"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <UserAvatar user={u} size={42} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-cafe truncate">{u.name || 'Sin nombre'}</p>
                            {u.role === 'admin' && (
                              <span className="rounded-md bg-forest text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                Admin
                              </span>
                            )}
                            {u.role === 'owner' && (
                              <span className="rounded-md bg-dorado/20 text-dorado border border-dorado/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                Casero
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted truncate">
                            <span className="truncate">{u.email}</span>
                            {u.phone && (
                              <>
                                <span>•</span>
                                <span className="font-medium text-cafe">{u.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
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
                          className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-bold text-cafe outline-none cursor-pointer hover:border-forest"
                        >
                          <option value="seeker">👤 Inquilino</option>
                          <option value="owner">🏡 Propietario</option>
                          <option value="admin">🛡️ Administrador</option>
                        </select>
                        {(() => {
                          const currentStatus = resolveUserStatus(u, u.email);
                          return (
                            <select
                              value={currentStatus}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                if (newStatus === currentStatus) return;
                                setStatusModalTarget({
                                  user: u,
                                  targetStatus: newStatus,
                                  currentStatus,
                                });
                              }}
                              className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer border outline-none ${
                                currentStatus === 'active'
                                  ? 'bg-jade/10 text-jade border-jade/30 hover:bg-jade/20'
                                  : currentStatus === 'inactive'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                  : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                              }`}
                            >
                              <option value="active">🟢 Activo</option>
                              <option value="inactive">🟡 Inactivo</option>
                              <option value="suspended">🔴 Suspendido</option>
                            </select>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Componente de Paginación */}
              <RuwaPagination
                currentPage={adminUserPage}
                totalPages={totalUserPages}
                totalItems={filteredUsers.length}
                itemsPerPage={USERS_PER_PAGE}
                onPageChange={setAdminUserPage}
                label="usuarios"
              />
            </SectionCard>

            {/* Moderación de Propiedades */}
            <SectionCard>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-terracota/10 text-terracota">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-cafe">Moderación de Propiedades</h3>
                    <p className="text-xs text-text-muted">Supervisa y actualiza el estado de los inmuebles publicados en toda Guatemala</p>
                  </div>
                </div>
                <span className="rounded-full bg-terracota/10 px-3 py-1 text-xs font-black text-terracota self-start sm:self-auto">
                  {allProperties.length} registradas
                </span>
              </div>

              {/* Filtros por Estado */}
              <div className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-crema/60 p-1 border border-border mb-4">
                {[
                  { id: 'todas', label: 'Todas', count: propertyStatusCounts.todas },
                  { id: 'disponible', label: 'Disponibles', count: propertyStatusCounts.disponible },
                  { id: 'alquilada', label: 'Alquiladas', count: propertyStatusCounts.alquilada },
                  { id: 'pausada', label: 'Pausadas', count: propertyStatusCounts.pausada },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAdminPropertyStatusFilter(tab.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      adminPropertyStatusFilter === tab.id
                        ? 'bg-white text-forest shadow-xs font-extrabold'
                        : 'text-text-muted hover:text-cafe'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Buscador de Propiedades */}
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#E8D9C8] bg-[#FDFBF7] px-4 py-2.5">
                <Search size={16} className="text-text-muted shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar vivienda por título, zona, municipio o propietario..."
                  value={adminPropertySearch}
                  onChange={(e) => setAdminPropertySearch(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-cafe outline-none"
                />
                {adminPropertySearch && (
                  <button
                    type="button"
                    onClick={() => setAdminPropertySearch('')}
                    className="text-text-muted hover:text-cafe p-1"
                    title="Limpiar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Lista de propiedades con paginación */}
              {allProperties.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-[#FDFBF7] py-10 text-center">
                  <Building2 size={36} className="mx-auto mb-2 text-text-muted/40" />
                  <p className="text-sm font-bold text-cafe">No hay propiedades publicadas aún</p>
                  <p className="text-xs text-text-muted mt-1">Los caseros publicarán viviendas que aparecerán aquí para moderación.</p>
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-[#FDFBF7] py-10 text-center">
                  <Search size={36} className="mx-auto mb-2 text-text-muted/40" />
                  <p className="text-sm font-bold text-cafe">No se encontraron propiedades</p>
                  <p className="text-xs text-text-muted mt-1">Ningún inmueble coincide con el estado o búsqueda seleccionada.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminPropertySearch('');
                      setAdminPropertyStatusFilter('todas');
                    }}
                    className="mt-3 text-xs font-extrabold text-forest hover:underline cursor-pointer"
                  >
                    Restablecer búsqueda
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {paginatedProperties.map((prop) => {
                    const thumb = prop.thumbnail || prop.images?.[0] || '';
                    const propStatus = (prop.status || 'disponible').toLowerCase();
                    return (
                      <div
                        key={prop.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-crema/30 p-3 sm:p-3.5 transition-all hover:bg-white hover:border-[#E8D9C8]"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={prop.title || 'Propiedad'}
                              className="h-12 w-16 object-cover rounded-xl border border-border-light shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="h-12 w-16 rounded-xl bg-forest/10 border border-border-light flex items-center justify-center text-forest shrink-0">
                              <Home size={20} />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-cafe truncate">{prop.title || 'Propiedad sin título'}</p>
                              {propStatus === 'disponible' && (
                                <span className="rounded-full bg-jade/10 text-jade border border-jade/20 px-2 py-0.2 text-[9px] font-black uppercase">
                                  Disponible
                                </span>
                              )}
                              {propStatus === 'alquilada' && (
                                <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.2 text-[9px] font-black uppercase">
                                  Alquilada
                                </span>
                              )}
                              {propStatus === 'pausada' && (
                                <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.2 text-[9px] font-black uppercase">
                                  Pausada
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-muted truncate mt-0.5">
                              {prop.address?.approximate || prop.address?.zone || prop.zone || 'Ubicación no indicada'} •{' '}
                              <strong className="text-cafe font-extrabold">Q {Number(prop.price || 0).toLocaleString()}</strong>/mes
                            </p>
                            {(prop.ownerName || prop.ownerEmail) && (
                              <p className="text-[11px] text-text-muted truncate mt-0.5">
                                Propietario: {prop.ownerName || prop.ownerEmail}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <select
                            value={propStatus}
                            onChange={async (e) => {
                              try {
                                await updatePropertyStatus(prop.id, e.target.value);
                                setAdminNotice(`Estado del inmueble cambiado a ${e.target.value}.`);
                              } catch (err) {
                                window.alert(err.message);
                              }
                            }}
                            className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-bold text-cafe outline-none cursor-pointer hover:border-forest"
                          >
                            <option value="disponible">🟢 Disponible</option>
                            <option value="alquilada">🔵 Alquilada</option>
                            <option value="pausada">⏸️ Pausada</option>
                          </select>
                          <Link
                            to={`/propiedad/${prop.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center h-8 w-8 rounded-xl bg-forest/10 hover:bg-forest/20 text-forest transition-colors cursor-pointer"
                            title="Ver publicación"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Componente de Paginación */}
              <RuwaPagination
                currentPage={adminPropertyPage}
                totalPages={totalPropertyPages}
                totalItems={filteredProperties.length}
                itemsPerPage={PROPERTIES_PER_PAGE}
                onPageChange={setAdminPropertyPage}
                label="viviendas"
              />
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
                  {
                    icon: ShieldCheck,
                    label: 'Tipo de cuenta',
                    value: (isAdmin || user?.role === 'admin')
                      ? 'Super Administrador'
                      : user?.role === 'owner'
                      ? 'Propietario / Casero'
                      : 'Inquilino / Buscador',
                    iconBg: (isAdmin || user?.role === 'admin') ? 'bg-forest/15' : user?.role === 'owner' ? 'bg-dorado/10' : 'bg-forest/10',
                    iconColor: (isAdmin || user?.role === 'admin') ? 'text-forest' : user?.role === 'owner' ? 'text-dorado' : 'text-forest',
                  },
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

            {/* Security — Password & Authentication */}
            <SectionCard>
              <h3 className="flex items-center gap-2 text-base font-extrabold text-cafe mb-5">
                <Lock size={20} className="text-forest" /> Seguridad y Acceso
              </h3>
              <div className="space-y-4">
                {(() => {
                  const isGoogleUser = Boolean(
                    user?.authProviders?.includes('google.com') ||
                    firebaseAuth?.currentUser?.providerData?.some((p) => p.providerId === 'google.com')
                  );
                  const hasPasswordProvider = Boolean(
                    user?.authProviders?.includes('password') ||
                    firebaseAuth?.currentUser?.providerData?.some((p) => p.providerId === 'password')
                  );
                  const isGoogleOnly = isGoogleUser && !hasPasswordProvider;

                  return (
                    <>
                      {/* Google Authentication Status Card */}
                      {isGoogleUser && (
                        <div className="rounded-2xl border border-[#E8D9C8]/80 bg-[#FDFBF7] p-4 sm:p-5">
                          <div className="flex items-start gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white border border-[#E8D9C8] shadow-xs">
                              <svg width="22" height="22" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-extrabold text-cafe">Acceso vinculado con Google</h4>
                                <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-black text-forest">
                                  ✓ Protegido
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                                Tu sesión y credenciales están administradas directamente por Google (<strong className="text-cafe font-bold">{user?.email}</strong>). No requieres recordar una contraseña local para ingresar.
                              </p>
                              {isGoogleOnly && (
                                <div className="mt-3.5 pt-3 border-t border-[#E8D9C8]/60 flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-[11px] text-text-muted font-bold">¿Deseas poder entrar también con contraseña escrita?</span>
                                  <button
                                    type="button"
                                    onClick={handleSendResetEmail}
                                    disabled={resetEmailBusy}
                                    className="text-xs font-black text-forest hover:text-forest-dark hover:underline disabled:opacity-60 cursor-pointer"
                                  >
                                    {resetEmailBusy ? 'Enviando enlace...' : 'Crear contraseña vía correo'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Password Row */}
                      <div className="flex items-center justify-between rounded-2xl border border-[#E8D9C8]/60 bg-[#FDFBF7] p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest/10 text-forest">
                            <Lock size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-cafe">
                              {isGoogleOnly ? 'Contraseña local (opcional)' : 'Contraseña de la cuenta'}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              {isGoogleOnly ? 'No configurada (acceso vía Google)' : 'Protección con contraseña activa'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setShowPasswordForm(!showPasswordForm); setPwMessage(''); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
                          className="flex items-center gap-1.5 rounded-xl bg-crema px-4 py-2 text-xs font-bold text-cafe transition-colors hover:bg-[#E8D9C8] cursor-pointer"
                        >
                          {showPasswordForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {showPasswordForm ? 'Cerrar' : isGoogleOnly ? 'Configurar' : 'Cambiar'}
                        </button>
                      </div>

                      {/* Password change form */}
                      {showPasswordForm && (
                        <form onSubmit={handleChangePassword} className="rounded-2xl border border-forest/20 bg-forest/5 p-5 space-y-4" style={{ animation: 'slide-up 0.3s ease-out' }}>
                          {pwMessage && (
                            <div className={`flex flex-col gap-1.5 rounded-xl p-3.5 text-xs font-bold ${pwError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-jade/15 text-forest border border-jade/30'}`}>
                              <div className="flex items-center gap-2">
                                {pwError ? <AlertTriangle size={15} className="shrink-0 text-red-600" /> : <Check size={15} className="shrink-0 text-forest" />}
                                <span>{pwMessage}</span>
                              </div>
                              {pwError && (
                                <div className="mt-1 flex items-center justify-between border-t border-red-200/60 pt-2">
                                  <span className="text-[11px] text-red-600/90 font-medium">¿Olvidaste tu contraseña actual?</span>
                                  <button
                                    type="button"
                                    onClick={handleSendResetEmail}
                                    disabled={resetEmailBusy}
                                    className="text-[11px] font-black text-terracota hover:underline disabled:opacity-60 cursor-pointer"
                                  >
                                    {resetEmailBusy ? 'Enviando...' : 'Restablecer por correo'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Current password */}
                          <div>
                            <div className="mb-1.5 flex items-center justify-between">
                              <label className="block text-xs font-extrabold uppercase tracking-wider text-cafe">Contraseña actual</label>
                              <button
                                type="button"
                                onClick={handleSendResetEmail}
                                disabled={resetEmailBusy}
                                className="text-[11px] font-extrabold text-terracota hover:underline disabled:opacity-60 cursor-pointer"
                              >
                                {resetEmailBusy ? 'Enviando...' : '¿La olvidaste? Restablecer'}
                              </button>
                            </div>
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
                              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="text-text-muted hover:text-cafe cursor-pointer">
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
                                placeholder="Mínimo 8 caracteres"
                                required
                                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-cafe outline-none"
                              />
                              <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="text-text-muted hover:text-cafe cursor-pointer">
                                {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            {/* Strength meter */}
                            {newPw && (
                              <div className="mt-2.5" aria-live="polite">
                                <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
                                  <span className="text-text-muted">Nivel de seguridad</span>
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
                                placeholder="Repite la nueva contraseña"
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
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-forest to-forest-dark px-4 py-3 text-sm font-black text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
                          >
                            {pwBusy ? 'Actualizando contraseña...' : 'Actualizar contraseña'}
                          </button>
                        </form>
                      )}
                    </>
                  );
                })()}
              </div>
            </SectionCard>

            {/* Identity Verification */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-base font-extrabold text-cafe">
                  <BadgeCheck size={20} className={isAdmin ? 'text-forest' : 'text-dorado'} />
                  {isAdmin ? 'Verificación de Super Administrador' : 'Verificación oficial de identidad'}
                </h3>
                {isAdmin ? (
                  <span className="rounded-full bg-forest/20 px-2.5 py-0.5 text-[10px] font-black text-forest">
                    Maestro Activo
                  </span>
                ) : isVerified ? (
                  <button
                    type="button"
                    onClick={() => setShowDpiModal(true)}
                    className="text-xs font-bold text-forest hover:underline"
                  >
                    Actualizar datos
                  </button>
                ) : null}
              </div>

              {dpiPurgedNotice && (
                <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800 animate-[fade-in_0.2s_ease-out]">
                  <Check size={16} className="text-red-600 shrink-0" />
                  <span>Datos de DPI purgados con éxito. Tu cuenta ha vuelto al estado no verificado.</span>
                </div>
              )}

              {isAdmin ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-forest/30 bg-gradient-to-br from-forest/10 via-[#FAF5EE] to-forest/5 p-5 shadow-xs">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-forest/20 text-forest shadow-xs">
                      <ShieldCheck size={32} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-cafe">Identidad con Autorización Administrativa</p>
                        <span className="rounded-full bg-forest/20 px-2.5 py-0.5 text-[10px] font-black text-forest">
                          Exento de DPI
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        La verificación con DPI aplica exclusivamente a los roles de inquilino y propietario para generar confianza en la comunidad. Tu rol de administrador cuenta con privilegios superiores directos del sistema.
                      </p>
                    </div>
                  </div>
                </div>
              ) : isVerified ? (
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
                            {user?.dpiData?.municipality || 'Ubicación no indicada'}, {user?.dpiData?.department || 'Ubicación no indicada'}
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
                          onClick={() => handleOpenDpiModal()}
                          className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-cafe hover:bg-crema transition-colors cursor-pointer"
                        >
                          <Edit3 size={13} /> Modificar datos
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPurgeDpiModal(true)}
                          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                          title="Eliminar datos de DPI del dispositivo"
                        >
                          <Trash2 size={13} /> Purgar datos de DPI
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : user?.verificationStatus === 'pendiente' ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-amber-300 bg-amber-50/70 p-5 shadow-xs">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-700 shadow-xs">
                      <Clock3 size={26} className="animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-amber-950">Solicitud de verificación en revisión</p>
                        <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-black text-amber-900">
                          Revisión por Admin
                        </span>
                      </div>
                      <p className="text-xs text-amber-900/90 mt-1.5 leading-relaxed">
                        Tus datos oficiales y fotografía de DPI fueron recibidos y están siendo revisados por el equipo de administración.
                        En cuanto sea aprobada, <strong>se te habilitará el permiso de subir inmuebles</strong> y recibirás una notificación en tiempo real.
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div className="rounded-xl bg-white/90 p-2.5 border border-amber-200">
                          <span className="text-[10px] font-extrabold uppercase text-amber-800/80 block">CUI Registrado</span>
                          <span className="font-mono font-bold text-cafe">{formatDpiCui(user?.dpiData?.cui)}</span>
                        </div>
                        <div className="rounded-xl bg-white/90 p-2.5 border border-amber-200">
                          <span className="text-[10px] font-extrabold uppercase text-amber-800/80 block">Municipio / Departamento</span>
                          <span className="font-bold text-cafe truncate block">
                            {user?.dpiData?.municipality || 'N/A'}, {user?.dpiData?.department || 'Guatemala'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDpiModal(true)}
                          className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-xs"
                        >
                          <Edit3 size={13} /> Modificar o actualizar solicitud
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : user?.verificationStatus === 'rechazada' ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-red-300 bg-red-50/70 p-5 shadow-xs">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-red-700 shadow-xs">
                      <AlertTriangle size={26} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-red-950">Solicitud de verificación rechazada</p>
                        <span className="rounded-full bg-red-200 px-2.5 py-0.5 text-[10px] font-black text-red-900">
                          Requiere corrección
                        </span>
                      </div>
                      <p className="text-xs text-red-900/90 mt-1 leading-relaxed">
                        El administrador revisó tu formulario y no pudo aprobar tu acreditación con los datos presentados.
                      </p>

                      <div className="mt-3 rounded-xl bg-white p-3.5 border border-red-200">
                        <span className="text-[11px] font-extrabold uppercase text-red-700 block mb-1">
                          Motivo especificado por el administrador:
                        </span>
                        <p className="text-xs font-bold text-cafe">
                          "{user?.verificationRejectionReason || 'Problema con la legibilidad del documento o los datos ingresados.'}"
                        </p>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDpiModal()}
                          className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-black text-white shadow-md transition-all cursor-pointer"
                        >
                          <Sparkles size={14} /> Corregir datos y volver a solicitar
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
                        Ingresa tus datos personales oficiales de DPI para obtener la insignia dorada de <strong>"Verificado con DPI"</strong> y habilitar la publicación de propiedades.
                      </p>
                      <ul className="mt-3 space-y-1.5 text-[11px] font-semibold text-text-muted">
                        <li className="flex items-center gap-1.5"><Check size={13} className="text-forest" /> Registro de CUI oficial de 13 dígitos y lugar de emisión</li>
                        <li className="flex items-center gap-1.5"><Check size={13} className="text-forest" /> Contacto de referencia familiar o laboral para respaldo</li>
                        <li className="flex items-center gap-1.5"><Check size={13} className="text-forest" /> Subida de fotografía frontal del documento</li>
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
                onClick={() => setShowLogoutModal(true)}
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
                    {isVerified ? 'Modificar Datos de Verificación' : 'Verificación de Identidad con DPI'}
                    <span className="text-[10px] uppercase font-black bg-dorado/20 text-dorado px-2 py-0.5 rounded-full">
                      {isVerified ? 'Certificado Activo' : 'Oficial'}
                    </span>
                  </h2>
                  <p className="text-xs text-text-secondary font-medium">
                    {isVerified
                      ? 'Actualiza tu contacto de respaldo y dirección manteniendo tu certificación activa'
                      : 'Datos personales para generar máxima confianza en la comunidad RuwaJay'}
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

              {user?.verificationStatus === 'rechazada' && (
                <div className="rounded-2xl bg-red-50 p-4 border border-red-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-red-800 tracking-wider">
                    <AlertTriangle size={16} className="text-red-600 shrink-0" />
                    <span>Tu solicitud anterior fue rechazada</span>
                  </div>
                  {user.verificationRejectionReason && (
                    <p className="text-xs font-bold text-red-700 bg-white/90 p-2.5 rounded-xl border border-red-200/80 leading-relaxed">
                      Motivo: "{user.verificationRejectionReason}"
                    </p>
                  )}
                  <p className="text-[11px] text-red-700 leading-normal">
                    El registro anterior ha sido limpiado por completo. Por favor completa este formulario nuevamente desde cero para que el administrador pueda revisarlo y habilitarte como casero.
                  </p>
                </div>
              )}

              {/* CUI Input */}
              <div>
                <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">
                  Número de CUI / DPI (13 dígitos) *
                </label>
                <div className={`flex items-center gap-3 rounded-2xl border border-[#E8D9C8] px-4 py-3 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20 ${isVerified ? 'bg-black/5 opacity-80' : 'bg-[#FDFBF7]'}`}>
                  <FileCheck size={18} className="text-dorado shrink-0" />
                  <input
                    type="text"
                    required
                    readOnly={isVerified}
                    maxLength={16}
                    value={dpiForm.cui}
                    onChange={(e) => setDpiForm({ ...dpiForm, cui: formatDpiCui(e.target.value) })}
                    placeholder="Ej. 2450 12345 0101"
                    className={`min-w-0 flex-1 bg-transparent text-sm font-extrabold tracking-wider text-cafe outline-none ${isVerified ? 'cursor-not-allowed text-cafe/80' : ''}`}
                  />
                  {isVerified && <Lock size={15} className="text-text-muted shrink-0" title="CUI validado oficialmente" />}
                </div>
                {isVerified ? (
                  <p className="text-[11px] text-forest font-bold mt-1 flex items-center gap-1">
                    <Check size={12} /> CUI oficial certificado por el administrador.
                  </p>
                ) : (
                  <p className="text-[11px] text-text-muted mt-1">El número único de identificación de tu DPI emitido por RENAP.</p>
                )}
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
                  className="rounded-xl px-5 py-3 text-xs font-bold text-text-muted hover:text-cafe transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={verifyBusy}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-dorado to-[#C5850F] px-6 py-3 text-xs font-black text-white shadow-lg hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {verifyBusy ? 'Guardando...' : isVerified ? 'Guardar Cambios de Verificación' : 'Validar y Obtener Insignia Oficial'}
                  <CheckCircle2 size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ Modal de Confirmación de Solicitud de Verificación ═══════ */}
      {showDpiSuccessModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fade-in_0.2s_ease-out]"
          onClick={() => setShowDpiSuccessModal(false)}
        >
          <div
            className="relative flex flex-col w-full max-w-md rounded-3xl bg-white shadow-2xl border border-[#E8D9C8] overflow-hidden animate-[scale-up_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top golden / forest accent line */}
            <div className="h-2 bg-gradient-to-r from-dorado via-amber-400 to-forest" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowDpiSuccessModal(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF5EE] text-text-muted hover:bg-border-light hover:text-cafe transition-colors border border-border-light cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="p-6 sm:p-7 text-center">
              {/* Icon badge */}
              <div className="w-16 h-16 rounded-2xl bg-forest/10 text-forest flex items-center justify-center mx-auto mb-4 ring-8 ring-forest/5 shadow-sm">
                <ShieldCheck size={36} className="text-forest" />
              </div>

              {/* Title & Badge */}
              <h3 className="text-xl font-black text-cafe tracking-tight">
                ¡Solicitud de Verificación Enviada!
              </h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-forest/10 border border-forest/20 text-forest text-xs font-bold mx-auto">
                <Clock size={13} />
                <span>En proceso de revisión</span>
              </div>

              {/* Message */}
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mt-3.5">
                Tu solicitud para ser casero está siendo revisada por el equipo administrador. Recibirás una notificación en tiempo real en cuanto sea procesada.
              </p>

              {/* Info steps card */}
              <div className="mt-5 rounded-2xl bg-[#FAF5EE] border border-border-light p-4 text-left space-y-2.5 text-xs text-text-secondary">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-dorado/25 text-dorado flex items-center justify-center font-bold shrink-0 mt-0.5 text-[10px]">
                    1
                  </div>
                  <span>Revisión y validación de los datos de tu DPI por el equipo de moderación.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-forest/20 text-forest flex items-center justify-center font-bold shrink-0 mt-0.5 text-[10px]">
                    2
                  </div>
                  <span>Activación de la insignia <strong className="text-cafe">Casero Verificado</strong> en tu cuenta.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 mt-0.5 text-[10px]">
                    3
                  </div>
                  <span>Publicación y gestión de viviendas con máxima confianza para inquilinos.</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setShowDpiSuccessModal(false)}
                className="mt-6 w-full py-3 px-5 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-forest to-emerald-700 hover:from-forest-dark hover:to-forest text-white shadow-lg shadow-forest/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={18} />
                <span>Entendido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Modal de Confirmación de Edición de DPI (Usuario Verificado) ═══════ */}
      {showDpiEditSuccessModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fade-in_0.2s_ease-out]"
          onClick={() => setShowDpiEditSuccessModal(false)}
        >
          <div
            className="relative flex flex-col w-full max-w-md rounded-3xl bg-white shadow-2xl border border-[#E8D9C8] overflow-hidden animate-[scale-up_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top golden / forest accent line */}
            <div className="h-2 bg-gradient-to-r from-forest via-emerald-500 to-dorado" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowDpiEditSuccessModal(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF5EE] text-text-muted hover:bg-border-light hover:text-cafe transition-colors border border-border-light cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="p-6 sm:p-7 text-center">
              {/* Icon badge */}
              <div className="w-16 h-16 rounded-2xl bg-forest/10 text-forest flex items-center justify-center mx-auto mb-4 ring-8 ring-forest/5 shadow-sm">
                <CheckCircle2 size={36} className="text-forest" />
              </div>

              {/* Title & Badge */}
              <h3 className="text-xl font-black text-cafe tracking-tight">
                ¡Datos Actualizados!
              </h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-forest/10 border border-forest/20 text-forest text-xs font-bold mx-auto">
                <BadgeCheck size={13} />
                <span>Certificado Oficial Vigente</span>
              </div>

              {/* Message */}
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mt-3.5">
                Tus datos de contacto de respaldo y dirección se han actualizado correctamente sin alterar tu estado de verificación ni requerir nueva aprobación.
              </p>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setShowDpiEditSuccessModal(false)}
                className="mt-6 w-full py-3 px-5 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-forest to-emerald-700 hover:from-forest-dark hover:to-forest text-white shadow-lg shadow-forest/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={18} />
                <span>Entendido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Modal de Confirmación para Purgar Datos de DPI ═══════ */}
      {showPurgeDpiModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fade-in_0.2s_ease-out]"
          onClick={() => setShowPurgeDpiModal(false)}
        >
          <div
            className="relative flex flex-col w-full max-w-md rounded-3xl bg-white shadow-2xl border border-red-200/60 overflow-hidden animate-[scale-up_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top red/amber warning accent line */}
            <div className="h-2 bg-gradient-to-r from-red-500 via-amber-500 to-red-600" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowPurgeDpiModal(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF5EE] text-text-muted hover:bg-border-light hover:text-cafe transition-colors border border-border-light cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="p-6 sm:p-7 text-center">
              {/* Danger Icon badge */}
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50/50 shadow-sm border border-red-100">
                <Trash2 size={30} className="text-red-600" />
              </div>

              {/* Title & Badge */}
              <h3 className="text-xl font-black text-cafe tracking-tight">
                ¿Purgar datos de DPI?
              </h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold mx-auto">
                <AlertTriangle size={13} />
                <span>Baja de acreditación oficial</span>
              </div>

              {/* Message */}
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mt-3.5">
                ¿Estás seguro de purgar y eliminar tus datos de verificación de DPI? Al purgar tus datos, tu documento será eliminado, perderás tu insignia de verificación oficial y el estatus de casero verificado hasta que vuelvas a registrarte.
              </p>

              {/* Security info card */}
              <div className="mt-4 rounded-2xl bg-[#FFF8F7] border border-red-100 p-3.5 text-left text-xs text-red-950/80 leading-relaxed">
                <p className="font-bold text-red-800 flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={14} className="text-red-600" /> Pérdida de privilegios:
                </p>
                Tu cuenta volverá al estado no verificado y deberás presentar una nueva solicitud si deseas publicar o certificar propiedades nuevamente.
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  disabled={purgingDpi}
                  onClick={() => setShowPurgeDpiModal(false)}
                  className="flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-text-muted hover:bg-crema hover:text-cafe border border-border transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={purgingDpi}
                  onClick={async () => {
                    setPurgingDpi(true);
                    try {
                      await purgeDpiData();
                      setShowPurgeDpiModal(false);
                      setDpiPurgedNotice(true);
                      setTimeout(() => setDpiPurgedNotice(false), 5000);
                    } catch (err) {
                      console.error('Error al purgar datos:', err);
                      window.alert('No se pudieron purgar los datos. Intenta nuevamente.');
                    } finally {
                      setPurgingDpi(false);
                    }
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  <span>{purgingDpi ? 'Purgando...' : 'Sí, purgar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Modal de Confirmación para Eliminar Comunicado ═══════ */}
      {deletingUpdate && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fade-in_0.2s_ease-out]"
          onClick={() => {
            if (!isDeletingUpdateBusy) setDeletingUpdate(null);
          }}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-red-100 animate-[scale-up_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top red danger bar */}
            <div className="h-2 bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />

            <button
              type="button"
              disabled={isDeletingUpdateBusy}
              onClick={() => setDeletingUpdate(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-cafe p-2 rounded-full hover:bg-crema transition-colors cursor-pointer disabled:opacity-50"
              title="Cerrar"
            >
              <X size={18} />
            </button>

            <div className="p-6 sm:p-7 text-center">
              {/* Danger Icon badge */}
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50/50 shadow-sm border border-red-100">
                <Trash2 size={30} className="text-red-600" />
              </div>

              {/* Title & Badge */}
              <h3 className="text-xl font-black text-cafe tracking-tight">
                ¿Eliminar comunicado?
              </h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold mx-auto">
                <AlertTriangle size={13} />
                <span>Acción irreversible</span>
              </div>

              {/* Comunicado Preview Card */}
              <div className="mt-4 rounded-2xl bg-[#FFF8F7] border border-red-100 p-3.5 text-left text-xs leading-relaxed">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase text-red-800 shrink-0">
                    {deletingUpdate.category || 'comunicado'}
                  </span>
                  <span className="font-extrabold text-cafe text-sm truncate block flex-1">
                    {deletingUpdate.title}
                  </span>
                </div>
                <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                  {deletingUpdate.content}
                </p>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed mt-3">
                Este comunicado será removido permanentemente y ya no aparecerá en la web ni en la app móvil para los usuarios.
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  disabled={isDeletingUpdateBusy}
                  onClick={() => setDeletingUpdate(null)}
                  className="flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-text-muted hover:bg-crema hover:text-cafe border border-border transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeletingUpdateBusy}
                  onClick={async () => {
                    setIsDeletingUpdateBusy(true);
                    try {
                      await deleteSystemUpdate(deletingUpdate.id);
                      setAdminNotice('Comunicado eliminado exitosamente.');
                      setDeletingUpdate(null);
                    } catch (err) {
                      setAdminNotice(err.message || 'Error al eliminar comunicado.');
                    } finally {
                      setIsDeletingUpdateBusy(false);
                    }
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  <span>{isDeletingUpdateBusy ? 'Eliminando...' : 'Sí, eliminar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Modal de Confirmación para Cambiar Estado de Usuario ═══════ */}
      {statusModalTarget && (() => {
        const { user: targetUser, targetStatus } = statusModalTarget;
        const isSuspending = targetStatus === 'suspended';
        const isActivating = targetStatus === 'active';

        const config = isSuspending ? {
          gradient: 'from-red-500 via-rose-500 to-red-600',
          borderColor: 'border-red-100',
          badgeBg: 'bg-red-50 border-red-200 text-red-700',
          badgeText: 'Acceso bloqueado',
          iconBg: 'bg-red-50 text-red-600 ring-red-50/50 border-red-100',
          icon: <AlertTriangle size={30} className="text-red-600" />,
          title: '¿Suspender cuenta de usuario?',
          description: `El usuario "${targetUser.name || targetUser.email}" será desconectado inmediatamente del sistema y no podrá volver a iniciar sesión hasta que sea reactivado.`,
          cardBg: 'bg-[#FFF8F7] border-red-100',
          btnGradient: 'from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 shadow-red-600/20',
          btnText: 'Sí, suspender cuenta',
          btnLoadingText: 'Suspendiendo...',
        } : isActivating ? {
          gradient: 'from-emerald-500 via-teal-500 to-forest',
          borderColor: 'border-emerald-100',
          badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          badgeText: 'Restablecimiento de acceso',
          iconBg: 'bg-emerald-50 text-emerald-600 ring-emerald-50/50 border-emerald-100',
          icon: <ShieldCheck size={30} className="text-emerald-600" />,
          title: '¿Reactivar cuenta de usuario?',
          description: `Se levantarán todas las restricciones sobre la cuenta de "${targetUser.name || targetUser.email}". El usuario podrá iniciar sesión y entrar a la plataforma normalmente.`,
          cardBg: 'bg-[#F0FAF5] border-emerald-100',
          btnGradient: 'from-emerald-600 to-forest hover:from-emerald-700 hover:to-forest-dark shadow-emerald-600/20',
          btnText: 'Sí, reactivar cuenta',
          btnLoadingText: 'Reactivando...',
        } : {
          gradient: 'from-amber-400 via-amber-500 to-amber-600',
          borderColor: 'border-amber-100',
          badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
          badgeText: 'Pausa de acceso',
          iconBg: 'bg-amber-50 text-amber-600 ring-amber-50/50 border-amber-100',
          icon: <Clock3 size={30} className="text-amber-600" />,
          title: '¿Marcar cuenta como inactiva?',
          description: `La cuenta de "${targetUser.name || targetUser.email}" quedará inactiva y no podrá navegar activamente hasta que contacte a un administrador o sea reactivada.`,
          cardBg: 'bg-[#FDFBF7] border-amber-100',
          btnGradient: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20',
          btnText: 'Sí, marcar inactiva',
          btnLoadingText: 'Actualizando...',
        };

        return (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fade-in_0.2s_ease-out]"
            onClick={() => {
              if (!isUpdatingStatusBusy) setStatusModalTarget(null);
            }}
          >
            <div
              className={`relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border ${config.borderColor} animate-[scale-up_0.25s_ease-out]`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Accent Gradient */}
              <div className={`h-2 bg-gradient-to-r ${config.gradient}`} />

              <button
                type="button"
                disabled={isUpdatingStatusBusy}
                onClick={() => setStatusModalTarget(null)}
                className="absolute top-4 right-4 text-text-muted hover:text-cafe p-2 rounded-full hover:bg-crema transition-colors cursor-pointer disabled:opacity-50"
                title="Cerrar"
              >
                <X size={18} />
              </button>

              <div className="p-6 sm:p-7 text-center">
                {/* Icon Badge */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-8 shadow-sm border ${config.iconBg}`}>
                  {config.icon}
                </div>

                {/* Title & Badge */}
                <h3 className="text-xl font-black text-cafe tracking-tight">
                  {config.title}
                </h3>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full border text-xs font-bold mx-auto ${config.badgeBg}`}>
                  <Shield size={13} />
                  <span>{config.badgeText}</span>
                </div>

                {/* User Info Card */}
                <div className={`mt-4 rounded-2xl border p-3.5 text-left text-xs ${config.cardBg}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cafe/10 flex items-center justify-center font-bold text-cafe shrink-0 overflow-hidden">
                      {targetUser.avatarImage ? (
                        <img src={targetUser.avatarImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (targetUser.name?.[0] || targetUser.email?.[0] || 'U').toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-cafe text-sm truncate">{targetUser.name || 'Usuario'}</p>
                      <p className="text-xs text-text-muted truncate">{targetUser.email}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed mt-3">
                  {config.description}
                </p>

                {/* Action Buttons */}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isUpdatingStatusBusy}
                    onClick={() => setStatusModalTarget(null)}
                    className="flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-text-muted hover:bg-crema hover:text-cafe border border-border transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingStatusBusy}
                    onClick={async () => {
                      setIsUpdatingStatusBusy(true);
                      try {
                        await updateUserStatus(targetUser.id, targetStatus);
                        const statusLabels = {
                          active: 'Activo (Acceso totalmente habilitado)',
                          inactive: 'Inactivo',
                          suspended: 'Suspendido (Acceso bloqueado)',
                        };
                        setAdminNotice(`Estado de cuenta de ${targetUser.email} cambiado a ${statusLabels[targetStatus] || targetStatus}.`);
                        setStatusModalTarget(null);
                      } catch (err) {
                        console.error('Error al actualizar estado:', err);
                        window.alert(err.message || 'Error al actualizar estado.');
                      } finally {
                        setIsUpdatingStatusBusy(false);
                      }
                    }}
                    className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r ${config.btnGradient} shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50`}
                  >
                    {isSuspending ? <AlertTriangle size={15} /> : isActivating ? <ShieldCheck size={15} /> : <Clock3 size={15} />}
                    <span>{isUpdatingStatusBusy ? config.btnLoadingText : config.btnText}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                    {user?.dpiData?.municipality || 'Ubicación no indicada'}, {user?.dpiData?.department || 'Ubicación no indicada'}
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
                      <PrivateMedia
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

      {/* ── Modal de Rechazo de Verificación (Admin) ── */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-[fade-in_0.2s_ease-out]">
          <div
            className="relative flex flex-col w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-red-200 animate-[scale-up_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(() => {
              const targetUser = allUsers.find(
                (u) => (u.id && (u.id === rejectingRequest.userId || u.id === rejectingRequest.id)) ||
                       (u.email && rejectingRequest.userEmail && u.email.toLowerCase() === rejectingRequest.userEmail.toLowerCase())
              );
              const targetName = targetUser?.name || targetUser?.displayName || rejectingRequest.userName || (targetUser?.email ? targetUser.email.split('@')[0] : (rejectingRequest.userEmail ? rejectingRequest.userEmail.split('@')[0] : 'Usuario'));
              const targetAvatar = targetUser?.avatarImage || targetUser?.avatar || targetUser?.photoURL || rejectingRequest.userAvatar || null;
              const displayTargetUser = {
                ...targetUser,
                name: targetName,
                avatarImage: targetAvatar,
                avatarId: targetUser?.avatarId || rejectingRequest.avatarId,
              };

              return (
                <div className="flex items-center justify-between border-b border-border-light bg-red-50/80 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={displayTargetUser} size={42} className="shrink-0" />
                    <div>
                      <h3 className="text-base font-extrabold text-cafe">Rechazar Solicitud de Casero</h3>
                      <p className="text-xs text-text-muted">
                        <strong className="text-cafe">{targetName}</strong> {targetUser?.email || rejectingRequest.userEmail ? `· ${targetUser?.email || rejectingRequest.userEmail}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRejectingRequest(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-text-muted hover:text-cafe border border-border-light transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })()}

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                Indica el motivo del rechazo. Este mensaje le llegará al usuario como <strong>notificación en tiempo real</strong> para que pueda corregir sus datos y volver a postularse.
              </p>

              {/* Motivos rápidos */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-text-muted mb-2">
                  Motivos frecuentes (haz clic para autocompletar):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'La fotografía del DPI está borrosa o ilegible',
                    'El número de CUI no coincide con los datos del RENAP',
                    'Documento de identificación vencido',
                    'El contacto de respaldo o teléfono no es válido',
                    'Los nombres o apellidos no coinciden con el documento presentado',
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setRejectionReasonInput(reason)}
                      className={`rounded-xl border px-2.5 py-1 text-xs text-left transition-all cursor-pointer ${
                        rejectionReasonInput === reason
                          ? 'border-red-500 bg-red-50 text-red-700 font-bold'
                          : 'border-border bg-white text-text-secondary hover:border-red-300'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs font-bold text-cafe mb-1.5">
                  Descripción detallada del motivo *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="Escribe claramente qué dato debe corregir el usuario..."
                  className="w-full rounded-2xl border border-border bg-[#FDFBF7] p-3 text-xs font-medium text-cafe outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-text-muted hover:text-cafe transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isProcessingVerifAction || !rejectionReasonInput.trim()}
                  onClick={handleConfirmReject}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isProcessingVerifAction ? 'Procesando...' : 'Confirmar Rechazo y Notificar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmación de Aprobación de Casero (Admin) ── */}
      {approvingRequest && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-[fade-in_0.2s_ease-out]">
          <div
            className="relative flex flex-col w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-forest/30 animate-[scale-up_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top green accent line */}
            <div className="h-2 bg-gradient-to-r from-forest via-emerald-500 to-forest-dark" />

            {/* Header */}
            {(() => {
              const targetUser = allUsers.find(
                (u) => (u.id && (u.id === approvingRequest.userId || u.id === approvingRequest.id)) ||
                       (u.email && approvingRequest.userEmail && u.email.toLowerCase() === approvingRequest.userEmail.toLowerCase())
              );
              const targetName = targetUser?.name || targetUser?.displayName || approvingRequest.userName || (targetUser?.email ? targetUser.email.split('@')[0] : (approvingRequest.userEmail ? approvingRequest.userEmail.split('@')[0] : 'Usuario'));
              const targetAvatar = targetUser?.avatarImage || targetUser?.avatar || targetUser?.photoURL || approvingRequest.userAvatar || null;
              const displayTargetUser = {
                ...targetUser,
                name: targetName,
                avatarImage: targetAvatar,
                avatarId: targetUser?.avatarId || approvingRequest.avatarId,
              };

              return (
                <>
                  <div className="flex items-center justify-between border-b border-border-light bg-[#F4F9F5] px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest/15 text-forest shadow-xs">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-cafe">Aprobar Solicitud de Casero</h3>
                        <p className="text-xs text-text-muted">
                          Habilitación de rol y permisos oficiales de propietario
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApprovingRequest(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-text-muted hover:text-cafe border border-border-light transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-4">
                    {/* User Info Card */}
                    <div className="flex items-center gap-3.5 rounded-2xl bg-[#FDFBF7] p-3.5 border border-[#E8D9C8]">
                      <UserAvatar user={displayTargetUser} size={48} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-cafe truncate">{targetName}</h4>
                        <p className="text-xs text-text-muted truncate">{targetUser?.email || approvingRequest.userEmail}</p>
                        {(targetUser?.phone || approvingRequest.userPhone) && (
                          <p className="text-xs font-semibold text-forest mt-0.5">
                            Tel: {targetUser?.phone || approvingRequest.userPhone}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-forest/15 text-forest px-2.5 py-1 text-[10px] font-black uppercase">
                        Solicitante
                      </span>
                    </div>

                    {/* Explanation Box */}
                    <div className="rounded-2xl bg-forest/10 border border-forest/20 p-4 space-y-2 text-xs">
                      <p className="font-extrabold text-forest-dark flex items-center gap-1.5">
                        <CheckCircle2 size={16} className="text-forest shrink-0" />
                        ¿Confirmas autorizar a este usuario como casero?
                      </p>
                      <ul className="text-text-secondary space-y-1 pl-5 list-disc text-[11px] leading-relaxed">
                        <li>Se le otorgará automáticamente el rol de <strong>Propietario / Casero</strong>.</li>
                        <li>Podrá <strong>anunciar, publicar y administrar viviendas</strong> en RuwaJay.</li>
                        <li>Recibirá una <strong>notificación en tiempo real</strong> en su cuenta.</li>
                      </ul>
                    </div>

                    {/* CUI Preview */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-[#FAF5EE] p-2.5 border border-border-light">
                        <span className="text-[10px] font-extrabold uppercase text-text-muted block">CUI Declarado</span>
                        <span className="font-mono font-bold text-cafe">{formatDpiCui(approvingRequest.cui)}</span>
                      </div>
                      <div className="rounded-xl bg-[#FAF5EE] p-2.5 border border-border-light">
                        <span className="text-[10px] font-extrabold uppercase text-text-muted block">Lugar Emisión</span>
                        <span className="font-bold text-cafe truncate block">
                          {approvingRequest.municipality || 'N/A'}, {approvingRequest.department || 'Guatemala'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-light">
                      <button
                        type="button"
                        disabled={isProcessingVerifAction}
                        onClick={() => setApprovingRequest(null)}
                        className="rounded-xl px-4 py-2.5 text-xs font-bold text-text-muted hover:text-cafe transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={isProcessingVerifAction}
                        onClick={handleConfirmApprove}
                        className="flex items-center gap-2 rounded-xl bg-forest hover:bg-forest-dark px-5 py-2.5 text-xs font-black text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Check size={16} />
                        {isProcessingVerifAction ? 'Aprobando...' : 'Aceptar y Habilitar como Casero'}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Modal para Ver Foto del DPI en Grande (Admin) ── */}
      {viewingDpiPhoto && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-[fade-in_0.2s_ease-out]"
          onClick={() => setViewingDpiPhoto(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewingDpiPhoto(null)}
              className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <img
              src={viewingDpiPhoto}
              alt="Foto del DPI"
              className="max-h-[82vh] w-auto max-w-full object-contain mx-auto"
            />
            <div className="bg-black/90 p-3 text-center text-xs text-white/80 font-bold">
              Documento de Identificación (DPI) presentado para verificación
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

      {/* Modal de Confirmación para Cerrar Sesión */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        isBusy={isLoggingOut}
      />

      {/* ═══════ Modal de Confirmación para Eliminar Cita ═══════ */}
      {Boolean(deletingVisitId) && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fade-in_0.2s_ease-out]"
          onClick={() => { if (!isDeletingVisitBusy) setDeletingVisitId(null); }}
        >
          <div
            className="relative flex flex-col w-full max-w-md rounded-3xl bg-white shadow-2xl border border-red-200/60 overflow-hidden animate-[scale-up_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-2 bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />

            <button
              type="button"
              disabled={isDeletingVisitBusy}
              onClick={() => setDeletingVisitId(null)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF5EE] text-text-muted hover:bg-border-light hover:text-cafe transition-colors border border-border-light cursor-pointer disabled:opacity-50"
            >
              <X size={16} />
            </button>

            <div className="p-6 sm:p-7 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50/50 shadow-sm border border-red-100">
                <Trash2 size={30} className="text-red-600" />
              </div>

              <h3 className="text-xl font-black text-cafe tracking-tight">
                ¿Eliminar cita del historial?
              </h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold mx-auto">
                <AlertTriangle size={13} />
                <span>Acción irreversible</span>
              </div>

              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mt-3.5">
                ¿Deseas eliminar esta cita del historial para ambos participantes? Se borrará de los registros de forma permanente.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  disabled={isDeletingVisitBusy}
                  onClick={() => setDeletingVisitId(null)}
                  className="flex-1 rounded-2xl border border-border bg-white px-5 py-3 text-xs font-black text-cafe hover:bg-crema active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeletingVisitBusy}
                  onClick={handleConfirmDeleteVisit}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-[0.98] px-5 py-3 text-xs font-black text-white shadow-lg shadow-red-600/20 transition-all cursor-pointer disabled:opacity-75"
                >
                  {isDeletingVisitBusy ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      <span>Eliminar cita</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Modal de Confirmación para Eliminar Vivienda ═══════ */}
      {Boolean(deletingPropertyTarget) && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fade-in_0.2s_ease-out]"
          onClick={() => { if (!isDeletingPropertyBusy) setDeletingPropertyTarget(null); }}
        >
          <div
            className="relative flex flex-col w-full max-w-md rounded-3xl bg-white shadow-2xl border border-red-200/60 overflow-hidden animate-[scale-up_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-2 bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />

            <button
              type="button"
              disabled={isDeletingPropertyBusy}
              onClick={() => setDeletingPropertyTarget(null)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF5EE] text-text-muted hover:bg-border-light hover:text-cafe transition-colors border border-border-light cursor-pointer disabled:opacity-50"
            >
              <X size={16} />
            </button>

            <div className="p-6 sm:p-7 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50/50 shadow-sm border border-red-100">
                <Trash2 size={30} className="text-red-600" />
              </div>

              <h3 className="text-xl font-black text-cafe tracking-tight">
                ¿Eliminar vivienda?
              </h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold mx-auto">
                <AlertTriangle size={13} />
                <span>Acción permanente</span>
              </div>

              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mt-3.5">
                ¿Estás seguro de eliminar permanentemente <strong className="text-cafe">"{deletingPropertyTarget?.title || 'esta vivienda'}"</strong>? Dejará de aparecer para todos los usuarios y en los resultados de búsqueda.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  disabled={isDeletingPropertyBusy}
                  onClick={() => setDeletingPropertyTarget(null)}
                  className="flex-1 rounded-2xl border border-border bg-white px-5 py-3 text-xs font-black text-cafe hover:bg-crema active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeletingPropertyBusy}
                  onClick={handleConfirmDeleteProperty}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-[0.98] px-5 py-3 text-xs font-black text-white shadow-lg shadow-red-600/20 transition-all cursor-pointer disabled:opacity-75"
                >
                  {isDeletingPropertyBusy ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      <span>Eliminar vivienda</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
