(function initializeEmmaEnv() {
	try {
		var params = new URLSearchParams(location.search || '');
		var override = params.get('emma_env');
		var host = (location && location.hostname) ? location.hostname : '';
		var inferred = (host === 'localhost' || host === '127.0.0.1') ? 'development' : 'production';
		var env = override || inferred;
		if (env !== 'development' && env !== 'production') env = 'production';
		window.EMMA_ENV = env;
		window.EMMA_DEBUG = (env === 'development') || params.get('emma_debug') === '1';
	} catch (e) {
		// Safe defaults for production
		try { window.EMMA_ENV = 'production'; window.EMMA_DEBUG = false; } catch (_) {}
	}
})();


