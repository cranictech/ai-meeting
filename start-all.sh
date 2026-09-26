#!/bin/bash

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP="localhost"
fi

echo "Starting Meeting AI development servers..."

# Start API server
echo "Starting API server on port 3000..."
cd apps/api
npm run dev &
API_PID=$!
cd ../..

# Start Web server
echo "Starting Web server on port 3001..."
cd apps/web
npm run dev &
WEB_PID=$!
cd ../..

# Start Mobile Expo
echo "Starting Expo development server..."
cd apps/mobile
npx expo start --lan &
MOBILE_PID=$!
cd ../..

echo ""
echo "=========================================="
echo "Servers started successfully!"
echo "=========================================="
echo "API Server: http://$LOCAL_IP:3000"
echo "Web Server: http://localhost:3001"
echo "Mobile Expo: http://localhost:8081"
echo ""
echo "For mobile app on iPhone and Android:"
echo "1. Download Expo Go app from the App Store or Google Play"
echo "2. Connect your phone to the same Wi-Fi network as this computer"
echo "3. Scan the QR code displayed in the Expo terminal or open exp://$LOCAL_IP:8081"
echo "=========================================="

cleanup() {
    echo ""
    echo "Stopping all servers..."
    kill $API_PID 2>/dev/null
    kill $WEB_PID 2>/dev/null
    kill $MOBILE_PID 2>/dev/null
    exit
}

trap cleanup INT
wait