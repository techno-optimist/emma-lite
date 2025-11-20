# Residual Security Risks

_Prepared October 19, 2025_

Even after the latest hardening pass, two structural security gaps remain. They do not expose plaintext by themselves, but they reduce the defensive depth of the web vault and should be prioritized before a public production launch.

## 1. Global Vault Objects Exposed
- **What exists today**: window.emmaWebVault (and related helpers like window.webVaultStatus, window.emmaAPI.vault, etc.) are globally accessible in the page context.
- **Risk**: Any injected script—via cross-site scripting (XSS), compromised third-party widget, or malicious browser extension running in the page context—can call these methods directly. Because the vault instance holds decrypted data in memory and has access to the passphrase while the user session is open, an attacker could exfiltrate the entire vault without defeating the cryptography.
- **Why it matters**: The core goal of the vault is to protect sensitive memories even if the hosting app is compromised. As long as these APIs are exposed globally, the vault depends entirely on there being no XSS bugs anywhere in the app. Moving the vault logic into a dedicated Web Worker or sandboxed iframe with a hardened, message-based bridge would isolate the crypto operations and allow tighter permission checks before servicing a request.
- **Suggested approach**:
  - Implement a Worker (or iframe) that owns the vault state and encryption keys.
  - Replace direct method calls with structured messages (e.g., postMessage) that validate the action and inputs.
  - Only expose minimal, vetted commands (e.g., listMemories, saveMemory, unlockVault).
  - Enforce origin checks and optionally require a session token or capability.
  - Keep the worker’s scope free of DOM APIs to reduce attack surface.

## 2. Site-Wide CSP Still Requires 'unsafe-inline'
- **What exists today**: The dashboard page now loads scripts from external files and no longer relies on inline <script> tags. However, many legacy views (e.g., pages/people.html, popup flows, older dashboards) still use inline event handlers (onclick, onload, etc.). Because of that, the Content Security Policy returned by server.js must keep 'unsafe-inline' in script-src to avoid breaking those pages.
- **Risk**: Allowing 'unsafe-inline' dramatically increases the impact of any HTML injection or DOM-based cross-site scripting. Attackers can inject <script> tags or inline event handlers and gain immediate execution. Even though most vault logic is now hardened, an injected script can still leverage the global vault APIs (see risk #1) or perform other privileged actions.
- **Why it matters**: A strict CSP is one of the most effective defenses against XSS. Dropping 'unsafe-inline' forces all scripts to come from trusted bundles and prevents inline injection from succeeding. Until every page stops using inline handlers, the CSP cannot be tightened.
- **Suggested approach**:
  - Audit remaining HTML views for inline event handlers (onclick, onmouseover, etc.).
  - Move their logic into dedicated JS modules that attach listeners after the DOM loads.
  - Replace inline style or javascript: URLs where they exist.
  - Once all inline usage is removed, update server.js to emit a CSP without 'unsafe-inline'. Optionally add a nonce-based approach for any unavoidable inline snippets (e.g., templating frameworks).

## Prioritization
- **Isolation of vault APIs** is a high-severity item. It prevents a single XSS from compromising decrypted vault data. Without this isolation, the web vault still relies heavily on the absence of XSS vulnerabilities.
- **CSP tightening** is a medium-to-high priority. It reduces the likelihood of XSS succeeding in the first place, complements the vault API isolation, and improves overall site resilience.

Addressing both items brings the web vault closer to a production-ready security posture. Until then, deployment should assume that XSS could lead to vault compromise, and any third-party script injected into the app must be vetted with extreme caution.
