'use strict';

(function(global){
  async function biometricAuth(reason) {
    try {
      const C = global.Capacitor;
      const Bio = C?.Plugins?.Biometric || C?.Plugins?.FingerprintAuth;
      if (!Bio) return { ok: false, error: 'no_bio_plugin' };
      if (typeof Bio.isAvailable === 'function') {
        const av = await Bio.isAvailable();
        if (!av?.has || av.error) return { ok: false, error: 'not_available' };
      }
      // Try a generic verify call if available
      if (typeof Bio.verify === 'function') {
        const res = await Bio.verify({ reason: reason || 'Confirm privileged action' });
        return { ok: !!res?.verified };
      }
      // Some plugins expose authenticate
      if (typeof Bio.authenticate === 'function') {
        const res = await Bio.authenticate({ reason: reason || 'Confirm privileged action' });
        return { ok: !!res?.success };
      }
      return { ok: false, error: 'no_verify_method' };
    } catch (e) {
      return { ok: false, error: e?.message || 'biometric_error' };
    }
  }

  async function promptPassphrase(reason) {
    // Minimal prompt fallback; replace with branded modal if desired
    const input = global.prompt((reason || 'Enter vault passphrase to continue') + ':');
    if (!input) return { ok: false };
    // TODO: verify passphrase via a background API if available; for now accept entry
    return { ok: true };
  }

  async function requirePrivilegedAction(opts = {}) {
    const reason = opts.reason || 'Confirm privileged action';
    // Prefer biometrics if enabled
    try {
      if (global.EmmaBiometrics && (await global.EmmaBiometrics.getEnabled())) {
        const bio = await biometricAuth(reason);
        if (bio.ok) return true;
        // Fall through to passphrase prompt on failure
      }
    } catch {}
    const pass = await promptPassphrase(reason);
    return !!pass.ok;
  }

  global.EmmaSecurity = { requirePrivilegedAction };
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

