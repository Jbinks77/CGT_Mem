#!/bin/zsh
# Smart Command Memory - Zsh Hook
# Add to your ~/.zshrc:
#   source /path/to/zsh-hook.sh

CMDMEM_ENDPOINT="${CMDMEM_ENDPOINT:-http://localhost:8000/api/commands/ingest}"
CMDMEM_AGENT="${CMDMEM_AGENT:-${0:A:h}/../agent.py}"

__cmdmem_preexec() {
    __cmdmem_start=$(( $(date +%s%N) / 1000000 ))
    __cmdmem_cmd="$1"
}

__cmdmem_precmd() {
    local exit_code=$?

    if [ -n "$__cmdmem_cmd" ]; then
        local end=$(( $(date +%s%N) / 1000000 ))
        local duration=$(( end - ${__cmdmem_start:-$end} ))

        python3 "$CMDMEM_AGENT" "$__cmdmem_cmd" \
            --shell zsh \
            --exit-code "$exit_code" \
            --duration "$duration" \
            --cwd "$PWD" \
            --endpoint "$CMDMEM_ENDPOINT" &>/dev/null &!

        unset __cmdmem_cmd __cmdmem_start
    fi
}

autoload -Uz add-zsh-hook
add-zsh-hook preexec __cmdmem_preexec
add-zsh-hook precmd __cmdmem_precmd
