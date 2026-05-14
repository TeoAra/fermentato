#!/bin/bash
# Image enrichment pipeline
# Run from: /www/nodeapps/fermenta

export DATABASE_URL="$DATABASE_URL"
export CLOUDINARY_CLOUD_NAME="$CLOUDINARY_CLOUD_NAME"
export CLOUDINARY_API_KEY="$CLOUDINARY_API_KEY"
export CLOUDINARY_API_SECRET="$CLOUDINARY_API_SECRET"

SCRIPT_DIR="/www/nodeapps/fermenta/server"
COUNTRY="${1:-all}"  # e.g. 'Italia', 'United States', 'all'
LIMIT="${2:-500}"    # max breweries per country

echo "=== STEP 1: Discovering brewery website URLs (country=$COUNTRY) ==="
python3 $SCRIPT_DIR/brewery_website_finder.py --country "$COUNTRY" --limit $LIMIT 2>&1

echo ""
echo "=== STEP 2: Crawling brewery websites for beer images (country=$COUNTRY) ==="
python3 $SCRIPT_DIR/brewery_image_crawler.py --country "$COUNTRY" --limit $LIMIT 2>&1
