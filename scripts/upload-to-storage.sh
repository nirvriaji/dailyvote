#!/bin/bash
# Upload images to Firebase Storage using Firebase CLI

echo "🚀 Uploading images to Firebase Storage..."
echo ""

BUCKET="gs://exitpollsimulator.firebasestorage.app"

# Create directories in storage
echo "📁 Creating directories..."
firebase storage:mkdir "${BUCKET}/images/parties/logos" --project exitpollsimulator 2>/dev/null || true
firebase storage:mkdir "${BUCKET}/images/parties/candidates" --project exitpollsimulator 2>/dev/null || true

# Upload logos
echo ""
echo "📦 Uploading logos..."
for file in static/images/parties/logos/*.webp; do
  filename=$(basename "$file")
  echo "  Uploading: ${filename}"
  firebase storage:upload "$file" "${BUCKET}/images/parties/logos/${filename}" --project exitpollsimulator -P || echo "    ✗ Failed"
done

# Upload candidates
echo ""
echo "📦 Uploading candidate photos..."
for file in static/images/parties/candidates/*.webp; do
  filename=$(basename "$file")
  echo "  Uploading: ${filename}"
  firebase storage:upload "$file" "${BUCKET}/images/parties/candidates/${filename}" --project exitpollsimulator -P || echo "    ✗ Failed"
done

echo ""
echo "✅ Upload process complete!"
echo "🌎 Images available at:"
echo "   https://storage.googleapis.com/exitpollsimulator.firebasestorage.app/images/parties/"
