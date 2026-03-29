Unicode True
!include "MUI2.nsh"

; ── Général ─────────────────────────────────────────────────
Name "cmdmem — Mémoire de commandes"
OutFile "cmdmem-installer.exe"
InstallDir "$APPDATA\cmdmem"
RequestExecutionLevel user
ShowInstDetails show

; ── Pages MUI ───────────────────────────────────────────────
!define MUI_WELCOMEPAGE_TITLE "cmdmem"
!define MUI_WELCOMEPAGE_TEXT "Cet assistant installe le hook PowerShell cmdmem.$\r$\n$\r$\nUne fois installé, chaque commande que vous tapez dans PowerShell sera automatiquement sauvegardée dans votre mémoire de commandes.$\r$\n$\r$\nAucune donnée sensible (mots de passe, tokens) n'est jamais envoyée."

!define MUI_FINISHPAGE_TITLE "Installation réussie !"
!define MUI_FINISHPAGE_TEXT "cmdmem est installé.$\r$\n$\r$\nOuvrez un nouveau PowerShell pour commencer la capture automatique de vos commandes."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "French"

; ── Installation ────────────────────────────────────────────
Section "Main"
  SetOutPath "$INSTDIR"

  ; Extraire les fichiers
  File "hook.ps1"
  File "setup.ps1"
  File "unsetup.ps1"

  ; Configurer le profil PowerShell
  DetailPrint "Configuration du profil PowerShell..."
  nsExec::ExecToLog 'powershell.exe -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\setup.ps1" "$INSTDIR\hook.ps1"'
  Pop $0

  ; Écrire les infos de désinstallation
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\cmdmem" "DisplayName" "cmdmem — Mémoire de commandes"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\cmdmem" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\cmdmem" "Publisher" "cmdmem"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\cmdmem" "NoModify" "1"
  WriteUninstaller "$INSTDIR\uninstall.exe"

  DetailPrint "Installation terminée !"
SectionEnd

; ── Désinstallation ─────────────────────────────────────────
Section "Uninstall"
  nsExec::ExecToLog 'powershell.exe -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\unsetup.ps1"'

  Delete "$INSTDIR\hook.ps1"
  Delete "$INSTDIR\setup.ps1"
  Delete "$INSTDIR\unsetup.ps1"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\cmdmem"
SectionEnd
