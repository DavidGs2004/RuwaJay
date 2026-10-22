import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className = '', showLabel = false, size = 'md' }) {
  const { theme, toggleTheme, isDark } = useTheme();

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center gap-2 rounded-full border transition-all duration-300 cursor-pointer select-none ${
        isDark
          ? 'bg-[#18263A] border-[#2C3F5E] text-amber-300 hover:bg-[#1E3048] hover:border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
          : 'bg-white border-[#E8D9C8] text-[#5C473C] hover:bg-[#FAF5EF] hover:border-forest/40 shadow-xs'
      } ${
        isSmall
          ? 'h-9 w-9 p-1.5'
          : showLabel
          ? 'h-10 px-3.5 py-2'
          : 'h-11 w-11 p-2'
      } ${className}`}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun
            size={isSmall ? 16 : 18}
            className="animate-[spin_0.5s_ease-out] text-amber-300"
            strokeWidth={2.4}
          />
        ) : (
          <Moon
            size={isSmall ? 16 : 18}
            className="text-forest transition-transform duration-300 hover:-rotate-12"
            strokeWidth={2.4}
          />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-black tracking-tight whitespace-nowrap">
          {isDark ? 'Modo Claro' : 'Modo Oscuro'}
        </span>
      )}
    </button>
  );
}
