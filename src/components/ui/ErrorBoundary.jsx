import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RuwaJay ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full rounded-3xl border border-border bg-white p-8 shadow-card">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-xl font-black text-cafe mb-2">Algo no salió como esperábamos</h2>
            <p className="text-xs text-text-muted mb-6 leading-relaxed">
              Ocurrió un inconveniente al cargar esta sección. Hemos protegido tu información para que puedas continuar navegando con tranquilidad.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-black text-white hover:bg-forest-dark transition-all shadow-xs"
              >
                <RefreshCw size={14} /> Recargar página
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-crema px-5 py-2.5 text-xs font-bold text-cafe hover:bg-border/60 transition-all"
              >
                <Home size={14} /> Volver al inicio
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
