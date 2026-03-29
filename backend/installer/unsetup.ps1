# cmdmem — Uninstall (runs at uninstall time)
if (Test-Path $PROFILE) {
    $lines = Get-Content $PROFILE | Where-Object { $_ -notlike "*cmdmem*" }
    $lines | Set-Content $PROFILE
    Write-Host "Hook retiré du profil PowerShell."
}
