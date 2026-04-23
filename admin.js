(function () {
  var API_URL = 'api/save.php';

  var state = {
    articles: [],
    projects: []
  };

  var currentDomainId = '';
  var currentArticleId = '';
  var ui = {};

  function getRootFromScript() {
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i += 1) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('admin.js') !== -1) {
        return new URL(src, window.location.href);
      }
    }
    return new URL('admin.js', window.location.href);
  }

  function getJsonUrl(filename) {
    return new URL(filename, getRootFromScript()).href;
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

  function normalizeId(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function textToPlain(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function htmlToPlainText(html) {
    var value = String(html || '')
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/?p[^>]*>/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<\/?li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");

    return value.trim();
  }

  function formatDateLabel(dateIso) {
    if (!dateIso) {
      return '';
    }
    var date = new Date(dateIso + 'T00:00:00');
    if (isNaN(date.getTime())) {
      return dateIso;
    }
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function setStatus(message, isError) {
    if (!ui.status) return;
    ui.status.textContent = message;
    ui.status.className = isError ? 'admin-status error' : 'admin-status success';
    if (message) {
      window.clearTimeout(setStatus.timerId);
      setStatus.timerId = window.setTimeout(function () {
        ui.status.textContent = '';
        ui.status.className = 'admin-status';
      }, 4000);
    }
  }

  async function fetchJson(filename) {
    var response = await fetch(getJsonUrl(filename), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Impossible de charger ' + filename + ' (HTTP ' + response.status + ')');
    }
    return response.json();
  }

  function normalizeState() {
    state.articles = Array.isArray(state.articles) ? state.articles : [];
    state.projects = Array.isArray(state.projects) ? state.projects : [];

    state.articles.forEach(function (article) {
      if (!article.date || typeof article.date !== 'object') {
        article.date = { iso: '', label: '' };
      }
      if (!article.nav || typeof article.nav !== 'object') {
        article.nav = { prev: '', next: '' };
      }
      if (!article.contentHtml) {
        article.contentHtml = '';
      }
    });

    state.projects.forEach(function (domain) {
      if (!Array.isArray(domain.projets)) {
        domain.projets = [];
      }
    });
  }

  function bindUi() {
    ui.status = document.getElementById('statusMsg');

    ui.domainSelect = document.getElementById('domainSelect');
    ui.addDomainBtn = document.getElementById('addDomainBtn');
    ui.deleteDomainBtn = document.getElementById('deleteDomainBtn');
    ui.cancelDomainBtn = document.getElementById('cancelDomainBtn');
    ui.domainForm = document.getElementById('domainForm');
    ui.domainId = document.getElementById('domainId');
    ui.domainName = document.getElementById('domainName');
    ui.domainIcon = document.getElementById('domainIcon');
    ui.domainDesc = document.getElementById('domainDesc');
    ui.domainSkills = document.getElementById('domainSkills');

    ui.articleSelect = document.getElementById('articleSelect');
    ui.addArticleBtn = document.getElementById('addArticleBtn');
    ui.deleteArticleBtn = document.getElementById('deleteArticleBtn');
    ui.cancelArticleBtn = document.getElementById('cancelArticleBtn');
    ui.articleForm = document.getElementById('articleForm');
    ui.articleId = document.getElementById('articleId');
    ui.articleTitle = document.getElementById('articleTitle');
    ui.articleDate = document.getElementById('articleDate');
    ui.articleDomain = document.getElementById('articleDomain');
    ui.articleDescription = document.getElementById('articleDescription');
    ui.articleProjectLink = document.getElementById('articleProjectLink');
    ui.articleApproach = document.getElementById('articleApproach');

    ui.countDomains = document.getElementById('countDomains');
    ui.countArticles = document.getElementById('countArticles');
    ui.domainsList = document.getElementById('domainesList');
    ui.articlesList = document.getElementById('articlesList');
  }

  function findDomainById(domainId) {
    return state.projects.find(function (domain) {
      return domain.id === domainId;
    }) || null;
  }

  function findArticleById(articleId) {
    return state.articles.find(function (article) {
      return article.id === articleId;
    }) || null;
  }

  function findProjectMatchForArticle(article) {
    var articleId = article && article.id ? article.id : '';
    var articlePath = article && article.path ? article.path : '';

    for (var i = 0; i < state.projects.length; i += 1) {
      var domain = state.projects[i];
      for (var j = 0; j < domain.projets.length; j += 1) {
        var project = domain.projets[j];
        if ((project.articleId || '') === articleId) {
          return { domain: domain, index: j, project: project };
        }
        if (articlePath && (project.lien || '') === articlePath) {
          return { domain: domain, index: j, project: project };
        }
      }
    }

    return null;
  }

  function articleDomainId(article) {
    if (!article) return '';
    if (article.domainId) return article.domainId;

    var match = findProjectMatchForArticle(article);
    if (match) {
      return match.domain.id || '';
    }

    return '';
  }

  function renderDomainSelect(selectedId) {
    ui.domainSelect.innerHTML = '<option value="">-- Sélectionner un domaine --</option>';
    ui.articleDomain.innerHTML = '<option value="">-- Sélectionner --</option>';

    state.projects.forEach(function (domain) {
      var label = (domain.icon ? domain.icon + ' ' : '') + (domain.domaine || 'Domaine');

      var option1 = document.createElement('option');
      option1.value = domain.id;
      option1.textContent = label;
      ui.domainSelect.appendChild(option1);

      var option2 = document.createElement('option');
      option2.value = domain.id;
      option2.textContent = label;
      ui.articleDomain.appendChild(option2);
    });

    if (selectedId) {
      ui.domainSelect.value = selectedId;
    }
  }

  function renderArticleSelect(selectedId) {
    ui.articleSelect.innerHTML = '<option value="">-- Sélectionner un article --</option>';
    state.articles.forEach(function (article) {
      var option = document.createElement('option');
      option.value = article.id;
      option.textContent = article.title || article.id || 'Article';
      ui.articleSelect.appendChild(option);
    });

    if (selectedId) {
      ui.articleSelect.value = selectedId;
    }
  }

  function renderOverview() {
    if (ui.countDomains) {
      ui.countDomains.textContent = state.projects.length + ' domaines';
    }
    if (ui.countArticles) {
      ui.countArticles.textContent = state.articles.length + ' articles';
    }

    if (ui.domainsList) {
      ui.domainsList.innerHTML = '<h4>Domaines enregistrés</h4>';
      state.projects.forEach(function (domain) {
        var line = document.createElement('p');
        line.innerHTML = escapeHtml(domain.icon || '•') + ' <strong>' + escapeHtml(domain.domaine || 'Domaine') + '</strong>';
        ui.domainsList.appendChild(line);
      });
    }

    if (ui.articlesList) {
      ui.articlesList.innerHTML = '<h4>Articles enregistrés</h4>';
      state.articles.forEach(function (article) {
        var domain = findDomainById(articleDomainId(article));
        var line = document.createElement('p');
        line.innerHTML = '<strong>' + escapeHtml(article.title || 'Article') + '</strong>' +
          (domain ? ' - ' + escapeHtml(domain.domaine || '') : '') +
          (article.date && article.date.label ? ' - ' + escapeHtml(article.date.label) : '');
        ui.articlesList.appendChild(line);
      });
    }
  }

  function showDomainForm(domain) {
    currentDomainId = domain && domain.id ? domain.id : '';
    ui.domainForm.style.display = 'grid';
    ui.domainId.value = domain && domain.id ? domain.id : '';
    ui.domainName.value = domain && domain.domaine ? domain.domaine : '';
    ui.domainIcon.value = domain && domain.icon ? domain.icon : '';
    ui.domainDesc.value = domain && domain.descriptionCourte ? domain.descriptionCourte : '';
    ui.domainSkills.value = domain && domain.description ? htmlToPlainText(domain.description) : '';
    ui.deleteDomainBtn.disabled = !domain;
  }

  function showNewDomainForm() {
    currentDomainId = '';
    ui.domainForm.style.display = 'grid';
    ui.domainId.value = '';
    ui.domainName.value = '';
    ui.domainIcon.value = '🎬';
    ui.domainDesc.value = '';
    ui.domainSkills.value = '';
    ui.deleteDomainBtn.disabled = true;
    ui.domainSelect.value = '';
  }

  function showArticleForm(article) {
    var contentParts = splitArticleContent(article ? article.contentHtml || '' : '');
    currentArticleId = article && article.id ? article.id : '';
    ui.articleForm.style.display = 'grid';
    ui.articleId.value = article && article.id ? article.id : '';
    ui.articleTitle.value = article && article.title ? article.title : '';
    ui.articleDate.value = article && article.date && article.date.iso ? article.date.iso : '';
    ui.articleDescription.value = contentParts.description;
    ui.articleProjectLink.value = contentParts.projectLink;
    ui.articleApproach.value = contentParts.approach;
    ui.articleDomain.value = articleDomainId(article);
    ui.deleteArticleBtn.disabled = !article;
  }

  function showNewArticleForm() {
    currentArticleId = '';
    ui.articleForm.style.display = 'grid';
    ui.articleId.value = '';
    ui.articleTitle.value = '';
    ui.articleDate.value = '';
    ui.articleDomain.value = '';
    ui.articleDescription.value = '';
    ui.articleProjectLink.value = '';
    ui.articleApproach.value = '';
    ui.deleteArticleBtn.disabled = true;
    ui.articleSelect.value = '';
  }

  function splitArticleContent(contentHtml) {
    var fallback = {
      description: htmlToPlainText(contentHtml || ''),
      projectLink: '',
      approach: ''
    };

    if (!contentHtml) {
      return fallback;
    }

    var container = document.createElement('div');
    container.innerHTML = String(contentHtml);

    var firstLink = container.querySelector('a[href]');
    if (firstLink) {
      fallback.projectLink = firstLink.getAttribute('href') || '';
    }

    function textFromNodes(nodes) {
      var lines = [];
      nodes.forEach(function (node) {
        var tag = (node.tagName || '').toLowerCase();
        if (tag === 'ul' || tag === 'ol') {
          Array.prototype.forEach.call(node.querySelectorAll('li'), function (li) {
            var text = textToPlain(li.textContent || '');
            if (text) {
              lines.push('- ' + text);
            }
          });
        } else {
          var value = textToPlain(node.textContent || '');
          if (value) {
            lines.push(value);
          }
        }
      });
      return lines.join('\n');
    }

    function sectionByHeading(pattern) {
      var headings = container.querySelectorAll('h2, h3');
      var target = null;
      Array.prototype.forEach.call(headings, function (heading) {
        if (!target && pattern.test((heading.textContent || '').toLowerCase())) {
          target = heading;
        }
      });

      if (!target) return '';

      var nodes = [];
      var cursor = target.nextElementSibling;
      while (cursor) {
        var tag = (cursor.tagName || '').toLowerCase();
        if (tag === 'h2' || tag === 'h3') {
          break;
        }
        if (tag === 'p' || tag === 'ul' || tag === 'ol') {
          nodes.push(cursor);
        }
        cursor = cursor.nextElementSibling;
      }

      return textFromNodes(nodes);
    }

    var description = sectionByHeading(/description|explication|projet/);
    var approach = sectionByHeading(/demarche|démarche|etapes|étapes|processus/);

    if (description) {
      fallback.description = description;
    }
    if (approach) {
      fallback.approach = approach;
    }

    return fallback;
  }

  async function loadData() {
    var articles = await fetchJson('articles-data.json');
    var projects = await fetchJson('projects-data.json');

    state.articles = Array.isArray(articles.articles) ? articles.articles : [];
    state.projects = Array.isArray(projects.projects) ? projects.projects : [];
    normalizeState();

    renderDomainSelect(currentDomainId);
    renderArticleSelect(currentArticleId);
    renderOverview();
  }

  function bindEvents() {
    ui.domainSelect.addEventListener('change', function () {
      var domain = findDomainById(ui.domainSelect.value);
      if (domain) {
        showDomainForm(domain);
      } else {
        ui.domainForm.style.display = 'none';
        currentDomainId = '';
        ui.deleteDomainBtn.disabled = true;
      }
    });

    ui.articleSelect.addEventListener('change', function () {
      var article = findArticleById(ui.articleSelect.value);
      if (article) {
        showArticleForm(article);
      } else {
        ui.articleForm.style.display = 'none';
        currentArticleId = '';
        ui.deleteArticleBtn.disabled = true;
      }
    });

    ui.addDomainBtn.addEventListener('click', function () {
      showNewDomainForm();
    });

    ui.cancelDomainBtn.addEventListener('click', function () {
      ui.domainForm.style.display = 'none';
      currentDomainId = '';
      ui.domainSelect.value = '';
    });

    ui.addArticleBtn.addEventListener('click', function () {
      showNewArticleForm();
    });

    ui.cancelArticleBtn.addEventListener('click', function () {
      ui.articleForm.style.display = 'none';
      currentArticleId = '';
      ui.articleSelect.value = '';
    });

    ui.domainForm.addEventListener('submit', function (event) {
      event.preventDefault();
      saveDomain();
    });

    ui.articleForm.addEventListener('submit', function (event) {
      event.preventDefault();
      saveArticle();
    });

    ui.deleteDomainBtn.addEventListener('click', function () {
      deleteDomain();
    });

    ui.deleteArticleBtn.addEventListener('click', function () {
      deleteArticle();
    });
  }

  function buildDomainPayload() {
    var name = textToPlain(ui.domainName.value);
    var id = textToPlain(ui.domainId.value) || normalizeId(name);

    return {
      id: id,
      domaine: name,
      icon: textToPlain(ui.domainIcon.value) || '•',
      description: textToPlain(ui.domainDesc.value),
      skills: ui.domainSkills.value || ''
    };
  }

  function buildArticlePayload() {
    var title = textToPlain(ui.articleTitle.value);
    var domainId = ui.articleDomain.value || '';
    var domain = findDomainById(domainId);
    var existing = currentArticleId ? findArticleById(currentArticleId) : null;
    var id = textToPlain(ui.articleId.value) || normalizeId(title) || ('article-' + Date.now());
    var dateIso = ui.articleDate.value || '';

    return {
      originalId: currentArticleId,
      id: id,
      title: title,
      domainId: domainId,
      domainLabel: domain ? domain.domaine : '',
      tag: domain ? domain.domaine : '',
      dateIso: dateIso,
      dateLabel: dateIso ? '📅 ' + formatDateLabel(dateIso) : '',
      descriptionProject: ui.articleDescription.value || '',
      projectLink: textToPlain(ui.articleProjectLink.value || ''),
      projectApproach: ui.articleApproach.value || '',
      path: existing && existing.path ? existing.path : ''
    };
  }

  async function postForm(payload) {
    var formData = new FormData();
    Object.keys(payload).forEach(function (key) {
      formData.append(key, payload[key]);
    });

    var response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    var result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Erreur serveur');
    }

    return result;
  }

  async function saveDomain() {
    try {
      await postForm(Object.assign({ action: 'saveDomain' }, buildDomainPayload()));
      setStatus('Domaine sauvegardé.');
      await loadData();
      ui.domainForm.style.display = 'none';
      currentDomainId = '';
    } catch (error) {
      setStatus('Impossible de sauvegarder le domaine: ' + error.message, true);
    }
  }

  async function saveArticle() {
    try {
      var payload = Object.assign({ action: 'saveArticle' }, buildArticlePayload());
      await postForm(payload);
      setStatus('Article sauvegardé.');
      currentArticleId = payload.id;
      await loadData();
      ui.articleForm.style.display = 'none';
      ui.articleSelect.value = payload.id;
    } catch (error) {
      setStatus('Impossible de sauvegarder l\'article: ' + error.message, true);
    }
  }

  async function deleteDomain() {
    if (!currentDomainId) return;
    if (!window.confirm('Supprimer ce domaine et ses projets ?')) return;

    try {
      await postForm({ action: 'deleteDomain', id: currentDomainId });
      setStatus('Domaine supprimé.');
      currentDomainId = '';
      ui.domainForm.style.display = 'none';
      await loadData();
      ui.domainSelect.value = '';
    } catch (error) {
      setStatus('Impossible de supprimer le domaine: ' + error.message, true);
    }
  }

  async function deleteArticle() {
    if (!currentArticleId) return;
    if (!window.confirm('Supprimer cet article ?')) return;

    try {
      await postForm({ action: 'deleteArticle', id: currentArticleId });
      setStatus('Article supprimé.');
      currentArticleId = '';
      ui.articleForm.style.display = 'none';
      await loadData();
      ui.articleSelect.value = '';
    } catch (error) {
      setStatus('Impossible de supprimer l\'article: ' + error.message, true);
    }
  }

  function init() {
    bindUi();
    bindEvents();
    loadData()
      .then(function () {
        setStatus('Admin prêt. Remplis les champs avec du texte simple, puis sauvegarde.');
      })
      .catch(function (error) {
        setStatus('Erreur de chargement: ' + error.message, true);
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
