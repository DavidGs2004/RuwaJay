import React, { useState, useRef } from 'react';
import { X, Palette, Image as ImageIcon, Check, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';

export const WALLPAPER_PRESETS = [
  {
    id: 'default',
    name: 'RuwaJay Clásico',
    description: 'Cuadrícula sutil oficial',
    bgColor: '#FAF6F0',
    type: 'default',
    previewClass: 'bg-[#FAF6F0] border-border',
  },
  {
    id: 'linen',
    name: 'Lino Crema',
    description: 'Tonalidad cálida y suave',
    bgColor: '#F5ECE1',
    type: 'color',
    previewClass: 'bg-[#F5ECE1] border-border',
  },
  {
    id: 'dark',
    name: 'Noche Slate',
    description: 'Modo oscuro premium',
    bgColor: '#0F172A',
    textColor: '#F8FAFC',
    type: 'color',
    previewClass: 'bg-[#0F172A] border-slate-700',
  },
  {
    id: 'forest',
    name: 'Bosque Jade',
    description: 'Esmeralda distintivo',
    bgColor: '#062D1D',
    textColor: '#F0FDF4',
    type: 'color',
    previewClass: 'bg-[#062D1D] border-emerald-800',
  },
  {
    id: 'ocean',
    name: 'Azul Índigo',
    description: 'Calma marina',
    bgColor: '#0A2540',
    textColor: '#F0F9FF',
    type: 'color',
    previewClass: 'bg-[#0A2540] border-sky-800',
  },
  {
    id: 'sunset',
    name: 'Atardecer Maya',
    description: 'Terracota profundo',
    bgColor: '#451A03',
    textColor: '#FFFBEB',
    type: 'color',
    previewClass: 'bg-[#451A03] border-amber-900',
  },
  {
    id: 'sand',
    name: 'Arena Cálida',
    description: 'Pastel acogedor',
    bgColor: '#FFFBEB',
    type: 'color',
    previewClass: 'bg-[#FFFBEB] border-amber-200',
  },
  {
    id: 'white',
    name: 'Blanco Puro',
    description: 'Minimalismo absoluto',
    bgColor: '#FFFFFF',
    type: 'color',
    previewClass: 'bg-white border-border',
  },
];

export default function ChatWallpaperModal({
  currentConfig,
  onApply,
  onClose,
  conversationId,
}) {
  const [selectedPreset, setSelectedPreset] = useState(currentConfig?.preset || 'default');
  const [customImage, setCustomImage] = useState(currentConfig?.image || null);
  const [applyGlobally, setApplyGlobally] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      window.alert('La imagen no debe superar los 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomImage(reader.result);
      setSelectedPreset('custom');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = () => {
    const config = {
      preset: selectedPreset,
      image: selectedPreset === 'custom' ? customImage : null,
      applyGlobally,
    };
    onApply(config);
    onClose();
  };

  const handleReset = () => {
    setSelectedPreset('default');
    setCustomImage(null);
    onApply({ preset: 'default', image: null, applyGlobally });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-[fade-in_0.15s_ease-out]">
      <div className="flex flex-col w-full max-w-lg max-h-[90dvh] sm:max-h-[85vh] rounded-3xl bg-white shadow-2xl border border-border overflow-hidden my-auto">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 border-b border-border bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-forest/10 text-forest shrink-0">
              <Palette size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-cafe">Fondo de pantalla personalizado</h3>
              <p className="text-[11px] sm:text-xs text-text-muted">Personaliza la vista visual de tus chats</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-crema hover:text-cafe transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* Privacy Notice Banner */}
          <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/60 p-2.5 sm:p-3 text-[11px] sm:text-xs text-emerald-900">
            <ShieldCheck size={16} className="text-forest shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Personalización 100% privada:</strong> Este fondo se guarda exclusivamente en tu navegador. El otro usuario verá únicamente su propia configuración preferida.
            </p>
          </div>

          {/* Preset Styles */}
          <div>
            <label className="block text-xs font-black text-cafe mb-2 sm:mb-2.5">
              Estilos y colores predefinidos:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {WALLPAPER_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id && !customImage;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setCustomImage(null);
                    }}
                    className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border-2 transition-all relative text-center group ${
                      isSelected
                        ? 'border-forest bg-forest/5 shadow-xs scale-[1.01]'
                        : 'border-border/80 hover:border-forest/40 bg-white'
                    }`}
                  >
                    <div
                      className={`h-7 sm:h-9 w-full rounded-xl mb-1.5 sm:mb-2 border shadow-2xs ${preset.previewClass}`}
                      style={{ backgroundColor: preset.bgColor }}
                    />
                    <span className="text-[11px] font-black text-cafe truncate w-full">
                      {preset.name}
                    </span>
                    <span className="text-[9px] text-text-muted truncate w-full">
                      {preset.description}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-forest text-white text-[10px]">
                        <Check size={10} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Image Upload Section */}
          <div>
            <label className="block text-xs font-black text-cafe mb-1.5 sm:mb-2">
              O elige una foto o imagen desde tu dispositivo:
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-border hover:border-forest bg-[#FAF8F5] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-bold text-cafe transition-all hover:bg-white shadow-2xs"
              >
                <ImageIcon size={16} className="text-forest shrink-0" />
                <span>Seleccionar imagen...</span>
              </button>

              {customImage && (
                <div className="flex items-center gap-2 rounded-2xl border border-forest/30 bg-forest/5 p-1.5 pr-3">
                  <img
                    src={customImage}
                    alt="Vista previa fondo"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-cover border border-forest/20 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-forest">Foto seleccionada</p>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomImage(null);
                        setSelectedPreset('default');
                      }}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      Quitar foto
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scope selection */}
          <div className="pt-2 border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] sm:text-xs font-semibold text-cafe">
              <input
                type="checkbox"
                checked={applyGlobally}
                onChange={(e) => setApplyGlobally(e.target.checked)}
                className="h-4 w-4 rounded text-forest focus:ring-forest cursor-pointer shrink-0"
              />
              <span>Aplicar este fondo a todas mis conversaciones de chat</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-t border-border bg-[#FAF8F5] gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-cafe transition-colors px-1 sm:px-2 py-1.5"
          >
            <RotateCcw size={13} className="shrink-0" />
            <span className="hidden xs:inline sm:inline">Restablecer</span>
            <span className="xs:hidden sm:hidden text-[11px]">Por defecto</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 rounded-xl border border-border bg-white text-xs font-bold text-cafe hover:bg-crema transition-colors min-h-[36px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 sm:px-5 py-2 rounded-xl bg-forest hover:bg-forest-dark text-white text-xs font-black transition-all shadow-xs min-h-[36px] flex items-center justify-center whitespace-nowrap"
            >
              Guardar fondo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
