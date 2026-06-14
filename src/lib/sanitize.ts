import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize admin-authored rich-text HTML (product descriptions, etc.) before
 * rendering with dangerouslySetInnerHTML. Allows common formatting tags only,
 * strips scripts/event handlers/iframes. Works on both server (SSR) and client.
 */
export function sanitizeHtml(dirty: string | undefined | null): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "b", "strong", "i", "em", "u", "s", "strike",
      "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "h5", "h6",
      "blockquote", "span", "div", "code", "pre", "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "style", "class"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}
