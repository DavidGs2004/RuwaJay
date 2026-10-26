import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function RuwaPagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 5,
  onPageChange = () => {},
  label = 'elementos',
  className = '',
}) {
  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [1];
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    if (!pages.includes(totalPages)) pages.push(totalPages);
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 mt-3 border-t border-border-light text-xs ${className}`}
    >
      <span className="font-semibold text-text-muted">
        Mostrando <strong className="text-cafe">{startItem}</strong> - <strong className="text-cafe">{endItem}</strong> de{' '}
        <strong className="text-cafe">{totalItems}</strong> {label}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 self-center sm:self-auto">
          {/* Previous Page */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="flex items-center gap-1 rounded-xl border border-border-light bg-white px-2.5 py-1.5 font-bold text-cafe transition-all hover:bg-forest/10 hover:text-forest disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
            title="Página anterior"
          >
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) =>
              p === '...' ? (
                <span key={`dots-${idx}`} className="px-1 text-text-muted font-bold select-none">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-8 h-8 rounded-xl font-bold transition-all text-xs flex items-center justify-center cursor-pointer ${
                    currentPage === p
                      ? 'bg-forest text-white shadow-xs font-black'
                      : 'bg-white border border-border-light text-cafe hover:bg-forest/10 hover:text-forest'
                  }`}
                  aria-current={currentPage === p ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            )}
          </div>

          {/* Next Page */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="flex items-center gap-1 rounded-xl border border-border-light bg-white px-2.5 py-1.5 font-bold text-cafe transition-all hover:bg-forest/10 hover:text-forest disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
            title="Página siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
