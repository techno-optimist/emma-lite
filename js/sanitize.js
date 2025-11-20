// Minimal global HTML sanitizer for interpolations
// Use escapeHtml(value) for any user-provided or dynamic content
(function(){
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
  }
})();

