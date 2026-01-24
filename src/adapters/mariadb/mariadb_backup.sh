#!/bin/bash

# Required environment variables - no defaults allowed
if [ -z "$MARIADB_HOST" ]; then
    echo "ERROR: MARIADB_HOST environment variable is required" >&2
    exit 1
fi

if [ -z "$MARIADB_USER" ]; then
    echo "ERROR: MARIADB_USER environment variable is required" >&2
    exit 1
fi

if [ -z "$MARIADB_PASSWORD" ]; then
    echo "ERROR: MARIADB_PASSWORD environment variable is required" >&2
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
    if [ -z "$TOOLKIT_MARIADB" ] || [ -z "$TOOLKIT_MARIADB_DUMP" ]; then
        echo "ERROR: All tool paths required for manual resolution" >&2
        exit 1
    fi
    MARIADB_CMD="$TOOLKIT_MARIADB"
    MARIADB_DUMP_CMD="$TOOLKIT_MARIADB_DUMP"
else
    # Automatic mode: use PATH resolution
    MARIADB_CMD="mariadb"
    MARIADB_DUMP_CMD="mariadb-dump"
fi

# Verify binaries are available
if ! command -v "$MARIADB_CMD" &> /dev/null; then
    echo "ERROR: mariadb command not found: $MARIADB_CMD" >&2
    exit 1
fi
if ! command -v "$MARIADB_DUMP_CMD" &> /dev/null; then
    echo "ERROR: mariadb-dump command not found: $MARIADB_DUMP_CMD" >&2
    exit 1
fi

# Capture tool metadata (version and resolved path)
MARIADB_VERSION=$($MARIADB_CMD --version 2>&1 | head -n 1)
MARIADB_PATH=$(command -v "$MARIADB_CMD")
MARIADB_DUMP_VERSION=$($MARIADB_DUMP_CMD --version 2>&1 | head -n 1)
MARIADB_DUMP_PATH=$(command -v "$MARIADB_DUMP_CMD")

# Create temporary config file for password (more secure than MYSQL_PWD env var)
MARIADB_CONFIG=$(mktemp)
chmod 600 "$MARIADB_CONFIG"
cat > "$MARIADB_CONFIG" << EOF
[client]
password=${MARIADB_PASSWORD}
EOF

# Ensure config file is cleaned up on exit
cleanup() {
    rm -f "$MARIADB_CONFIG"
}
trap cleanup EXIT

# Build connection arguments
MARIADB_CONN_ARGS="--defaults-extra-file=${MARIADB_CONFIG} -h ${MARIADB_HOST} -u ${MARIADB_USER}"
if [ -n "$MARIADB_PORT" ]; then
    MARIADB_CONN_ARGS="${MARIADB_CONN_ARGS} -P ${MARIADB_PORT}"
fi

# Create backups directory if it doesn't exist
mkdir -p "${BACKUP_ROOT}"

# Generate timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

# Get all databases (excluding system databases)
# Capture stderr separately to avoid warnings polluting the database list
QUERY_STDERR=$(mktemp)
ALL_DBS=$($MARIADB_CMD $MARIADB_CONN_ARGS -N -e "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys');" 2>"$QUERY_STDERR")
QUERY_EXIT_CODE=$?

# Check if the query failed (foundational failure)
if [ $QUERY_EXIT_CODE -ne 0 ]; then
    echo "ERROR: Failed to query database list: $(cat "$QUERY_STDERR")" >&2
    rm -f "$QUERY_STDERR"
    exit 1
fi
rm -f "$QUERY_STDERR"

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
        # Backup this database
        BACKUP_FILE="${BACKUP_DIR}/${db}.sql"
        $MARIADB_DUMP_CMD $MARIADB_CONN_ARGS --single-transaction --routines --triggers ${db} > "${BACKUP_FILE}" 2>&1

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
echo "    \"mariadb\": {"
echo "      \"version\": \"${MARIADB_VERSION}\","
echo "      \"path\": \"${MARIADB_PATH}\""
echo "    },"
echo "    \"mariadb-dump\": {"
echo "      \"version\": \"${MARIADB_DUMP_VERSION}\","
echo "      \"path\": \"${MARIADB_DUMP_PATH}\""
echo "    }"
echo "  }"
echo "}"
