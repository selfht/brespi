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

if [ -z "$RESTORE_FILE" ]; then
    echo "ERROR: RESTORE_FILE environment variable is required" >&2
    exit 1
fi

if [ -z "$DATABASE" ]; then
    echo "ERROR: DATABASE environment variable is required" >&2
    exit 1
fi

# Validate that restore file exists
if [ ! -f "$RESTORE_FILE" ]; then
    echo "ERROR: Restore file not found: ${RESTORE_FILE}" >&2
    exit 1
fi

# Toolkit resolution (default to automatic if not specified)
TOOLKIT_RESOLUTION="${TOOLKIT_RESOLUTION:-automatic}"

# Define tool commands based on resolution mode
if [ "$TOOLKIT_RESOLUTION" = "manual" ]; then
    # Manual mode: validate all paths are provided
    if [ -z "$TOOLKIT_PSQL" ] || [ -z "$TOOLKIT_PG_RESTORE" ]; then
        echo "ERROR: All tool paths required for manual resolution" >&2
        exit 1
    fi
    PSQL_CMD="$TOOLKIT_PSQL"
    PG_RESTORE_CMD="$TOOLKIT_PG_RESTORE"
else
    # Automatic mode: use PATH resolution
    PSQL_CMD="psql"
    PG_RESTORE_CMD="pg_restore"
fi

# Verify binaries are available
if ! command -v "$PSQL_CMD" &> /dev/null; then
    echo "ERROR: psql command not found: $PSQL_CMD" >&2
    exit 1
fi
if ! command -v "$PG_RESTORE_CMD" &> /dev/null; then
    echo "ERROR: pg_restore command not found: $PG_RESTORE_CMD" >&2
    exit 1
fi

# Capture tool metadata (version and resolved path)
PSQL_VERSION=$($PSQL_CMD --version 2>&1 | head -n 1)
PSQL_PATH=$(command -v "$PSQL_CMD")
PG_RESTORE_VERSION=$($PG_RESTORE_CMD --version 2>&1 | head -n 1)
PG_RESTORE_PATH=$(command -v "$PG_RESTORE_CMD")

# Export for child processes
export PGHOST
export PGUSER
export PGPASSWORD

# Check if database exists
DB_EXISTS=$($PSQL_CMD -h ${PGHOST} -U ${PGUSER} -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = '${DATABASE}';" 2>&1)
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to check if database exists: ${DB_EXISTS}" >&2
    exit 1
fi

# Verify database exists (we need it to exist for restore)
if [ -z "$(echo $DB_EXISTS | xargs)" ]; then
    echo "ERROR: Database '${DATABASE}' does not exist. Create it first with proper permissions." >&2
    exit 1
fi

# Restore the backup using pg_restore with --clean to drop existing objects
$PG_RESTORE_CMD -h ${PGHOST} -U ${PGUSER} -d ${DATABASE} --clean --if-exists ${RESTORE_FILE} 2>/dev/null
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to restore database from file" >&2
    exit 1
fi

# Success
echo "{"
echo "  \"status\": \"success\","
echo "  \"database\": \"${DATABASE}\","
echo "  \"runtime\": {"
echo "    \"psql\": {"
echo "      \"version\": \"${PSQL_VERSION}\","
echo "      \"path\": \"${PSQL_PATH}\""
echo "    },"
echo "    \"pg_restore\": {"
echo "      \"version\": \"${PG_RESTORE_VERSION}\","
echo "      \"path\": \"${PG_RESTORE_PATH}\""
echo "    }"
echo "  }"
echo "}"
exit 0
