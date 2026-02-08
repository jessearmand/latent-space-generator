#!/bin/bash

# Shutdown script for latent-space-generator
# Terminates any processes running on ports 3000 (Vite) and 3001 (proxy server)

PORTS=(3000 3001)
KILLED=0

for PORT in "${PORTS[@]}"; do
    # Find PIDs listening on the port
    PIDS=$(lsof -ti ":$PORT" 2>/dev/null | sort -u)

    if [ -n "$PIDS" ]; then
        for PID in $PIDS; do
            # Get process name for logging
            PNAME=$(ps -p "$PID" -o comm= 2>/dev/null || echo "unknown")
            echo "Killing $PNAME (PID $PID) on port $PORT"
            kill "$PID" 2>/dev/null
            KILLED=$((KILLED + 1))
        done
    fi
done

if [ $KILLED -eq 0 ]; then
    echo "No processes found on ports 3000 or 3001"
else
    echo "Terminated $KILLED process(es)"

    # Wait briefly and check if any processes are still running
    sleep 1
    for PORT in "${PORTS[@]}"; do
        REMAINING=$(lsof -ti ":$PORT" 2>/dev/null)
        if [ -n "$REMAINING" ]; then
            echo "Force killing remaining processes on port $PORT..."
            echo "$REMAINING" | xargs kill -9 2>/dev/null
        fi
    done
fi
