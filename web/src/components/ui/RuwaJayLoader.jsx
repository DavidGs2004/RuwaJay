import { useEffect, useState } from 'react';

export default function RuwaJayLoader() {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setLeaving(true), 2600);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className={`ruwajay-loader${leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite" aria-label="Cargando RuwaJay">
      <div className="loader-content">
        <div className="loader-emblem" aria-hidden="true">
          <svg className="loader-ring" viewBox="0 0 240 240">
            <defs><g id="ruwa-loader-motif"><path d="M104 8h8l8 8 8-8h8v11l-16 16-16-16Z" fill="#ffd447"/><path d="m114 8 6 6 6-6Z" fill="#f04b23"/><rect x="116" y="24" width="8" height="8" rx="1" fill="#f7a900"/></g></defs>
            <circle cx="120" cy="120" r="109" fill="none" stroke="#003d29" strokeWidth="13"/><circle cx="120" cy="120" r="101" fill="none" stroke="#006b3c" strokeWidth="17"/><circle cx="120" cy="120" r="92" fill="none" stroke="#f7a900" strokeWidth="4"/>
            <g>{Array.from({ length: 12 }, (_, index) => <use key={index} href="#ruwa-loader-motif" transform={`rotate(${index * 30} 120 120)`}/>)}</g>
          </svg>
          <svg className="loader-home" viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="88" fill="#fff7e8" stroke="#ffd447" strokeWidth="3"/>
            <g className="loader-sun" fill="none" stroke="#f7a900" strokeWidth="5" strokeLinecap="round"><circle cx="168" cy="71" r="14" fill="#ffd447" stroke="none"/><path d="M168 45v8M168 89v8M142 71h8M186 71h8M150 53l6 6M180 83l6 6M186 53l-6 6M156 83l-6 6"/></g>
            <ellipse className="loader-shadow" cx="119" cy="185" rx="54" ry="8" fill="#003d29"/>
            <path d="M58 117 97 82l23 20 20-16 43 31v54H58Z" fill="#ffe9bf"/><path d="m49 119 48-44 24 20 19-15 51 38-9 12-42-31-20 15-23-20-38 36Z" fill="#f04b23"/><path d="m60 112 37-34 24 20 19-15 41 30" fill="none" stroke="#4a1d0a" strokeWidth="7" strokeLinecap="square" strokeLinejoin="miter"/>
            <path d="M66 118h108v13H66Z" fill="#f7a900"/><path d="M66 118h12v7h12v-7h12v7h12v-7h12v7h12v-7h12v7h12v-7h12v13H66Z" fill="#ffd447"/>
            <rect x="70" y="136" width="26" height="23" rx="2" fill="#006b3c"/><rect x="76" y="141" width="14" height="13" rx="1" fill="#ffd447"/><path d="M117 171v-33a17 17 0 0 1 34 0v33Z" fill="#4a1d0a"/><path className="loader-door-light" d="M126 171v-31a8 8 0 0 1 16 0v31Z" fill="#f7a900"/><circle cx="138" cy="153" r="2" fill="#fff7e8"/>
            <path d="M47 175c13-21 25-20 36 0ZM157 175c13-23 27-23 39 0Z" fill="#006b3c"/><path d="M54 175c-4-20 2-29 13-34 2 18-2 28-13 34ZM73 175c1-20 9-27 21-29-3 18-9 26-21 29ZM170 175c-3-21 4-31 16-35 1 19-4 29-16 35Z" fill="#159447"/>
            <path className="loader-path" d="M134 173c-1 7-19 10-18 21" fill="none" stroke="#f7a900" strokeWidth="6" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="loader-brand">Ruwa<span>Jay</span></p>
        <p className="loader-message">Preparando tu próximo hogar <span className="loader-dots" aria-hidden="true"><i/><i/><i/></span></p>
      </div>
    </section>
  );
}
