import { useState, useMemo } from 'react';
import {
  X, Calculator, ArrowRight, ShieldCheck, Sparkles,
  AlertCircle, Home, MapPin, PieChart, CheckCircle2,
  ChevronDown, ChevronUp, Info, HelpCircle
} from 'lucide-react';
import { formatPrice } from '../../data/properties';

/**
 * RentAffordabilityModal — Financial planning tool applying the 30/70 rule for Guatemalan renters
 * Features:
 * - Simple & detailed expense breakdown (services, groceries, transport, debts)
 * - Visual interactive 3-tier budget distribution bar (Rent vs Expenses vs Living/Savings)
 * - Financial health assessment indicator with warnings
 * - 1-Click interactive suggested locations filtering directly into catalog & map auto-centering
 */
export default function RentAffordabilityModal({
  isOpen,
  onClose,
  onApplyBudgetFilter,
  onSelectSuggestedLocation,
}) {
  const [income, setIncome] = useState(10000);
  const [tierPercent, setTierPercent] = useState(30);
  const [expenseMode, setExpenseMode] = useState('simple'); // 'simple' | 'detailed'
  const [simpleExpenses, setSimpleExpenses] = useState(2500);

  // Detailed categories for Guatemala
  const [detailedExpenses, setDetailedExpenses] = useState({
    services: 650,     // Agua, luz EEGSA, internet, garita
    groceries: 2000,   // Canasta básica y súper
    transport: 800,    // Gasolina, Transmetro, parqueo
    debts: 500,        // Préstamos, colegiaturas, tarjetas
  });

  // Calculate total fixed expenses according to mode
  const totalFixedExpenses = useMemo(() => {
    if (expenseMode === 'detailed') {
      return (
        Number(detailedExpenses.services || 0) +
        Number(detailedExpenses.groceries || 0) +
        Number(detailedExpenses.transport || 0) +
        Number(detailedExpenses.debts || 0)
      );
    }
    return Number(simpleExpenses) || 0;
  }, [expenseMode, simpleExpenses, detailedExpenses]);

  // Computations
  const calculations = useMemo(() => {
    const inc = Math.max(100, Number(income) || 0);
    const exp = Math.max(0, totalFixedExpenses);

    const recommended = Math.round(inc * (tierPercent / 100));
    const maxBudget = Math.round(inc * 0.38);
    const remainingForLiving = Math.max(0, inc - recommended - exp);
    const initialMoveInCash = Math.round(recommended * 2 + 500); // 1st month + deposit + garita/legal

    // Percentages for visual bar
    const rentPercentActual = Math.min(100, Math.round((recommended / inc) * 100));
    const expPercentActual = Math.min(100 - rentPercentActual, Math.round((exp / inc) * 100));
    const livingPercentActual = Math.max(0, 100 - rentPercentActual - expPercentActual);
    const totalCommitmentPercent = Math.round(((recommended + exp) / inc) * 100);

    let suggestedLocations = [];
    if (recommended <= 3200) {
      suggestedLocations = [
        { label: 'San Miguel Petapa', dept: 'Guatemala', zone: 'San Miguel Petapa' },
        { label: 'Villa Nueva', dept: 'Guatemala', zone: 'Villa Nueva' },
        { label: 'Mixco / San Cristóbal', dept: 'Guatemala', zone: 'San Cristóbal' },
        { label: 'Zona 1 (Centro)', dept: 'Guatemala', zone: 'Zona 1' },
        { label: 'Zona 7 (Kaminaljuyú)', dept: 'Guatemala', zone: 'Zona 7' },
        { label: 'Xela Centro (Quetzaltenango)', dept: 'Quetzaltenango', zone: 'Zona 1 (Centro Histórico)' },
      ];
    } else if (recommended <= 5800) {
      suggestedLocations = [
        { label: 'Zona 4 (Cuatro Grados)', dept: 'Guatemala', zone: 'Zona 4' },
        { label: 'Zona 11 (Mariscal / Miraflores)', dept: 'Guatemala', zone: 'Zona 11' },
        { label: 'Zona 12 (USAC / Reformita)', dept: 'Guatemala', zone: 'Zona 12' },
        { label: 'Carretera a El Salvador', dept: 'Guatemala', zone: 'Carretera a El Salvador' },
        { label: 'Antigua Guatemala (Jocotenango)', dept: 'Sacatepéquez', zone: 'Jocotenango' },
        { label: 'Panajachel (Sololá)', dept: 'Sololá', zone: 'Panajachel' },
      ];
    } else if (recommended <= 8500) {
      suggestedLocations = [
        { label: 'Zona 10 (Zona Viva)', dept: 'Guatemala', zone: 'Zona 10' },
        { label: 'Zona 14 (La Cañada / Europlaza)', dept: 'Guatemala', zone: 'Zona 14' },
        { label: 'Zona 15 (Vista Hermosa)', dept: 'Guatemala', zone: 'Zona 15' },
        { label: 'Zona 16 (San Isidro)', dept: 'Guatemala', zone: 'Zona 16' },
        { label: 'Antigua Guatemala (Centro)', dept: 'Sacatepéquez', zone: 'Antigua Guatemala' },
      ];
    } else {
      suggestedLocations = [
        { label: 'Zona 14 (Exclusivo)', dept: 'Guatemala', zone: 'Zona 14' },
        { label: 'Zona 15 (Penthouses)', dept: 'Guatemala', zone: 'Zona 15' },
        { label: 'Zona 16 (Cayalá)', dept: 'Guatemala', zone: 'Zona 16' },
        { label: 'Carretera a El Salvador (Lujo)', dept: 'Guatemala', zone: 'Carretera a El Salvador' },
      ];
    }

    return {
      inc,
      exp,
      recommended,
      maxBudget,
      remainingForLiving,
      initialMoveInCash,
      rentPercentActual,
      expPercentActual,
      livingPercentActual,
      totalCommitmentPercent,
      suggestedLocations,
    };
  }, [income, totalFixedExpenses, tierPercent]);

  if (!isOpen) return null;

  const handleApplyGeneralBudget = () => {
    onApplyBudgetFilter?.(calculations.maxBudget);
    onClose();
  };

  const handleLocationClick = (loc) => {
    onSelectSuggestedLocation?.(loc, calculations.maxBudget);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-[#FDFBF7] px-5 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest text-white shadow-sm">
              <Calculator size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-cafe sm:text-lg">
                  Calculadora de Capacidad de Alquiler
                </h3>
                <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-black text-forest border border-forest/20">
                  Regla 30/70
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Planificación financiera inteligente adaptada al mercado inmobiliario de Guatemala
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-cafe/5 hover:text-cafe transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {/* Income & Expense Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Income */}
            <div className="rounded-2xl border border-border bg-[#FDFBF7] p-4">
              <label className="block text-xs font-bold text-cafe mb-1.5">
                Ingreso mensual neto total (Q)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-black text-forest">Q</span>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={income}
                  onChange={(e) => setIncome(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-xl border border-border bg-white pl-8 pr-3 py-2.5 text-sm font-extrabold text-cafe outline-none focus:border-forest focus:ring-2 focus:ring-forest/10"
                />
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">
                Suma tus ingresos líquidos mensuales o familiares
              </p>
            </div>

            {/* Expenses with Simple/Detailed Toggle */}
            <div className="rounded-2xl border border-border bg-[#FDFBF7] p-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-cafe">
                  Gastos fijos obligatorios (Q)
                </label>
                <button
                  type="button"
                  onClick={() => setExpenseMode(expenseMode === 'simple' ? 'detailed' : 'simple')}
                  className="text-[11px] font-extrabold text-forest hover:underline"
                >
                  {expenseMode === 'simple' ? '⚙️ Desglosar gastos' : '↩ Modo simple'}
                </button>
              </div>

              {expenseMode === 'simple' ? (
                <div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-sm font-black text-terracota">Q</span>
                    <input
                      type="number"
                      min={0}
                      step={200}
                      value={simpleExpenses}
                      onChange={(e) => setSimpleExpenses(Math.max(0, Number(e.target.value)))}
                      className="w-full rounded-xl border border-border bg-white pl-8 pr-3 py-2.5 text-sm font-extrabold text-cafe outline-none focus:border-forest focus:ring-2 focus:ring-forest/10"
                    />
                  </div>
                  <p className="text-[11px] text-text-muted mt-1.5">
                    Deudas, colegiaturas, créditos o servicios
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-muted font-medium">Servicios (luz/agua/net/garita):</span>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1.5 text-[11px] font-bold text-text-muted">Q</span>
                      <input
                        type="number"
                        value={detailedExpenses.services}
                        onChange={(e) => setDetailedExpenses({ ...detailedExpenses, services: Number(e.target.value) })}
                        className="w-full rounded-lg border border-border bg-white pl-6 pr-2 py-1 text-xs font-bold text-cafe outline-none focus:border-forest"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-muted font-medium">Alimentación y súper:</span>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1.5 text-[11px] font-bold text-text-muted">Q</span>
                      <input
                        type="number"
                        value={detailedExpenses.groceries}
                        onChange={(e) => setDetailedExpenses({ ...detailedExpenses, groceries: Number(e.target.value) })}
                        className="w-full rounded-lg border border-border bg-white pl-6 pr-2 py-1 text-xs font-bold text-cafe outline-none focus:border-forest"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-muted font-medium">Transporte y gasolina:</span>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1.5 text-[11px] font-bold text-text-muted">Q</span>
                      <input
                        type="number"
                        value={detailedExpenses.transport}
                        onChange={(e) => setDetailedExpenses({ ...detailedExpenses, transport: Number(e.target.value) })}
                        className="w-full rounded-lg border border-border bg-white pl-6 pr-2 py-1 text-xs font-bold text-cafe outline-none focus:border-forest"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-muted font-medium">Préstamos y colegiaturas:</span>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1.5 text-[11px] font-bold text-text-muted">Q</span>
                      <input
                        type="number"
                        value={detailedExpenses.debts}
                        onChange={(e) => setDetailedExpenses({ ...detailedExpenses, debts: Number(e.target.value) })}
                        className="w-full rounded-lg border border-border bg-white pl-6 pr-2 py-1 text-xs font-bold text-cafe outline-none focus:border-forest"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border/80 pt-1.5 flex items-center justify-between font-black text-cafe">
                    <span>Total fijos desglosados:</span>
                    <span className="text-terracota">{formatPrice(totalFixedExpenses)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tier Selector */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-cafe mb-2">
              Perfil de presupuesto asignado a vivienda
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { percent: 25, title: '25% Conservador', subtitle: 'Ahorro máximo' },
                { percent: 30, title: '30% Recomendado', subtitle: 'Equilibrio sano' },
                { percent: 35, title: '35% Flexible', subtitle: 'Mayor confort' },
              ].map((tier) => (
                <button
                  key={tier.percent}
                  type="button"
                  onClick={() => setTierPercent(tier.percent)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                    tierPercent === tier.percent
                      ? 'border-forest bg-forest/10 text-forest shadow-xs font-black'
                      : 'border-border bg-white text-text-secondary hover:border-forest/40'
                  }`}
                >
                  <span className="text-xs font-bold">{tier.title}</span>
                  <span className="text-[10px] text-text-muted">{tier.subtitle}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ══════════════ VISUAL MULTI-SEGMENT BUDGET BAR ══════════════ */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-cafe flex items-center gap-1.5">
                <PieChart size={15} className="text-forest" />
                Desglose Visual de tu Ingreso ({formatPrice(calculations.inc)} = 100%)
              </span>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                calculations.totalCommitmentPercent <= 60
                  ? 'bg-jade/10 text-forest'
                  : calculations.totalCommitmentPercent <= 75
                  ? 'bg-dorado/15 text-dorado'
                  : 'bg-red-50 text-red-600'
              }`}>
                {calculations.totalCommitmentPercent <= 60
                  ? '✓ Excelente salud'
                  : calculations.totalCommitmentPercent <= 75
                  ? '⚖️ Sostenible'
                  : '⚠️ Alerta de sobrecarga'}
              </span>
            </div>

            {/* Segmented Bar */}
            <div className="h-5 w-full rounded-full bg-crema overflow-hidden flex shadow-inner border border-border/50">
              {/* Rent segment */}
              <div
                style={{ width: `${calculations.rentPercentActual}%` }}
                className="bg-forest h-full transition-all duration-500 relative group cursor-pointer flex items-center justify-center text-[10px] font-black text-white"
                title={`Renta: ${formatPrice(calculations.recommended)} (${calculations.rentPercentActual}%)`}
              >
                {calculations.rentPercentActual >= 15 && `${calculations.rentPercentActual}%`}
              </div>

              {/* Fixed Expenses segment */}
              <div
                style={{ width: `${calculations.expPercentActual}%` }}
                className="bg-terracota h-full transition-all duration-500 relative group cursor-pointer flex items-center justify-center text-[10px] font-black text-white"
                title={`Gastos Fijos: ${formatPrice(calculations.exp)} (${calculations.expPercentActual}%)`}
              >
                {calculations.expPercentActual >= 15 && `${calculations.expPercentActual}%`}
              </div>

              {/* Free living/saving segment */}
              <div
                style={{ width: `${calculations.livingPercentActual}%` }}
                className="bg-dorado h-full transition-all duration-500 relative group cursor-pointer flex items-center justify-center text-[10px] font-black text-white"
                title={`Libre / Ahorro: ${formatPrice(calculations.remainingForLiving)} (${calculations.livingPercentActual}%)`}
              >
                {calculations.livingPercentActual >= 15 && `${calculations.livingPercentActual}%`}
              </div>
            </div>

            {/* Bar Legend */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-cafe">
                <span className="w-3 h-3 rounded-full bg-forest shrink-0" />
                <span className="truncate">Renta ({calculations.rentPercentActual}% · {formatPrice(calculations.recommended)})</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-cafe">
                <span className="w-3 h-3 rounded-full bg-terracota shrink-0" />
                <span className="truncate">Fijos ({calculations.expPercentActual}% · {formatPrice(calculations.exp)})</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-cafe">
                <span className="w-3 h-3 rounded-full bg-dorado shrink-0" />
                <span className="truncate">Libre ({calculations.livingPercentActual}% · {formatPrice(calculations.remainingForLiving)})</span>
              </div>
            </div>

            {/* Warning if overcommitted */}
            {calculations.totalCommitmentPercent > 75 && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium mt-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                <span>
                  <strong>Atención:</strong> Tus gastos fijos y renta suman el <strong>{calculations.totalCommitmentPercent}%</strong> de tus ingresos. Te sugerimos elegir una vivienda de hasta {formatPrice(Math.round(calculations.inc * 0.25))} o reducir compromisos para evitar tensiones de fin de mes.
                </span>
              </div>
            )}
          </div>

          {/* ══════════════ RESULT STATS CARDS ══════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-forest/20 bg-forest/5 p-4 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-forest">
                Renta Recomendada
              </span>
              <p className="text-xl sm:text-2xl font-black text-forest mt-1">
                {formatPrice(calculations.recommended)}
              </p>
              <span className="text-[10px] text-text-muted font-semibold">
                por mes ({tierPercent}% del ingreso)
              </span>
            </div>

            <div className="rounded-2xl border border-dorado/30 bg-dorado/5 p-4 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-dorado">
                Tope Máximo Seguro
              </span>
              <p className="text-xl sm:text-2xl font-black text-cafe mt-1">
                {formatPrice(calculations.maxBudget)}
              </p>
              <span className="text-[10px] text-text-muted font-semibold">
                límite financiero sano (38%)
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-crema/40 p-4 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
                Fondo Inicial Mudanza
              </span>
              <p className="text-xl sm:text-2xl font-black text-cafe mt-1">
                {formatPrice(calculations.initialMoveInCash)}
              </p>
              <span className="text-[10px] text-text-muted font-semibold">
                1er mes + depósito + garita
              </span>
            </div>
          </div>

          {/* ══════════════ 1-CLICK INTERACTIVE SUGGESTED LOCATIONS ══════════════ */}
          <div className="rounded-2xl border border-border bg-[#FDFBF7] p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-3">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-forest" />
                <h4 className="text-xs font-black text-cafe uppercase tracking-wider">
                  Zonas y Sectores recomendados en Guatemala:
                </h4>
              </div>
              <span className="text-[11px] font-bold text-forest">
                ⚡ Clic en una zona para filtrar y centrar mapa
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {calculations.suggestedLocations.map((loc) => (
                <button
                  key={loc.label}
                  type="button"
                  onClick={() => handleLocationClick(loc)}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3.5 py-1.5 text-xs font-bold text-cafe shadow-2xs hover:border-forest hover:bg-forest hover:text-white transition-all active:scale-95 cursor-pointer"
                  title={`Buscar casas y apartamentos en ${loc.label} por hasta ${formatPrice(calculations.maxBudget)}`}
                >
                  <MapPin size={13} className="text-terracota group-hover:text-white transition-colors" />
                  <span>{loc.label}</span>
                  <ArrowRight size={12} className="text-text-muted group-hover:text-white transition-colors group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-text-muted hover:text-cafe"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleApplyGeneralBudget}
            className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-black text-white hover:bg-forest-dark transition-all shadow-md active:scale-95"
          >
            <span>Ver viviendas en mi presupuesto (≤ {formatPrice(calculations.maxBudget)})</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
