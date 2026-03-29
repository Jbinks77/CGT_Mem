from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse

router = APIRouter()


def _generate_installer(backend_url: str) -> str:
    hook_content = r"""# Smart Command Memory - Hook
$Script:CmdMemEndpoint = if ($env:CMDMEM_ENDPOINT) { $env:CMDMEM_ENDPOINT } else { "BACKEND_URL_PLACEHOLDER/api/commands/ingest" }
$Script:CmdMemLastHistoryId = 0
$Script:CmdMemLastStart = $null

Set-PSReadLineKeyHandler -Key Enter -ScriptBlock {
    $Script:CmdMemLastStart = Get-Date
    [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
}

$Script:CmdMemOriginalPrompt = $function:prompt

function prompt {
    $exitCode = $LASTEXITCODE
    $lastCmd = Get-History -Count 1

    if ($lastCmd -and $lastCmd.Id -ne $Script:CmdMemLastHistoryId) {
        $Script:CmdMemLastHistoryId = $lastCmd.Id
        $command = $lastCmd.CommandLine
        $duration = 0
        if ($Script:CmdMemLastStart) {
            $duration = [int]((Get-Date) - $Script:CmdMemLastStart).TotalMilliseconds
            $Script:CmdMemLastStart = $null
        }

        $body = @{
            command      = $command
            shell        = "powershell"
            hostname     = $env:COMPUTERNAME
            username     = $env:USERNAME
            os           = "Windows $([System.Environment]::OSVersion.Version.ToString())"
            cwd          = $PWD.Path
            exit_code    = if ($null -eq $exitCode) { 0 } else { $exitCode }
            duration_ms  = $duration
            command_type = "command"
        } | ConvertTo-Json -Compress

        try {
            $wc = New-Object System.Net.WebClient
            $wc.Headers.Add("Content-Type", "application/json")
            $null = $wc.UploadStringAsync([Uri]$Script:CmdMemEndpoint, "POST", $body)
        } catch {}
    }

    if ($Script:CmdMemOriginalPrompt) {
        & $Script:CmdMemOriginalPrompt
    } else {
        "PS $($PWD.Path)> "
    }
}
""".replace("BACKEND_URL_PLACEHOLDER", backend_url)

    installer = r"""#Requires -Version 5.1
<#
.SYNOPSIS
    Installateur Smart Command Memory
.DESCRIPTION
    Installe le hook de capture automatique des commandes PowerShell.
    Toutes vos commandes seront envoyees a cmdmem et ajoutees a votre documentation.
#>

$ErrorActionPreference = "Stop"
$HookDir  = "$env:APPDATA\cmdmem"
$HookFile = "$HookDir\hook.ps1"

Write-Host ""
Write-Host "  cmdmem - Installateur" -ForegroundColor Cyan
Write-Host "  ─────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# 1. Creer le dossier
if (-not (Test-Path $HookDir)) {
    New-Item -ItemType Directory -Path $HookDir -Force | Out-Null
    Write-Host "  [+] Dossier cree : $HookDir" -ForegroundColor Green
}

# 2. Ecrire le hook
$hookContent = @'
HOOK_CONTENT_PLACEHOLDER
'@

Set-Content -Path $HookFile -Value $hookContent -Encoding UTF8
Write-Host "  [+] Hook installe : $HookFile" -ForegroundColor Green

# 3. Ajouter au profil PowerShell (si pas deja present)
$profileDir = Split-Path $PROFILE
if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}
if (-not (Test-Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force | Out-Null
}

$profileContent = Get-Content $PROFILE -Raw -ErrorAction SilentlyContinue
$hookLine = ". `"$HookFile`""

if ($profileContent -notlike "*cmdmem*") {
    Add-Content -Path $PROFILE -Value "`n# Smart Command Memory - capture automatique des commandes`n$hookLine"
    Write-Host "  [+] Profil mis a jour : $PROFILE" -ForegroundColor Green
} else {
    Write-Host "  [=] Profil deja configure" -ForegroundColor Yellow
}

# 4. Tester la connexion au backend
Write-Host ""
Write-Host "  Test de connexion..." -ForegroundColor DarkGray
try {
    $response = Invoke-WebRequest -Uri "BACKEND_URL_PLACEHOLDER/api/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  [+] Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "  [!] Backend inaccessible - verifiez que le serveur tourne" -ForegroundColor Yellow
    Write-Host "      URL : BACKEND_URL_PLACEHOLDER" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  Installation terminee !" -ForegroundColor Cyan
Write-Host "  Relancez PowerShell pour activer la capture automatique." -ForegroundColor White
Write-Host ""
""".replace("BACKEND_URL_PLACEHOLDER", backend_url).replace("HOOK_CONTENT_PLACEHOLDER", hook_content)

    return installer


@router.get("/download/installer.ps1", response_class=PlainTextResponse)
async def download_installer(request: Request):
    # Detect server URL from request
    host = request.headers.get("host", "localhost:8000")
    scheme = "https" if request.url.scheme == "https" else "http"
    backend_url = f"{scheme}://{host}"

    script = _generate_installer(backend_url)

    return PlainTextResponse(
        content=script,
        headers={
            "Content-Disposition": 'attachment; filename="cmdmem-installer.ps1"',
            "Content-Type": "text/plain; charset=utf-8",
        },
    )


@router.get("/download/info")
async def download_info(request: Request):
    host = request.headers.get("host", "localhost:8000")
    scheme = "https" if request.url.scheme == "https" else "http"
    backend_url = f"{scheme}://{host}"
    return {
        "installer_url": f"{backend_url}/api/download/installer.ps1",
        "backend_url": backend_url,
        "supported_shells": ["PowerShell 5.1+", "PowerShell 7+"],
        "install_command": f'irm "{backend_url}/api/download/installer.ps1" | iex',
    }
