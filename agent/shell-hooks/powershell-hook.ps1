# Smart Command Memory - PowerShell Hook
$Script:CmdMemEndpoint = if ($env:CMDMEM_ENDPOINT) { $env:CMDMEM_ENDPOINT } else { "http://localhost:8000/api/commands/ingest" }
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

        # Envoi non-bloquant via .NET WebClient (simple et fiable)
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
