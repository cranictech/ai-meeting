#!/bin/bash
# ============================================================
# Meeting AI - Mobile Dev Startup Script
# Fixes IP automatically and starts API + Expo for mobile
# ============================================================

# Get current local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
  echo "❌ Could not detect local IP. Make sure you are connected to WiFi."
  exit 1
fi

echo "✅ Detected local IP: $LOCAL_IP"
echo "📝 Updating mobile app config..."

# Update app.json
sed -i '' "s|\"apiUrl\":.*|\"apiUrl\": \"http://$LOCAL_IP:3000\"|g" apps/mobile/app.json

# Update lib/api.ts fallback
sed -i '' "s|http://[0-9.]*:3000|http://$LOCAL_IP:3000|g" apps/mobile/lib/api.ts

echo "✅ Config updated to http://$LOCAL_IP:3000"
echo ""
echo "🔌 Starting API server (in background)..."
cd apps/api && npm run dev &
API_PID=$!

echo "⏳ Waiting for API to start..."
sleep 4

# Test if API is up
if curl -s "http://localhost:3000/health" | grep -q "ok"; then
  echo "✅ API is running!"
else
  echo "⚠️  API may still be starting up..."
fi

echo ""
echo "📱 Starting Expo (scan the QR code with Expo Go)..."
echo "   Make sure your iPhone is on the SAME WiFi network!"
echo ""
cd ../mobile && npx expo start --lan

# Cleanup on exit
trap "kill $API_PID 2>/dev/null" EXIT
