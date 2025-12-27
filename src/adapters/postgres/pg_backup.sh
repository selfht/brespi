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

# Output JSON array start
echo "{"
echo "  \"timestamp\": \"${TIMESTAMP}\","
echo "  \"backupDir\": \"${BACKUP_DIR}\","
echo "  \"databases\": ["

FIRST=true

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

    # Add comma separator
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo ","
    fi

    if [ "$SHOULD_BACKUP" = false ]; then
        # Skip this database
        echo -n "    {\"name\": \"${db}\", \"status\": \"skipped\"}"
    else
        # Backup this database in custom format
        BACKUP_FILE="${BACKUP_DIR}/${db}.dump"
        pg_dump -h ${PGHOST} -U ${PGUSER} -Fc ${db} > "${BACKUP_FILE}" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo -n "    {\"name\": \"${db}\", \"status\": \"success\", \"path\": \"${BACKUP_FILE}\"}"
        else
            echo -n "    {\"name\": \"${db}\", \"status\": \"error\", \"error\": \"pg_dump failed\"}"
        fi
    fi
done

# Output JSON array end
echo ""
echo "  ]"
echo "}"

# Always exit with success (0) to allow partial success
# Individual backup failures are reported in the JSON output
exit 0
