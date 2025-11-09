(function initializeEmmaEnv() {
	try {
		var params = new URLSearchParams(location.search || '');
		var override = params.get('emma_env');
		var host = (location && location.hostname) ? location.hostname : '';
		var protocol = (location && location.protocol) ? location.protocol : '';
		var isLocalHost = (
			!host ||
			host === 'localhost' ||
			host === '127.0.0.1' ||
			host === '::1' ||
			host === '0.0.0.0' ||
			isPrivateNetworkHost(host)
		);
		if (protocol === 'file:') {
			isLocalHost = true;
		}
		var inferred = isLocalHost ? 'development' : 'production';
		var env = override || inferred;
		if (env !== 'development' && env !== 'production') env = 'production';
		window.EMMA_ENV = env;
		window.EMMA_DEBUG = (env === 'development') || params.get('emma_debug') === '1';
	} catch (e) {
		// Safe defaults for production
		try { window.EMMA_ENV = 'production'; window.EMMA_DEBUG = false; } catch (_) {}
	}

	var PROD_BACKEND_ORIGIN = 'https://emma-lite-optimized.onrender.com';

	function isPrivateNetworkHost(host) {
		if (!host) return false;
		return (
			/^10\./.test(host) ||
			/^192\.168\./.test(host) ||
			/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
		);
	}

	function normalizeOrigin(origin) {
		return (origin || '').replace(/\/+$/, '');
	}

	function resolveBackendOrigin() {
		if (typeof window === 'undefined') {
			return PROD_BACKEND_ORIGIN;
		}

		if (window.EMMA_BACKEND_ORIGIN) {
			return normalizeOrigin(window.EMMA_BACKEND_ORIGIN);
		}

		var loc = window.location || {};
		var protocol = loc.protocol || 'http:';
		var hostname = (loc.hostname || '').toLowerCase();
		var port = loc.port || '';
		var isFileProtocol = protocol === 'file:';
		var isLocalHost = (
			isFileProtocol ||
			hostname === '' ||
			hostname === 'localhost' ||
			hostname === '127.0.0.1' ||
			hostname === '::1' ||
			hostname === '0.0.0.0' ||
			isPrivateNetworkHost(hostname)
		);

		if (isLocalHost) {
			var resolvedHost = hostname || 'localhost';
			var secure = protocol === 'https:';
			var resolvedPort = port || (secure ? '' : '3000');
			var portSegment = resolvedPort ? (':' + resolvedPort) : '';
			var scheme = secure ? 'https:' : 'http:';
			return scheme + '//' + resolvedHost + portSegment;
		}

		if (hostname === 'emma-lite-optimized.onrender.com') {
			var backendPortSegment = port ? (':' + port) : '';
			return (protocol || 'https:') + '//' + loc.hostname + backendPortSegment;
		}

		if (loc.origin) {
			return normalizeOrigin(loc.origin);
		}

		var fallbackHost = hostname || 'emma-lite-optimized.onrender.com';
		var fallbackScheme = protocol || 'https:';
		var fallbackPort = port ? (':' + port) : '';
		return normalizeOrigin(fallbackScheme + '//' + fallbackHost + fallbackPort) || PROD_BACKEND_ORIGIN;
	}

	if (typeof window !== 'undefined') {
		window.getEmmaBackendOrigin = function getEmmaBackendOrigin() {
			try {
				return normalizeOrigin(resolveBackendOrigin());
			} catch (error) {
				if (window.EMMA_DEBUG) {
					console.warn('Emma backend origin resolution failed, using production backend.', error);
				}
				return PROD_BACKEND_ORIGIN;
			}
		};

		window.getEmmaBackendWsUrl = function getEmmaBackendWsUrl() {
			var origin = window.getEmmaBackendOrigin();
			var wsOrigin = origin.replace(/^http/i, 'ws');
			return normalizeOrigin(wsOrigin) + '/voice';
		};
	}
})();


