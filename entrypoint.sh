#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Executing production entrypoint script...."

# 1. Apply Prisma migrations.
echo "Running Prisma migrations...."
npx prisma migrate deploy --schema ./prisma/schema
echo "Prisma migrations complete."

# 2. Generate Prisma Client (with type-checking turned off).
echo "Generating Prisma Client...."
npx prisma generate --schema ./prisma/schema

# Turn off the type-checking of the Prisma Client to prevent compile issue.
node ./tools/client-fix.js
# Copy prisma engine to dist.
npm run db:prisma-engine-fix

echo "Prisma Client generation complete."

# 3. Conditionally run the seed script.
echo "Running seed script...."

if [ "$RUN_SEED" = "true" ]; then
    echo "Running database seed script...."
    npx prisma db seed
    echo "Database seed complete."
else
    echo "Skipping database seed (RUN_SEED is false)."
fi

# 4. Run the application.
echo "Running application with command: $@"
exec "$@"
