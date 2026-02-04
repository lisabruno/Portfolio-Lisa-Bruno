# Script d'optimisation des images du portfolio
# Rédimensionne et compresse les images trop volumineuses

# Vérifier si ImageMagick est installé
try {
    $magickVersion = magick -version 2>&1 | Select-Object -First 1
    Write-Host "ImageMagick trouvé: $magickVersion" -ForegroundColor Green
} catch {
    Write-Host "ImageMagick n'est pas installé. Installation recommandée pour optimiser les images." -ForegroundColor Yellow
    Write-Host "Téléchargez-le sur: https://imagemagick.org/script/download.php" -ForegroundColor Cyan
    exit
}

# Dossiers à traiter
$imageFolders = @(
    "médias/le reportage photooo",
    "médias/Art et Ecriture",
    "médias/Qui-suis-je",
    "médias/communication"
)

# Paramètres d'optimisation
$maxWidth = 1200
$jpgQuality = 80
$pngQuality = 85

Write-Host "=== Démarrage de l'optimisation des images ===" -ForegroundColor Cyan
Write-Host "Max largeur: ${maxWidth}px, JPG qualité: ${jpgQuality}%, PNG qualité: ${pngQuality}%" -ForegroundColor Gray

$totalSizeBefore = 0
$totalSizeAfter = 0

foreach ($folder in $imageFolders) {
    if (-not (Test-Path $folder)) {
        Write-Host "Dossier non trouvé: $folder" -ForegroundColor Yellow
        continue
    }

    Write-Host "`nTraitement du dossier: $folder" -ForegroundColor Cyan

    # Traiter les JPG
    $jpgFiles = Get-ChildItem -Path $folder -Filter "*.jpg" -Recurse
    
    foreach ($file in $jpgFiles) {
        $sizeBefore = $file.Length
        $totalSizeBefore += $sizeBefore
        
        # Créer un fichier temporaire
        $tempFile = "$($file.FullName).tmp"
        
        # Redimensionner et compresser
        Write-Host "  JPG: $($file.Name) ($(  [math]::Round($sizeBefore/1MB, 2))MB)" -ForegroundColor Gray -NoNewline
        
        magick convert "$($file.FullName)" -resize "${maxWidth}x${maxWidth}>" -quality $jpgQuality -strip "$tempFile" 2>&1 | Out-Null
        
        if (Test-Path $tempFile) {
            $sizeAfter = (Get-Item $tempFile).Length
            $totalSizeAfter += $sizeAfter
            $reduction = [math]::Round((1 - ($sizeAfter / $sizeBefore)) * 100, 1)
            
            # Remplacer l'original
            Remove-Item -Force $file.FullName
            Move-Item -Force $tempFile $file.FullName
            
            Write-Host " → $(  [math]::Round($sizeAfter/1MB, 2))MB (-${reduction}%)" -ForegroundColor Green
        } else {
            Write-Host " → ERREUR" -ForegroundColor Red
        }
    }

    # Traiter les PNG
    $pngFiles = Get-ChildItem -Path $folder -Filter "*.png" -Recurse
    
    foreach ($file in $pngFiles) {
        $sizeBefore = $file.Length
        $totalSizeBefore += $sizeBefore
        
        $tempFile = "$($file.FullName).tmp"
        
        Write-Host "  PNG: $($file.Name) ($(  [math]::Round($sizeBefore/1MB, 2))MB)" -ForegroundColor Gray -NoNewline
        
        magick convert "$($file.FullName)" -resize "${maxWidth}x${maxWidth}>" -quality $pngQuality -strip "$tempFile" 2>&1 | Out-Null
        
        if (Test-Path $tempFile) {
            $sizeAfter = (Get-Item $tempFile).Length
            $totalSizeAfter += $sizeAfter
            $reduction = [math]::Round((1 - ($sizeAfter / $sizeBefore)) * 100, 1)
            
            Remove-Item -Force $file.FullName
            Move-Item -Force $tempFile $file.FullName
            
            Write-Host " → $(  [math]::Round($sizeAfter/1MB, 2))MB (-${reduction}%)" -ForegroundColor Green
        } else {
            Write-Host " → ERREUR" -ForegroundColor Red
        }
    }
}

$totalReduction = if ($totalSizeBefore -gt 0) { [math]::Round((1 - ($totalSizeAfter / $totalSizeBefore)) * 100, 1) } else { 0 }

Write-Host "`n=== Résumé de l'optimisation ===" -ForegroundColor Cyan
Write-Host "Taille avant: $(  [math]::Round($totalSizeBefore/1MB, 2))MB"
Write-Host "Taille après: $(  [math]::Round($totalSizeAfter/1MB, 2))MB"
Write-Host "Réduction totale: -${totalReduction}%" -ForegroundColor Green
Write-Host "`n✅ Optimisation terminée!" -ForegroundColor Green
