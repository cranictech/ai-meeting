#!/bin/bash

# Start development servers for Meeting AI

echo "Starting Meeting AI development servers..."

# Start API server
cd apps/api
npm run dev &
API_PID=$!

# Start Web server
cd ../web
npm run dev &
WEB_PID=$!

echo "API server running on port 3000 (PID: $API_PID)"
echo "Web server running on port 3001 (PID: $WEB_PID)"
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $API_PID $WEB_PID