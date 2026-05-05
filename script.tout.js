(function () {
  var PROJECTS_STORAGE_KEY = 'site-web-renouveau.projects-data';
  var zigzagScrollHandler = null;
  var monthMap = {
    janvier: 1,
    fevrier: 2,
    mars: 3,
    avril: 4,
    mai: 5,
    juin: 6,
    juillet: 7,
    aout: 8,
    septembre: 9,
    octobre: 10,
    novembre: 11,
    decembre: 12
  };

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, function (char) {
      if (char === '&') return '&amp;';
      if (char === '<') return '&lt;';
      if (char === '>') return '&gt;';
      if (char === '"') return '&quot;';
      return '&#039;';
    });
  }

  function getRootFromScript() {
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('script.tout.js') !== -1) {
        return new URL(src, window.location.href);
      }
    }
    return new URL('script.tout.js', window.location.href);
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function normalizePath(path) {
    return decodeURIComponent(String(path || ''))
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .toLowerCase();
  }

  function getStarPoints(cx, cy) {
    return [
      cx + ',' + (cy - 16),
      cx + 4 + ',' + (cy - 5),
      cx + 16 + ',' + cy,
      cx + 4 + ',' + (cy + 5),
      cx + ',' + (cy + 16),
      (cx - 4) + ',' + (cy + 5),
      (cx - 16) + ',' + cy,
      (cx - 4) + ',' + (cy - 5)
    ].join(' ');
  }

  function getDomainLabel(domain, domainId) {
    var explicit = String(domain && domain.domaine ? domain.domaine : '').trim();
    if (explicit) {
      return explicit;
    }

    var id = normalize(domainId || '');
    if (id.indexOf('anim') !== -1) return 'Animation / Rigging 2D/Motion Design 2D et 3D';
    if (id.indexOf('communication') !== -1) return 'Communication digitale';
    if (id.indexOf('montage') !== -1 || id.indexOf('audiovisuel') !== -1) return 'Audiovisuel';
    if (id.indexOf('web') !== -1 || id.indexOf('design') !== -1) return 'Design web';
    if (id.indexOf('photo') !== -1) return 'Photographie';
    return 'Projet';
  }

  function extractArticleDescription(contentHtml) {
    var temp = document.createElement('div');
    temp.innerHTML = String(contentHtml || '');

    var headings = Array.prototype.slice.call(temp.querySelectorAll('h2, h3'));
    var descriptionHeading = headings.find(function (heading) {
      return normalize(heading.textContent || '').indexOf('description') !== -1;
    });

    var text = '';
    if (descriptionHeading) {
      var current = descriptionHeading.nextElementSibling;
      while (current) {
        var tagName = (current.tagName || '').toLowerCase();
        if (tagName === 'h2' || tagName === 'h3') {
          break;
        }
        if (tagName === 'p') {
          text = (current.textContent || '').trim();
          if (text) {
            break;
          }
        }
        current = current.nextElementSibling;
      }
    }

    if (!text) {
      var firstParagraph = temp.querySelector('p');
      text = firstParagraph ? (firstParagraph.textContent || '').trim() : '';
    }

    return text
      .replace(/^(explication générale|explication generale|description)\s*:\s*/i, '')
      .trim();
  }

  async function loadArticleDescriptionsByPath() {
    try {
      var rootScript = getRootFromScript();
      var jsonUrl = new URL('articles-data.json', rootScript);
      var response = await fetch(jsonUrl.href, { cache: 'no-store' });
      if (!response.ok) {
        return {};
      }

      var data = await response.json();
      var map = {};

      (data.articles || []).forEach(function (article) {
        var path = normalizePath(article.path);
        if (!path) {
          return;
        }

        var description = extractArticleDescription(article.contentHtml);
        if (description) {
          map[path] = description;
        }
      });

      return map;
    } catch (error) {
      return {};
    }
  }

  function computeSortKey(dateText) {
    var normalized = normalize(dateText);

    if (normalized.indexOf('en continu') !== -1) {
      return { bucket: 4, year: 9999, month: 12 };
    }

    if (normalized.indexOf('en cours') !== -1) {
      return { bucket: 3, year: 9998, month: 12 };
    }

    var monthYearPairs = [];
    var pairRegex = /(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})/g;
    var pair;
    while ((pair = pairRegex.exec(normalized)) !== null) {
      monthYearPairs.push({
        year: Number(pair[2]),
        month: monthMap[pair[1]] || 12
      });
    }

    if (monthYearPairs.length) {
      monthYearPairs.sort(function (a, b) {
        if (b.year !== a.year) {
          return b.year - a.year;
        }
        return b.month - a.month;
      });
      return { bucket: 2, year: monthYearPairs[0].year, month: monthYearPairs[0].month };
    }

    var years = normalized.match(/\b\d{4}\b/g);
    if (years && years.length) {
      var maxYear = Math.max.apply(
        null,
        years.map(function (y) {
          return Number(y);
        })
      );
      return { bucket: 2, year: maxYear, month: 12 };
    }

    return { bucket: 1, year: 0, month: 0 };
  }

  function sortDomainProjects(projects) {
    var normalized = (projects || []).map(function (project, index) {
      var dateText = project.date || 'Date non renseignée';
      return {
        project: project,
        sortKey: computeSortKey(dateText),
        index: index
      };
    });

    normalized.sort(function (a, b) {
      if (b.sortKey.bucket !== a.sortKey.bucket) {
        return b.sortKey.bucket - a.sortKey.bucket;
      }
      if (b.sortKey.year !== a.sortKey.year) {
        return b.sortKey.year - a.sortKey.year;
      }
      if (b.sortKey.month !== a.sortKey.month) {
        return b.sortKey.month - a.sortKey.month;
      }
      return a.index - b.index;
    });

    return normalized.map(function (item) {
      return item.project;
    });
  }

  async function loadProjectsData() {
    try {
      var rootScript = getRootFromScript();
      var jsonUrl = new URL('projects-data.json', rootScript);
      var response = await fetch(jsonUrl.href, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Impossible de charger projects-data.json (HTTP ' + response.status + ')');
      }
      return response.json();
    } catch (error) {
      try {
        var cached = localStorage.getItem(PROJECTS_STORAGE_KEY);
        var parsed = cached ? JSON.parse(cached) : null;
        if (parsed && Array.isArray(parsed.projects) && parsed.projects.length) {
          return parsed;
        }
      } catch (cacheError) {
        // Ignore cache parsing errors and fall through to empty structure.
      }
      console.warn('[tout] projects-data.json indisponible, fallback vide.', error);
      return { projects: [] };
    }
  }

  function resolveProjectLink(link, rootScriptUrl) {
    var raw = String(link || '').trim();
    if (!raw) {
      return '#';
    }

    try {
      return new URL(raw, rootScriptUrl).href;
    } catch (error) {
      return raw;
    }
  }

  function animateConnectionPoints(scrollPercent) {
    var points = document.querySelectorAll('.connection-point-wrap');

    points.forEach(function (point) {
      var dataIndex = Number(point.getAttribute('data-index'));
      var startProgress = dataIndex * 0.13;
      var endProgress = startProgress + 0.08;

      if (scrollPercent >= startProgress && scrollPercent <= endProgress) {
        var pointProgress = (scrollPercent - startProgress) / (endProgress - startProgress);
        point.style.opacity = String(pointProgress);
      } else if (scrollPercent > endProgress) {
        point.style.opacity = '1';
      } else {
        point.style.opacity = '0';
      }
    });
  }

  function initToutZigzagAnimation() {
    var path = document.getElementById('zigzag-path');
    var timeline = document.querySelector('.timeline-container');
    if (!path || !timeline) {
      return;
    }

    var isStaticTimeline = timeline.classList.contains('tout-timeline-static');

    if (zigzagScrollHandler) {
      window.removeEventListener('scroll', zigzagScrollHandler);
      zigzagScrollHandler = null;
    }

    if (isStaticTimeline) {
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '0';
      animateConnectionPoints(1);
      return;
    }

    var pathLength = path.getTotalLength();
    path.style.strokeDasharray = String(pathLength);
    path.style.strokeDashoffset = String(pathLength);

    var rafPending = false;
    var drawSpeed = 1.45;
    var drawAdvance = 0.03;

    function updateZigzag() {
      rafPending = false;

      var rect = timeline.getBoundingClientRect();
      var windowHeight = window.innerHeight;
      var timelineHeight = timeline.offsetHeight;
      if (!timelineHeight) {
        return;
      }

      var viewportMiddle = windowHeight / 2;
      var start = rect.top;
      var end = rect.top + timelineHeight;
      var rawProgress = (viewportMiddle - start) / (end - start);
      var boostedProgress = rawProgress * drawSpeed + drawAdvance;
      var scrollPercent = Math.min(Math.max(boostedProgress, 0), 1);

      var drawLength = pathLength * scrollPercent;
      path.style.strokeDashoffset = String(pathLength - drawLength);

      animateConnectionPoints(scrollPercent);
    }

    zigzagScrollHandler = function () {
      if (!rafPending) {
        rafPending = true;
        window.requestAnimationFrame(updateZigzag);
      }
    };

    window.addEventListener('scroll', zigzagScrollHandler, { passive: true });
    zigzagScrollHandler();
  }

  function renderDomainTimeline(domain, rootScriptUrl, articleDescriptionsByPath) {
    var desktopTrack = document.getElementById('project-line-desktop');
    var mobileTrack = document.getElementById('project-line-mobile');
    var svg = document.getElementById('zigzag-svg');
    var path = document.getElementById('zigzag-path');
    var points = document.getElementById('zigzag-points');
    var heroTitle = document.querySelector('.tout-hero h1');

    if (!desktopTrack || !mobileTrack || !svg || !path || !points) {
      return;
    }

    if (heroTitle && domain.domaine) {
      heroTitle.textContent = domain.domaine;
    }

    var projects = sortDomainProjects(domain.projets || []);
    if (!projects.length) {
      desktopTrack.innerHTML = '<p class="card-description">Aucun projet trouvé dans ce domaine.</p>';
      mobileTrack.innerHTML = '';
      return;
    }

    var svgWidth = 800;
    var edgeInset = 24;
    var leftX = edgeInset;
    var rightX = svgWidth - edgeInset;
    var startY = 190;
    var stepY = 330;
    var starYOffset = -55;
    var minHeight = startY + ((projects.length - 1) * stepY) + 260;
    var pointClasses = ['point-blue', 'point-purple', 'point-green', 'point-orange', 'point-indigo', 'point-pink', 'point-cyan', 'point-yellow'];
    var dotClasses = ['dot-blue', 'dot-purple', 'dot-green', 'dot-orange', 'dot-indigo', 'dot-pink', 'dot-cyan', 'dot-yellow'];

    var positions = projects.map(function (_, index) {
      return {
        x: index % 2 === 0 ? leftX : rightX,
        y: startY + (index * stepY)
      };
    });

    var pathData = '';
    if (positions.length) {
      var firstStarY = positions[0].y + starYOffset;
      pathData = 'M ' + positions[0].x + ' ' + firstStarY;
      for (var i = 1; i < positions.length; i++) {
        var prev = positions[i - 1];
        var curr = positions[i];
        var prevStarY = prev.y + starYOffset;
        var currStarY = curr.y + starYOffset;
        var midY = (prevStarY + currStarY) / 2;
        pathData += ' L ' + prev.x + ' ' + midY + ' L ' + curr.x + ' ' + midY + ' L ' + curr.x + ' ' + currStarY;
      }
    }

    path.setAttribute('d', pathData);
    svg.setAttribute('viewBox', '0 0 ' + svgWidth + ' ' + minHeight);
    svg.style.height = minHeight + 'px';

    var desktopContainer = document.querySelector('.timeline-desktop');
    if (desktopContainer) {
      desktopContainer.style.minHeight = minHeight + 'px';
    }

    var starDelayStep = 0.22;

    points.innerHTML = projects.map(function (_, index) {
      var pos = positions[index];
      var pointClass = pointClasses[index % pointClasses.length];
      var delay = (index * starDelayStep).toFixed(2);
      return (
        '<g class="connection-point-wrap" data-index="' + index + '" style="--star-delay: -' + delay + 's;">' +
        '<polygon class="connection-point ' + pointClass + '" points="' + getStarPoints(pos.x, pos.y + starYOffset) + '" style="--star-delay: -' + delay + 's;"></polygon>' +
        '</g>'
      );
    }).join('');

    desktopTrack.innerHTML = projects.map(function (project, index) {
      var isLeft = index % 2 === 0;
      var y = positions[index].y;
      var top = y - 128;
      var offset = 236;
      var cardPos = isLeft ? 'left: ' + offset + 'px;' : 'right: ' + offset + 'px;';
      var imagePos = isLeft ? 'left: -118px;' : 'right: -118px;';
      var lineClasses = ['wide', 'medium', 'medium', 'large', 'xlarge'];
      var lineClass = lineClasses[index] || 'medium';
      var safeTitle = escapeHtml(project.titre || 'Projet');
      var safeLink = escapeHtml(resolveProjectLink(project.lien, rootScriptUrl));
      var dateText = escapeHtml(project.date || 'Date non renseignée');
      var domainText = escapeHtml(getDomainLabel(domain, domain.id));
      var articleDescription = articleDescriptionsByPath[normalizePath(project.lien)] || '';
      var descriptionText = escapeHtml(articleDescription || project.description || project.descriptionCourte || '');
      var delay = (index * starDelayStep).toFixed(2);
      return (
        '<article class="card-section" style="top:' + top + 'px; ' + cardPos + '">' +
        '<h3><a class="project-title-button" href="' + safeLink + '">' + safeTitle + '</a></h3>' +
        '<p class="project-date-small">' + dateText + '</p>' +
        '<p class="project-domain-small">' + domainText + '</p>' +
        '<div class="ornament small"><div class="line ' + lineClass + '"></div><svg class="star" width="16" height="16" viewBox="0 0 24 24" fill="#ffdb70" stroke="#ffdb70" style="--star-delay: -' + delay + 's;"><polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9"></polygon></svg><div class="line ' + lineClass + '"></div></div>' +
        '<p class="card-description">' + descriptionText + '</p>' +
        '</article>' +
        '<div class="card-image-vertical" style="top:' + (top - 60) + 'px; ' + imagePos + '"><div class="placeholder-vertical"></div></div>'
      );
    }).join('');

    mobileTrack.innerHTML = projects.map(function (project, index) {
      var sideClass = index % 2 === 0 ? 'left' : 'right';
      var dotClass = dotClasses[index % dotClasses.length];
      var safeTitle = escapeHtml(project.titre || 'Projet');
      var safeLink = escapeHtml(resolveProjectLink(project.lien, rootScriptUrl));
      var dateText = escapeHtml(project.date || 'Date non renseignée');
      var domainText = escapeHtml(getDomainLabel(domain, domain.id));
      var articleDescription = articleDescriptionsByPath[normalizePath(project.lien)] || '';
      var descriptionText = escapeHtml(articleDescription || project.description || project.descriptionCourte || '');
      var delay = (index * starDelayStep).toFixed(2);

      return (
        '<div class="mobile-item"><div class="mobile-content ' + sideClass + '"><div class="mobile-card"><h3><a class="project-title-button" href="' + safeLink + '">' + safeTitle + '</a></h3><p class="project-date-small">' + dateText + '</p><p class="project-domain-small">' + domainText + '</p><div class="ornament-mobile"><div class="line-mobile"></div><svg class="star-mobile" width="14" height="14" viewBox="0 0 24 24" fill="#ffdb70" style="--star-delay: -' + delay + 's;"><polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9"></polygon></svg><div class="line-mobile"></div></div><p>' + descriptionText + '</p></div></div><div class="mobile-dot ' + dotClass + '" style="--star-delay: -' + delay + 's;"></div><div class="mobile-content ' + (sideClass === 'left' ? 'right' : 'left') + '"></div></div>'
      );
    }).join('');

    initToutZigzagAnimation();
  }

  async function initToutPage() {
    var shell = document.querySelector('.tout-shell[data-domain-id]');
    if (!shell) {
      return;
    }

    try {
      var domainId = shell.getAttribute('data-domain-id');
      var rootScript = getRootFromScript();
      var data = await loadProjectsData();
      var articleDescriptionsByPath = await loadArticleDescriptionsByPath();
      var domain = (data.projects || []).find(function (item) {
        return item.id === domainId;
      });

      if (!domain) {
        console.warn('[tout] Domaine introuvable:', domainId);
        return;
      }

      renderDomainTimeline(domain, rootScript, articleDescriptionsByPath);
    } catch (error) {
      console.warn('[tout] Erreur de chargement:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToutPage);
  } else {
    initToutPage();
  }
})();