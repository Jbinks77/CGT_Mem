# cmdmem — Setup (runs at install time)
param([string]$HookFile)

if (-not $HookFile) {
    $HookFile = "$env:APPDATA\cmdmem\hook.ps1"
}

$hookLine = ". `"$HookFile`""

# Créer le dossier du profil si absent
$profileDir = Split-Path -Parent $PROFILE
if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}

# Créer le fichier profil si absent
if (-not (Test-Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force | Out-Null
}

# Ajouter le hook si pas déjà présent
$content = Get-Content $PROFILE -Raw -ErrorAction SilentlyContinue
if (-not $content -or $content -notlike "*cmdmem*") {
    Add-Content -Path $PROFILE -Value "`n# cmdmem — capture automatique des commandes`n$hookLine"
    Write-Host "Hook ajouté au profil : $PROFILE"
} else {
    Write-Host "Hook déjà présent dans le profil."
}
