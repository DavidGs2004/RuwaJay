import React, { useState } from 'react';
import { X, Smile, ThumbsUp, Heart, Sparkles, Coffee } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Caritas',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹',
      '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
      '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐',
      '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟',
      '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭',
      '😮‍💨', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱',
      '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡',
      '🤫', '🫠', '🤥', '😶', '😐', '😑', '😬', '🫨', '😯', '😦',
      '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🤐',
      '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
      '👿', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃'
    ]
  },
  {
    id: 'gestures',
    name: 'Manos y Gestos',
    icon: ThumbsUp,
    emojis: [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '🫶', '👐',
      '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵',
      '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀',
      '👁️', '👅', '👄', '🫦', '💋', '👋', '🤚', '🖐️', '✋', '🖖',
      '🫱', '🫲', '🫳', '🫴', '🫷', '🫸', '👌', '🤌', '🤏', '✌️',
      '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇',
      '☝️', '🫵'
    ]
  },
  {
    id: 'hearts',
    name: 'Corazones y Emociones',
    icon: Heart,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
      '💟', '🔥', '✨', '🌟', '💫', '💥', '💢', '💯', '💤', '💨'
    ]
  },
  {
    id: 'objects',
    name: 'Objetos y RuwaJay',
    icon: Sparkles,
    emojis: [
      '🏡', '🏠', '🏢', '🏬', '🔑', '🗝️', '🛋️', '🛏️', '🚪', '🪴',
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟',
      '💡', '💰', '💵', '💳', '📦', '📌', '📍', '🔔', '📣', '📢',
      '💬', '💭', '📞', '📱', '📸', '🎥', '🚗', '🛵', '🚲', '⚡'
    ]
  },
  {
    id: 'activities',
    name: 'Comida y Ocio',
    icon: Coffee,
    emojis: [
      '☕', '🍵', '🧃', '🥤', '🍕', '🍔', '🌮', '🌯', '🥗', '🍎',
      '🍰', '🍦', '🥂', '🍻', '🍻', '⚽', '🏀', '🎾', '🎮', '🎧',
      '🏖️', '⛰️', '🏕️', '🌅', '✈️', '⛵', '🐶', '🐱', '🐾', '🌿'
    ]
  }
];

export default function FullEmojiPickerModal({ onSelect, onClose, currentReaction }) {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [searchTerm, setSearchTerm] = useState('');

  const currentCategoryData = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
  const displayEmojis = searchTerm.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    : currentCategoryData?.emojis || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-[fade-in_0.15s_ease-out]">
      <div className="flex flex-col w-full max-w-sm sm:max-w-md h-[430px] rounded-3xl bg-white shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest/10 text-forest">
              <Smile size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black text-cafe">Reaccionar al mensaje</h3>
              <p className="text-[10px] text-text-muted">Elige cualquier emoji de tu preferencia</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-crema hover:text-cafe transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center justify-around border-b border-border bg-white px-2 py-1.5 shrink-0">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearchTerm('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-forest text-white shadow-xs'
                    : 'text-text-secondary hover:bg-crema hover:text-cafe'
                }`}
                title={cat.name}
              >
                <Icon size={14} />
                <span className="hidden sm:inline text-[11px]">{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Emojis Grid */}
        <div className="flex-1 overflow-y-auto p-3 bg-[#FAF8F5]/50">
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {displayEmojis.map((emoji, index) => {
              const isSelected = currentReaction === emoji;
              return (
                <button
                  key={`${emoji}-${index}`}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl text-2xl hover:scale-125 hover:bg-white active:scale-95 transition-all shadow-2xs border ${
                    isSelected
                      ? 'border-forest bg-forest/15 scale-110 shadow-sm'
                      : 'border-transparent bg-white/70'
                  }`}
                  title={emoji}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-white text-[11px] text-text-muted">
          <span>{displayEmojis.length} emojis disponibles</span>
          {currentReaction && (
            <button
              type="button"
              onClick={() => onSelect(currentReaction)}
              className="text-red-500 font-bold hover:underline"
            >
              Quitar mi reacción ({currentReaction})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
