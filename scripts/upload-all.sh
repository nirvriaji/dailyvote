#!/bin/bash
# Upload all images to Firebase Storage using Firebase CLI

echo "🚀 Uploading images to Firebase Storage..."
echo ""

cd "$(dirname "$0")/.."

success=0
failed=0

# Upload logos
echo "📦 Uploading logos..."
for file in static/images/parties/logos/*.webp; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo -n "  Uploading ${filename}... "
    if firebase storage:upload "$file" "gs://exitpollsimulator.firebasestorage.app/images/parties/logos/${filename}" --project exitpollsimulator > /dev/null 2>&1; then
      echo "✓"
      ((success++))
    else
      echo "✗"
      ((failed++))
    fi
  fi
done

# Upload candidates
echo ""
echo "📦 Uploading candidate photos..."
for file in static/images/parties/candidates/*.webp; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo -n "  Uploading ${filename}... "
    if firebase storage:upload "$file" "gs://exitpollsimulator.firebasestorage.app/images/parties/candidates/${filename}" --project exitpollsimulator > /dev/null 2>&1; then
      echo "✓"
      ((success++))
    else
      echo "✗"
      ((failed++))
    fi
  fi
done

echo ""
echo "✅ Upload complete!"
echo "   Success: $success files"
echo "   Failed: $failed files"

if [ $failed -eq 0 ]; then
  echo ""
  echo "🌎 All images now available at:"
  echo "   https://storage.googleapis.com/exitpollsimulator.firebasestorage.app/images/parties/"
fi
