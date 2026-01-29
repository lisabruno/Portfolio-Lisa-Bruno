/*
 * OPTIMISATIONS SUPPLÉMENTAIRES - PERFORMANCE
 * Améliore les performances et l'expérience utilisateur
 */

// Debounce utility pour limiter les appels fréquents
function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

// Throttle utility pour limiter la fréquence d'exécution
function throttle(func, limit) {
	let inThrottle;
	return function(...args) {
		if (!inThrottle) {
			func.apply(this, args);
			inThrottle = true;
			setTimeout(() => inThrottle = false, limit);
		}
	};
}

// Optimisation du scroll avec debounce
const optimizeScroll = () => {
	let ticking = false;
	
	window.addEventListener('scroll', () => {
		if (!ticking) {
			window.requestAnimationFrame(() => {
				// Code d'optimisation du scroll
				ticking = false;
			});
			ticking = true;
		}
	}, { passive: true });
};

// Lazy loading natif pour les images
const setupNativeLazyLoad = () => {
	if ('IntersectionObserver' in window) {
		const images = document.querySelectorAll('img[data-src]');
		const imageObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const img = entry.target;
					img.src = img.dataset.src;
					img.removeAttribute('data-src');
					observer.unobserve(img);
				}
			});
		});
		images.forEach(img => imageObserver.observe(img));
	}
};

// Optimisation des ressources avec Resource Hints
const setupResourceHints = () => {
	// Preload des ressources critiques
	const criticalResources = [
		{ href: 'styles/Style.css', rel: 'preload', as: 'style' },
		{ href: 'Animations/Responsive.js', rel: 'preload', as: 'script' },
	];
	
	criticalResources.forEach(resource => {
		const link = document.createElement('link');
		link.rel = resource.rel;
		link.href = resource.href;
		if (resource.as) link.as = resource.as;
		document.head.appendChild(link);
	});
};

// Réduction de la consommation CPU en utilisant requestIdleCallback si disponible
const deferNonCritical = (callback) => {
	if ('requestIdleCallback' in window) {
		requestIdleCallback(callback);
	} else {
		setTimeout(callback, 1);
	}
};

// Optimisation du changement de thème avec réduction des repaints
const optimizeThemeToggle = () => {
	const body = document.body;
	const toggleBtn = document.getElementById('theme-toggle');
	
	if (toggleBtn) {
		toggleBtn.addEventListener('click', () => {
			// Utiliser batch des mutations DOM
			requestAnimationFrame(() => {
				body.classList.toggle('theme-dark');
			});
		}, { passive: true });
	}
};

// Initialisation au chargement du DOM
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		optimizeScroll();
		setupNativeLazyLoad();
		optimizeThemeToggle();
		deferNonCritical(() => setupResourceHints());
	});
} else {
	optimizeScroll();
	setupNativeLazyLoad();
	optimizeThemeToggle();
	deferNonCritical(() => setupResourceHints());
}

// Signaler au service worker de mettre en cache les ressources
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		// Optionnel : enregistrer un service worker
		// navigator.serviceWorker.register('service-worker.js').catch(() => {});
	});
}
