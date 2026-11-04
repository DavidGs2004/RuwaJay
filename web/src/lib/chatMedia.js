const extensionMime = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', avif: 'image/avif', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  '3gp': 'video/3gpp', mkv: 'video/x-matroska', ogv: 'video/ogg',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav',
  ogg: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac',
};
export function chatMediaInfo(source, isVoice = false) {
  let mime = String(source?.type || (typeof source === 'string' && source.match(/^data:([^;,]+)/)?.[1]) || '')
    .split(';')[0].trim().toLowerCase();
  if (!mime || mime === 'application/octet-stream') {
    mime = extensionMime[String(source?.name || '').split('.').pop().toLowerCase()] || (isVoice ? 'audio/webm' : '');
  }
  if (mime === 'image/jpg') mime = 'image/jpeg';
  if (!/^(image\/(jpeg|png|webp|gif|avif|heic|heif)|audio\/[a-z0-9.+-]+|video\/(webm|mp4|quicktime|3gpp|x-matroska|ogg))$/.test(mime)) {
    throw new Error('Formato multimedia no permitido. Selecciona una imagen, audio o video compatible.');
  }
  if (typeof source?.size === 'number' && (!source.size || source.size > 20 * 1024 * 1024)) {
    throw new Error('El archivo está vacío o supera el límite de 20 MB.');
  }
  return { mime, type: mime.split('/')[0] };
}
