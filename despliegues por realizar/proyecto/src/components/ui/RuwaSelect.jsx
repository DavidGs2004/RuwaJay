import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check, MapPin } from 'lucide-react';

/**
 * RuwaSelect — Premium custom dropdown/listbox component
 * Features:
 * - Beautiful RuwaJay palette & micro-animations
 * - Integrated instant search filter for quick picking
 * - Keyboard navigation (Arrows, Enter, Escape)
 * - Click-outside dismissal
 * - Responsive auto-alignment (left/right) to prevent screen overflow
 * - Selected state checkmark & forest accents
 */
export default function RuwaSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  label,
  icon: IconComponent = MapPin,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  align = 'auto',
  className = '',
  buttonClassName = '',
  id,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuAlign, setMenuAlign] = useState(align === 'auto' ? 'left' : align);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options to objects: { value, label }
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Current selected option object
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value) || null;
  }, [normalizedOptions, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(q) ||
      (opt.value && opt.value.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  // Calculate alignment relative to window when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);

      // Auto check boundary
      if (align === 'auto' && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        // If dropdown is in the right third of the screen, align right
        if (rect.right + 120 > screenWidth || rect.left > screenWidth * 0.55) {
          setMenuAlign('right');
        } else {
          setMenuAlign('left');
        }
      }

      // Autofocus search input
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, align]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      return () => document.removeEventListener('pointerdown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    }
  };

  // Ensure highlighted item is in view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex];
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (val) => {
    onChange?.(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${isOpen ? 'z-40' : 'z-10'} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label className="block text-xs font-bold text-text-muted mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`group flex min-h-11 h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-cafe transition-all duration-150 outline-none hover:border-forest/50 hover:bg-white focus:border-forest focus:ring-2 focus:ring-forest/15 disabled:cursor-not-allowed disabled:opacity-50 ${
          isOpen ? 'border-forest ring-2 ring-forest/20 bg-white shadow-sm' : ''
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 overflow-hidden text-left">
          {IconComponent && (
            <IconComponent
              size={15}
              className={`shrink-0 transition-colors ${
                isOpen ? 'text-forest' : 'text-forest/70 group-hover:text-forest'
              }`}
            />
          )}
          <span className="truncate text-cafe">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={16}
          className={`shrink-0 text-text-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-forest' : 'group-hover:text-cafe'
          }`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute top-full mt-1.5 w-full min-w-[240px] sm:min-w-[280px] max-w-[340px] rounded-2xl border border-border/80 bg-white/98 backdrop-blur-md p-2 shadow-2xl z-50 animate-[scale-in_0.15s_ease-out] ${
            menuAlign === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          }`}
          style={{
            boxShadow: '0 20px 40px -8px rgba(45, 24, 16, 0.18), 0 4px 12px rgba(45, 24, 16, 0.08)',
          }}
        >
          {/* Search Header if searchable and more than 4 items */}
          {searchable && normalizedOptions.length > 4 && (
            <div className="p-1 pb-2 mb-1 border-b border-border/50">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2.5 text-text-muted pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-xl border border-border bg-[#FDFBF7] pl-8 pr-8 py-1.5 text-xs font-medium text-cafe placeholder:text-text-muted outline-none focus:border-forest focus:bg-white focus:ring-1 focus:ring-forest/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 text-text-muted hover:text-cafe p-0.5 rounded-full"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status helper */}
              <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] font-semibold text-text-muted">
                <span>
                  {searchQuery ? `${filteredOptions.length} resultados` : `${normalizedOptions.length} opciones`}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-forest/80 font-bold">
                  Guatemala
                </span>
              </div>
            </div>
          )}

          {/* Options List */}
          <div
            ref={listRef}
            className="max-h-56 overflow-y-auto overscroll-contain space-y-0.5 pr-0.5 select-none"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#D8C5B2 transparent',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-3 text-center">
                <p className="text-xs font-bold text-cafe">Sin resultados</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  No se encontró "{searchQuery}"
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-[11px] font-bold text-forest hover:underline"
                >
                  Ver todas las opciones
                </button>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`group/opt flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-100 text-left ${
                      isSelected
                        ? 'bg-forest text-white font-bold shadow-sm'
                        : isHighlighted
                        ? 'bg-forest/10 text-forest'
                        : 'text-cafe hover:bg-crema/80'
                    }`}
                  >
                    <span className="truncate flex-1">{opt.label}</span>

                    {isSelected && (
                      <span className="shrink-0 flex items-center justify-center h-4 w-4 rounded-full bg-white/20 text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}

                    {!isSelected && opt.badge && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-crema text-text-muted group-hover/opt:bg-forest/10 group-hover/opt:text-forest">
                        {opt.badge}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
