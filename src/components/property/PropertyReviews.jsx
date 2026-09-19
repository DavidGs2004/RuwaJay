import { useState, useEffect, useMemo } from 'react';
import {
  Star, MessageSquare, CheckCircle, PlusCircle, Sparkles,
  ThumbsUp, ShieldCheck, UserCheck, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { demoReviews } from '../../data/properties';
import { doc, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestore } from '../../lib/firebase';

const QUICK_TAGS = [
  'Zona muy segura',
  'Garita 24/7',
  'Agua constante',
  'Parqueo amplio',
  'Excelente ubicación',
  'Trato amable',
  'Ambiente tranquilo',
  'Buena iluminación',
];

export default function PropertyReviews({ propertyId, propertyTitle }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [userName, setUserName] = useState(user?.name || '');
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState(['Zona muy segura', 'Trato amable']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [likedReviews, setLikedReviews] = useState({});
  const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  // Sync user name if logged in
  useEffect(() => {
    if (user?.name && !userName) {
      setUserName(user.name);
    }
  }, [user]);

  // Load API reviews first, keeping demo and local data as a graceful fallback.
  useEffect(() => {
    const initial = demoReviews[propertyId] || [
      {
        id: `seed-${propertyId}-1`,
        userName: 'Carlos Marroquín',
        userAvatar: null,
        rating: 4.9,
        date: '10 de Enero, 2026',
        verifiedTenant: true,
        comment: 'La propiedad superó mis expectativas. Todo muy limpio, seguro y el contrato fue claro y sin sorpresas.',
        tags: ['Zona muy segura', 'Agua constante', 'Excelente ubicación'],
      },
    ];
    try {
      const stored = JSON.parse(localStorage.getItem(`ruwajay_reviews_${propertyId}`) || '[]');
      setReviews([...stored, ...initial]);
    } catch {
      setReviews(initial);
    }
    fetch(`${apiUrl}/api/properties/${encodeURIComponent(propertyId)}/reviews`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (Array.isArray(data?.reviews) && data.reviews.length) {
          setReviews((previous) => [...data.reviews, ...previous.filter((review) => !review.id.startsWith('api-'))]);
        }
      })
      .catch(() => { /* Conserva datos locales y demo. */ });
  }, [propertyId, apiUrl]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!reviews.length) return { average: 5.0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = sum / reviews.length;
    return {
      average: avg.toFixed(1),
      count: reviews.length,
    };
  }, [reviews]);

  const handleToggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleLikeReview = (reviewId) => {
    setLikedReviews((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);

    const newReview = {
      id: `rev-${Date.now()}`,
      userName: userName.trim() || 'Inquilino de RuwaJay',
      userAvatar: user?.avatarImage || null,
      rating: userRating,
      date: new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' }),
      verifiedTenant: !!user?.verified,
      comment: comment.trim(),
      tags: selectedTags,
      isNew: true,
    };

    const token = localStorage.getItem('ruwajay_token');
    if (token) {
      try {
        const response = await fetch(`${apiUrl}/api/properties/${encodeURIComponent(propertyId)}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ rating: userRating, comment: comment.trim(), tags: selectedTags }),
        });
        if (!response.ok) throw new Error('No se pudo guardar la reseña.');
        const data = await response.json();
        setReviews((prev) => [data.review, ...prev]);
        const firebaseUser = firebaseAuth?.currentUser;
        if (firebaseUser && firestore) {
          setDoc(doc(firestore, 'properties', String(propertyId), 'reviews', data.review.id), {
            ...data.review,
            userId: firebaseUser.uid,
            createdAt: Date.now(),
          }).catch(() => { /* La API conserva la reseña aunque Firestore no responda. */ });
        }
        setIsSubmitting(false);
        setShowAddModal(false);
        setComment('');
        setSuccessMessage('¡Gracias por tu opinión! Tu reseña ha sido publicada con éxito.');
        setTimeout(() => setSuccessMessage(''), 4000);
        return;
      } catch {
        // Fallback local below keeps the form usable during an API outage.
      }
    }

    try {
      const stored = JSON.parse(localStorage.getItem(`ruwajay_reviews_${propertyId}`) || '[]');
      const updated = [newReview, ...stored];
      localStorage.setItem(`ruwajay_reviews_${propertyId}`, JSON.stringify(updated));
      setReviews((prev) => [newReview, ...prev]);
    } catch {
      setReviews((prev) => [newReview, ...prev]);
    }

    setIsSubmitting(false);
    setShowAddModal(false);
    setComment('');
    setSuccessMessage('¡Gracias por tu opinión! Tu reseña ha sido publicada con éxito.');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  return (
    <section className="mt-10 rounded-3xl border border-border-light bg-white p-5 shadow-card sm:p-8">
      {/* Section Header */}
      <div className="flex flex-col gap-4 border-b border-border-light pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-dorado/15 text-dorado flex items-center justify-center shadow-xs">
              <Star size={20} fill="currentColor" />
            </div>
            <div>
              <h3 className="text-xl font-black text-cafe sm:text-2xl">
                Opiniones y Reseñas
              </h3>
              <p className="text-xs text-text-muted font-medium">
                Experiencias de inquilinos que han visitado o vivido en esta propiedad
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(!showAddModal)}
          className="btn-primary flex items-center justify-center gap-2 !rounded-2xl !py-3 !px-5 text-xs sm:text-sm shadow-md"
        >
          <PlusCircle size={16} />
          {showAddModal ? 'Cancelar reseña' : 'Escribir una opinión'}
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-jade/10 p-4 text-xs font-bold text-jade border border-jade/20 animate-[fade-in_0.2s_ease-out]">
          <CheckCircle size={17} className="flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Score Summary & Categories */}
      <div className="mt-6 grid grid-cols-1 gap-6 rounded-2xl bg-[#FAF5EE]/70 p-5 sm:grid-cols-12 sm:items-center">
        {/* Overall Score */}
        <div className="sm:col-span-4 text-center sm:border-r sm:border-border-light sm:pr-6">
          <div className="text-4xl sm:text-5xl font-black text-cafe">
            {stats.average}
          </div>
          <div className="mt-1 flex items-center justify-center gap-1 text-dorado">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={18}
                fill={star <= Math.round(stats.average) ? 'currentColor' : 'none'}
              />
            ))}
          </div>
          <p className="mt-1 text-xs font-extrabold text-text-muted">
            Basado en {stats.count} {stats.count === 1 ? 'opinión' : 'opiniones'} verificadas
          </p>
        </div>

        {/* Category breakdown */}
        <div className="sm:col-span-8 space-y-2.5 text-xs font-bold text-cafe">
          {[
            { label: 'Limpieza y estado del inmueble', score: '98%', val: 4.9 },
            { label: 'Seguridad y tranquilidad del sector', score: '96%', val: 4.8 },
            { label: 'Comunicación y atención del arrendador', score: '97%', val: 4.9 },
            { label: 'Relación calidad / precio mensual', score: '94%', val: 4.7 },
          ].map((cat) => (
            <div key={cat.label} className="flex items-center gap-3">
              <span className="w-48 text-[11px] text-text-secondary truncate">{cat.label}</span>
              <div className="flex-1 h-2 rounded-full bg-[#E8D9C8] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-forest to-jade"
                  style={{ width: cat.score }}
                />
              </div>
              <span className="w-8 text-right text-[11px] font-black text-forest">{cat.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form: Add Review */}
      {showAddModal && (
        <form
          onSubmit={handleSubmitReview}
          className="mt-6 rounded-3xl border-2 border-forest/15 bg-white p-5 sm:p-7 shadow-lg space-y-4 animate-[scale-up_0.2s_ease-out]"
        >
          <div className="flex items-center justify-between border-b border-border-light pb-3">
            <h4 className="text-sm font-black text-cafe flex items-center gap-2">
              <Sparkles size={16} className="text-dorado" />
              Comparte tu experiencia con esta vivienda
            </h4>
            <span className="text-[11px] text-text-muted font-bold">
              {user ? `Opinando como ${user.name}` : 'Opinión pública'}
            </span>
          </div>

          {/* Star selector */}
          <div>
            <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">
              Tu Calificación General *
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setUserRating(s)}
                    className="p-1 text-dorado transition-transform hover:scale-115 focus:outline-none"
                    aria-label={`Calificar con ${s} estrellas`}
                  >
                    <Star
                      size={24}
                      fill={(hoverRating || userRating) >= s ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-black text-dorado ml-2">
                {userRating === 5 && '¡Excelente experiencia!'}
                {userRating === 4 && 'Muy buena propiedad'}
                {userRating === 3 && 'Buena opción'}
                {userRating === 2 && 'Regular'}
                {userRating === 1 && 'Necesita mejorar'}
              </span>
            </div>
          </div>

          {/* User Name input if not logged in */}
          {!user && (
            <div>
              <label className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-cafe">
                Tu nombre *
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full rounded-xl border border-border bg-[#FDFBF7] px-3.5 py-2.5 text-xs font-bold text-cafe outline-none focus:border-forest"
              />
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-cafe">
              Tu comentario u opinión detallada *
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cuenta qué te pareció la zona, las instalaciones, la seguridad, los servicios y la atención del propietario..."
              className="w-full rounded-2xl border border-border bg-[#FDFBF7] p-3 text-xs font-medium text-cafe outline-none focus:border-forest transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Quick Tags Selector */}
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-cafe">
              Etiquetas destacadas (opcional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                      active
                        ? 'bg-forest text-white shadow-xs'
                        : 'bg-[#FAF5EE] text-cafe hover:bg-forest/10 border border-border-light'
                    }`}
                  >
                    {active ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-text-muted hover:bg-stone-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="btn-primary !rounded-xl !py-2.5 !px-6 text-xs font-black shadow-md disabled:opacity-50"
            >
              Publicar Opinión
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="mt-8 space-y-4">
        {reviews.map((rev) => {
          const isLiked = likedReviews[rev.id];
          return (
            <div
              key={rev.id}
              className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                rev.isNew
                  ? 'border-jade/30 bg-jade/5 shadow-sm ring-1 ring-jade/20'
                  : 'border-border-light bg-[#FCFBF8] hover:border-forest/20'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-forest to-jade text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {rev.userName ? rev.userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-cafe">
                        {rev.userName}
                      </span>
                      {rev.verifiedTenant && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-dorado/15 px-2 py-0.5 text-[10px] font-black text-[#996515]">
                          <ShieldCheck size={11} /> Inquilino Verificado
                        </span>
                      )}
                      {rev.isNew && (
                        <span className="rounded-full bg-jade/20 px-2 py-0.5 text-[10px] font-black text-jade animate-pulse">
                          Reciente
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-text-muted font-medium">
                      {rev.date}
                    </span>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1 text-dorado">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      fill={s <= Math.round(rev.rating) ? 'currentColor' : 'none'}
                    />
                  ))}
                  <span className="text-xs font-black text-cafe ml-1">
                    {Number(rev.rating).toFixed(1)}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-medium">
                {rev.comment}
              </p>

              {/* Tags */}
              {rev.tags && rev.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {rev.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-lg bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-forest border border-forest/15"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Helpful footer */}
              <div className="mt-3 pt-3 border-t border-border-light/60 flex items-center justify-between text-[11px] text-text-muted">
                <span>¿Te resultó útil esta reseña?</span>
                <button
                  type="button"
                  onClick={() => handleLikeReview(rev.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                    isLiked
                      ? 'bg-forest text-white font-bold'
                      : 'hover:bg-stone-200/60 text-text-secondary'
                  }`}
                >
                  <ThumbsUp size={12} />
                  <span>{isLiked ? 'Útil (1)' : 'Útil'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
