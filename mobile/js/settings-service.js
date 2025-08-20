/**
 * SettingsService
 * Unified, resilient settings read/write with deterministic precedence.
 * Precedence for reads: chrome.storage.local → localStorage → emmaAPI.storage
 * Writes: always mirror to localStorage, then attempt chrome and emmaAPI (best-effort).
 */

(function () {
	function isChromeAvailable() {
		try { return !!(window.chrome && chrome.storage && chrome.storage.local); } catch (_) { return false; }
	}

	function isEmmaAPIAvailable() {
		try { return !!(window.emmaAPI && window.emmaAPI.storage && typeof window.emmaAPI.storage.get === 'function'); } catch (_) { return false; }
	}

	function readLocalStorage(keys) {
		const out = {};
		for (const key of keys) {
			const raw = localStorage.getItem(key);
			if (raw === null || raw === undefined) continue;
			if (raw === 'true') { out[key] = true; continue; }
			if (raw === 'false') { out[key] = false; continue; }
			// Try JSON parse, fall back to string
			try { out[key] = JSON.parse(raw); } catch (_) { out[key] = raw; }
		}
		return out;
	}

	function writeLocalStorage(map) {
		for (const [key, value] of Object.entries(map)) {
			try {
				if (typeof value === 'boolean') {
					localStorage.setItem(key, value ? 'true' : 'false');
				} else if (typeof value === 'number') {
					localStorage.setItem(key, String(value));
				} else if (typeof value === 'string') {
					localStorage.setItem(key, value);
				} else {
					localStorage.setItem(key, JSON.stringify(value));
				}
			} catch (e) { /* ignore */ }
		}
	}

	async function readChrome(keys) {
		if (!isChromeAvailable()) return {};
		return await new Promise(resolve => {
			if (keys === null || keys === undefined) {
				chrome.storage.local.get(null, resolve);
			} else {
				chrome.storage.local.get(keys, resolve);
			}
		});
	}

	async function writeChrome(map) {
		if (!isChromeAvailable()) return false;
		try { await new Promise((resolve, reject) => chrome.storage.local.set(map, () => resolve(true))); return true; } catch (_) { return false; }
	}

	async function readEmmaAPI(keys) {
		if (!isEmmaAPIAvailable()) return {};
		try { 
			const res = await window.emmaAPI.storage.get(keys === null ? undefined : keys); 
			return res && !res.error ? res : {}; 
		} catch (_) { return {}; }
	}

	async function writeEmmaAPI(map) {
		if (!isEmmaAPIAvailable()) return false;
		try { await window.emmaAPI.storage.set(map); return true; } catch (_) { return false; }
	}

	async function get(keys) {
		if (!Array.isArray(keys)) throw new Error('SettingsService.get requires an array of keys');
		// Read from all available sources
		const [fromChrome, fromLocal, fromEmma] = await Promise.all([
			readChrome(keys),
			Promise.resolve(readLocalStorage(keys)),
			readEmmaAPI(keys)
		]);
		// Precedence: chrome → local → emmaAPI
		const out = { ...fromEmma, ...fromLocal, ...fromChrome };
		return out;
	}

	async function getAll() {
		const [fromChrome, fromEmma] = await Promise.all([
			readChrome(null),
			readEmmaAPI(null)
		]);
		// Merge with localStorage as middle layer
		const fromLocal = (() => {
			const out = {};
			try {
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (!key) continue;
					const val = localStorage.getItem(key);
					if (val === 'true') out[key] = true; else if (val === 'false') out[key] = false; else {
						try { out[key] = JSON.parse(val); } catch { out[key] = val; }
					}
				}
			} catch (_) {}
			return out;
		})();
		return { ...fromEmma, ...fromLocal, ...fromChrome };
	}

	async function set(map) {
		if (!map || typeof map !== 'object') throw new Error('SettingsService.set requires an object');
		// Always persist locally
		writeLocalStorage(map);
		// Best-effort mirrors
		const [okChrome, okEmma] = await Promise.all([
			writeChrome(map),
			writeEmmaAPI(map)
		]);
		return (okChrome || okEmma || true); // localStorage already succeeded
	}

	window.SettingsService = { get, getAll, set };
})();


