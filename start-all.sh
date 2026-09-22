#!/bin/bash

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
echo "API Server: http://localhost:3000"
echo "Web Server: http://localhost:3001"
echo "Mobile Expo: http://localhost:8081"
echo ""
echo "For mobile app on your phone:"
echo "1. Download Expo Go app from your app store"
echo "2. Scan the QR code displayed in the Expo terminal"
echo "3. Your local IP: 192.168.0.102"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "=========================================="

# Function to kill all processes on exit
cleanup() {
    echo ""
    echo "Stopping all servers..."
    kill $API_PID 2>/dev/null
    kill $WEB_PID 2>/dev/null
    kill $MOBILE_PID 2>/dev/null
    exit
}

# Trap Ctrl+C
trap cleanup INT

# Wait for processes
wait