// Timeline generation - shared between index.html and projets.html
(function () {
  // lightweight caches to avoid repeated network calls and DOM parsing
  window.__portfolioProjectsCache = window.__portfolioProjectsCache || null;
  window.__articleDescriptionsCache = window.__articleDescriptionsCache || null;
  var __rootTimelineScriptCache = null;

  function getRootFromScript() {
    if (__rootTimelineScriptCache) {
      return __rootTimelineScriptCache;
    }
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('script.timeline.js') !== -1) {
        __rootTimelineScriptCache = new URL(src, window.location.href);
        return __rootTimelineScriptCache;
      }
    }
    __rootTimelineScriptCache = new URL('script.timeline.js', window.location.href);
    return __rootTimelineScriptCache;
  }

  var desktopContainer = document.querySelector('.timeline-desktop');
  var mobileContainer = document.querySelector('.timeline-mobile');
  if (!desktopContainer || !mobileContainer) {
    return;
  }

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

  var pointClasses = [
    'point-blue',
    'point-purple',
    'point-green',
    'point-orange',
    'point-indigo',
    'point-pink',
    'point-cyan',
    'point-yellow'
  ];

  var dotClasses = [
    'dot-blue',
    'dot-purple',
    'dot-green',
    'dot-orange',
    'dot-indigo',
    'dot-pink',
    'dot-cyan',
    'dot-yellow'
  ];

  function normalize(text) {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
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
    escaped = escaped.replace(/&lt;strong&gt;/g, '<strong>');
    escaped = escaped.replace(/&lt;\/strong&gt;/g, '</strong>');
    escaped = escaped.replace(/(^|<br>)(\s*-\s[^<]*)/g, function (_, prefix, line) {
      var cleanPrefix = prefix === '<br>' ? '' : prefix;
      return cleanPrefix + '<span class="desc-bullet-line">' + line.trim() + '</span>';
    });
    return escaped;
  }

  function normalizePath(path) {
    return decodeURIComponent(String(path || ''))
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .toLowerCase();
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

  function extractDateText(card) {
    var dateNode = card.querySelector('.project-meta-item');
    if (!dateNode) {
      return 'Date non renseignée';
    }
    return dateNode.textContent.replace(/^\s*📅\s*/u, '').trim() || 'Date non renseignée';
  }

  function computeSortKey(dateText) {
    var normalized = normalize(dateText);

    if (normalized.includes('en continu')) {
      return { bucket: 4, year: 9999, month: 12 };
    }

    if (normalized.includes('en cours')) {
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

  function resolveLogoImage(hint) {
    var value = normalize(hint);
    if (value.indexOf('communication') !== -1 || value.indexOf('flyer') !== -1 || value.indexOf('instagram') !== -1) {
      return '/Logo et images/Communication.png';
    }
    if (value.indexOf('animation') !== -1 || value.indexOf('rigging') !== -1 || value.indexOf('audiovisuel') !== -1 || value.indexOf('montage') !== -1 || value.indexOf('photographie') !== -1) {
      return '/Logo et images/Création.png';
    }
    if (value.indexOf('web') !== -1 || value.indexOf('design') !== -1 || value.indexOf('madd') !== -1 || value.indexOf('bordeaux') !== -1 || value.indexOf('site internet') !== -1) {
      return '/Logo et images/Divers.png';
    }
    return '/Logo et images/Création.png';
  }

  function normalizeProjects(projects) {
    var normalized = (projects || []).map(function (project, index) {
      var dateText = project.dateText || project.date || 'Date non renseignée';
      return {
        title: project.title || project.domaine || 'Projet',
        description: project.description || '',
        dateText: dateText,
        href: project.href || project.lien || null,
        image: project.image || '',
        sortKey: computeSortKey(dateText),
        index: typeof project.index === 'number' ? project.index : index
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

    return normalized;
  }

  function getProjectsFromCards(cards) {
    return cards.map(function (card, index) {
      var titleNode = card.querySelector('.project-details h3');
      var descriptionNode = card.querySelector('.project-details p');
      var linkNode = card.querySelector('.project-link-button');
      var imageNode = card.querySelector('.project-image img');
      var dateText = extractDateText(card);

      return {
        title: titleNode ? titleNode.textContent.trim() : 'Projet',
        description: descriptionNode ? descriptionNode.textContent.trim() : '',
        dateText: dateText,
        href: linkNode ? linkNode.getAttribute('href') : null,
        image: imageNode ? imageNode.getAttribute('src') : '',
        index: index
      };
    });
  }

  function getCompactTitle(title) {
    var value = String(title || '').trim();
    if (!value) {
      return 'Projet';
    }

    var conciseMap = {
      'Telepatia - animation meme': 'Telepatia',
      'Animation Voiture du Nouvel Âge - motion design': 'Voiture',
      'Motion design : l’endogamie numériquement assistée': 'Endogamie',
      'IDFC - animation meme': 'IDFC',
      'Communication pour @la.fee.du.tri': 'La.fee.du.tri',
      'Instagram Lisauteur - Mon Instagram professionnel': 'Lisauteur',
      'Montage Avenir - Mon rêve cinématographique': 'Montage Avenir',
      'Un dernier message...': 'Un dernier message',
      'Reportage photo de tatouages': 'Tatouages',
      'Photo sur la lecture': 'Lecture',
      'Site fictif du MADD': 'MADD',
      'Site fictif avec base de données : Bordeaux Sagastronomie': 'Bordeaux Gastro',
      'KeyFrame : Premier épisode sur l’animation 2D': 'KeyFrame'
    };

    if (conciseMap[value]) {
      return conciseMap[value];
    }

    if (value.indexOf(' - ') !== -1) {
      return value.split(' - ')[0].trim();
    }

    if (value.indexOf(':') !== -1) {
      return value.split(':')[0].trim();
    }

    return value;
  }

  function getDomainLabel(project) {
    if (project && project.hideDomainLabel) {
      return '';
    }

    var explicit = String(project && project.domain ? project.domain : '').trim();
    if (explicit && normalize(explicit) !== 'domaine') {
      return explicit;
    }

    var hint = normalize((project && project.href) || '') + ' ' + normalize((project && project.title) || '');

    if (hint.indexOf('animation') !== -1 || hint.indexOf('rigging') !== -1 || hint.indexOf('motion') !== -1) {
      return 'Animation / Rigging 2D/Motion Design 2D et 3D';
    }
    if (hint.indexOf('communication') !== -1 || hint.indexOf('flyer') !== -1 || hint.indexOf('instagram') !== -1) {
      return 'Communication digitale';
    }
    if (hint.indexOf('montage') !== -1 || hint.indexOf('audiovisuel') !== -1 || hint.indexOf('message') !== -1) {
      return 'Audiovisuel';
    }
    if (hint.indexOf('design web') !== -1 || hint.indexOf('madd') !== -1 || hint.indexOf('bordeaux') !== -1 || hint.indexOf('site internet') !== -1) {
      return 'Design web';
    }
    if (hint.indexOf('photo') !== -1 || hint.indexOf('photographie') !== -1 || hint.indexOf('tatouage') !== -1 || hint.indexOf('lecture') !== -1) {
      return 'Photographie';
    }

    return 'Projet';
  }

  function formatProjectCount(count) {
    var total = Number(count) || 0;
    return total + ' ' + (total > 1 ? 'projets' : 'projet');
  }

  function flattenProjectsFromData(data, articleDescriptionsByPath) {
    var flattened = [];

    (data.projects || []).forEach(function (domain) {
      var domainLabel = domain.domaine || 'Domaine';

      if (Array.isArray(domain.projets) && domain.projets.length) {
        domain.projets.forEach(function (project, index) {
          var projectPath = project.lien || domain.lien || '';
          var articleDescription = articleDescriptionsByPath[normalizePath(projectPath)] || '';
          flattened.push({
            title: project.titre || domainLabel || 'Projet',
            description: articleDescription || project.description || project.descriptionCourte || domain.descriptionCourte || domain.description || '',
            dateText: project.date || domain.date || 'Date non renseignée',
            href: projectPath || null,
            image: resolveLogoImage(domainLabel || domain.id || project.titre || projectPath || ''),
            index: flattened.length,
            domain: domainLabel,
            projectIndex: index
          });
        });
      } else {
        flattened.push({
          title: domainLabel || 'Projet',
          description: domain.descriptionCourte || domain.description || '',
          dateText: domain.date || 'Domaine principal',
          href: domain.lien || null,
          image: resolveLogoImage(domainLabel || domain.id || domain.lien || ''),
          index: flattened.length,
          domain: domainLabel,
          projectIndex: 0
        });
      }
    });

    return flattened;
  }

  async function loadArticleDescriptionsByPath() {
    try {
      if (window.__articleDescriptionsCache) {
        return window.__articleDescriptionsCache;
      }
      var rootScript = getRootFromScript();
      var jsonUrl = new URL('articles-data.json', rootScript);
      var response = await fetch(jsonUrl.href, { cache: 'default' });
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

      window.__articleDescriptionsCache = map;
      return map;
    } catch (error) {
      return {};
    }
  }

  function getCreationCategoriesFromData(data) {
    var creationDomains = (data.projects || []).filter(function (domain) {
      return domain.parentCategory === 'Création';
    });

    return creationDomains.map(function (domain, index) {
      var shortDescription = String(domain.descriptionCourte || '').trim();
      var detailedDescription = String(domain.description || '').trim();
      var mergedDescription = '';

      if (shortDescription && detailedDescription) {
        mergedDescription = shortDescription + '<br/>' + detailedDescription;
      } else {
        mergedDescription = shortDescription || detailedDescription;
      }

      return {
        title: domain.domaine || 'Domaine',
        description: mergedDescription,
        dateText: formatProjectCount((domain.projets || []).length),
        href: domain.lien || null,
        image: resolveLogoImage(domain.domaine || domain.id || domain.lien || ''),
        hideDomainLabel: true,
        index: index
      };
    });
  }

  function getCategoriesFromData(data) {
    var categories = {};
    var subdomains = {};

    (data.projects || []).forEach(function (domain) {
      var parentCat = domain.parentCategory || 'Autre';
      if (!categories[parentCat]) {
        categories[parentCat] = [];
      }
      categories[parentCat].push(domain);
      if (!subdomains[parentCat]) {
        subdomains[parentCat] = [];
      }
      subdomains[parentCat].push(domain.domaine);
    });

    var result = [];
    var categoryOrder = ['Communication', 'Création'];
    var categoryImages = {
      Communication: 'Logo et images/Communication.png',
      Création: 'Logo et images/Création.png'
    };

    categoryOrder.forEach(function (catName, catIndex) {
      if (categories[catName] && categories[catName].length) {
        var domains = categories[catName];
        var totalProjects = 0;
        var descriptions = [];
        var firstImage = '';
        var firstLink = '';

        domains.forEach(function (domain) {
          totalProjects += (domain.projets || []).length;
          var shortDesc = String(domain.descriptionCourte || '').trim();
          if (shortDesc) {
            descriptions.push('<strong>' + escapeHtml(domain.domaine) + ':</strong> ' + escapeHtmlWithBreaks(shortDesc));
          }
          if (!firstImage && domain.image) {
            firstImage = domain.image;
          }
          if (!firstLink && domain.lien) {
            firstLink = domain.lien;
          }
        });

        // Override link for 'Création' category to point to creation.html
        if (catName === 'Création') {
          firstLink = 'creation.html';
        }

        result.push({
          title: catName,
          description: descriptions.join('<br/><br/>'),
          dateText: formatProjectCount(totalProjects),
          href: firstLink || null,
          image: categoryImages[catName] || resolveLogoImage(catName),
          hideDomainLabel: true,
          index: catIndex,
          subdomains: subdomains[catName]
        });
      }
    });

    return result;
  }

  function getDomainsFromData(data) {
    return (data.projects || []).map(function (domain, index) {
      var shortDescription = String(domain.descriptionCourte || '').trim();
      var detailedDescription = String(domain.description || '').trim();
      var mergedDescription = '';

      if (shortDescription && detailedDescription) {
        mergedDescription = shortDescription + '<br/>' + detailedDescription;
      } else {
        mergedDescription = shortDescription || detailedDescription;
      }

      return {
        title: domain.domaine || 'Domaine',
        description: mergedDescription,
        dateText: formatProjectCount((domain.projets || []).length),
        href: domain.lien || null,
        image: resolveLogoImage(domain.domaine || domain.id || domain.lien || ''),
        hideDomainLabel: true,
        index: index
      };
    });
  }

  function getFallbackIndexProjects() {
    return [
      {
        title: 'Communication',
        description:
          '<strong>Communication digitale - Création de supports:</strong> Création de contenus et supports print/digital pour les réseaux sociaux.<br/>- Visuels Instagram, Facebook, LinkedIn<br/>- Flyers, brochures et affiches<br/>- Campagnes publicitaires et analyse des performances<br/>',
        dateText: '2 projets',
        href: 'Communication digitale - flyer/TOUT communication.html',
        image: 'Logo et images/Communication.png',
        hideDomainLabel: true,
        index: 0
      },
      {
        title: 'Création',
        description:
          '<strong>Animation / Rigging 2D/Motion Design 2D et 3D:</strong> Création de motion design en 2D/3D et d\'animation 2D en image par image, ainsi qu\'en puppeting-rigging.<br/><br/><strong>Audiovisuel - Montage vidéo - Photographie:</strong> Production audiovisuelle complète: montage vidéo, réalisation, photographie et retouches.<br/><br/><strong>Design Web - Création de site internet:</strong> Design, conception et développement de sites web modernes.<br/>',
        dateText: '9 projets',
        href: 'creation.html',
        image: 'Logo et images/Création.png',
        hideDomainLabel: true,
        index: 1
      }
    ];
  }

  function getFallbackCreationProjects() {
    return [
      {
        title: 'Animation / Rigging 2D/Motion Design 2D et 3D',
        description:
          'Création de motion design en 2D/3D et d\'animation 2D en image par image, ainsi qu\'en puppeting-rigging.<br/>- Création de modèles 2D avec Adobe Illustrator<br/>- Animation de personnages/assets en rigging 2D avec Adobe Animate, After Effects, Moho Animation 14 et en image par image avec Krita<br/>- Rigging 2D pour donner vie à des personnages avec fluidité et expressivité<br/>',
        dateText: '5 projets',
        href: '3D - Animation 2D - Rigging 2D/TOUT animation.html',
        image: 'Logo et images/Création.png',
        hideDomainLabel: true,
        index: 0
      },
      {
        title: 'Audiovisuel - Montage vidéo - Photographie',
        description:
          'Production audiovisuelle complète: montage vidéo, réalisation, photographie et retouches.<br/>- Montage Premiere Pro / CapCut<br/>- Montage multicam et post-production After Effects<br/>- Captation photo et retouches Lightroom / Photoshop<br/>',
        dateText: '4 projets',
        href: 'Montage vidéo - réalisation/TOUT Montage vidéo - réalisation.html',
        image: 'Logo et images/Création.png',
        hideDomainLabel: true,
        index: 1
      },
      {
        title: 'Design Web - Création de site internet',
        description:
          'Design, conception et développement de sites web modernes.<br/>- Prototypage Figma<br/>- Développement HTML/CSS/JavaScript, SQL, PHP<br/>- Optimisation performance et SEO<br/>',
        dateText: '2 projets',
        href: 'Design Web - Création de Site internet/TOUT web.html',
        image: 'Logo et images/Divers.png',
        hideDomainLabel: true,
        index: 2
      }
    ];
  }

  async function loadProjectsFromDataFile(flattenProjects, isCreationPage) {
    try {
      var data;
      if (window.__portfolioProjectsCache) {
        data = window.__portfolioProjectsCache;
      } else {
        var rootScript = getRootFromScript();
        var jsonUrl = new URL('projects-data.json', rootScript);
        var response = await fetch(jsonUrl.href, { cache: 'default' });
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        data = await response.json();
        window.__portfolioProjectsCache = data;
      }

      if (!data || !Array.isArray(data.projects) || !data.projects.length) {
        throw new Error('Invalid projects-data.json content');
      }

      if (flattenProjects) {
        var articleDescriptionsByPath = await loadArticleDescriptionsByPath();
        return flattenProjectsFromData(data, articleDescriptionsByPath);
      }

      if (isCreationPage) {
        return getCreationCategoriesFromData(data);
      }

      return getCategoriesFromData(data);
    } catch (error) {
      console.warn('[timeline] Impossible de charger projects-data.json, fallback active:', error);
      return isCreationPage ? getFallbackCreationProjects() : getFallbackIndexProjects();
    }
  }

  function renderTimeline(projects) {
    if (!projects.length) {
      return;
    }

    var svgWidth = 800;
    var edgeInset = 24;
    var startY = 120;
    var stepY = 330;
    var leftX = edgeInset;
    var rightX = svgWidth - edgeInset;
    var cardTopOffset = 125;
    var timelineHeight = startY + (projects.length - 1) * stepY + 240;
    var starDelayStep = 0.22;

    var points = projects.map(function (_, index) {
      return {
        x: index % 2 === 0 ? leftX : rightX,
        y: startY + index * stepY
      };
    });

    var pathParts = ['M ' + points[0].x + ' ' + points[0].y];
    for (var i = 1; i < points.length; i++) {
      var previous = points[i - 1];
      var current = points[i];
      var middleY = previous.y + stepY / 2;

      pathParts.push('L ' + previous.x + ' ' + middleY);
      if (previous.x !== current.x) {
        pathParts.push('L ' + current.x + ' ' + middleY);
      }
      pathParts.push('L ' + current.x + ' ' + current.y);
    }

    var circlesHtml = points
      .map(function (point, index) {
        var pointClass = pointClasses[index % pointClasses.length];
        var delay = (index * starDelayStep).toFixed(2);
        return (
          '<polygon points="' +
          getStarPoints(point.x, point.y) +
          '" class="connection-point ' +
          pointClass +
          '" data-index="' +
          index +
          '" style="--star-delay: -' + delay + 's;"/>'
        );
      })
      .join('');

    var desktopCardsHtml = projects
      .map(function (project, index) {
        var point = points[index];
        var isLeft = point.x === leftX;
        var cardOffset = 236;
        var cardPos = isLeft ? 'left: ' + cardOffset + 'px;' : 'right: ' + cardOffset + 'px;';
        var imageClass = isLeft ? 'card-image-left' : 'card-image-right';
        var imageUrl = String(project.image || '').trim();
        var safeTitle = escapeHtml(getCompactTitle(project.title));
        var safeDescription = escapeHtmlWithBreaks(project.description);
        var safeDate = escapeHtml(project.dateText);
        var safeDomain = escapeHtml(getDomainLabel(project));
        var domainHtml = safeDomain ? '<p class="project-domain-small">' + safeDomain + '</p>' : '';
        var safeHref = project.href ? escapeHtml(project.href) : '';
        var titleHtml = safeHref
          ? '<a class="project-title-button project-title-button-compact" href="' + safeHref + '">' + safeTitle + '</a>'
          : safeTitle;
        return (
          '<div class="card-section" style="top: ' +
          (point.y - cardTopOffset) +
          'px; ' +
          cardPos +
          '">' +
          '<h3>' +
          titleHtml +
          '</h3>' +
          '<p class="project-date-small">' +
          safeDate +
          '</p>' +
          domainHtml +
          '<p class="card-description">' +
          safeDescription +
          '</p>' +
          '</div>' +
            '<div class="card-image-vertical ' + imageClass + '" style="top: ' +
            (point.y - cardTopOffset) +
            'px;' +
            (imageUrl ? ' background-image: url(\'' + imageUrl + '\'); background-size: contain; background-position: center; background-repeat: no-repeat;' : '') +
            '"></div>'
        );
      })
      .join('');

    desktopContainer.style.minHeight = timelineHeight + 'px';
    desktopContainer.innerHTML =
      '<svg class="zigzag-svg" viewBox="0 0 ' +
      svgWidth +
      ' ' +
      timelineHeight +
      '" preserveAspectRatio="xMidYMid meet">' +
      '<defs>' +
      '<filter id="glow">' +
      '<feGaussianBlur stdDeviation="6" result="coloredBlur"/>' +
      '<feMerge>' +
      '<feMergeNode in="coloredBlur"/>' +
      '<feMergeNode in="SourceGraphic"/>' +
      '</feMerge>' +
      '</filter>' +
      '</defs>' +
      '<path id="zigzag-path" d="' +
      pathParts.join(' ') +
      '" stroke="#72a9ff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" opacity="0.9" class="animated-path"/>' +
      circlesHtml +
      '</svg>' +
      desktopCardsHtml;

    var mobileItemsHtml = projects
      .map(function (project, index) {
        var dotClass = dotClasses[index % dotClasses.length];
        var safeTitle = escapeHtml(getCompactTitle(project.title));
        var safeDescription = escapeHtmlWithBreaks(project.description);
        var safeDate = escapeHtml(project.dateText);
        var safeDomain = escapeHtml(getDomainLabel(project));
        var domainHtml = safeDomain ? '<p class="project-domain-small">' + safeDomain + '</p>' : '';
        var safeHref = project.href ? escapeHtml(project.href) : '';
        var mobileTitleHtml = safeHref
          ? '<a class="project-title-button project-title-button-compact" href="' + safeHref + '">' + safeTitle + '</a>'
          : safeTitle;
        var delay = (index * starDelayStep).toFixed(2);
        var imageStyle = project.image
          ?
            ' style="background-image: url(\'' +
            escapeHtml(project.image) +
            '\'); background-size: contain; background-position: center;"'
          : '';

        var cardHtml =
          '<div class="mobile-card">' +
          '<h3>' +
          mobileTitleHtml +
          '</h3>' +
          '<p class="project-date-small">' +
          safeDate +
          '</p>' +
          domainHtml +
          '<div class="ornament-mobile">' +
          '<div class="line-mobile"></div>' +
          '<svg class="star-mobile" width="14" height="14" viewBox="0 0 24 24" fill="#ffdb70" stroke="#ffdb70" style="--star-delay: -' + delay + 's;">' +
          '<polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9" />' +
          '</svg>' +
          '<div class="line-mobile"></div>' +
          '</div>' +
          '<p>' +
          safeDescription +
          '</p>' +
          '</div>';

        if (index % 2 === 0) {
          return (
            '<div class="mobile-item">' +
            '<div class="mobile-content left">' +
            cardHtml +
            '</div>' +
            '<div class="mobile-dot ' +
            dotClass +
            '" style="--star-delay: -' + delay + 's;"></div>' +
            '<div class="mobile-content right"><div class="mobile-image"' +
            imageStyle +
            '></div></div>' +
            '</div>'
          );
        }

        return (
          '<div class="mobile-item">' +
          '<div class="mobile-content left"><div class="mobile-image"' +
          imageStyle +
          '></div></div>' +
          '<div class="mobile-dot ' +
          dotClass +
          '" style="--star-delay: -' + delay + 's;"></div>' +
          '<div class="mobile-content right">' +
          cardHtml +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    mobileContainer.innerHTML = '<div class="vertical-line"></div>' + mobileItemsHtml;
    document.dispatchEvent(new CustomEvent('timeline:rendered'));
  }

  async function initTimeline() {
    var isProjectsPage = document.body.classList.contains('projets-page');
    var isCreationPage = document.body.classList.contains('creation-page');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.projects-list .project-item'));
    var projects;

    if (isProjectsPage) {
      projects = normalizeProjects(await loadProjectsFromDataFile(true, false));
    } else if (isCreationPage) {
      projects = normalizeProjects(await loadProjectsFromDataFile(false, true));
    } else if (cards.length > 0) {
      projects = normalizeProjects(getProjectsFromCards(cards));
    } else {
      projects = normalizeProjects(await loadProjectsFromDataFile(false, false));
    }

    renderTimeline(projects);
  }

  initTimeline();
})();
