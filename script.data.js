(function () {
  function getRootFromScript() {
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('script.data.js') !== -1) {
        return new URL(src, window.location.href);
      }
    }
    return new URL('script.data.js', window.location.href);
  }

  function escapeHtml(text) {
    return (text || '').replace(/[&<>"']/g, function (char) {
      if (char === '&') return '&amp;';
      if (char === '<') return '&lt;';
      if (char === '>') return '&gt;';
      if (char === '"') return '&quot;';
      return '&#039;';
    });
  }

  function escapeHtmlWithBreaks(text) {
    var escaped = escapeHtml(text);
    escaped = escaped.replace(/&lt;br\s*\/?&gt;/g, '<br>');
    escaped = escaped.replace(/&lt;\/br&gt;/g, '</br>');
    return escaped;
  }

  function extractMaxYear(text) {
    var years = String(text || '').match(/\b\d{4}\b/g);
    if (!years || !years.length) return 0;
    return Math.max.apply(
      null,
      years.map(function (y) {
        return Number(y);
      })
    );
  }

  function findFeaturedProject(data) {
    var best = null;

    (data.projects || []).forEach(function (domain) {
      (domain.projets || []).forEach(function (project) {
        var year = extractMaxYear(project.date);
        if (!best || year > best.year) {
          best = {
            title: project.titre || domain.domaine || 'Projet',
            description: project.descriptionCourte || project.description || domain.descriptionCourte || domain.description || '',
            date: project.date || domain.date || '',
            image: project.image || domain.image || '',
            domain: domain.domaine || '',
            href: project.lien || domain.lien || '#',
            year: year
          };
        }
      });
    });

    if (best) return best;

    var firstDomain = (data.projects || [])[0] || null;
    if (!firstDomain) return null;

    return {
      title: firstDomain.domaine || 'Projet',
      description: firstDomain.descriptionCourte || firstDomain.description || '',
      date: firstDomain.date || '',
      image: firstDomain.image || '',
      domain: firstDomain.domaine || '',
      href: firstDomain.lien || '#',
      year: extractMaxYear(firstDomain.date)
    };
  }

  function hydrateIndex(data) {
    var featured = findFeaturedProject(data);
    if (!featured) return;

    var imageEl = document.querySelector('.latest-project .placeholder-image');
    var titleEl = document.querySelector('.latest-project .project-content h2');
    var descriptionEl = document.querySelector('.latest-project .project-description');
    var tagsEl = document.querySelector('.latest-project .project-tags');

    if (imageEl && featured.image) {
      imageEl.style.backgroundImage = "url('" + featured.image + "')";
      imageEl.style.backgroundSize = 'cover';
      imageEl.style.backgroundPosition = 'center';
    }

    if (titleEl) {
      var safeTitle = escapeHtml(featured.title);
      var safeHref = escapeHtml(featured.href || '#');
      titleEl.innerHTML = '<a class="project-title-button" href="' + safeHref + '">' + safeTitle + '</a>';
    }

    if (descriptionEl) {
      descriptionEl.innerHTML = escapeHtmlWithBreaks(featured.description);
    }

    if (tagsEl) {
      var domain = escapeHtml(featured.domain || 'Projet');
      var date = escapeHtml(featured.date || 'Date non renseignee');
      tagsEl.innerHTML =
        '<span class="tag">Projet vedette</span>' +
        '<span class="tag">' + domain + '</span>' +
        '<span class="tag">' + date + '</span>';
    }
  }

  function renderProjectsPage(data) {
    var main = document.querySelector('main');
    var timelineSection = document.querySelector('main .timeline-container');
    var contactSection = document.querySelector('main .contact');

    if (!main || !timelineSection || !contactSection) {
      return;
    }

    var oldSections = main.querySelectorAll('.category-section');
    oldSections.forEach(function (section) {
      section.remove();
    });

    var fragment = document.createDocumentFragment();

    (data.projects || []).forEach(function (domain) {
      var section = document.createElement('section');
      section.className = 'category-section';
      section.id = 'cat-' + (domain.id || 'domaine');

      var projectsHtml = (domain.projets || [])
        .map(function (project) {
          var title = escapeHtml(project.titre || 'Projet');
          var description = escapeHtmlWithBreaks(project.description || project.descriptionCourte || '');
          var date = escapeHtml(project.date || 'Date non renseignee');
          var href = escapeHtml(project.lien || '#');
          var image = escapeHtml(project.image || '');
          var emoji = escapeHtml(domain.icon || '•');

          return (
            '<article class="project-item">' +
            '<div class="project-emoji">' +
            emoji +
            '</div>' +
            '<div class="project-image">' +
            '<img src="' +
            image +
            '" alt="' +
            title +
            '">' +
            '</div>' +
            '<div class="project-details">' +
            '<h3>' +
            title +
            '</h3>' +
            '<p>' +
            description +
            '</p>' +
            '<div class="project-meta"><span class="project-meta-item">📅 ' +
            date +
            '</span></div>' +
            '<a href="' +
            href +
            '" class="project-link-button">Voir le projet →</a>' +
            '</div>' +
            '</article>'
          );
        })
        .join('');

      section.innerHTML =
        '<h2 class="category-title">' +
        '<span class="category-icon">' +
        escapeHtml(domain.icon || '•') +
        '</span>' +
        escapeHtml(domain.domaine || 'Domaine') +
        '</h2>' +
        '<div class="projects-list">' +
        projectsHtml +
        '</div>';

      fragment.appendChild(section);
    });

    main.insertBefore(fragment, contactSection);
  }

  async function loadData() {
    var rootScript = getRootFromScript();
    var jsonUrl = new URL('projects-data.json', rootScript);
    var response = await fetch(jsonUrl.href, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Impossible de charger projects-data.json (HTTP ' + response.status + ')');
    }
    return response.json();
  }

  async function initDataBinding() {
    var isIndex = !document.body.classList.contains('projets-page');
    var isProjects = document.body.classList.contains('projets-page');

    try {
      var data = await loadData();

      if (isIndex) {
        hydrateIndex(data);
        document.dispatchEvent(new CustomEvent('projects:data-rendered', { detail: { page: 'index' } }));
      }

      if (isProjects) {
        renderProjectsPage(data);
        document.dispatchEvent(new CustomEvent('projects:data-rendered', { detail: { page: 'projets' } }));
      }
    } catch (error) {
      console.warn('[data] Liaison JSON inactive:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', initDataBinding);
})();
