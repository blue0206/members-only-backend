#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Executing development entrypoint script...."

# 1. Apply Prisma migrations.
echo "Running Prisma migrations (dev)...."
npx prisma migrate dev --schema ./prisma/schema --name "dev_migration_$(date +%Y%m%d%H%M%S)"
echo "Prisma migrations complete."

# 2. Generate Prisma Client (with type-checking turned off).
echo "Generating Prisma Client (dev)...."
npx prisma generate --schema ./prisma/schema

# Copy prisma engine to dist.
npm run db:prisma-engine-fix

echo "Prisma Client generation complete."

# 3. Conditionally run the seed script.
echo "Running seed script (dev)...."

if [ "$RUN_SEED" = "true" ]; then
    echo "Running database seed script...."
    npx prisma db seed
    echo "Database seed complete."
else
    echo "Skipping database seed (RUN_SEED is false)."
fi

# 5. Execute the main command provided as arguments to this script.
echo "Starting application with command: $@"
exec "$@"
