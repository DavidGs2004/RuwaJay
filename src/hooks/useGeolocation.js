import { useState, useEffect, useCallback } from 'react';

export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt'); // 'prompt' | 'granted' | 'denied'

  // Check permission state on mount
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionState(result.state);
        result.addEventListener('change', () => {
          setPermissionState(result.state);
        });
      }).catch(() => {
        // permissions API not available
      });
    }
  }, []);

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('La geolocalización no está disponible en tu navegador');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setPermissionState('granted');
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === 1
            ? 'Permiso de ubicación denegado'
            : err.code === 2
            ? 'Ubicación no disponible'
            : 'Tiempo de espera agotado'
        );
        setPermissionState(err.code === 1 ? 'denied' : permissionState);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, [permissionState]);

  const setManualPosition = useCallback((lat, lng) => {
    setPosition({ lat, lng, accuracy: null, manual: true });
    setError(null);
  }, []);

  return {
    position,
    error,
    loading,
    permissionState,
    requestPosition,
    setManualPosition,
  };
}
