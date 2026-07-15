import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
}

/**
 * Sanitize plain text (remove all HTML)
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        item !== null && typeof item === 'object' && !Array.isArray(item) ? sanitizeObject(item as Record<string, unknown>) :
        typeof item === 'string' ? sanitizeText(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Escape SQL special characters (for raw queries - use with caution)
 */
export function escapeSql(value: string): string {
  const escapedCharacters: Record<string, string> = {
    "\0": "\\0",
    "\b": "\\b",
    "\t": "\\t",
    "\x1a": "\\z",
    "\n": "\\n",
    "\r": "\\r",
    '"': '\\"',
    "'": "\\'",
    "\\": "\\\\",
    "%": "\\%",
  };
  return Array.from(value, (char) => escapedCharacters[char] ?? char).join("");
}
