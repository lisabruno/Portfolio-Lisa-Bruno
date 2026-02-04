/*
	================================================
	RESPONSIVE.JS — AMÉLIORATIONS INTERACTIVES
	================================================
	Ce fichier gère toutes les interactions et animations dynamiques du portfolio :
	
	1. Défilement fluide vers les ancres (#about, #projects…)
	2. Révélation au scroll (IntersectionObserver)
	3. Parallaxe douce sur le fond du hero
	4. Effet de tilt subtil au survol des cartes
	5. Mise en surbrillance des liens de navigation selon la section visible
	6. Lazy-load des iframes et respect de prefers-reduced-motion
	
	Respecte les préférences d'accessibilité (prefers-reduced-motion)
	================================================
*/

// ====== IIFE (Immediately Invoked Function Expression) pour l'isolation du scope ======
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	// ====== INITIALISATION PRINCIPALE ======
	// Démarre toutes les fonctionnalités interactives
	function init() {
		// Vérifie si l'utilisateur préfère moins d'animations (accessibilité)
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		// 0) Mode sombre/clair
		setupThemeToggle();

		// 1) Défilement fluide vers les ancres en tenant compte de la topbar fixe
		setupSmoothScroll();

		// 2) Révélation au scroll des blocs clés
		if (!reduceMotion) setupScrollReveal();

		// 3) Parallaxe douce du fond du hero
		if (!reduceMotion) setupHeroParallax();

		// 4) Tilt au survol pour cartes
		if (!reduceMotion) setupCardTilt();

		// 5) Mise en surbrillance du lien actif dans la nav
		setupActiveNavHighlight();

		// 6) Lazy-load de médias (ex: iframes) si possible
		setupLazyLoadMedia();

		// 7) Animations au clic sur les éléments importants
		setupClickAnimations();

		// Animations continues désactivées pour améliorer les performances
		// if (!reduceMotion) setupContinuousAnimations();
		// if (!reduceMotion) setupAnimatedGradient();
		// if (!reduceMotion) setupFloatingCards();
		// if (!reduceMotion) setupRandomHeroBg();
	}

	// ====== 0. MODE SOMBRE/CLAIR ======
	// Gère le basculement entre mode sombre et clair avec sauvegarde dans localStorage
	function setupThemeToggle() {
		const body = document.body;
		const toggleBtn = document.getElementById('theme-toggle');
		if (!toggleBtn) return; // Si pas de bouton, sortir

		const THEME_KEY = 'site-theme';
		const FADE_CLASS = 'theme-fade';
		const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
		const savedTheme = localStorage.getItem(THEME_KEY);
		let fadeTimer;

		const playFade = () => {
			clearTimeout(fadeTimer);
			body.classList.add(FADE_CLASS);
			fadeTimer = window.setTimeout(() => body.classList.remove(FADE_CLASS), 1100);
		};

		const applyTheme = (isDark) => {
			if (isDark) {
				body.classList.add('theme-dark');
				toggleBtn.classList.add('is-on');
				toggleBtn.setAttribute('aria-pressed', 'true');
				toggleBtn.setAttribute('aria-label', 'Activer le mode clair');
				localStorage.setItem(THEME_KEY, 'dark');
			} else {
				body.classList.remove('theme-dark');
				toggleBtn.classList.remove('is-on');
				toggleBtn.setAttribute('aria-pressed', 'false');
				toggleBtn.setAttribute('aria-label', 'Activer le mode sombre');
				localStorage.setItem(THEME_KEY, 'light');
			}
		};

		// Applique le thème initial (sauvegardé ou préférence système)
		const initialDark = savedTheme ? savedTheme === 'dark' : prefersDark;
		applyTheme(initialDark);

		// Écoute le clic sur le bouton
		toggleBtn.addEventListener('click', () => {
			const isDark = !body.classList.contains('theme-dark');
			playFade();
			applyTheme(isDark);
		});
	}

	// ====== 1. DÉFILEMENT FLUIDE ======
	// Scroll smooth vers les ancres avec compensation du header fixe
	function setupSmoothScroll() {
		const header = document.querySelector('.topbar');
		const headerHeight = header ? header.offsetHeight : 0;
		const links = document.querySelectorAll('a[href^="#"]');

		links.forEach((link) => {
			link.addEventListener('click', (e) => {
				const href = link.getAttribute('href');
				// Ignore si juste '#'
				if (!href || href === '#') return;
				const target = document.querySelector(href);
				if (!target) return;
				e.preventDefault();
				const y = target.getBoundingClientRect().top + window.scrollY - Math.max(headerHeight, 72);
				window.scrollTo({ top: y, behavior: 'smooth' });
			});
		});
	}

	// ====== 2. RÉVÉLATION AU SCROLL ======
	// Utilise IntersectionObserver pour montrer les éléments au fur et à mesure du scroll
	function setupScrollReveal() {
		const revealSelectors = [
			'.hero-content',
			'.domains .card',
			'.projects .project-card',
			'.project-item',
			'.about .pillar',
			'.social-card',
			'.footer .footer-col',
			'.article-main',
			'.article-sidebar .sidebar-section',
		];

		const elements = document.querySelectorAll(revealSelectors.join(','));
		elements.forEach((el) => {
			// Supprimé: will-change consomme trop de mémoire GPU
			el.classList.add('js-reveal'); // marqueur pour style optionnel
		});

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-visible');
						// Nettoyer will-change après l'animation pour libérer la mémoire GPU
						setTimeout(() => {
							entry.target.style.willChange = 'auto';
						}, 1000);
						observer.unobserve(entry.target);
					}
				});
			},
			{ rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
		);

		elements.forEach((el) => observer.observe(el));
	}

	// ====== 3. PARALLAXE DU HÉRO ======
	// Crée un effet de mouvement subtil sur le fond du héro lors du scroll
	function setupHeroParallax() {
		const bg = document.querySelector('.hero-bg');
		if (!bg) return;
		let rafId = null;
		let lastScrollY = 0;

		const onScroll = () => {
			const currentScrollY = window.scrollY || 0;
			// Seulement mettre à jour si le scroll a changé significativement
			if (Math.abs(currentScrollY - lastScrollY) < 2) return;
			
			if (rafId) return;
			rafId = requestAnimationFrame(() => {
				const y = currentScrollY;
				// Déplacement subtil (et limité) pour éviter la barre horizontale
				const translate = Math.min(16, y * 0.04);
				bg.style.transform = `translate3d(0, ${translate}px, 0)`;
				lastScrollY = y;
				rafId = null;
			});
		};
		window.addEventListener('scroll', onScroll, { passive: true });
	}

	// ====== 4. TILT AU SURVOL ======
	// Effet 3D (rotation) sur les cartes en fonction de la position de la souris
	function setupCardTilt() {
		const tiltSelector = ['.card', '.project-card', '.social-card'];
		const cards = document.querySelectorAll(tiltSelector.join(','));

		cards.forEach((card) => {
			let rect = null;
			let rafId = null;
			const maxTilt = 6; // degrés max

			const onEnter = () => {
				rect = card.getBoundingClientRect();
				card.style.transition = 'transform 120ms ease';
				card.style.willChange = 'transform';
			};

			const onMove = (e) => {
				if (!rect || rafId) return; // Throttle avec requestAnimationFrame
				rafId = requestAnimationFrame(() => {
					const x = e.clientX - rect.left;
					const y = e.clientY - rect.top;
					const cx = rect.width / 2;
					const cy = rect.height / 2;
					const dx = (x - cx) / cx;
					const dy = (y - cy) / cy;
					const rx = (-dy * maxTilt).toFixed(2);
					const ry = (dx * maxTilt).toFixed(2);
					card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
					rafId = null;
				});
			};

			const onLeave = () => {
				card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
				card.style.willChange = 'auto'; // Nettoyer will-change
				rafId = null;
			};

			card.addEventListener('mouseenter', onEnter);
			card.addEventListener('mousemove', onMove);
			card.addEventListener('mouseleave', onLeave);
		});
	}

	// ====== 5. SURLIGNAGE NAV ACTIF ======
	// Met en avant le lien de navigation correspondant à la section visible
	function setupActiveNavHighlight() {
		const sections = [
			{ id: 'hero', link: 'a[href="#hero"]' },
			{ id: 'projects', link: 'a[href="#projects"]' },
			{ id: 'about', link: 'a[href="#about"]' },
			{ id: 'contact', link: 'a[href="#contact"]' },
		];
		const navLinks = sections.map((s) => ({ ...s, el: document.querySelector(s.link) })).filter((s) => s.el);
		if (!navLinks.length) return;

		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const match = navLinks.find((s) => `#${s.id}` === `#${entry.target.id}`);
					if (!match) return;
					if (entry.isIntersecting) {
						navLinks.forEach((s) => s.el.classList.remove('active'));
						match.el.classList.add('active');
					}
				});
			},
			{ threshold: 0.35 }
		);

		sections.forEach((s) => {
			const el = document.getElementById(s.id);
			if (el) io.observe(el);
		});
	}

	// ====== 6. LAZY-LOAD DES IFRAMES ======
	// Optimise le chargement des médias (iframes, vidéos)
	function setupLazyLoadMedia() {
		document.querySelectorAll('iframe:not([loading])').forEach((el) => {
			// Ajoute l'attribut de lazy si supporté
			try {
				el.setAttribute('loading', 'lazy');
			} catch (_) {}
		});
	}

	// ====== 7. ANIMATIONS AU CLIC ======
	// Ajoute des effets visuels au clic sur les éléments importants
	function setupClickAnimations() {
		// Animations au clic sur les boutons - DÉSACTIVÉ pour éviter le flou
		document.querySelectorAll('.project-link, .social-card').forEach((el) => {
			el.addEventListener('click', (e) => {
				// Ajoute la classe de pulsation
				el.classList.add('clicked');
				el.classList.add('glow-click');
				
				// Crée un effet ripple au clic
				const rect = el.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;
				
				const ripple = document.createElement('span');
				ripple.style.position = 'absolute';
				ripple.style.left = x + 'px';
				ripple.style.top = y + 'px';
				ripple.style.width = '0';
				ripple.style.height = '0';
				ripple.style.borderRadius = '50%';
				ripple.style.background = 'rgba(122, 160, 255, 0.5)';
				ripple.style.pointerEvents = 'none';
				ripple.style.transform = 'translate(-50%, -50%)';
				ripple.style.animation = 'ripple 0.6s ease-out';
				
				if (el.style.position === 'static') {
					el.style.position = 'relative';
				}
				el.appendChild(ripple);
				
				// Nettoie l'effet ripple après l'animation
				setTimeout(() => ripple.remove(), 600);
				
				// Enlève les classes après l'animation
				setTimeout(() => {
					el.classList.remove('clicked');
					el.classList.remove('glow-click');
				}, 500);
			});
		});

		// Animation au clic sur les cartes de domaine
		document.querySelectorAll('.card').forEach((card) => {
			card.addEventListener('click', () => {
				card.classList.add('wobble');
				setTimeout(() => card.classList.remove('wobble'), 300);
			});
		});

		// Animation au clic sur les cartes de projet avec brillance
		document.querySelectorAll('.project-card').forEach((card) => {
			card.addEventListener('click', () => {
				card.classList.add('shine');
				setTimeout(() => card.classList.remove('shine'), 600);
			});
		});

		// Ajout d'effet de pulsation sur les titres au scroll
		const titles = document.querySelectorAll('h1, h2, .hero h1');
		titles.forEach((title) => {
			title.style.cursor = 'pointer';
			title.addEventListener('click', () => {
				title.classList.add('wobble');
				setTimeout(() => title.classList.remove('wobble'), 300);
			});
		});

		// Animations au hover sur les sections principales
		setupHoverAnimations();
	}

	// ====== 8. ANIMATIONS AU SURVOL AVANCÉES ======
	// Ajoute des effets supplémentaires lors du survol
	function setupHoverAnimations() {
		// Effet de glow léger au survol sur les cartes
		document.querySelectorAll('.card, .project-card, .social-card').forEach((el) => {
			el.addEventListener('mouseenter', () => {
				el.style.boxShadow = el.style.boxShadow.replace(
					/rgba\([\d,\s.]+\)/g,
					'rgba(122, 160, 255, 0.5)'
				);
			});

			el.addEventListener('mouseleave', () => {
				el.style.boxShadow = '';
			});
		});

		// Animation douce sur les liens
		document.querySelectorAll('a').forEach((link) => {
			if (!link.classList.contains('btn') && !link.classList.contains('project-link')) {
				link.addEventListener('mouseenter', function() {
					this.style.transition = 'all 0.3s ease';
				});
			}
		});

		// Animation au survol des éléments "pillar"
		document.querySelectorAll('.pillar').forEach((pillar) => {
			pillar.addEventListener('mouseenter', function() {
				const icon = this.querySelector('.pillar-icon');
				if (icon) {
					icon.style.transform = 'scale(1.2) rotate(10deg)';
				}
			});

			pillar.addEventListener('mouseleave', function() {
				const icon = this.querySelector('.pillar-icon');
				if (icon) {
					icon.style.transform = '';
				}
			});
		});
	}

	// ====== BONUS : ANIMATION DE COMPTEUR ======
	// Anime les nombres de 0 jusqu'au target (pour statistiques)
	function animateCounters() {
		const counters = document.querySelectorAll('[data-count]');
		if (!counters.length) return;

		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const element = entry.target;
					const target = parseInt(element.getAttribute('data-count'));
					const duration = 2000;
					const step = target / (duration / 16);
					let current = 0;

					const timer = setInterval(() => {
						current += step;
						if (current >= target) {
							element.textContent = target;
							clearInterval(timer);
						} else {
							element.textContent = Math.floor(current);
						}
					}, 16);

					observer.unobserve(element);
				}
			});
		}, { threshold: 0.5 });

		counters.forEach(counter => observer.observe(counter));
	}

	// ====== BONUS : PARALLAXE DES CARTES ======
	// Déplacement subtil des cartes en fonction de la position de scroll
	function setupCardParallax() {
		const cards = document.querySelectorAll('.card, .project-card, .pillar');
		if (!cards.length) return;

		window.addEventListener('scroll', () => {
			cards.forEach(card => {
				const rect = card.getBoundingClientRect();
				const scrollPercent = rect.top / window.innerHeight;
				if (scrollPercent > -0.5 && scrollPercent < 1) {
					const translateY = (scrollPercent - 0.5) * 20;
					card.style.transform = `translateY(${translateY}px)`;
				}
			});
		}, { passive: true });
	}

	// ====== 8. ANIMATIONS CONTINUES ======
	// Animer en continu les icônes et éléments visuels
	function setupContinuousAnimations() {
		// Animation des icônes de projet
		const projectIcons = document.querySelectorAll('.project-icon');
		projectIcons.forEach((icon, index) => {
			icon.style.animation = `float 3s ease-in-out ${index * 0.2}s infinite`;
		});

		// Animation des icônes de piliers
		const pillarIcons = document.querySelectorAll('.pillar-icon');
		pillarIcons.forEach((icon, index) => {
			icon.style.animation = `pulse-glow 2s ease-in-out ${index * 0.3}s infinite`;
		});

		// Animation des icônes sociales
		const socialIcons = document.querySelectorAll('.social-icon');
		socialIcons.forEach((icon, index) => {
			icon.style.animation = `rotate-subtle 4s ease-in-out ${index * 0.5}s infinite`;
		});

		// Animation des icônes de domaine
		const cardIcons = document.querySelectorAll('.card-icon svg');
		cardIcons.forEach((icon, index) => {
			icon.style.animation = `scale-pulse 3s ease-in-out ${index * 0.4}s infinite`;
		});
	}

	// ====== 9. GRADIENT ANIMÉ ======
	// Fait bouger subtilement les dégradés de fond
	function setupAnimatedGradient() {
		const body = document.body;
		let hue = 0;

		setInterval(() => {
			hue = (hue + 0.2) % 360;
			body.style.setProperty('--gradient-shift', `${hue}deg`);
		}, 50);
	}

	// ====== 10. EFFET FLOTTANT SUR LES CARTES ======
	// Animation de lévitation subtile
	function setupFloatingCards() {
		const cards = document.querySelectorAll('.card, .project-card, .social-card');
		
		cards.forEach((card, index) => {
			const delay = index * 0.15;
			const duration = 3 + (index % 3) * 0.5;
			card.style.animation = `float-card ${duration}s ease-in-out ${delay}s infinite`;
		});

		// Ajouter un effet de brillance au survol
		cards.forEach(card => {
			card.addEventListener('mouseenter', () => {
				card.style.animation = 'none';
				card.style.transform = 'translateY(-8px)';
			});
			
			card.addEventListener('mouseleave', () => {
				const index = Array.from(cards).indexOf(card);
				const delay = index * 0.15;
				const duration = 3 + (index % 3) * 0.5;
				card.style.animation = `float-card ${duration}s ease-in-out ${delay}s infinite`;
			});
		});
	}
 

// ====== CARROUSEL D'IMAGES ======
// Fonction pour naviguer dans les carrousels d'images
function moveCarousel(carouselId, direction) {
	const carousel = document.getElementById(carouselId);
	if (!carousel) return;
	
	const images = carousel.querySelectorAll('.carousel-image');
	if (images.length === 0) return;
	
	// Trouve l'image actuellement active
	let currentIndex = -1;
	images.forEach((img, index) => {
		if (img.classList.contains('active')) {
			currentIndex = index;
		}
	});
	
	// Calcule le nouvel index (avec boucle)
	let newIndex = currentIndex + direction;
	if (newIndex < 0) {
		newIndex = images.length - 1; // Retour à la dernière image
	} else if (newIndex >= images.length) {
		newIndex = 0; // Retour à la première image
	}
	
	// Retire la classe active de l'image actuelle
	if (currentIndex >= 0) {
		images[currentIndex].classList.remove('active');
	}
	
	// Ajoute la classe active à la nouvelle image
	images[newIndex].classList.add('active');
}

	// ====== 11. GRADIENT ALÉATOIRE HERO ======
	// Change les couleurs du fond du hero de manière aléatoire avec fondue progressive
	function setupRandomHeroBg() {
		const wrapper = document.querySelector('.hero-wrapper');
		const topbar = document.querySelector('.topbar');
		
		// Si ni wrapper ni topbar n'existent, on sort
		if (!wrapper && !topbar) return;

		// Palette de couleurs disponibles (RGBA)
		const colors = [
			'rgba(255, 127, 180, 0.55)',  // Rose
			'rgba(168, 85, 247, 0.55)',   // Violet
			'rgba(96, 165, 250, 0.55)',   // Bleu clair
			'rgba(20, 184, 166, 0.55)',   // Bleu turquoise
		];

		// Fonction pour parser une couleur RGBA et la décomposer
		function parseColor(colorStr) {
			const match = colorStr.match(/\d+(\.\d+)?/g);
			return {
				r: parseInt(match[0]),
				g: parseInt(match[1]),
				b: parseInt(match[2]),
				a: parseFloat(match[3])
			};
		}

		// Fonction pour interpoler entre deux couleurs
		function lerpColor(color1, color2, t) {
			const c1 = parseColor(color1);
			const c2 = parseColor(color2);
			const r = Math.round(c1.r + (c2.r - c1.r) * t);
			const g = Math.round(c1.g + (c2.g - c1.g) * t);
			const b = Math.round(c1.b + (c2.b - c1.b) * t);
			const a = (c1.a + (c2.a - c1.a) * t).toFixed(2);
			return `rgba(${r}, ${g}, ${b}, ${a})`;
		}

		// Fonction pour générer un dégradé aléatoire
		function generateRandomGradient() {
			const color1 = colors[Math.floor(Math.random() * colors.length)];
			const color2 = colors[Math.floor(Math.random() * colors.length)];
			const color3 = colors[Math.floor(Math.random() * colors.length)];
			
			const pos1X = Math.random() * 40 + 10;
			const pos1Y = Math.random() * 40 + 10;
			const pos2X = Math.random() * 40 + 60;
			const pos2Y = Math.random() * 40 + 20;
			const pos3X = Math.random() * 40 + 40;
			const pos3Y = Math.random() * 40 + 60;

			return { color1, color2, color3, pos1X, pos1Y, pos2X, pos2Y, pos3X, pos3Y };
		}

		// Fonction pour créer une string de gradient
		function gradientToString(grad) {
			return `radial-gradient(circle at ${grad.pos1X}% ${grad.pos1Y}%, ${grad.color1}, transparent 35%),
					radial-gradient(circle at ${grad.pos2X}% ${grad.pos2Y}%, ${grad.color2}, transparent 38%),
					radial-gradient(circle at ${grad.pos3X}% ${grad.pos3Y}%, ${grad.color3}, transparent 42%)`;
		}

		let currentGradient = generateRandomGradient();
		let targetGradient = generateRandomGradient();
		let animationProgress = 0;
		let animationDuration = 6000; // 6 secondes
		let lastTime = Date.now();

		// Animation avec requestAnimationFrame
		function animate() {
			const now = Date.now();
			const elapsed = now - lastTime;

			animationProgress += elapsed / animationDuration;

			if (animationProgress >= 1) {
				animationProgress = animationProgress - 1; // Continue au prochain cycle
				currentGradient = targetGradient;
				targetGradient = generateRandomGradient();
			}

			// Interpole les couleurs et positions
			const t = animationProgress;
			const interpGrad = {
				color1: lerpColor(currentGradient.color1, targetGradient.color1, t),
				color2: lerpColor(currentGradient.color2, targetGradient.color2, t),
				color3: lerpColor(currentGradient.color3, targetGradient.color3, t),
				pos1X: currentGradient.pos1X + (targetGradient.pos1X - currentGradient.pos1X) * t,
				pos1Y: currentGradient.pos1Y + (targetGradient.pos1Y - currentGradient.pos1Y) * t,
				pos2X: currentGradient.pos2X + (targetGradient.pos2X - currentGradient.pos2X) * t,
				pos2Y: currentGradient.pos2Y + (targetGradient.pos2Y - currentGradient.pos2Y) * t,
				pos3X: currentGradient.pos3X + (targetGradient.pos3X - currentGradient.pos3X) * t,
				pos3Y: currentGradient.pos3Y + (targetGradient.pos3Y - currentGradient.pos3Y) * t,
			};

			if (wrapper) {
				wrapper.style.setProperty('--hero-bg', gradientToString(interpGrad));
			}

			// Anime aussi le topbar avec la même animation
			if (topbar) {
				topbar.style.setProperty('--topbar-bg', gradientToString(interpGrad));
			}

			lastTime = now;
			requestAnimationFrame(animate);
		}

		// Mise à jour initiale
		if (wrapper) {
			wrapper.style.setProperty('--hero-bg', gradientToString(currentGradient));
		}
		if (topbar) {
			topbar.style.setProperty('--topbar-bg', gradientToString(currentGradient));
		}

		// Démarre l'animation
		requestAnimationFrame(animate);
	}

