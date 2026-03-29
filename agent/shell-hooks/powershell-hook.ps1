# Smart Command Memory - PowerShell Hook
$Script:CmdMemEndpoint = if ($env:CMDMEM_ENDPOINT) { $env:CMDMEM_ENDPOINT } else { "http://46.225.130.235:8000/api/commands/ingest" }
$Script:CmdMemLastHistoryId = 0
$Script:CmdMemLastStart = $null
$Script:CmdMemSeen = @{}

function CmdMem-ShouldSend($command) {
    # Seuls les flags (commençant par - ou /) entrent dans la clé.
    # Les arguments positionnels (chemins, fichiers) sont ignorés.
    # Ex : "cd /var" et "cd /etc" → même clé "cd|" → ignoré
    #      "ls" puis "ls -al"     → clés "ls|" et "ls|-al" → les deux envoyés
    $parts = $command.Trim() -split '\s+'
    if ($parts.Count -eq 0 -or $parts[0] -eq '') { return $false }
    $base = $parts[0].ToLower()
    $flags = if ($parts.Count -gt 1) {
        ($parts[1..($parts.Count - 1)] | Where-Object { $_ -match '^-' } | Sort-Object) -join ' '
    } else { '' }
    $key = "$base|$flags"
    if (-not $Script:CmdMemSeen.ContainsKey($base)) {
        $Script:CmdMemSeen[$base] = [System.Collections.Generic.HashSet[string]]::new()
    }
    if ($Script:CmdMemSeen[$base].Contains($key)) { return $false }
    $null = $Script:CmdMemSeen[$base].Add($key)
    return $true
}

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

        if (CmdMem-ShouldSend $command) {
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

            # Envoi non-bloquant via .NET WebClient (simple et fiable)
            try {
                $wc = New-Object System.Net.WebClient
                $wc.Headers.Add("Content-Type", "application/json")
                $null = $wc.UploadStringAsync([Uri]$Script:CmdMemEndpoint, "POST", $body)
            } catch {}
        }
    }

    if ($Script:CmdMemOriginalPrompt) {
        & $Script:CmdMemOriginalPrompt
    } else {
        "PS $($PWD.Path)> "
    }
}
