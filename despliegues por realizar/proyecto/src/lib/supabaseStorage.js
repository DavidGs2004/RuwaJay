const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const PROPERTY_BUCKET = import.meta.env.VITE_SUPABASE_PROPERTY_BUCKET || 'property-images';

function uploadFile(file, path, onProgress) {
  return new Promise((resolve, reject) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      reject(new Error('Supabase Storage no está configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'));
      return;
    }

    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const request = new XMLHttpRequest();
    request.open('POST', `${SUPABASE_URL}/storage/v1/object/${PROPERTY_BUCKET}/${encodedPath}`);
    request.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    request.setRequestHeader('Content-Type', file.type || 'image/jpeg');
    request.setRequestHeader('x-upsert', 'false');

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    request.onerror = () => reject(new Error('No se pudo conectar con Supabase Storage.'));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(`${SUPABASE_URL}/storage/v1/object/public/${PROPERTY_BUCKET}/${encodedPath}`);
        return;
      }

      let detail = '';
      try {
        const response = JSON.parse(request.responseText || '{}');
        detail = response.message || response.error || '';
      } catch { /* response is not JSON */ }
      reject(new Error(detail || `Supabase rechazó la fotografía (${request.status}).`));
    };
    request.send(file);
  });
}

export async function uploadPropertyImagesToSupabase(files, propertyId, ownerId, onProgress = () => {}) {
  if (!files?.length) return [];
  if (files.length > 8) throw new Error('Puedes subir un máximo de 8 imágenes.');

  const validTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const invalidFile = files.find((file) => !validTypes.has(file.type) || file.size > 8 * 1024 * 1024);
  if (invalidFile) throw new Error('Cada imagen debe ser JPG, PNG o WebP y pesar máximo 8 MB.');

  const transferred = files.map(() => 0);
  const sizes = files.map((file) => file.size);
  const totalBytes = sizes.reduce((sum, size) => sum + size, 0);
  const safeOwnerId = String(ownerId || 'user').replace(/[^a-zA-Z0-9_-]/g, '-');

  const uploads = files.map((file, index) => {
    const path = `properties/${propertyId}/${safeOwnerId}/${Date.now()}-${index}-${crypto.randomUUID()}.jpg`;
    return uploadFile(file, path, (loaded) => {
      transferred[index] = loaded;
      const uploadedBytes = transferred.reduce((sum, bytes) => sum + bytes, 0);
      onProgress(totalBytes ? Math.round((uploadedBytes / totalBytes) * 100) : 100);
    });
  });

  return Promise.all(uploads);
}
