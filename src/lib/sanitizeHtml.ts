export function sanitizeHtml(html: string): string {
  if (!html) return '';
  // Remove script tags and their content
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}
