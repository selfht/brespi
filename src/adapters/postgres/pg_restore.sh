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
    echo "{\"status\": \"error\", \"error\": \"Restore file not found: ${RESTORE_FILE}\"}"
    exit 1
fi

# Export for child processes
export PGHOST
export PGUSER
export PGPASSWORD

# Check if database exists
DB_EXISTS=$(psql -h ${PGHOST} -U ${PGUSER} -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = '${DATABASE}';" 2>&1)
if [ $? -ne 0 ]; then
    echo "{\"status\": \"error\", \"error\": \"Failed to check if database exists: ${DB_EXISTS}\"}"
    exit 1
fi

# Drop database if it exists
if [ ! -z "$(echo $DB_EXISTS | xargs)" ]; then
    # Forcefully terminate all connections to the database
    psql -h ${PGHOST} -U ${PGUSER} -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${DATABASE}' AND pid <> pg_backend_pid();" >/dev/null 2>&1

    dropdb -h ${PGHOST} -U ${PGUSER} ${DATABASE} 2>&1
    if [ $? -ne 0 ]; then
        echo "{\"status\": \"error\", \"error\": \"Failed to drop existing database\"}"
        exit 1
    fi
fi

# Create the database
createdb -h ${PGHOST} -U ${PGUSER} ${DATABASE} 2>&1
if [ $? -ne 0 ]; then
    echo "{\"status\": \"error\", \"error\": \"Failed to create database\"}"
    exit 1
fi

# Restore the backup
psql -h ${PGHOST} -U ${PGUSER} -d ${DATABASE} -f ${RESTORE_FILE} >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "{\"status\": \"error\", \"error\": \"Failed to restore database from file\"}"
    exit 1
fi

# Success
echo "{\"status\": \"success\", \"database\": \"${DATABASE}\"}"
exit 0
