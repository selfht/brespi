-- Grant the mariadb user full access to all databases
-- This runs first (00-) to ensure permissions are set before other seeds create databases

GRANT ALL PRIVILEGES ON *.* TO 'mariadb'@'%';
FLUSH PRIVILEGES;
