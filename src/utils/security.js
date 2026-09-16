/**
 * RuwaJay Security Utilities
 * Frontend security controls against XSS, malicious file uploads, protocol injections,
 * and sensitive identity data exposure.
 */

/**
 * Strips dangerous HTML tags and script injections from user-supplied strings.
 * Safe for displaying text in UI components.
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') return input;
  
  return input
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe, object, embed tags
    .replace(/<\/?(iframe|object|embed|applet)\b[^>]*>/gi, '')
    // Neutralize dangerous inline event handlers (e.g. onerror=, onload=, onclick=)
    .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\bon\w+\s*=\s*[^>\s]+/gi, '')
    // Neutralize javascript: pseudo-protocols
    .replace(/javascript\s*:/gi, 'blocked-javascript:')
    // Neutralize data:text/html vectors
    .replace(/data\s*:\s*text\/html/gi, 'blocked-data:')
    // Strip leading/trailing whitespaces
    .trim();
}

/**
 * Validates an uploaded file strictly checking MIME type and size.
 * Prevents execution of SVGs with embedded scripts or executable files.
 * @param {File} file 
 * @param {Object} options 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file, options = {}) {
  const maxSize = options.maxSizeBytes || 5 * 1024 * 1024; // 5 MB default
  const allowedMimeTypes = options.allowedTypes || [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  if (!file) {
    return { valid: false, error: 'No se ha seleccionado ningún archivo.' };
  }

  // Check size
  if (file.size > maxSize) {
    const sizeInMb = (maxSize / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `El archivo supera el tamaño máximo permitido de ${sizeInMb} MB.` };
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato no permitido. Solo se aceptan imágenes JPG, PNG o WebP seguras.',
    };
  }

  // Check filename extension to prevent spoofing
  const filename = (file.name || '').toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const hasValidExt = validExtensions.some((ext) => filename.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: 'La extensión del archivo no coincide con un formato de imagen permitido.',
    };
  }

  return { valid: true };
}

/**
 * Ensures an URL is safe to navigate to or display.
 * Rejects javascript:, data: (non-image), vbscript:, or malformed protocols.
 */
export function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();

  // Block dangerous schemes
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('data:text') ||
    trimmed.startsWith('file:')
  ) {
    return false;
  }

  // Allow relative URLs, http, https, mailto, tel
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return true;
  }

  return false;
}

/**
 * Masks sensitive identification strings like Guatemalan CUI/DPI (13 digits),
 * phone numbers or emails, revealing only specified visible digits.
 */
export function maskSensitive(str, visibleCount = 4) {
  if (!str || typeof str !== 'string') return '';
  const clean = str.trim();
  if (clean.length <= visibleCount) return clean;

  const maskedPart = '•'.repeat(Math.max(4, clean.length - visibleCount));
  const visiblePart = clean.slice(-visibleCount);
  return `${maskedPart} ${visiblePart}`;
}

/**
 * Checks password strength according to RuwaJay security policy:
 * At least 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character.
 */
export function assessPasswordStrength(password) {
  const p = password || '';
  const rules = {
    length: p.length >= 8,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    number: /[0-9]/.test(p),
    symbol: /[^A-Za-z0-9]/.test(p),
  };

  const score = Object.values(rules).filter(Boolean).length;
  let level = 'débil';
  let color = '#EF4444'; // red

  if (score === 5) {
    level = 'muy fuerte';
    color = '#10B981'; // green
  } else if (score >= 4) {
    level = 'fuerte';
    color = '#2D6A4F'; // forest green
  } else if (score >= 3) {
    level = 'media';
    color = '#F59E0B'; // amber
  }

  return { rules, score, level, color, isStrong: score === 5 };
}
