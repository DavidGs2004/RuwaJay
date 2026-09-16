import { useState, useMemo } from 'react';
import { X, Printer, Copy, Check, FileText, ShieldCheck, Scale, Calendar, User, Home, Download } from 'lucide-react';
import { formatPrice } from '../../data/properties';

/**
 * LeaseContractModal — Official residential lease agreement generator for Guatemala
 * Conforms to Articles 1880 to 1941 of the Guatemalan Civil Code (Decreto Ley 106).
 * Features:
 * - Pre-filled fields from property and user (including verified DPI if available)
 * - Live preview of legal document
 * - Print-ready layout (@media print) for direct PDF export
 * - Copy text capability
 */
export default function LeaseContractModal({
  isOpen,
  onClose,
  property,
  owner,
  user,
}) {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'edit'
  const [copied, setCopied] = useState(false);

  // Extract user verified DPI if available
  const userCui = user?.dpiData?.cui || '';
  const userAddress = user?.dpiData?.legalAddress || 'Ciudad de Guatemala';

  // Form states
  const [contractData, setContractData] = useState({
    city: 'Guatemala',
    day: new Date().getDate(),
    month: new Date().toLocaleString('es-GT', { month: 'long' }),
    year: new Date().getFullYear(),
    ownerName: owner?.name || 'María Elena López',
    ownerCui: '1234 56789 0101',
    ownerAddress: 'Ciudad de Guatemala',
    tenantName: user?.name || 'Inquilino Arrendatario',
    tenantCui: userCui || '2345 67890 0101',
    tenantAddress: userAddress,
    hasGuarantor: false,
    guarantorName: 'Fiador Mancomunado',
    guarantorCui: '3456 78901 0101',
    propertyAddress: property?.address?.exact || property?.address?.approximate || 'Zona 10, Ciudad de Guatemala',
    propertyDepartment: property?.address?.department || 'Guatemala',
    monthlyRent: property?.price || 4500,
    depositAmount: property?.deposit || property?.price || 4500,
    maintenanceFee: 350,
    durationMonths: 12,
    startDate: new Date().toISOString().split('T')[0],
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const el = document.getElementById('printable-contract-text');
    if (el) {
      navigator.clipboard.writeText(el.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen || !property) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-black/60 p-2 sm:p-4 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-border">
        {/* Header (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-border bg-[#FDFBF7] px-5 py-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest text-white shadow-sm">
              <Scale size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-cafe sm:text-lg">
                  Borrador de Contrato de Arrendamiento
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-extrabold text-forest border border-forest/20">
                  <ShieldCheck size={11} /> Leyes de Guatemala
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Código Civil de Guatemala (Decreto Ley 106, Art. 1880 - 1941)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex min-h-10 items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-black text-white hover:bg-forest-dark transition-all shadow-xs active:scale-95"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-bold text-cafe hover:bg-crema transition-all"
            >
              {copied ? <Check size={15} className="text-forest" /> : <Copy size={15} />}
              <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-cafe/5 hover:text-cafe transition-colors"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* View Switcher (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-border bg-crema/40 px-6 py-2.5 print:hidden">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'preview'
                  ? 'bg-forest text-white shadow-xs'
                  : 'text-cafe hover:bg-white'
              }`}
            >
              Vista Previa Legal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'edit'
                  ? 'bg-forest text-white shadow-xs'
                  : 'text-cafe hover:bg-white'
              }`}
            >
              Editar Datos del Contrato
            </button>
          </div>

          <span className="text-[11px] font-semibold text-text-muted hidden sm:inline">
            Propiedad: <strong className="text-cafe">{property.title}</strong>
          </span>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-[#FAF8F5]">
          {/* EDIT FORM TAB */}
          {activeTab === 'edit' && (
            <div className="space-y-6 max-w-2xl mx-auto print:hidden bg-white p-6 rounded-2xl border border-border shadow-xs">
              <h4 className="font-extrabold text-cafe text-sm uppercase tracking-wider border-b border-border/60 pb-2">
                Partes Comparecientes
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-cafe mb-1">Nombre del Arrendante (Propietario)</label>
                  <input
                    type="text"
                    value={contractData.ownerName}
                    onChange={(e) => setContractData({ ...contractData, ownerName: e.target.value })}
                    className="w-full rounded-xl border border-border bg-[#FDFBF7] px-3 py-2 text-xs font-semibold text-cafe outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-cafe mb-1">DPI / CUI del Arrendante</label>
                  <input
                    type="text"
                    value={contractData.ownerCui}
                    onChange={(e) => setContractData({ ...contractData, ownerCui: e.target.value })}
                    className="w-full rounded-xl border border-border bg-[#FDFBF7] px-3 py-2 text-xs font-semibold text-cafe outline-none focus:border-forest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-cafe mb-1">Nombre del Arrendatario (Inquilino)</label>
                  <input
                    type="text"
                    value={contractData.tenantName}
                    onChange={(e) => setContractData({ ...contractData, tenantName: e.target.value })}
                    className="w-full rounded-xl border border-border bg-[#FDFBF7] px-3 py-2 text-xs font-semibold text-cafe outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-cafe mb-1">DPI / CUI del Arrendatario</label>
                  <input
                    type="text"
                    value={contractData.tenantCui}
                    onChange={(e) => setContractData({ ...contractData, tenantCui: e.target.value })}
                    className="w-full rounded-xl border border-border bg-[#FDFBF7] px-3 py-2 text-xs font-semibold text-cafe outline-none focus:border-forest"
                  />
                </div>
              </div>

              <h4 className="font-extrabold text-cafe text-sm uppercase tracking-wider border-b border-border/60 pb-2 pt-2">
                Condiciones del Alquiler (Quetzales)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-cafe mb-1">Renta Mensual (Q)</label>
                  <input
                    type="number"
                    value={contractData.monthlyRent}
                    onChange={(e) => setContractData({ ...contractData, monthlyRent: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-[#FDFBF7] px-3 py-2 text-xs font-semibold text-cafe outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-cafe mb-1">Depósito en Garantía (Q)</label>
                  <input
                    type="number"
                    value={contractData.depositAmount}
                    onChange={(e) => setContractData({ ...contractData, depositAmount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-[#FDFBF7] px-3 py-2 text-xs font-semibold text-cafe outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-cafe mb-1">Cuota Garita / Mant. (Q)</label>
                  <input
                    type="number"
                    value={contractData.maintenanceFee}
                    onChange={(e) => setContractData({ ...contractData, maintenanceFee: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-[#FDFBF7] px-3 py-2 text-xs font-semibold text-cafe outline-none focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-cafe mb-1">Dirección del Inmueble</label>
                <input
                  type="text"
                  value={contractData.propertyAddress}
                  onChange={(e) => setContractData({ ...contractData, propertyAddress: e.target.value })}
                  className="w-full rounded-xl border border-border bg-[#FDFBF7] px-3 py-2 text-xs font-semibold text-cafe outline-none focus:border-forest"
                />
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="rounded-xl bg-forest px-5 py-2 text-xs font-black text-white hover:bg-forest-dark"
                >
                  Actualizar y Ver Contrato
                </button>
              </div>
            </div>
          )}

          {/* LEGAL DOCUMENT PREVIEW (Printable) */}
          <div
            id="printable-contract-text"
            className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl border border-border shadow-md print:shadow-none print:border-none print:p-0 text-cafe font-serif leading-relaxed text-sm print:text-black"
          >
            {/* Watermark/Emblem */}
            <div className="text-center border-b-2 border-forest/20 pb-5 mb-6">
              <p className="text-[10px] font-sans font-black uppercase tracking-[0.25em] text-dorado mb-1">
                República de Guatemala • Documento Privado con Legalización de Firmas
              </p>
              <h2 className="text-lg sm:text-xl font-black font-sans uppercase tracking-tight text-cafe">
                CONTRATO PRIVADO DE ARRENDAMIENTO DE BIEN INMUEBLE PARA VIVIENDA
              </h2>
              <p className="text-[11px] font-sans text-text-muted mt-1">
                Fundamento Legal: Artículos 1880 al 1941 del Código Civil de Guatemala (Decreto Ley 106)
              </p>
            </div>

            {/* Introductory clause */}
            <p className="mb-4 text-justify">
              En la ciudad de <strong>{contractData.city}</strong>, departamento de <strong>{contractData.propertyDepartment}</strong>,
              el día <strong>{contractData.day}</strong> de <strong>{contractData.month}</strong> del año <strong>{contractData.year}</strong>,
              comparecemos por una parte: <strong>{contractData.ownerName}</strong>, mayor de edad, con domicilio en {contractData.ownerAddress},
              quien se identifica con el Código Único de Identificación —CUI— del Documento Personal de Identificación —DPI— número{' '}
              <strong>{contractData.ownerCui}</strong>, extendido por el Registro Nacional de las Personas —RENAP— de la República de Guatemala,
              a quien en lo sucesivo de este instrumento se le denominará simplemente como <strong>"EL ARRENDANTE"</strong>; y por la otra parte:{' '}
              <strong>{contractData.tenantName}</strong>, mayor de edad, con domicilio en {contractData.tenantAddress}, quien se identifica con el
              Código Único de Identificación —CUI— del Documento Personal de Identificación —DPI— número{' '}
              <strong>{contractData.tenantCui}</strong>, extendido por el RENAP, a quien en adelante se le denominará{' '}
              <strong>"EL ARRENDATARIO"</strong>. Ambos otorgantes manifestamos encontrarnos en el libre ejercicio de nuestros derechos civiles y
              convenir en celebrar el presente <strong>CONTRATO DE ARRENDAMIENTO RESIDENCIAL</strong>, sujeto a las cláusulas siguientes:
            </p>

            {/* CLAUSES */}
            <div className="space-y-4 text-justify">
              <p>
                <strong>PRIMERA: DEL INMUEBLE OBJETO DEL CONTRATO.</strong> Manifiesta EL ARRENDANTE que es legítimo poseedor del bien inmueble
                ubicado en: <strong>{contractData.propertyAddress}</strong>, departamento de {contractData.propertyDepartment}. El inmueble cuenta
                con sus instalaciones completas, servicios de agua potable, servicio sanitario, energía eléctrica y accesorios en perfecto estado de
                funcionamiento y conservación, comprometiéndose EL ARRENDATARIO a entregarlo al vencimiento en el mismo estado en que hoy lo recibe.
              </p>

              <p>
                <strong>SEGUNDA: DEL PLAZO Y VIGENCIA.</strong> El plazo del presente arrendamiento será de{' '}
                <strong>{contractData.durationMonths} MESES FORZOSOS</strong>, contados a partir de la fecha de inicio convenida ({contractData.startDate}).
                Dicho plazo podrá prorrogarse únicamente mediante cruce de cartas escritas o firma de nuevo documento con al menos treinta (30) días
                calendario de anticipación a su vencimiento.
              </p>

              <p>
                <strong>TERCERA: DEL PRECIO DE LA RENTA Y FORMA DE PAGO.</strong> EL ARRENDATARIO se obliga formalmente a pagar a EL ARRENDANTE en
                concepto de renta mensual la suma de <strong>{formatPrice(contractData.monthlyRent)} EXACTOS</strong> mensuales anticipados, los
                cuales deberán hacerse efectivos dentro de los <strong>primeros cinco (5) días calendario</strong> de cada mes, mediante depósito o
                transferencia bancaria a la cuenta designada por EL ARRENDANTE. La falta de pago puntual causará un recargo moratorio mensual por retraso
                además de constituir causa inmediata de resolución del contrato.
              </p>

              <p>
                <strong>CUARTA: DEL DEPÓSITO EN GARANTÍA.</strong> En este acto EL ARRENDATARIO entrega a EL ARRENDANTE la cantidad de{' '}
                <strong>{formatPrice(contractData.depositAmount)} EXACTOS</strong> en concepto de depósito de garantía. Dicha suma garantizará el pago
                de cualquier daño atribuible al inquilino, reparaciones locativas o saldos pendientes de servicios públicos. Este depósito en ningún caso
                podrá abonarse como pago de mensualidad de renta y será devuelto dentro de los treinta (30) días posteriores a la desocupación formal del
                inmueble previa verificación del finiquito de servicios.
              </p>

              <p>
                <strong>QUINTA: DESTINO EXCLUSIVO Y PROHIBICIONES.</strong> El inmueble se destinará única y exclusivamente para{' '}
                <strong>HABITACIÓN Y VIVIENDA FAMILIAR</strong>. Queda terminantemente prohibido a EL ARRENDATARIO: a) Subarrendar total o parcialmente el
                bien inmueble a terceras personas naturales o jurídicas; b) Introducir sustancias inflamables, corrosivas o explosivas; c) Destinar el
                inmueble para actividades mercantiles abiertas al público, ilícitas o reñidas con la moral; d) Modificar la estructura arquitectónica del
                inmueble sin previa autorización expresa y por escrito de EL ARRENDANTE.
              </p>

              <p>
                <strong>SEXTA: DE LOS SERVICIOS Y MANTENIMIENTO.</strong> Correrá por cuenta exclusiva de EL ARRENDATARIO el pago puntual de su consumo
                de energía eléctrica, servicio de internet/cable y la cuota mensual de seguridad/garita de <strong>{formatPrice(contractData.maintenanceFee)}</strong>.
                Las reparaciones locativas originadas por el uso ordinario o negligencia del inquilino serán cubiertas por este último.
              </p>

              <p>
                <strong>SÉPTIMA: DE LA TERMINACIÓN ANTICIPADA Y DESAHUCIO.</strong> Son causas de terminación anticipada de pleno derecho: el vencimiento
                del plazo, la falta de pago de una sola mensualidad de renta en el tiempo estipulado, la violación a cualquiera de las prohibiciones pactadas
                o el deterioro grave de la propiedad. EL ARRENDATARIO renuncia expresamente al fuero de su domicilio y se somete a los Tribunales de
                Justicia del departamento de {contractData.propertyDepartment}, aceptando como buenas y exactas las cuentas que formule EL ARRENDANTE y como
                líquido y exigible el saldo que se le reclame.
              </p>

              <p>
                <strong>OCTAVA: ACEPTACIÓN FORMAL.</strong> En los términos consignados, las partes comparecientes leemos íntegramente lo estipulado en este
                documento privado, y enterados de su contenido, validez y efectos legales, lo ratificamos, aceptamos y firmamos de mutuo acuerdo.
              </p>
            </div>

            {/* SIGNATURE SECTION */}
            <div className="grid grid-cols-2 gap-12 pt-16 mt-8 border-t border-border/80">
              <div className="text-center">
                <div className="border-t-2 border-cafe pt-2">
                  <p className="font-bold text-xs">{contractData.ownerName}</p>
                  <p className="text-[11px] text-text-muted">EL ARRENDANTE (Propietario)</p>
                  <p className="text-[10px] text-text-muted">DPI: {contractData.ownerCui}</p>
                </div>
              </div>

              <div className="text-center">
                <div className="border-t-2 border-cafe pt-2">
                  <p className="font-bold text-xs">{contractData.tenantName}</p>
                  <p className="text-[11px] text-text-muted">EL ARRENDATARIO (Inquilino)</p>
                  <p className="text-[10px] text-text-muted">DPI: {contractData.tenantCui}</p>
                </div>
              </div>
            </div>

            {/* Legal stamp note */}
            <div className="mt-12 text-center text-[10px] text-text-muted/80 italic border-t border-dashed border-border pt-3">
              Generado automáticamente a través de la plataforma inmobiliaria RuwaJay Guatemala • Modelo estándar de contrato privado conforme a la legislación vigente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
