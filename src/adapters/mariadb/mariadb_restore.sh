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
    # Manual mode: validate mariadb path is provided
    if [ -z "$TOOLKIT_MARIADB" ]; then
        echo "ERROR: TOOLKIT_MARIADB path required for manual resolution" >&2
        exit 1
    fi
    MARIADB_CMD="$TOOLKIT_MARIADB"
else
    # Automatic mode: use PATH resolution
    MARIADB_CMD="mariadb"
fi

# Verify binary is available
if ! command -v "$MARIADB_CMD" &> /dev/null; then
    echo "ERROR: mariadb command not found: $MARIADB_CMD" >&2
    exit 1
fi

# Capture tool metadata (version and resolved path)
MARIADB_VERSION=$($MARIADB_CMD --version 2>&1 | head -n 1)
MARIADB_PATH=$(command -v "$MARIADB_CMD")

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

# Check if database exists
# Capture stderr separately to avoid warnings polluting the result
QUERY_STDERR=$(mktemp)
DB_EXISTS=$($MARIADB_CMD $MARIADB_CONN_ARGS -N -e "SELECT 1 FROM information_schema.schemata WHERE schema_name = '${DATABASE}';" 2>"$QUERY_STDERR")
QUERY_EXIT_CODE=$?
if [ $QUERY_EXIT_CODE -ne 0 ]; then
    echo "ERROR: Failed to check if database exists: $(cat "$QUERY_STDERR")" >&2
    rm -f "$QUERY_STDERR"
    exit 1
fi
rm -f "$QUERY_STDERR"

# Verify database exists (we need it to exist for restore)
if [ -z "$(echo $DB_EXISTS | xargs)" ]; then
    echo "ERROR: Database '${DATABASE}' does not exist. Create it first with proper permissions." >&2
    exit 1
fi

# Restore the backup using mariadb
# Capture stderr separately to avoid warnings in output
RESTORE_STDERR=$(mktemp)
$MARIADB_CMD $MARIADB_CONN_ARGS ${DATABASE} < ${RESTORE_FILE} 2>"$RESTORE_STDERR"
RESTORE_EXIT_CODE=$?
if [ $RESTORE_EXIT_CODE -ne 0 ]; then
    echo "ERROR: Failed to restore database from file: $(cat "$RESTORE_STDERR")" >&2
    rm -f "$RESTORE_STDERR"
    exit 1
fi
rm -f "$RESTORE_STDERR"

# Success
echo "{"
echo "  \"status\": \"success\","
echo "  \"database\": \"${DATABASE}\","
echo "  \"runtime\": {"
echo "    \"mariadb\": {"
echo "      \"version\": \"${MARIADB_VERSION}\","
echo "      \"path\": \"${MARIADB_PATH}\""
echo "    }"
echo "  }"
echo "}"
exit 0
