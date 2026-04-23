(function () {
  window.__portfolioNavManaged = true;

  var PROJECTS_NAV_STORAGE_KEY = 'site-web-renouveau.projects-data';

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, function (char) {
      if (char === '&') return '&amp;';
      if (char === '<') return '&lt;';
      if (char === '>') return '&gt;';
      if (char === '"') return '&quot;';
      return '&#039;';
    });
  }

  function getRootFromNavScript() {
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i += 1) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('script.nav.js') !== -1) {
        return new URL(src, window.location.href);
      }
    }
    return new URL('script.nav.js', window.location.href);
  }

  function normalizeDomainLabel(label) {
    var value = String(label || '').trim();
    if (!value) {
      return 'Domaine';
    }

    // Clean technical separators for a concise nav label.
    value = value.replace(/\s+-\s+/g, ' · ');
    value = value.replace(/\s{2,}/g, ' ');

    return value;
  }

  function fallbackDomainLinks(basePrefix) {
    return [
      {
        href: basePrefix + '3D - Animation 2D - Rigging 2D/TOUT animation.html',
        label: 'Motion design 2d/3d · Animation 2d · Rigging 2d'
      },
      {
        href: basePrefix + 'Communication digitale - flyer/TOUT communication.html',
        label: 'Communication digitale · Création de supports'
      },
      {
        href: basePrefix + 'Montage vidéo - réalisation/TOUT Montage vidéo - réalisation.html',
        label: 'Audiovisuel'
      },
      {
        href: basePrefix + 'Design Web - Création de Site internet/TOUT web.html',
        label: 'Design web · Création de site internet'
      }
    ];
  }

  function buildProjectsSubmenuHtml(baseHref, domainLinks) {
    var items = '<a href="' + escapeHtml(baseHref) + '">Tous les projets</a>';

    domainLinks.forEach(function (item) {
      if (!item || !item.href) {
        return;
      }

      items += '<a href="' + escapeHtml(item.href) + '">' + escapeHtml(item.label || 'Domaine') + '</a>';
    });

    return items;
  }

  async function loadProjectsDomainLinks(basePrefix) {
    try {
      var rootScript = getRootFromNavScript();
      var jsonUrl = new URL('projects-data.json', rootScript);
      var response = await fetch(jsonUrl.href, { cache: 'no-store' });
      if (response.ok) {
        var data = await response.json();
        if (data && Array.isArray(data.projects)) {
          return data.projects
            .map(function (domain) {
              return {
                href: basePrefix + String(domain.lien || '').replace(/^\.?\//, ''),
                label: normalizeDomainLabel(domain.domaine)
              };
            })
            .filter(function (item) {
              return item.href;
            });
        }
      }

      var cached = localStorage.getItem(PROJECTS_NAV_STORAGE_KEY);
      if (cached) {
        var parsedCached = JSON.parse(cached);
        if (parsedCached && Array.isArray(parsedCached.projects)) {
          return parsedCached.projects
            .map(function (domain) {
              return {
                href: basePrefix + String(domain.lien || '').replace(/^\.?\//, ''),
                label: normalizeDomainLabel(domain.domaine)
              };
            })
            .filter(function (item) {
              return item.href;
            });
        }
      }

      return fallbackDomainLinks(basePrefix);
    } catch (error) {
      return fallbackDomainLinks(basePrefix);
    }
  }

  function getBasePrefix(nav) {
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href]'));
    var ref = links.find(function (link) {
      var href = (link.getAttribute('href') || '').toLowerCase();
      return href.indexOf('index.html') !== -1 || href.indexOf('projets.html') !== -1 || href.indexOf('cv/cv.html') !== -1;
    });

    if (!ref) {
      return '';
    }

    var href = ref.getAttribute('href') || '';
    var match = href.match(/^(.*?)(?:index|projets|cv\/cv)\.html/i);
    return match ? match[1] : '';
  }

  function ensureAnnouncementBanner(header) {
    if (!header || !header.parentNode) {
      return;
    }

    var previous = header.previousElementSibling;
    if (previous && previous.classList.contains('site-announcement')) {
      return;
    }

    var banner = document.createElement('div');
    banner.className = 'site-announcement';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-label', 'Annonce');

    var track = document.createElement('div');
    track.className = 'site-announcement-track';
    track.innerHTML =
      'voici ma nouvelle <span class="site-announcement-accent">direction artistique</span> - refonte de mon <span class="site-announcement-accent">site</span> et de ma <span class="site-announcement-accent">communication</span> !';

    banner.appendChild(track);
    header.parentNode.insertBefore(banner, header);
  }

  function normalizePrimaryNav(nav) {
    var basePrefix = getBasePrefix(nav);

    nav.innerHTML =
      '<a href="' + basePrefix + 'index.html">Accueil</a>' +
      '<a href="' + basePrefix + 'projets.html">Projets</a>' +
      '<a href="' + basePrefix + 'qui-suis-je.html">À Propos</a>' +
      '<a href="' + basePrefix + 'contact.html">Contact</a>' +
      '<a href="' + basePrefix + 'CV/cv.html">CV</a>';
  }

  function forceIndexHeader(header, basePrefix) {
    header.classList.remove('tout-topbar');
    header.classList.remove('article-topbar');
    header.classList.add('topbar');

    header.innerHTML =
      '<div class="brand">Portfolio de Lisa Bruno</div>' +
      '<nav class="nav-links" aria-label="Navigation principale">' +
      '<a href="' + basePrefix + 'index.html">Accueil</a>' +
      '<a href="' + basePrefix + 'projets.html">Projets</a>' +
      '<a href="' + basePrefix + 'qui-suis-je.html">À Propos</a>' +
      '<a href="' + basePrefix + 'contact.html">Contact</a>' +
      '<a href="' + basePrefix + 'CV/cv.html">CV</a>' +
      '</nav>';
  }

  function buildFooterHTML(basePrefix) {
    return (
      '<div class="footer-nav">' +
      '<div class="footer-column">' +
      '<h4>Tous les domaines</h4>' +
      '<a href="' + basePrefix + '3D - Animation 2D - Rigging 2D/TOUT animation.html">Animation 2D/3D</a>' +
      '<a href="' + basePrefix + 'Communication digitale - flyer/TOUT communication.html">Communication</a>' +
      '<a href="' + basePrefix + 'Montage vidéo - réalisation/TOUT Montage vidéo - réalisation.html">Audiovisuel</a>' +
      '<a href="' + basePrefix + 'Design Web - Création de Site internet/TOUT web.html">Design web</a>' +
      '</div>' +
      '<div class="footer-column">' +
      '<h4>1 gros projet par domaine</h4>' +
      '<a href="' + basePrefix + '3D - Animation 2D - Rigging 2D/3 - endogamie numériquement assisté/article-MotionDesign.html">Motion Design - Endogamie</a>' +
      '<a href="' + basePrefix + 'Communication digitale - flyer/1 - La.fee.du.tri/article-la.fee.du.tri.html">La Fée du Tri</a>' +
      '<a href="' + basePrefix + 'Montage vidéo - réalisation/2 - un dernier message/article-message.html">Un dernier message</a>' +
      '<a href="' + basePrefix + 'Design Web - Création de Site internet/2 - Bordeaux gastro/article-bordeaux-gastro.html">Bordeaux Gastro</a>' +
      '</div>' +
      '<div class="footer-column">' +
      '<h4>À propos de moi</h4>' +
      '<a href="' + basePrefix + 'qui-suis-je.html">Qui suis-je ?</a>' +
      '<a href="' + basePrefix + 'contact.html">Contact</a>' +
      '<a href="' + basePrefix + 'CV/cv.html">CV / Parcours</a>' +
      '<a href="https://www.instagram.com/lisauteur/" target="_blank" rel="noopener noreferrer">Instagram : lisauteur</a>' +
      '<a href="https://www.youtube.com/@Lisauteur" target="_blank" rel="noopener noreferrer">YouTube : Lisauteur</a>' +
      '<a href="mailto:bordeaux.lisabruno@gmail.com?subject=Contact depuis le portfolio">Mail : bordeaux.lisabruno@gmail.com</a>' +
      '</div>' +
      '</div>' +
      '<div class="copyright"><p>© 2024 Mon Portfolio - Tous droits réservés</p></div>'
    );
  }

  function normalizeFooter(footer, basePrefix) {
    footer.innerHTML = buildFooterHTML(basePrefix);
  }

  function setActiveLink(nav) {
    var currentUrl = new URL(window.location.href);
    var currentPath = currentUrl.pathname.replace(/\/+$/, '/');

    nav.querySelectorAll('a[href]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.charAt(0) === '#') {
        return;
      }

      var linkUrl;
      try {
        linkUrl = new URL(href, window.location.href);
      } catch (error) {
        return;
      }

      var linkPath = linkUrl.pathname.replace(/\/+$/, '/');
      var samePage = linkPath === currentPath;
      var sameHash = !linkUrl.hash || linkUrl.hash === currentUrl.hash;

      if (samePage && sameHash) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function initDropdownMenus() {
    var headers = document.querySelectorAll('.topbar, .tout-topbar, header.article-topbar');
    if (!headers.length) {
      return;
    }

    headers.forEach(function (header) {
      var nav = header.querySelector('.nav-links, .tout-nav, .article-nav');
      if (!nav) {
        return;
      }

      ensureAnnouncementBanner(header);

      var basePrefix = getBasePrefix(nav);
      forceIndexHeader(header, basePrefix);
      nav = header.querySelector('.nav-links');

      normalizePrimaryNav(nav);
      nav.classList.add('nav-menu');

      document.querySelectorAll('footer.footer, footer.article-footer').forEach(function (footer) {
        normalizeFooter(footer, basePrefix);
      });

      if (header.querySelector('.menu-toggle')) {
        return;
      }

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'menu-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
      toggle.innerHTML =
        '<span class="menu-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span>' +
        '<span class="menu-toggle-label">Menu</span>';

      header.insertBefore(toggle, nav);

      function setupProjectsSubmenu() {
        if (nav.querySelector('.nav-item-dropdown')) {
          return Promise.resolve(function () {});
        }

        var directLinks = Array.prototype.filter.call(nav.children, function (el) {
          return el.tagName === 'A';
        });

        var projetsLink = directLinks.find(function (link) {
          var href = (link.getAttribute('href') || '').toLowerCase();
          var text = (link.textContent || '').toLowerCase();
          return href.indexOf('projets.html') !== -1 || text.indexOf('projets') !== -1;
        });

        if (!projetsLink) {
          return Promise.resolve(function () {});
        }

        var baseHref = (projetsLink.getAttribute('href') || '').split('#')[0] || 'projets.html';
        var basePrefix = baseHref.replace(/projets\.html$/i, '');
        var dropdown = document.createElement('div');
        dropdown.className = 'nav-item-dropdown';
        nav.insertBefore(dropdown, projetsLink);
        dropdown.appendChild(projetsLink);

        projetsLink.classList.add('nav-parent');
        projetsLink.setAttribute('aria-haspopup', 'true');
        projetsLink.setAttribute('aria-expanded', 'false');

        var toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'dropdown-toggle';
        toggleBtn.setAttribute('aria-label', 'Ouvrir les catégories projets');
        toggleBtn.innerHTML = '<span class="dropdown-caret">▾</span>';
        dropdown.appendChild(toggleBtn);

        var submenu = document.createElement('div');
        submenu.className = 'nav-submenu';
        submenu.innerHTML = buildProjectsSubmenuHtml(baseHref, fallbackDomainLinks(basePrefix));
        dropdown.appendChild(submenu);

        loadProjectsDomainLinks(basePrefix).then(function (domainLinks) {
          submenu.innerHTML = buildProjectsSubmenuHtml(baseHref, domainLinks);

          submenu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
              closeSubmenu();
            });
          });
        });

        function closeSubmenu() {
          dropdown.classList.remove('is-open');
          projetsLink.setAttribute('aria-expanded', 'false');
        }

        toggleBtn.addEventListener('click', function (event) {
          event.stopPropagation();
          event.preventDefault();
          var isOpen = dropdown.classList.toggle('is-open');
          projetsLink.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        dropdown.addEventListener('mouseenter', function () {
          if (window.innerWidth > 900) {
            dropdown.classList.add('is-open');
            projetsLink.setAttribute('aria-expanded', 'true');
          }
        });

        dropdown.addEventListener('mouseleave', function () {
          if (window.innerWidth > 900) {
            closeSubmenu();
          }
        });

        submenu.querySelectorAll('a').forEach(function (link) {
          link.addEventListener('click', function () {
            closeSubmenu();
          });
        });

        return Promise.resolve(closeSubmenu);
      }

      var closeProjectsSubmenu = function () {};
      setupProjectsSubmenu().then(function (closeFn) {
        closeProjectsSubmenu = closeFn;
        setActiveLink(nav);
      });
      setActiveLink(nav);

      function closeMenu() {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        closeProjectsSubmenu();
      }

      function toggleMenu() {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      }

      toggle.addEventListener('click', function (event) {
        event.stopPropagation();
        toggleMenu();
      });

      document.addEventListener('click', function (event) {
        if (!header.contains(event.target)) {
          closeMenu();
        }
      });

      nav.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          closeMenu();
        });
      });

      window.addEventListener('resize', function () {
        if (window.innerWidth > 900) {
          closeMenu();
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDropdownMenus);
  } else {
    initDropdownMenus();
  }
})();
