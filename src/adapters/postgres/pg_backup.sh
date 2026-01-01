#!/bin/bash

# Required environment variables - no defaults allowed
if [ -z "$PGHOST" ]; then
    echo "ERROR: PGHOST environment variable is required" >&2
    exit 1
fi

if [ -z "$PGUSER" ]; then
    echo "ERROR: PGUSER environment variable is required" >&2
    exit 1
fi

if [ -z "$PGPASSWORD" ]; then
    echo "ERROR: PGPASSWORD environment variable is required" >&2
    exit 1
fi

if [ -z "$BACKUP_ROOT" ]; then
    echo "ERROR: BACKUP_ROOT environment variable is required" >&2
    exit 1
fi

if [ -z "$SELECTION_MODE" ]; then
    echo "ERROR: SELECTION_MODE environment variable is required" >&2
    exit 1
fi

# Validate SELECTION_MODE
if [ "$SELECTION_MODE" != "all" ] && [ "$SELECTION_MODE" != "include" ] && [ "$SELECTION_MODE" != "exclude" ]; then
    echo "ERROR: SELECTION_MODE must be 'all', 'include', or 'exclude'" >&2
    exit 1
fi

# Validate required variables for each mode
if [ "$SELECTION_MODE" = "include" ] && [ -z "$INCLUDE_DBS" ]; then
    echo "ERROR: INCLUDE_DBS is required when SELECTION_MODE is 'include'" >&2
    exit 1
fi

if [ "$SELECTION_MODE" = "exclude" ] && [ -z "$EXCLUDE_DBS" ]; then
    echo "ERROR: EXCLUDE_DBS is required when SELECTION_MODE is 'exclude'" >&2
    exit 1
fi

# Export for child processes
export PGHOST
export PGUSER
export PGPASSWORD

# Create backups directory if it doesn't exist
mkdir -p "${BACKUP_ROOT}"

# Generate timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

# Always get ALL databases (excluding system databases)
ALL_DBS=$(psql -h ${PGHOST} -U ${PGUSER} -t -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';" 2>&1)

# Check if the query failed (foundational failure)
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to query database list: ${ALL_DBS}" >&2
    exit 1
fi

# Determine which databases to backup based on selection mode
if [ "$SELECTION_MODE" = "all" ]; then
    BACKUP_DBS=$ALL_DBS
elif [ "$SELECTION_MODE" = "include" ]; then
    BACKUP_DBS=$INCLUDE_DBS
elif [ "$SELECTION_MODE" = "exclude" ]; then
    # For exclude mode, backup all except those in EXCLUDE_DBS
    BACKUP_DBS=""
    for db in ${ALL_DBS}; do
        db=$(echo "$db" | xargs)
        SHOULD_EXCLUDE=false
        for exclude_db in ${EXCLUDE_DBS}; do
            exclude_db=$(echo "$exclude_db" | xargs)
            if [ "$db" = "$exclude_db" ]; then
                SHOULD_EXCLUDE=true
                break
            fi
        done
        if [ "$SHOULD_EXCLUDE" = false ]; then
            BACKUP_DBS="$BACKUP_DBS $db"
        fi
    done
fi

# Track successfully backed up databases
SUCCESSFUL_BACKUPS=()

# Process each database
for db in ${ALL_DBS}; do
    # Trim whitespace
    db=$(echo "$db" | xargs)

    # Check if this database should be backed up
    SHOULD_BACKUP=false
    for backup_db in ${BACKUP_DBS}; do
        backup_db=$(echo "$backup_db" | xargs)
        if [ "$db" = "$backup_db" ]; then
            SHOULD_BACKUP=true
            break
        fi
    done

    if [ "$SHOULD_BACKUP" = true ]; then
        # Backup this database in custom format
        BACKUP_FILE="${BACKUP_DIR}/${db}.dump"
        pg_dump -h ${PGHOST} -U ${PGUSER} -Fc ${db} > "${BACKUP_FILE}" 2>&1

        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to backup database '${db}'" >&2
            exit 1
        fi

        # Store successful backup info
        SUCCESSFUL_BACKUPS+=("{\"name\": \"${db}\", \"path\": \"${BACKUP_FILE}\"}")
    fi
done

# Output JSON with only successful backups
echo "{"
echo "  \"databases\": ["

FIRST=true
for backup in "${SUCCESSFUL_BACKUPS[@]}"; do
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo ","
    fi
    echo -n "    ${backup}"
done

# Output JSON array end
echo ""
echo "  ]"
echo "}"
