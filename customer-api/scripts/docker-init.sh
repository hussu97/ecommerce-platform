#!/bin/sh
# One-time DB seed for Docker. Skips if /data/.seeded exists.
set -e
if [ -f /data/.seeded ]; then
  echo "DB already seeded, skipping."
  exit 0
fi
echo "Seeding database..."
python ensure_admin.py
python reset_and_seed.py
touch /data/.seeded
echo "Seed done."
