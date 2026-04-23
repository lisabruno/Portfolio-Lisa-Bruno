let zigzagScrollHandler = null;

function initDropdownMenus() {
  const headers = document.querySelectorAll('.topbar, .tout-topbar, header.article-topbar');
  if (!headers.length) return;

  headers.forEach((header) => {
    const nav = header.querySelector('.nav-links, .tout-nav, .article-nav');
    if (!nav) return;

    nav.classList.add('nav-menu');

    if (header.querySelector('.menu-toggle')) return;

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

// Animation de la ligne zigzag au scroll
function initZigzagAnimation() {
  const path = document.getElementById('zigzag-path');
  const timeline = document.getElementById('timeline');
  
  if (!path || !timeline) return;

  const pathLength = path.getTotalLength();
  
  // Configuration initiale
  path.style.strokeDasharray = pathLength;
  path.style.strokeDashoffset = pathLength;

  if (zigzagScrollHandler) {
    window.removeEventListener('scroll', zigzagScrollHandler);
  }

  let rafPending = false;
  const DRAW_SPEED = 1.45;
  const DRAW_ADVANCE = 0.03;

  const updateZigzag = () => {
    rafPending = false;

    const rect = timeline.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const timelineHeight = timeline.offsetHeight;

    if (!timelineHeight) {
      return;
    }

    const viewportMiddle = windowHeight / 2;
    const start = rect.top;
    const end = rect.top + timelineHeight;
    const rawProgress = (viewportMiddle - start) / (end - start);
    // Calibrage pour que la ligne suive visuellement plus vite la descente.
    const boostedProgress = rawProgress * DRAW_SPEED + DRAW_ADVANCE;
    const scrollPercent = Math.min(Math.max(boostedProgress, 0), 1);

    const drawLength = pathLength * scrollPercent;
    path.style.strokeDashoffset = pathLength - drawLength;

    animateConnectionPoints(scrollPercent);
  };

  // Animation au scroll
  zigzagScrollHandler = () => {
    if (!rafPending) {
      rafPending = true;
      window.requestAnimationFrame(updateZigzag);
    }
  };

  window.addEventListener('scroll', zigzagScrollHandler, { passive: true });
  zigzagScrollHandler();
}

// Animation des points de connexion
function animateConnectionPoints(scrollPercent) {
  const points = document.querySelectorAll('.connection-point');
  
  points.forEach((point) => {
    const dataIndex = parseInt(point.getAttribute('data-index'));
    
    // Points principaux (0-4)
    if (dataIndex <= 4) {
      const startProgress = dataIndex * 0.15;
      const endProgress = startProgress + 0.08;
      
      if (scrollPercent >= startProgress && scrollPercent <= endProgress) {
        const pointProgress = (scrollPercent - startProgress) / (endProgress - startProgress);
        point.style.transform = `scale(${pointProgress})`;
        point.style.opacity = pointProgress;
      } else if (scrollPercent > endProgress) {
        point.style.transform = 'scale(1)';
        point.style.opacity = '1';
      } else {
        point.style.transform = 'scale(0)';
        point.style.opacity = '0';
      }
    } 
    // Points bas (5-7)
    else {
      const bottomIndex = dataIndex - 5;
      const startProgress = 0.7 + bottomIndex * 0.08;
      const endProgress = startProgress + 0.05;
      
      if (scrollPercent >= startProgress && scrollPercent <= endProgress) {
        const pointProgress = (scrollPercent - startProgress) / (endProgress - startProgress);
        point.style.transform = `scale(${pointProgress})`;
        point.style.opacity = pointProgress;
      } else if (scrollPercent > endProgress) {
        point.style.transform = 'scale(1)';
        point.style.opacity = '1';
      } else {
        point.style.transform = 'scale(0)';
        point.style.opacity = '0';
      }
    }
  });
}

// Intersection Observer pour les animations d'apparition
function initIntersectionObserver() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '-50px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal');
      }
    });
  }, observerOptions);

  // Observer les éléments mobiles
  const mobileItems = document.querySelectorAll('.mobile-item');
  mobileItems.forEach(item => observer.observe(item));

  // Observer pour les cartes desktop
  const desktopObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-desktop');
      }
    });
  }, observerOptions);

  const cardSections = document.querySelectorAll('.card-section, .card-image-vertical');
  cardSections.forEach(card => desktopObserver.observe(card));
}

// Smooth scroll pour les liens d'ancrage
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Animation du bouton CTA
function initButtonAnimation() {
  const ctaButton = document.querySelector('.cta-button');
  if (ctaButton) {
    ctaButton.addEventListener('click', (e) => {
      // Créer un effet de ripple
      const ripple = document.createElement('span');
      const rect = ctaButton.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');
      
      ctaButton.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  }
}

// Détection du scroll pour optimiser les performances
let ticking = false;

function optimizedScroll(callback) {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      callback();
      ticking = false;
    });
    ticking = true;
  }
}

// Parallax léger sur le hero
function initParallax() {
  const hero = document.querySelector('.hero-content');
  if (!hero) return;

  window.addEventListener('scroll', () => {
    optimizedScroll(() => {
      const scrolled = window.pageYOffset;
      const parallax = scrolled * 0.5;
      hero.style.transform = `translateY(${parallax}px)`;
      hero.style.opacity = 1 - scrolled / 500;
    });
  });
}

// Animation des dots mobiles au scroll
function initMobileDotAnimation() {
  const dots = document.querySelectorAll('.mobile-dot');
  
  const dotObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'pulse 2s infinite';
      }
    });
  }, { threshold: 0.5 });

  dots.forEach(dot => dotObserver.observe(dot));
}

// Ajouter l'animation pulse et ripple en CSS dynamiquement
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% {
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      transform: translate(-50%, -50%) scale(1.1);
    }
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s ease-out;
    pointer-events: none;
  }
  
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  if (!window.__portfolioNavManaged) {
    initDropdownMenus();
  }
  initZigzagAnimation();
  initIntersectionObserver();
  initSmoothScroll();
  initButtonAnimation();
  initParallax();
  initMobileDotAnimation();
  
  // Performance: Lazy loading des images (quand vous les ajouterez)
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
});

// Gestion du redimensionnement de la fenêtre (debounce)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    // Recalculer les animations si nécessaire
    initZigzagAnimation();
  }, 250);
});

document.addEventListener('timeline:rendered', () => {
  initZigzagAnimation();
  initIntersectionObserver();
  initMobileDotAnimation();
});

document.addEventListener('projects:data-rendered', () => {
  initIntersectionObserver();
  initMobileDotAnimation();
});
