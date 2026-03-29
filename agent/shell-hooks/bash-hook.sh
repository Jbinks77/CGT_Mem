#!/bin/bash
# Smart Command Memory - Bash Hook
# Add to your ~/.bashrc:
#   source /path/to/bash-hook.sh

CMDMEM_ENDPOINT="${CMDMEM_ENDPOINT:-http://localhost:8000/api/commands/ingest}"
CMDMEM_AGENT="${CMDMEM_AGENT:-$(dirname "${BASH_SOURCE[0]}")/../agent.py}"

__cmdmem_timer_start() {
    __cmdmem_start=${__cmdmem_start:-$(($(date +%s%N)/1000000))}
}

__cmdmem_timer_stop() {
    local end=$(($(date +%s%N)/1000000))
    __cmdmem_duration=$(( end - ${__cmdmem_start:-$end} ))
    unset __cmdmem_start
}

__cmdmem_precmd() {
    local exit_code=$?
    __cmdmem_timer_stop

    local last_cmd
    last_cmd=$(history 1 | sed 's/^[ ]*[0-9]*[ ]*//')

    if [ -n "$last_cmd" ]; then
        python3 "$CMDMEM_AGENT" "$last_cmd" \
            --shell bash \
            --exit-code "$exit_code" \
            --duration "$__cmdmem_duration" \
            --cwd "$PWD" \
            --endpoint "$CMDMEM_ENDPOINT" &>/dev/null &
        disown
    fi
}

trap '__cmdmem_timer_start' DEBUG
PROMPT_COMMAND="__cmdmem_precmd;${PROMPT_COMMAND}"
