import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar, ChevronLeft, ChevronRight, ChevronDown,
  X, Sparkles
} from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const DAY_NAMES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

/**
 * Format Date object to YYYY-MM-DD
 */
function toDateString(d) {
  if (!d || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD to Date object in local time
 */
function parseDateString(str) {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format for user display in Spanish
 */
function formatDisplayDate(dateStr) {
  const d = parseDateString(dateStr);
  if (!d) return null;
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} de ${month}, ${year}`;
}

/**
 * RuwaDatePicker — Compact, adaptive date picker with smart centering
 */
export default function RuwaDatePicker({
  value = '',
  onChange = () => {},
  label,
  placeholder = 'dd / mm / aaaa',
  required = false,
  minDate,
  maxDate,
  disabled = false,
  className = '',
  isBirthDate = false,
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'months' | 'years'
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 288,
    isCentered: false,
  });

  // Currently viewed month/year in the calendar
  const initialDate = useMemo(() => {
    const parsed = parseDateString(value);
    if (parsed) return parsed;
    if (isBirthDate) {
      // Default to 25 years ago for birthdate convenience
      const d = new Date();
      d.setFullYear(d.getFullYear() - 25);
      return d;
    }
    return new Date();
  }, [value, isBirthDate]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [yearGridStart, setYearGridStart] = useState(Math.floor(initialDate.getFullYear() / 12) * 12);

  // Synchronize internal view when value changes
  useEffect(() => {
    const parsed = parseDateString(value);
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
      setYearGridStart(Math.floor(parsed.getFullYear() / 12) * 12);
    }
  }, [value]);

  // Adaptive positioning: Drops down if fits; otherwise centers in the screen!
  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.min(290, window.innerWidth - 24);
    // Approximate compact height: presets add ~30px
    const dropdownHeight = isBirthDate ? 300 : 270;
    const spaceBelow = window.innerHeight - rect.bottom;

    // If it does NOT comfortably fit below (with a 16px safety margin),
    // or if the screen height is small (< 680px), center it on the screen!
    const fitsBelow = spaceBelow >= dropdownHeight + 16 && window.innerHeight >= 650;

    if (!fitsBelow) {
      setCoords({
        isCentered: true,
        width: dropdownWidth,
        top: 0,
        left: 0,
      });
      return;
    }

    // Fits cleanly below
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - dropdownWidth - 12);
    }

    setCoords({
      isCentered: false,
      top: rect.bottom + 6,
      left: Math.max(12, left),
      width: dropdownWidth,
    });
  };

  const handleOpen = () => {
    if (disabled) return;
    updateCoords();
    setIsOpen(true);
    setViewMode('days');
  };

  const handleClose = () => {
    setIsOpen(false);
    setViewMode('days');
  };

  // Close on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };

    const handlePointerDown = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        handleClose();
      }
    };

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Navigation handlers
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handlePrevYears = (e) => {
    e.stopPropagation();
    setYearGridStart((y) => y - 12);
  };

  const handleNextYears = (e) => {
    e.stopPropagation();
    setYearGridStart((y) => y + 12);
  };

  // Select day
  const handleSelectDay = (day, isCurrentMonth, e) => {
    e.stopPropagation();
    let targetYear = viewYear;
    let targetMonth = viewMonth;

    if (!isCurrentMonth) {
      if (day > 15) {
        if (viewMonth === 0) {
          targetMonth = 11;
          targetYear -= 1;
        } else {
          targetMonth -= 1;
        }
      } else {
        if (viewMonth === 11) {
          targetMonth = 0;
          targetYear += 1;
        } else {
          targetMonth += 1;
        }
      }
    }

    const selected = new Date(targetYear, targetMonth, day);
    const dateStr = toDateString(selected);

    if (minDate && dateStr < minDate) return;
    if (maxDate && dateStr > maxDate) return;

    onChange(dateStr);
    handleClose();
  };

  const handleSelectMonth = (monthIndex) => {
    setViewMonth(monthIndex);
    setViewMode('days');
  };

  const handleSelectYear = (year) => {
    setViewYear(year);
    setViewMode('months');
  };

  const handleSetToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const str = toDateString(today);
    if ((!minDate || str >= minDate) && (!maxDate || str <= maxDate)) {
      onChange(str);
      handleClose();
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  // Generate 42 cells for calendar
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Dom
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    // Previous month filler
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      cells.push({
        day: i,
        isCurrentMonth: true,
      });
    }

    // Next month filler
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const todayStr = toDateString(new Date());
  const selectedDateStr = value;
  const displayLabel = formatDisplayDate(value);

  const birthPresets = [
    { label: '18a', year: new Date().getFullYear() - 18 },
    { label: '25a', year: new Date().getFullYear() - 25 },
    { label: '35a', year: new Date().getFullYear() - 35 },
    { label: '50a', year: new Date().getFullYear() - 50 },
  ];

  // The core calendar content (used both in centered modal and dropdown)
  const calendarContent = (
    <div
      ref={dropdownRef}
      style={{ width: `${coords.width}px` }}
      className="flex flex-col rounded-2xl bg-white border border-[#E8D9C8] shadow-2xl overflow-hidden animate-[scale-up_0.15s_ease-out] select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top decorative gradient bar */}
      <div className="h-1 w-full bg-gradient-to-r from-forest via-emerald-600 to-dorado" />

      {/* Header bar when centered */}
      {coords.isCentered && (
        <div className="bg-[#FAF5EE] px-3.5 py-2 border-b border-border-light flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Calendar size={13} className="text-forest shrink-0" />
            <span className="text-[11px] font-black text-cafe truncate">
              {label || 'Seleccionar fecha'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-5 h-5 rounded-md bg-white border border-border-light flex items-center justify-center text-stone-400 hover:text-cafe transition-colors"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <div className="bg-[#FAF5EE] px-3 py-1.5 border-b border-border-light flex items-center justify-between">
        {viewMode === 'days' && (
          <>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-lg bg-white border border-border-light flex items-center justify-center text-cafe hover:bg-forest/10 hover:text-forest transition-colors shadow-xs"
              title="Mes anterior"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('months')}
                className="px-2 py-0.5 rounded-md text-[11px] font-black text-cafe hover:bg-white transition-all flex items-center gap-1"
              >
                {MONTH_NAMES[viewMonth]}
                <ChevronDown size={10} className="text-stone-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setYearGridStart(Math.floor(viewYear / 12) * 12);
                  setViewMode('years');
                }}
                className="px-2 py-0.5 rounded-md text-[11px] font-black text-forest bg-forest/10 hover:bg-forest/20 transition-all flex items-center gap-1"
              >
                {viewYear}
                <ChevronDown size={10} className="text-forest" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 rounded-lg bg-white border border-border-light flex items-center justify-center text-cafe hover:bg-forest/10 hover:text-forest transition-colors shadow-xs"
              title="Mes siguiente"
            >
              <ChevronRight size={14} />
            </button>
          </>
        )}

        {viewMode === 'months' && (
          <div className="w-full flex items-center justify-between">
            <span className="text-[11px] font-black text-cafe">Mes ({viewYear})</span>
            <button
              type="button"
              onClick={() => setViewMode('days')}
              className="text-[10px] font-bold text-forest hover:underline"
            >
              Volver
            </button>
          </div>
        )}

        {viewMode === 'years' && (
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevYears}
              className="w-6 h-6 rounded-md bg-white border border-border-light flex items-center justify-center text-cafe hover:bg-forest/10 hover:text-forest"
            >
              <ChevronLeft size={12} />
            </button>
            <span className="text-[11px] font-black text-cafe">
              {yearGridStart} - {yearGridStart + 11}
            </span>
            <button
              type="button"
              onClick={handleNextYears}
              className="w-6 h-6 rounded-md bg-white border border-border-light flex items-center justify-center text-cafe hover:bg-forest/10 hover:text-forest"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Age Presets Bar (for birth dates) */}
      {isBirthDate && viewMode === 'days' && (
        <div className="flex items-center justify-between gap-1 px-2.5 py-1 bg-[#FDFBF7] border-b border-border-light/60">
          <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-0.5">
            <Sparkles size={10} className="text-dorado" /> Edad:
          </span>
          <div className="flex items-center gap-1">
            {birthPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewYear(preset.year);
                  setYearGridStart(Math.floor(preset.year / 12) * 12);
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-colors ${
                  viewYear === preset.year
                    ? 'bg-dorado text-white'
                    : 'bg-stone-100 text-cafe hover:bg-stone-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode: Days Calendar */}
      {viewMode === 'days' && (
        <div className="p-2">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-0.5 text-center mb-0.5">
            {DAY_NAMES.map((d, i) => (
              <span
                key={d}
                className={`text-[10px] font-extrabold py-0.5 ${
                  i === 0 ? 'text-terracota' : 'text-stone-400'
                }`}
              >
                {d}
              </span>
            ))}
          </div>

          {/* 42 Days Matrix */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarCells.map((cell, idx) => {
              let cellYear = viewYear;
              let cellMonth = viewMonth;
              if (!cell.isCurrentMonth) {
                if (cell.day > 15) {
                  cellMonth = viewMonth === 0 ? 11 : viewMonth - 1;
                  cellYear = viewMonth === 0 ? viewYear - 1 : viewYear;
                } else {
                  cellMonth = viewMonth === 11 ? 0 : viewMonth + 1;
                  cellYear = viewMonth === 11 ? viewYear + 1 : viewYear;
                }
              }

              const cellDateStr = toDateString(new Date(cellYear, cellMonth, cell.day));
              const isSelected = selectedDateStr === cellDateStr;
              const isToday = todayStr === cellDateStr;
              const isDisabled =
                (minDate && cellDateStr < minDate) ||
                (maxDate && cellDateStr > maxDate);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={(e) => handleSelectDay(cell.day, cell.isCurrentMonth, e)}
                  className={`relative h-6.5 sm:h-7 w-full rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center select-none ${
                    isDisabled
                      ? 'opacity-20 cursor-not-allowed text-stone-300'
                      : isSelected
                      ? 'bg-forest text-white font-black shadow-xs z-10'
                      : isToday
                      ? 'border border-dorado text-dorado font-black bg-dorado/5 hover:bg-dorado/15'
                      : cell.isCurrentMonth
                      ? 'text-cafe hover:bg-forest/10 hover:text-forest'
                      : 'text-stone-300 hover:text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <span>{cell.day}</span>
                  {isToday && !isSelected && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-dorado" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode: Months Selector */}
      {viewMode === 'months' && (
        <div className="p-2 grid grid-cols-3 gap-1.5">
          {MONTH_SHORT.map((m, idx) => {
            const isCurrent = viewMonth === idx;
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleSelectMonth(idx)}
                className={`py-2 rounded-lg text-[11px] font-bold transition-all ${
                  isCurrent
                    ? 'bg-forest text-white font-black shadow-xs'
                    : 'bg-[#FDFBF7] text-cafe hover:bg-forest/10 hover:text-forest border border-border-light'
                }`}
              >
                {MONTH_NAMES[idx]}
              </button>
            );
          })}
        </div>
      )}

      {/* Mode: Years Selector */}
      {viewMode === 'years' && (
        <div className="p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => {
              const y = yearGridStart + i;
              const isCurrent = viewYear === y;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => handleSelectYear(y)}
                  className={`py-2 rounded-lg text-[11px] font-bold transition-all ${
                    isCurrent
                      ? 'bg-forest text-white font-black shadow-xs'
                      : 'bg-[#FDFBF7] text-cafe hover:bg-forest/10 hover:text-forest border border-border-light'
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer with Quick Shortcuts */}
      <div className="bg-[#FAF5EE] px-3 py-1.5 border-t border-border-light flex items-center justify-between">
        <button
          type="button"
          onClick={handleClear}
          className="text-[10px] font-bold text-text-muted hover:text-terracota transition-colors"
        >
          Limpiar
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSetToday}
            className="px-2 py-0.5 rounded-md bg-white border border-border-light text-[10px] font-black text-forest hover:bg-forest hover:text-white transition-all shadow-xs"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="px-2.5 py-0.5 rounded-md bg-forest text-[10px] font-black text-white hover:bg-forest-light transition-all shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-cafe">
          {label} {required && <span className="text-terracota">*</span>}
        </label>
      )}

      {/* Interactive Trigger Field */}
      <div
        ref={triggerRef}
        id={id}
        onClick={handleOpen}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        className={`group relative flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 sm:py-2.5 transition-all cursor-pointer select-none ${
          disabled
            ? 'opacity-60 bg-stone-100 border-stone-200 cursor-not-allowed'
            : isOpen
            ? 'border-forest ring-2 ring-forest/15 bg-white shadow-xs'
            : value
            ? 'border-forest/40 bg-[#FDFBF7] hover:border-forest'
            : 'border-[#E8D9C8] bg-[#FDFBF7] hover:border-[#D4962A] hover:bg-white'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              value ? 'bg-forest/10 text-forest' : 'bg-stone-100 text-stone-400 group-hover:text-dorado'
            }`}
          >
            <Calendar size={13} />
          </div>

          <div className="min-w-0 flex-1">
            {displayLabel ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-cafe truncate">
                  {displayLabel}
                </span>
                <span className="hidden sm:inline-flex items-center rounded bg-forest/10 px-1.5 py-0.2 text-[9px] font-black text-forest">
                  {value}
                </span>
              </div>
            ) : (
              <span className="text-xs font-semibold text-text-muted">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Borrar fecha"
              className="w-4 h-4 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-200 hover:text-cafe transition-colors"
            >
              <X size={10} />
            </button>
          )}
          <ChevronDown
            size={14}
            className={`text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-forest' : ''}`}
          />
        </div>
      </div>

      {/* Floating Popover or Centered Modal via Portal */}
      {isOpen &&
        createPortal(
          coords.isCentered ? (
            /* Centered on Screen with subtle backdrop when not enough space below */
            <div
              className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-[1.5px] p-3 animate-[fade-in_0.15s_ease-out]"
              onClick={handleClose}
            >
              {calendarContent}
            </div>
          ) : (
            /* Dropped down right below trigger when space permits */
            <div
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 99999,
              }}
            >
              {calendarContent}
            </div>
          ),
          document.body
        )}
    </div>
  );
}
