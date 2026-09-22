# Meeting AI

An AI-powered meeting notes platform with real-time transcription, summary generation, and action item tracking.

## Features

- **User Authentication**: Email/password and Google OAuth support
- **Meeting Recording**: Audio recording with real-time duration tracking
- **AI Processing**: Automatic transcription and AI-generated summaries
- **Action Items**: Task management with due dates and assignments
- **Multi-platform**: Web (Next.js) and Mobile (Expo/React Native) apps
- **Database**: PostgreSQL with comprehensive schema
- **Queue Processing**: Redis-based job queue for meeting processing

## Tech Stack

### Backend
- Node.js with TypeScript
- Express.js API
- PostgreSQL database
- Redis with BullMQ for job processing
- JWT authentication
- OpenAI for AI features

### Web App
- Next.js 14 with App Router
- React 18
- Tailwind CSS
- Zustand state management
- Axios for API calls

### Mobile App
- Expo 51
- React Native
- Expo Router for navigation
- Expo Audio for recording
- AsyncStorage for token management

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL and Redis)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Start Docker services:
```bash
docker compose up -d
```

4. Configure environment variables:
```bash
cp apps/api/.env.example apps/api/.env
```

5. Build packages:
```bash
npm run build
```

6. Start development servers:
```bash
# Start all servers
./start-all.sh

# Or individually
cd apps/api && npm run dev
cd apps/web && npm run dev
cd apps/mobile && npx expo start --lan
```

### Mobile App Setup

1. Download Expo Go from your app store
2. Start the mobile dev server: `cd apps/mobile && npx expo start --lan`
3. Scan the QR code with Expo Go
4. Update the API URL in `apps/mobile/lib/api.ts` to your local IP

## Environment Variables

### API (.env)
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=meeting_ai
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
```

### Mobile (app.json)
Update the API URL in `apps/mobile/lib/api.ts` to your local network IP.

## Project Structure

```
.
├── apps/
│   ├── api/          # Express API server
│   ├── web/          # Next.js web app
│   └── mobile/       # Expo React Native app
├── packages/
│   └── database/     # Shared database package
├── docker-compose.yml
└── turbo.json
```

## Development

### Database Schema

The database schema is defined in `packages/database/schema.sql`. It includes tables for:
- Users and profiles
- Meetings and recordings
- Transcripts and segments
- Action items
- Organization management

### API Routes

- `/auth` - Authentication endpoints
- `/oauth` - OAuth endpoints
- `/meetings` - Meeting CRUD operations
- `/action-items` - Task management
- `/upload` - File upload handling

### Running Tests

```bash
npm run test
```

### Building for Production

```bash
npm run build
```

## Deployment

### Web App
Deploy to Vercel, Netlify, or any Node.js hosting platform.

### API
Deploy to Railway, Render, or any Node.js hosting with PostgreSQL and Redis.

### Mobile
Build with EAS Build or use Expo Application Services.

## License

MIT