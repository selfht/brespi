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

# Export for child processes
export PGHOST
export PGUSER
export PGPASSWORD

# Check if database exists
DB_EXISTS=$(psql -h ${PGHOST} -U ${PGUSER} -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = '${DATABASE}';" 2>&1)
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
pg_restore -h ${PGHOST} -U ${PGUSER} -d ${DATABASE} --clean --if-exists ${RESTORE_FILE} 2>/dev/null
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to restore database from file" >&2
    exit 1
fi

# Success
echo "{\"status\": \"success\", \"database\": \"${DATABASE}\"}"
exit 0
