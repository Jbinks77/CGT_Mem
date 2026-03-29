#!/usr/bin/env python3
"""
Build cmdmem Windows installer (.exe) with NSIS.
Usage: python3 build.py [server_url]
  or : SERVER_URL=http://... python3 build.py
"""
import os
import subprocess
import sys
import textwrap

DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_URL = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("SERVER_URL", "http://46.225.130.235:8000")

HOOK = textwrap.dedent(f"""\
    # cmdmem — Mémoire de commandes intelligente
    # Généré automatiquement — ne pas modifier manuellement

    $Script:CmdMemEndpoint = "{SERVER_URL}/api/commands/ingest"
    $Script:CmdMemLastHistoryId = 0
    $Script:CmdMemLastStart = $null

    Set-PSReadLineKeyHandler -Key Enter -ScriptBlock {{
        $Script:CmdMemLastStart = Get-Date
        [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
    }}

    $Script:CmdMemOriginalPrompt = $function:prompt

    function prompt {{
        $exitCode = $LASTEXITCODE
        $lastCmd = Get-History -Count 1

        if ($lastCmd -and $lastCmd.Id -ne $Script:CmdMemLastHistoryId) {{
            $Script:CmdMemLastHistoryId = $lastCmd.Id
            $command = $lastCmd.CommandLine
            $duration = 0
            if ($Script:CmdMemLastStart) {{
                $duration = [int]((Get-Date) - $Script:CmdMemLastStart).TotalMilliseconds
                $Script:CmdMemLastStart = $null
            }}

            $body = @{{
                command      = $command
                shell        = "powershell"
                hostname     = $env:COMPUTERNAME
                username     = $env:USERNAME
                os           = "Windows"
                cwd          = $PWD.Path
                exit_code    = if ($null -eq $exitCode) {{ 0 }} else {{ $exitCode }}
                duration_ms  = $duration
                command_type = "command"
            }} | ConvertTo-Json -Compress

            try {{
                $wc = New-Object System.Net.WebClient
                $wc.Headers.Add("Content-Type", "application/json")
                $null = $wc.UploadStringAsync([Uri]$Script:CmdMemEndpoint, "POST", $body)
            }} catch {{}}
        }}

        if ($Script:CmdMemOriginalPrompt) {{ & $Script:CmdMemOriginalPrompt }}
        else {{ "PS $($PWD.Path)> " }}
    }}
""")

# Écrire hook.ps1
hook_path = os.path.join(DIR, "hook.ps1")
with open(hook_path, "w", encoding="utf-8") as f:
    f.write(HOOK)
print(f"[1/2] hook.ps1 généré (serveur: {SERVER_URL})")

# Compiler avec NSIS
nsi_path = os.path.join(DIR, "cmdmem.nsi")
result = subprocess.run(
    ["makensis", nsi_path],
    capture_output=True, text=True, cwd=DIR
)

if result.returncode != 0:
    print("Erreur NSIS:")
    print(result.stdout)
    print(result.stderr)
    sys.exit(1)

exe_path = os.path.join(DIR, "cmdmem-installer.exe")
size_kb = os.path.getsize(exe_path) / 1024
print(f"[2/2] cmdmem-installer.exe compilé ({size_kb:.0f} KB)")
print(f"Chemin : {exe_path}")
