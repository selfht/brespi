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
if [ "$SELECTION_MODE" = "include" ] && [ -z "$DB_INCLUSIONS" ]; then
    echo "ERROR: DB_INCLUSIONS is required when SELECTION_MODE is 'include'" >&2
    exit 1
fi

if [ "$SELECTION_MODE" = "exclude" ] && [ -z "$DB_EXCLUSIONS" ]; then
    echo "ERROR: DB_EXCLUSIONS is required when SELECTION_MODE is 'exclude'" >&2
    exit 1
fi

# Toolkit resolution (default to automatic if not specified)
TOOLKIT_RESOLUTION="${TOOLKIT_RESOLUTION:-automatic}"

# Define tool commands based on resolution mode
if [ "$TOOLKIT_RESOLUTION" = "manual" ]; then
    # Manual mode: validate all paths are provided
    if [ -z "$TOOLKIT_PSQL" ] || [ -z "$TOOLKIT_PG_DUMP" ]; then
        echo "ERROR: All tool paths required for manual resolution" >&2
        exit 1
    fi
    PSQL_CMD="$TOOLKIT_PSQL"
    PG_DUMP_CMD="$TOOLKIT_PG_DUMP"
else
    # Automatic mode: use PATH resolution
    PSQL_CMD="psql"
    PG_DUMP_CMD="pg_dump"
fi

# Verify binaries are available
if ! command -v "$PSQL_CMD" &> /dev/null; then
    echo "ERROR: psql command not found: $PSQL_CMD" >&2
    exit 1
fi
if ! command -v "$PG_DUMP_CMD" &> /dev/null; then
    echo "ERROR: pg_dump command not found: $PG_DUMP_CMD" >&2
    exit 1
fi

# Capture tool metadata (version and resolved path)
PSQL_VERSION=$($PSQL_CMD --version 2>&1 | head -n 1)
PSQL_PATH=$(command -v "$PSQL_CMD")
PG_DUMP_VERSION=$($PG_DUMP_CMD --version 2>&1 | head -n 1)
PG_DUMP_PATH=$(command -v "$PG_DUMP_CMD")

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
ALL_DBS=$($PSQL_CMD -h ${PGHOST} -U ${PGUSER} -d postgres -t -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';" 2>&1)

# Check if the query failed (foundational failure)
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to query database list: ${ALL_DBS}" >&2
    exit 1
fi

# Determine which databases to backup based on selection mode
if [ "$SELECTION_MODE" = "all" ]; then
    BACKUP_DBS=$ALL_DBS
elif [ "$SELECTION_MODE" = "include" ]; then
    BACKUP_DBS=$DB_INCLUSIONS
elif [ "$SELECTION_MODE" = "exclude" ]; then
    # For exclude mode, backup all except those in DB_EXCLUSIONS
    BACKUP_DBS=""
    for db in ${ALL_DBS}; do
        db=$(echo "$db" | xargs)
        SHOULD_EXCLUDE=false
        for exclude_db in ${DB_EXCLUSIONS}; do
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
        $PG_DUMP_CMD -h ${PGHOST} -U ${PGUSER} -Fc ${db} > "${BACKUP_FILE}" 2>&1

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
echo "  ],"
echo "  \"runtime\": {"
echo "    \"psql\": {"
echo "      \"version\": \"${PSQL_VERSION}\","
echo "      \"path\": \"${PSQL_PATH}\""
echo "    },"
echo "    \"pg_dump\": {"
echo "      \"version\": \"${PG_DUMP_VERSION}\","
echo "      \"path\": \"${PG_DUMP_PATH}\""
echo "    }"
echo "  }"
echo "}"
