#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Building the extension..."
npm run build

ZIP_NAME="mosaic-extension.zip"

echo "Packaging the extension into $ZIP_NAME..."

# Remove old zip if it exists
if [ -f "$ZIP_NAME" ]; then
    rm "$ZIP_NAME"
fi

# Ensure dist exists
if [ ! -d "dist" ]; then
    echo "Error: dist directory does not exist! Build failed?"
    exit 1
fi

# Zip the contents of dist
cd dist
zip -r "../$ZIP_NAME" ./*
cd ..

echo "✅ Successfully created $ZIP_NAME"
echo "You can now send this file to your friends! They just need to unzip it and use 'Load unpacked' on the resulting folder in chrome://extensions."
