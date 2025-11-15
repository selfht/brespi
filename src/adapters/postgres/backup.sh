#!/bin/bash

# Postgres connection details from compose.yaml
export PGHOST=postgres
export PGUSER=postgres
export PGPASSWORD=postgres

# Create backups directory if it doesn't exist
mkdir -p /app/backups

# Generate timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/app/backups/${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

echo "Starting backup of individual databases..."
echo "Backup directory: ${BACKUP_DIR}"
echo ""

# Get list of databases (excluding system databases)
DATABASES=$(psql -h ${PGHOST} -U ${PGUSER} -t -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';")

# Backup each database individually
for db in ${DATABASES}; do
    BACKUP_FILE="${BACKUP_DIR}/${db}.sql"
    echo "Backing up database: ${db}"

    pg_dump -h ${PGHOST} -U ${PGUSER} ${db} > "${BACKUP_FILE}"

    if [ $? -eq 0 ]; then
        SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        echo "  ✓ ${db} backed up successfully (${SIZE})"
    else
        echo "  ✗ ${db} backup failed!"
        exit 1
    fi
done

echo ""
echo "All backups completed successfully!"
echo "Total size: $(du -sh "${BACKUP_DIR}" | cut -f1)"
