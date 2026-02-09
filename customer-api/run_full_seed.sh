#!/bin/bash
# Reset database and seed: admin user, languages (en/ar), taxonomies, brands, products (all with EN+AR)
# Run from customer-api directory

set -e
echo "Resetting database and seeding..."
python3 reset_and_seed.py
echo "Done."
