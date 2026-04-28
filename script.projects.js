// Remplit les lignes au rythme du scroll sur toute la hauteur de l'article.
document.addEventListener('DOMContentLoaded', async function () {
	function getRootFromScript() {
		const scripts = document.querySelectorAll('script[src]');
		for (let i = 0; i < scripts.length; i += 1) {
			const src = scripts[i].getAttribute('src') || '';
			if (src.includes('script.projects.js')) {
				return new URL(src, window.location.href);
			}
		}
		return new URL('script.projects.js', window.location.href);
	}

	async function hydrateArticleFromDatabase() {
		const articleRoot = document.querySelector('.article-page, .article-container');
		if (!articleRoot) {
			return;
		}

		function normalizePath(value) {
			return decodeURIComponent(String(value || ''))
				.replace(/\\/g, '/')
				.toLowerCase();
		}

		function resolveDbPath(pathValue) {
			const normalizedPath = normalizePath(pathValue);
			if (normalizedPath.startsWith('/')) {
				return normalizedPath.slice(1);
			}
			return normalizedPath;
		}

		function escapeHtml(text) {
			return String(text || '').replace(/[&<>"']/g, function (char) {
				if (char === '&') return '&amp;';
				if (char === '<') return '&lt;';
				if (char === '>') return '&gt;';
				if (char === '"') return '&quot;';
				return '&#039;';
			});
		}

		function textToHtmlSections(text) {
			const raw = String(text || '').trim();
			if (!raw) {
				return '';
			}

			const paragraphs = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
			let html = '';

			paragraphs.forEach((paragraph) => {
				const lines = paragraph.split(/\n/).map((line) => line.trim()).filter(Boolean);
				const isList = lines.length > 0 && lines.every((line) => line.startsWith('- '));

				if (isList) {
					html += '<ul>';
					lines.forEach((line) => {
						html += '<li>' + escapeHtml(line.replace(/^-\s*/, '')) + '</li>';
					});
					html += '</ul>';
				} else {
					html += '<p>' + escapeHtml(lines.join(' ')) + '</p>';
				}
			});

			return html;
		}

		function buildContentFromJsonArticle(article, fallbackHtml) {
			const rawJsonHtml = String(article.contentHtml || '').trim();
			const rawFallbackHtml = String(fallbackHtml || '').trim();

			function hasMediaBlock(html) {
				return /article-video|carousel|photo-gallery|project-gallery|<iframe|<video/i.test(String(html || ''));
			}

			const existingHtml = hasMediaBlock(rawJsonHtml) ? rawJsonHtml : (rawFallbackHtml || rawJsonHtml);
			const description = String(article.descriptionProject || '').trim();
			const approach = String(article.projectApproach || '').trim();
			const projectLink = String(article.projectLink || '').trim();
			const articlePath = String(article.path || '').toLowerCase();
			const articleTitle = String(article.title || '').toLowerCase();
			const isWebsiteProject = /design web|madd|bordeaux|sagastronomie/.test(articlePath + ' ' + articleTitle);

			let html = '';
			html += '<h2>Description du projet</h2>';
			html += textToHtmlSections(description) || '<p>Description à compléter.</p>';

			html += '<h2>Démarche du projet</h2>';
			html += textToHtmlSections(approach) || '<p>Démarche à compléter.</p>';

			if (existingHtml) {
				if (!description && !approach && !projectLink) {
					return existingHtml;
				}
				return existingHtml + html;
			}

			return html;
		}

		function buildUnifiedArticleContent(rawHtml) {
			const source = String(rawHtml || '').trim();
			if (!source) {
				return source;
			}

			const temp = document.createElement('div');
			temp.innerHTML = source;

			// Nettoie les blocs hors contenu principal (sidebars eventuellement presentes dans certains articles).
			temp.querySelectorAll('aside, .sidebar, .sidebar-section, .category-list, .recent-posts, .article-nav-links').forEach((node) => {
				node.remove();
			});

			const mediaSelector = '.article-video, .carousel, .photo-gallery, .project-gallery, iframe, video';
			const rawMediaNodes = Array.from(temp.querySelectorAll(mediaSelector));
			const mediaNodes = rawMediaNodes.filter((node) => {
				const parentContainer = node.parentElement && node.parentElement.closest('.article-video, .carousel, .photo-gallery, .project-gallery');
				if (!parentContainer) {
					return true;
				}
				return node.classList && (
					node.classList.contains('article-video') ||
					node.classList.contains('carousel') ||
					node.classList.contains('photo-gallery') ||
					node.classList.contains('project-gallery')
				);
			});

			const mediaHtml = mediaNodes.map((node) => {
				const tag = node.tagName ? node.tagName.toLowerCase() : '';
				if (tag === 'iframe' || tag === 'video') {
					return '<div class="article-video">' + node.outerHTML + '</div>';
				}
				return node.outerHTML;
			}).join('');

			mediaNodes.forEach((node) => {
				node.remove();
			});

			const headings = Array.from(temp.querySelectorAll('h2, h3'));

			function headingText(node) {
				return (node && node.textContent ? node.textContent : '').replace(/\s+/g, ' ').trim();
			}

			function findHeading(pattern) {
				return headings.find((h) => pattern.test(headingText(h))) || null;
			}

			function collectSectionAfterHeading(heading) {
				if (!heading) {
					return { paragraphs: [], lists: [] };
				}

				const paragraphs = [];
				const lists = [];
				let current = heading.nextElementSibling;

				while (current) {
					const tag = current.tagName ? current.tagName.toLowerCase() : '';
					if (tag === 'h2' || tag === 'h3') {
						break;
					}
					if (tag === 'p') {
						const text = (current.textContent || '').replace(/\s+/g, ' ').trim();
						if (text) {
							paragraphs.push(text);
						}
					}
					if (tag === 'ul' || tag === 'ol') {
						if (current.querySelector('li')) {
							lists.push(current.cloneNode(true));
						}
					}
					current = current.nextElementSibling;
				}

				return { paragraphs: paragraphs, lists: lists };
			}

			const paragraphs = Array.from(temp.querySelectorAll('p'))
				.map((p) => (p.textContent || '').replace(/\s+/g, ' ').trim())
				.filter(Boolean);

			const lists = Array.from(temp.querySelectorAll('ul, ol')).filter((list) => {
				return Array.from(list.querySelectorAll('li')).some((li) => (li.textContent || '').trim().length > 0);
			});

			const explication = paragraphs[0] || '';

			const demarcheHeading =
				findHeading(/motivation|consigne|consignes|objectif|intentions|processus|demarche|démarche/i) ||
				findHeading(/etapes|étapes/i);
			const demarcheSection = collectSectionAfterHeading(demarcheHeading);

			const competencesHeading =
				findHeading(/competences|compétences|outils/i) ||
				findHeading(/etapes|étapes/i);
			const competencesSection = collectSectionAfterHeading(competencesHeading);

			let demarcheText = demarcheSection.paragraphs[0] || paragraphs[1] || '';
			let demarcheList = demarcheSection.lists[0] || lists[0] || null;

			let competencesText = competencesSection.paragraphs[0] || '';
			let competencesList = competencesSection.lists[0] || (lists[1] || null);

			if (competencesList && demarcheList && competencesList.outerHTML === demarcheList.outerHTML) {
				competencesList = null;
			}

			if (!competencesText) {
				const toolsParagraph = paragraphs.find((text) => /logiciels?|outils?|adobe|figma|blender|photoshop|lightroom|premiere/i.test(text));
				if (toolsParagraph) {
					competencesText = toolsParagraph;
				}
			}

			if (!mediaHtml && !explication && !demarcheText && !demarcheList && !competencesText && !competencesList) {
				return source;
			}

		const ornament = '<div class="article-ornament"><span class="line"></span><svg class="star" viewBox="0 0 24 24"><polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9"></polygon></svg><span class="line"></span></div>';

		let html = '';

		html += '<section class="article-block article-block-media">';
			if (isWebsiteProject && projectLink && /^https?:\/\//i.test(projectLink)) {
				html += '<h2><a class="article-project-button article-media-button" href="' + escapeHtml(projectLink) + '" target="_blank" rel="noopener noreferrer">Rendu du projet</a></h2>';
			} else {
				html += '<h2>Rendu du projet</h2>';
			}
		if (mediaHtml) {
			html += mediaHtml;
		} else {
			html += '<p>Aucun média principal ajouté pour ce projet.</p>';
		}
		html += '</section>';

		html += ornament;
		html += '<section class="article-block article-block-explication">';
		html += '<h2>Courte explication du projet</h2>';
		html += '<p>' + escapeHtml(explication || 'Description à compléter.') + '</p>';
		html += '</section>';

		html += ornament;
		html += '<section class="article-block article-block-demarche">';
		html += '<h2>Ma démarche</h2>';
		if (demarcheText) {
			html += '<p>' + escapeHtml(demarcheText) + '</p>';
		}
		if (demarcheList) {
			html += demarcheList.outerHTML;
		} else if (!demarcheText) {
			html += '<p>Démarche à compléter.</p>';
		}
		html += '</section>';

		html += ornament;
		html += '<section class="article-block article-block-competences">';
		html += '<h2>Compétences acquises</h2>';
		if (competencesText) {
			html += '<p>' + escapeHtml(competencesText) + '</p>';
		}
		if (competencesList) {
			html += competencesList.outerHTML;
		} else if (!competencesText) {
			html += '<p>Compétences à compléter.</p>';
		}
		html += '</section>';

			return html;
		}

		try {
			const rootScript = getRootFromScript();
			const jsonUrl = new URL('articles-data.json', rootScript);
			const response = await fetch(jsonUrl.href, { cache: 'no-store' });
			if (!response.ok) {
				throw new Error('HTTP ' + response.status);
			}

			const data = await response.json();

			if (!data || !Array.isArray(data.articles)) {
				return;
			}

			const currentPath = normalizePath(window.location.pathname);
			const currentHref = normalizePath(window.location.href);
			const article = data.articles.find((item) => {
				const dbPath = resolveDbPath(item.path);
				return currentPath.endsWith('/' + dbPath) || currentPath.endsWith(dbPath) || currentHref.includes(dbPath);
			});

			if (!article) {
				return;
			}

			const titleEl = document.querySelector('.article-title') || document.querySelector('.article-header h1');
			if (titleEl && article.title) {
				titleEl.textContent = article.title;
			}

			const tagEl = document.querySelector('.article-tag');
			if (tagEl && article.tag) {
				tagEl.textContent = article.tag;
			}

			const timeEl = document.querySelector('.article-meta time');
			if (timeEl) {
				if (article.date && article.date.iso) {
					timeEl.setAttribute('datetime', article.date.iso);
				}
				if (article.date && article.date.label) {
					timeEl.textContent = article.date.label;
				}
			}

			const contentEl = document.querySelector('.article-content');
			if (contentEl) {
				contentEl.innerHTML = buildUnifiedArticleContent(buildContentFromJsonArticle(article, contentEl.innerHTML));
			}

			const prevLinkEl = document.querySelector('.article-nav-prev');
			if (prevLinkEl) {
				if (article.nav && article.nav.prev) {
					prevLinkEl.setAttribute('href', article.nav.prev);
					prevLinkEl.style.display = '';
				} else {
					prevLinkEl.style.display = 'none';
				}
			}

			const nextLinkEl = document.querySelector('.article-nav-next');
			if (nextLinkEl) {
				if (article.nav && article.nav.next) {
					nextLinkEl.setAttribute('href', article.nav.next);
					nextLinkEl.style.display = '';
				} else {
					nextLinkEl.style.display = 'none';
				}
			}
		} catch (error) {
			console.warn('[articles] Chargement articles-data.json impossible:', error);
		}
	}

	await hydrateArticleFromDatabase();

	function initDropdownMenus() {
		const headers = document.querySelectorAll('.topbar, .tout-topbar, header.article-topbar');
		if (!headers.length) {
			return;
		}

		headers.forEach((header) => {
			const nav = header.querySelector('.nav-links, .tout-nav, .article-nav');
			if (!nav) {
				return;
			}

			nav.classList.add('nav-menu');

			if (header.querySelector('.menu-toggle')) {
				return;
			}

			const toggle = document.createElement('button');
			toggle.type = 'button';
			toggle.className = 'menu-toggle';
			toggle.setAttribute('aria-expanded', 'false');
			toggle.setAttribute('aria-label', 'Ouvrir le menu');
			toggle.innerHTML = '<span>Menu</span>';

			header.insertBefore(toggle, nav);

			const setupProjectsSubmenu = () => {
				if (nav.querySelector('.nav-item-dropdown')) {
					return () => {};
				}

				const directLinks = Array.from(nav.children).filter((el) => el.tagName === 'A');
				const projetsLink = directLinks.find((link) => {
					const href = (link.getAttribute('href') || '').toLowerCase();
					const text = (link.textContent || '').toLowerCase();
					return href.includes('projets.html') || text.includes('projets');
				});

				if (!projetsLink) {
					return () => {};
				}

				const baseHref = (projetsLink.getAttribute('href') || '').split('#')[0] || 'projets.html';
				const basePrefix = baseHref.replace(/projets\.html$/i, '');
				const dropdown = document.createElement('div');
				dropdown.className = 'nav-item-dropdown';
				nav.insertBefore(dropdown, projetsLink);
				dropdown.appendChild(projetsLink);

				projetsLink.classList.add('nav-parent');
				projetsLink.setAttribute('aria-haspopup', 'true');
				projetsLink.setAttribute('aria-expanded', 'false');

				const toggleBtn = document.createElement('button');
				toggleBtn.type = 'button';
				toggleBtn.className = 'dropdown-toggle';
				toggleBtn.setAttribute('aria-label', 'Ouvrir les categories projets');
				toggleBtn.innerHTML = '<span class="dropdown-caret">▾</span>';
				dropdown.appendChild(toggleBtn);

				const submenu = document.createElement('div');
				submenu.className = 'nav-submenu';
				submenu.innerHTML =
					'<a href="' + baseHref + '">Tous les projets</a>' +
					'<a href="' + basePrefix + '3D - Animation 2D - Rigging 2D/TOUT animation.html">Animation</a>' +
					'<a href="' + basePrefix + 'Communication digitale - flyer/TOUT communication.html">Communication</a>' +
					'<a href="' + basePrefix + 'Montage vidéo - réalisation/TOUT Montage vidéo - réalisation.html">Audiovisuel</a>' +
					'<a href="' + basePrefix + 'Design Web - Création de Site internet/TOUT web.html">Design web</a>';
				dropdown.appendChild(submenu);

				const closeSubmenu = () => {
					dropdown.classList.remove('is-open');
					projetsLink.setAttribute('aria-expanded', 'false');
				};

				toggleBtn.addEventListener('click', (event) => {
					event.stopPropagation();
					event.preventDefault();
					const isOpen = dropdown.classList.toggle('is-open');
					projetsLink.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
				});

				dropdown.addEventListener('mouseenter', () => {
					if (window.innerWidth > 900) {
						dropdown.classList.add('is-open');
						projetsLink.setAttribute('aria-expanded', 'true');
					}
				});

				dropdown.addEventListener('mouseleave', () => {
					if (window.innerWidth > 900) {
						closeSubmenu();
					}
				});

				submenu.querySelectorAll('a').forEach((link) => {
					link.addEventListener('click', closeSubmenu);
				});

				return closeSubmenu;
			};

			const closeProjectsSubmenu = setupProjectsSubmenu();

			const closeMenu = () => {
				nav.classList.remove('is-open');
				toggle.setAttribute('aria-expanded', 'false');
				closeProjectsSubmenu();
			};

			toggle.addEventListener('click', (event) => {
				event.stopPropagation();
				const isOpen = nav.classList.toggle('is-open');
				toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
			});

			document.addEventListener('click', (event) => {
				if (!header.contains(event.target)) {
					closeMenu();
				}
			});

			nav.querySelectorAll('a').forEach((link) => {
				link.addEventListener('click', closeMenu);
			});

			window.addEventListener('resize', () => {
				if (window.innerWidth > 900) {
					closeMenu();
				}
			});
		});
	}

	if (!window.__portfolioNavManaged) {
		initDropdownMenus();
	}

	function normalizeArticleDomainLists() {
		const rootScript = getRootFromScript();
		const domainLinks = [
			{
				href: '3D - Animation 2D - Rigging 2D/TOUT animation.html',
				label: 'Motion design 2d/3d · Animation 2d · Rigging 2d'
			},
			{
				href: 'Communication digitale - flyer/TOUT communication.html',
				label: 'Communication digitale · Creation de supports'
			},
			{
				href: 'Montage vidéo - réalisation/TOUT Montage vidéo - réalisation.html',
				label: 'Audiovisuel · Montage vidéo · Photographie'
			},
			{
				href: 'Design Web - Création de Site internet/TOUT web.html',
				label: 'Design Web · Création de site internet'
			}
		];

		const itemsHtml = domainLinks
			.map((item) => '<li><a href="' + new URL(item.href, rootScript).href + '">' + item.label + '</a></li>')
			.join('');

		document.querySelectorAll('.sidebar-section').forEach((section) => {
			const title = section.querySelector('h3');
			if (!title) {
				return;
			}

			const text = (title.textContent || '').toLowerCase();
			if (!text.includes('autres domaines')) {
				return;
			}

			const list = section.querySelector('.category-list');
			if (!list) {
				return;
			}

			list.innerHTML = itemsHtml;
		});
	}

	normalizeArticleDomainLists();

	const articleContents = document.querySelectorAll('.article-content');

	if (!articleContents.length) {
		return;
	}

	function setupAutoCarousels() {
		const galleries = document.querySelectorAll('.photo-gallery');
		if (!galleries.length) {
			return;
		}

		galleries.forEach((gallery, galleryIndex) => {
			if (gallery.dataset.carouselEnhanced === 'true') {
				return;
			}

			const images = Array.from(gallery.querySelectorAll('img'));
			if (images.length <= 3) {
				return;
			}

			const carousel = document.createElement('div');
			carousel.className = 'carousel auto-photo-carousel';
			carousel.setAttribute('aria-label', 'Galerie d\'images');

			const container = document.createElement('div');
			container.className = 'carousel-container';

			const prevBtn = document.createElement('button');
			prevBtn.type = 'button';
			prevBtn.className = 'carousel-btn prev';
			prevBtn.setAttribute('aria-label', 'Image precedente');
			prevBtn.textContent = '❮';

			const imagesWrapper = document.createElement('div');
			imagesWrapper.className = 'carousel-images';

			const nextBtn = document.createElement('button');
			nextBtn.type = 'button';
			nextBtn.className = 'carousel-btn next';
			nextBtn.setAttribute('aria-label', 'Image suivante');
			nextBtn.textContent = '❯';

			container.appendChild(prevBtn);
			container.appendChild(imagesWrapper);
			container.appendChild(nextBtn);

			const counter = document.createElement('p');
			counter.className = 'carousel-counter';

			carousel.appendChild(container);
			carousel.appendChild(counter);

			let currentIndex = 0;

			images.forEach((img, index) => {
				img.classList.add('carousel-image');
				img.classList.toggle('active', index === 0);
				img.setAttribute('data-carousel-id', String(galleryIndex));
				imagesWrapper.appendChild(img);
			});

			function updateCarousel(direction) {
				images[currentIndex].classList.remove('active');
				currentIndex = (currentIndex + direction + images.length) % images.length;
				images[currentIndex].classList.add('active');
				counter.textContent = (currentIndex + 1) + ' / ' + images.length;
			}

			counter.textContent = '1 / ' + images.length;

			prevBtn.addEventListener('click', () => updateCarousel(-1));
			nextBtn.addEventListener('click', () => updateCarousel(1));

			carousel.addEventListener('keydown', (event) => {
				if (event.key === 'ArrowLeft') {
					event.preventDefault();
					updateCarousel(-1);
				}
				if (event.key === 'ArrowRight') {
					event.preventDefault();
					updateCarousel(1);
				}
			});

			gallery.dataset.carouselEnhanced = 'true';
			gallery.replaceWith(carousel);
		});
	}

	setupAutoCarousels();

	// Desactivation des line-dot (points noirs a gauche/droite)
	/*
	articleContents.forEach((content) => {
		if (!content.querySelector('.line-dot')) {
			content.insertAdjacentHTML(
				'beforeend',
				'<span class="line-dot left start" aria-hidden="true"></span>' +
				'<span class="line-dot right start" aria-hidden="true"></span>' +
				'<span class="line-dot left end" aria-hidden="true"></span>' +
				'<span class="line-dot right end" aria-hidden="true"></span>'
			);
		}
	});
	*/

	const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

	function updateAnimations() {
		const viewportHeight = window.innerHeight;
		const markerY = viewportHeight * 0.875; // 1/8 de l'ecran en partant du bas
		const lineInset = 10; // correspond a l'inset des lignes en CSS

		articleContents.forEach((content) => {
			const rect = content.getBoundingClientRect();
			const parentMain = content.closest('.article-main');

			// La fin de ligne suit un repere fixe: 1/8 de l'ecran depuis le bas.
			const effectiveHeight = Math.max(rect.height - (lineInset * 2), 1);
			const rawProgress = (markerY - rect.top - lineInset) / effectiveHeight;
			const progress = clamp(rawProgress, 0, 1);

			content.style.setProperty('--line-progress', progress.toFixed(4));

			if (parentMain) {
				if (progress > 0.001) {
					parentMain.classList.add('scroll-active');
				} else {
					parentMain.classList.remove('scroll-active');
				}
			}
		});
	}

	updateAnimations();
	window.addEventListener('scroll', updateAnimations, { passive: true });
	window.addEventListener('resize', updateAnimations, { passive: true });
});


