<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$articlesFile = __DIR__ . '/../articles-data.json';
$projectsFile = __DIR__ . '/../projects-data.json';

try {
    $action = $_POST['action'] ?? '';

    if ($action === 'saveDomain') {
        saveDomain($projectsFile);
    } elseif ($action === 'deleteDomain') {
        deleteDomain($projectsFile);
    } elseif ($action === 'saveArticle') {
        saveArticle($articlesFile, $projectsFile);
    } elseif ($action === 'deleteArticle') {
        deleteArticle($articlesFile, $projectsFile);
    } else {
        throw new Exception('Action non reconnue');
    }
} catch (Exception $exception) {
    http_response_code(400);
    echo json_encode(['error' => $exception->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}

function loadJsonFile($filePath) {
    if (!file_exists($filePath)) {
        throw new Exception('Fichier introuvable: ' . basename($filePath));
    }

    $content = file_get_contents($filePath);
    $data = json_decode($content, true);

    if (!is_array($data)) {
        throw new Exception('JSON invalide: ' . basename($filePath));
    }

    return $data;
}

function saveJsonFile($filePath, $data) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        throw new Exception('Impossible d\'encoder le JSON');
    }

    if (file_put_contents($filePath, $json) === false) {
        throw new Exception('Impossible d\'écrire le fichier: ' . basename($filePath));
    }
}

function normalizeId($text) {
    $text = strtolower(trim((string) $text));
    $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    $text = trim($text, '-');

    return $text ?: 'item-' . time();
}

function textToHtml($text) {
    $text = trim((string) $text);
    if ($text === '') {
        return '';
    }

    $text = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    $paragraphs = preg_split('/\R{2,}/', $text) ?: [];
    $html = '';

    foreach ($paragraphs as $paragraph) {
        $paragraph = trim($paragraph);
        if ($paragraph === '') {
            continue;
        }

        if (preg_match('/^(?:-\s.+(?:\R|$))+$/', $paragraph)) {
            $items = preg_split('/\R+/', $paragraph) ?: [];
            $html .= '<ul>';
            foreach ($items as $item) {
                $item = trim($item);
                if ($item === '') {
                    continue;
                }
                $item = preg_replace('/^-\s*/', '', $item);
                $html .= '<li>' . $item . '</li>';
            }
            $html .= '</ul>';
        } else {
            $html .= '<p>' . nl2br($paragraph) . '</p>';
        }
    }

    return $html;
}

function normalizeExternalUrl($url) {
    $url = trim((string) $url);
    if ($url === '') {
        return '';
    }

    if (!preg_match('/^https?:\/\//i', $url)) {
        $url = 'https://' . $url;
    }

    if (filter_var($url, FILTER_VALIDATE_URL) === false) {
        return '';
    }

    return $url;
}

function buildArticleContentHtml($description, $projectLink, $approach) {
    $descriptionHtml = textToHtml($description);
    $approachHtml = textToHtml($approach);
    $safeLink = normalizeExternalUrl($projectLink);
    $linkHtml = '';

    if ($safeLink !== '') {
        $escapedLink = htmlspecialchars($safeLink, ENT_QUOTES, 'UTF-8');
        $linkHtml =
            '<p class="article-project-link">' .
            '<a href="' . $escapedLink . '" target="_blank" rel="noopener noreferrer">🔗 Voir le projet</a>' .
            '</p>';
    }

    return
        '<h2>Description du projet</h2>' .
        ($descriptionHtml !== '' ? $descriptionHtml : '<p>Description à compléter.</p>') .
        $linkHtml .
        '<h2>Démarche du projet</h2>' .
        ($approachHtml !== '' ? $approachHtml : '<p>Démarche à compléter.</p>');
}

function plainTextExcerpt($text, $limit) {
    $clean = trim(preg_replace('/\s+/', ' ', strip_tags((string) $text)));
    if (mb_strlen($clean) <= $limit) {
        return $clean;
    }

    return rtrim(mb_substr($clean, 0, $limit - 1)) . '…';
}

function findProjectMatchIndex($projectsData, $articleId, $articlePath) {
    foreach ($projectsData['projects'] as $domainIndex => $domain) {
        foreach (($domain['projets'] ?? []) as $projectIndex => $project) {
            if (($project['articleId'] ?? '') === $articleId) {
                return [$domainIndex, $projectIndex];
            }
            if ($articlePath !== '' && ($project['lien'] ?? '') === $articlePath) {
                return [$domainIndex, $projectIndex];
            }
        }
    }

    return [null, null];
}

function ensureGeneratedArticlePage($pagePath, $article, $domainLabel) {
    $fullPath = __DIR__ . '/../' . $pagePath;
    $directory = dirname($fullPath);
    if (!is_dir($directory) && !mkdir($directory, 0777, true) && !is_dir($directory)) {
        throw new Exception('Impossible de créer le dossier de l\'article généré');
    }

    $safeTitle = htmlspecialchars($article['title'] ?? 'Article', ENT_QUOTES, 'UTF-8');
    $safeDomain = htmlspecialchars($domainLabel ?: 'Domaine', ENT_QUOTES, 'UTF-8');
    $safeDate = htmlspecialchars($article['date']['label'] ?? '', ENT_QUOTES, 'UTF-8');
    $safeIso = htmlspecialchars($article['date']['iso'] ?? '', ENT_QUOTES, 'UTF-8');

    $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$safeTitle}</title>
  <link rel="stylesheet" href="../../style.variables.css">
  <link rel="stylesheet" href="../../style.header.css">
  <link rel="stylesheet" href="../../style.navigation.css">
  <link rel="stylesheet" href="../../style.articles.css">
  <script src="../../script.nav.js" defer></script>
  <script src="../../script.projects.js" defer></script>
</head>
<body class="article-page">
  <header class="topbar article-topbar">
    <div class="brand">{$safeDomain}</div>
    <nav class="nav-links article-nav" aria-label="Navigation principale">
      <a href="../../index.html">Accueil</a>
      <a href="../../projets.html">Projets</a>
      <a href="../../admin.html">Admin</a>
    </nav>
  </header>

  <main class="article-container">
    <article class="article-card">
      <header class="article-header">
        <p class="article-tag">{$safeDomain}</p>
        <h1 class="article-title">{$safeTitle}</h1>
        <div class="article-meta">
          <time datetime="{$safeIso}">{$safeDate}</time>
        </div>
      </header>
      <div class="article-content"></div>
      <div class="article-nav-links">
        <a class="article-nav-prev" href="#">Article précédent</a>
        <a class="article-nav-next" href="#">Article suivant</a>
      </div>
    </article>
  </main>
</body>
</html>
HTML;

    file_put_contents($fullPath, $html);
}

function saveDomain($projectsFile) {
    $id = trim((string) ($_POST['id'] ?? ''));
    $domaine = trim((string) ($_POST['domaine'] ?? ''));
    $icon = trim((string) ($_POST['icon'] ?? ''));
    $description = trim((string) ($_POST['description'] ?? ''));
    $skills = trim((string) ($_POST['skills'] ?? ''));

    if ($domaine === '') {
        throw new Exception('Le nom du domaine est requis');
    }

    if ($id === '') {
        $id = normalizeId($domaine);
    }

    $projectsData = loadJsonFile($projectsFile);
    if (!isset($projectsData['projects']) || !is_array($projectsData['projects'])) {
        $projectsData['projects'] = [];
    }

    $domainIndex = null;
    foreach ($projectsData['projects'] as $index => $project) {
        if (($project['id'] ?? '') === $id) {
            $domainIndex = $index;
            break;
        }
    }

    $domain = $domainIndex !== null ? $projectsData['projects'][$domainIndex] : [
        'id' => $id,
        'projets' => []
    ];

    $domain['domaine'] = $domaine;
    $domain['icon'] = $icon !== '' ? $icon : ($domain['icon'] ?? '•');
    $domain['descriptionCourte'] = $description;
    $domain['description'] = textToHtml($skills);
    $domain['projets'] = $domain['projets'] ?? [];

    if ($domainIndex === null) {
        $projectsData['projects'][] = $domain;
    } else {
        $projectsData['projects'][$domainIndex] = $domain;
    }

    saveJsonFile($projectsFile, $projectsData);

    echo json_encode(['success' => true, 'message' => 'Domaine sauvegardé'], JSON_UNESCAPED_UNICODE);
}

function deleteDomain($projectsFile) {
    $id = trim((string) ($_POST['id'] ?? ''));
    if ($id === '') {
        throw new Exception('ID du domaine manquant');
    }

    $projectsData = loadJsonFile($projectsFile);
    $projectsData['projects'] = array_values(array_filter($projectsData['projects'], function ($domain) use ($id) {
        return ($domain['id'] ?? '') !== $id;
    }));

    saveJsonFile($projectsFile, $projectsData);
    echo json_encode(['success' => true, 'message' => 'Domaine supprimé'], JSON_UNESCAPED_UNICODE);
}

function saveArticle($articlesFile, $projectsFile) {
    $originalId = trim((string) ($_POST['originalId'] ?? ''));
    $id = trim((string) ($_POST['id'] ?? ''));
    $title = trim((string) ($_POST['title'] ?? ''));
    $domainId = trim((string) ($_POST['domainId'] ?? ''));
    $domainLabel = trim((string) ($_POST['domainLabel'] ?? ''));
    $tag = trim((string) ($_POST['tag'] ?? ''));
    $dateIso = trim((string) ($_POST['dateIso'] ?? ''));
    $dateLabel = trim((string) ($_POST['dateLabel'] ?? ''));
    $descriptionProject = trim((string) ($_POST['descriptionProject'] ?? ''));
    $projectLink = trim((string) ($_POST['projectLink'] ?? ''));
    $projectApproach = trim((string) ($_POST['projectApproach'] ?? ''));
    $legacyContent = (string) ($_POST['content'] ?? '');
    $path = trim((string) ($_POST['path'] ?? ''));

    if ($title === '') {
        throw new Exception('Le nom du projet est requis');
    }

    if ($id === '') {
        $id = normalizeId($title);
    }

    $articlesData = loadJsonFile($articlesFile);
    $projectsData = loadJsonFile($projectsFile);

    if (!isset($articlesData['articles']) || !is_array($articlesData['articles'])) {
        $articlesData['articles'] = [];
    }
    if (!isset($projectsData['projects']) || !is_array($projectsData['projects'])) {
        $projectsData['projects'] = [];
    }

    $existingArticleIndex = null;
    $existingArticle = null;
    foreach ($articlesData['articles'] as $index => $article) {
        if (($originalId !== '' && ($article['id'] ?? '') === $originalId) || ($article['id'] ?? '') === $id) {
            $existingArticleIndex = $index;
            $existingArticle = $article;
            break;
        }
    }

    $oldPath = $existingArticle['path'] ?? '';
    $path = $path !== '' ? $path : $oldPath;
    if ($path === '') {
        $path = 'generated/articles/' . normalizeId($title) . '.html';
    }

    $resolvedTag = $domainLabel !== '' ? $domainLabel : $tag;
    $contentHtml = buildArticleContentHtml($descriptionProject, $projectLink, $projectApproach);
    if (trim($descriptionProject) === '' && trim($projectApproach) === '' && trim($legacyContent) !== '') {
        $contentHtml = textToHtml($legacyContent);
    }

    $normalizedProjectLink = normalizeExternalUrl($projectLink);

    $articleData = [
        'id' => $id,
        'path' => $path,
        'title' => $title,
        'tag' => $resolvedTag,
        'domainId' => $domainId,
        'date' => [
            'iso' => $dateIso,
            'label' => $dateLabel
        ],
        'nav' => $existingArticle['nav'] ?? ['prev' => '', 'next' => ''],
        'descriptionProject' => $descriptionProject,
        'projectLink' => $normalizedProjectLink,
        'projectApproach' => $projectApproach,
        'contentHtml' => $contentHtml
    ];

    if ($existingArticleIndex === null) {
        $articlesData['articles'][] = $articleData;
    } else {
        $articlesData['articles'][$existingArticleIndex] = array_merge($existingArticle, $articleData);
    }

    if ($domainId !== '') {
        $domainIndex = null;
        foreach ($projectsData['projects'] as $index => $domain) {
            if (($domain['id'] ?? '') === $domainId) {
                $domainIndex = $index;
                break;
            }
        }

        if ($domainIndex !== null) {
            $domain = $projectsData['projects'][$domainIndex];
            if (!isset($domain['projets']) || !is_array($domain['projets'])) {
                $domain['projets'] = [];
            }

            [$oldDomainIndex, $oldProjectIndex] = findProjectMatchIndex($projectsData, $id, $oldPath);
            if ($oldDomainIndex !== null && $oldProjectIndex !== null) {
                array_splice($projectsData['projects'][$oldDomainIndex]['projets'], $oldProjectIndex, 1);
            }

            $projectEntry = [
                'articleId' => $id,
                'titre' => $title,
                'lien' => $path,
                'image' => $existingArticle['image'] ?? '',
                'descriptionCourte' => plainTextExcerpt($descriptionProject !== '' ? $descriptionProject : $legacyContent, 160),
                'description' => plainTextExcerpt(($descriptionProject . "\n\n" . $projectApproach) !== '' ? ($descriptionProject . "\n\n" . $projectApproach) : $legacyContent, 500),
                'date' => $dateLabel !== '' ? $dateLabel : $dateIso
            ];

            $updated = false;
            foreach ($domain['projets'] as $projectIndex => $project) {
                if (($project['articleId'] ?? '') === $id || ($project['lien'] ?? '') === $oldPath) {
                    $domain['projets'][$projectIndex] = array_merge($project, $projectEntry);
                    $updated = true;
                    break;
                }
            }

            if (!$updated) {
                $domain['projets'][] = $projectEntry;
            }

            $projectsData['projects'][$domainIndex] = $domain;
        }
    }

    saveJsonFile($articlesFile, $articlesData);
    saveJsonFile($projectsFile, $projectsData);

    if (!is_file(__DIR__ . '/../' . $path)) {
        ensureGeneratedArticlePage($path, $articleData, $resolvedTag ?: $domainLabel);
    }

    echo json_encode(['success' => true, 'message' => 'Article sauvegardé'], JSON_UNESCAPED_UNICODE);
}

function deleteArticle($articlesFile, $projectsFile) {
    $id = trim((string) ($_POST['id'] ?? ''));
    if ($id === '') {
        throw new Exception('ID de l\'article manquant');
    }

    $articlesData = loadJsonFile($articlesFile);
    $projectsData = loadJsonFile($projectsFile);
    $deletedPath = '';

    foreach ($articlesData['articles'] as $index => $article) {
        if (($article['id'] ?? '') === $id) {
            $deletedPath = $article['path'] ?? '';
            array_splice($articlesData['articles'], $index, 1);
            break;
        }
    }

    foreach ($projectsData['projects'] as $domainIndex => $domain) {
        if (!isset($domain['projets']) || !is_array($domain['projets'])) {
            continue;
        }

        $domain['projets'] = array_values(array_filter($domain['projets'], function ($project) use ($id, $deletedPath) {
            return ($project['articleId'] ?? '') !== $id && ($deletedPath === '' || ($project['lien'] ?? '') !== $deletedPath);
        }));
        $projectsData['projects'][$domainIndex] = $domain;
    }

    if ($deletedPath !== '') {
        $generatedFile = __DIR__ . '/../' . $deletedPath;
        if (strpos($deletedPath, 'generated/articles/') === 0 && is_file($generatedFile)) {
            @unlink($generatedFile);
        }
    }

    saveJsonFile($articlesFile, $articlesData);
    saveJsonFile($projectsFile, $projectsData);

    echo json_encode(['success' => true, 'message' => 'Article supprimé'], JSON_UNESCAPED_UNICODE);
}
