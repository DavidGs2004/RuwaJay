import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { resolveMediaUrl, getCachedMediaUrl } from '../../lib/backendService';

export default function PrivateMedia({ src, type = 'image', ...props }) {
  const { user } = useAuth();
  const uid = user?.id || null;

  // Initialize synchronously with cached URL if available
  const initialUrl = getCachedMediaUrl(src);
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let timer;

    if (!src) return;

    if (!src.startsWith('supabase://')) {
      setUrl(src);
      return;
    }

    const cached = getCachedMediaUrl(src);
    if (cached) {
      setUrl(cached);
    }

    const load = async () => {
      try {
        const resolved = await resolveMediaUrl(src);
        if (active && resolved) {
          setUrl(resolved);
          setError(false);
        }
      } catch (err) {
        if (active && !url) {
          setError(true);
        }
      }
    };

    load();
    if (src.startsWith('supabase://')) {
      timer = setInterval(load, 240000);
    }

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [src, uid]);

  if (error) {
    return (
      <div className="flex items-center gap-1.5 py-1 text-xs text-red-500 italic">
        <span>Archivo no disponible</span>
      </div>
    );
  }

  if (!url) {
    if (type === 'audio') {
      return (
        <div className="h-10 w-48 rounded-xl bg-black/10 animate-pulse flex items-center px-3" />
      );
    }
    return (
      <div className="h-48 w-full max-w-xs rounded-xl bg-black/10 animate-pulse flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-forest/30 border-t-forest animate-spin" />
      </div>
    );
  }

  if (type === 'audio') {
    return <audio controls src={url} className="max-w-full rounded-xl" {...props} />;
  }

  if (type === 'video') {
    return (
      <video
        controls
        playsInline
        src={url}
        className="max-h-72 w-full rounded-xl object-cover"
        {...props}
      />
    );
  }

  return (
    <img
      src={url}
      alt={props.alt || 'Archivo multimedia'}
      onClick={(e) => {
        if (props.onImageClick) props.onImageClick(url);
        props.onClick?.(e);
      }}
      loading="eager"
      {...props}
    />
  );
}
