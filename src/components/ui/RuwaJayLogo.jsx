export default function RuwaJayLogo({ size = 44, showText = true, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo/logo.png"
        alt="RuwaJay"
        className="drop-shadow-md"
        style={{
          height: size,
          width: 'auto',
          objectFit: 'contain',
        }}
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-extrabold text-[22px] tracking-tight text-cafe">
            Ruwa<span className="text-terracota">Jay</span>
          </span>
          <span className="text-[9px] tracking-[0.25em] uppercase font-bold text-dorado mt-0.5">
            Tu hogar, tu camino
          </span>
        </div>
      )}
    </div>
  );
}
