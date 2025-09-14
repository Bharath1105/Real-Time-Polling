# Real-time Polling Backend

A backend service for a real-time polling application built with Node.js, Express.js, PostgreSQL, Prisma, and WebSockets.

## Features

- **RESTful API** for CRUD operations on Users, Polls, and Votes
- **Real-time updates** via WebSockets using Socket.io
- **Authentication** with JWT tokens
- **Database relationships** properly modeled with Prisma
- **Password hashing** with bcryptjs

## Tech Stack

- **Backend Framework**: Node.js with Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Real-time Communication**: Socket.io
- **Authentication**: JWT
- **Password Hashing**: bcryptjs

## Database Schema

The application uses the following models with proper relationships:

- **User**: id, name, email, passwordHash, createdAt, updatedAt
- **Poll**: id, question, isPublished, createdAt, updatedAt, creatorId
- **PollOption**: id, text, createdAt, pollId
- **Vote**: id, createdAt, userId, pollOptionId

### Relationships

- **One-to-Many**: User → Polls (creator), Poll → PollOptions
- **Many-to-Many**: User ↔ PollOption (through Vote)

## Setup Instructions

### 1. Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd realtime-polling-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Environment Configuration

Edit the `.env` file with your database credentials:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/realtime_polling_db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3000
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Or create and run migrations (for production)
npm run db:migrate
```

### 5. Running the Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### Authentication

- `POST /api/users` - Create a new user
- `POST /api/users/login` - Login user and get JWT token
- `GET /api/users/:id` - Get user details (requires authentication)

### Polls

- `POST /api/polls` - Create a new poll (requires authentication)
- `GET /api/polls` - Get all polls (optionally filter by published status)
- `GET /api/polls/:id` - Get a specific poll with results
- `

PATCH /api/polls/:id/publish` - Publish a poll (requires authentication)

### Votes

- `POST /api/votes` - Submit a vote (requires authentication)

## WebSocket Events

### Client → Server

- `joinPoll` - Join a poll room for real-time updates
- `leavePoll` - Leave a poll room

### Server → Client

- `pollResults` - Broadcast updated poll results when a vote is cast

## Example Usage

### 1. Create a User

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### 3. Create a Poll

```bash
curl -X POST http://localhost:3000/api/polls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "question": "What is your favorite programming language?",
    "options": ["JavaScript", "Python", "Java", "Go"]
  }'
```

### 4. Publish a Poll

```bash
curl -X PATCH http://localhost:3000/api/polls/POLL_ID/publish \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Vote on a Poll

```bash
curl -X POST http://localhost:3000/api/votes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pollOptionId": "POLL_OPTION_ID"
  }'
```

## WebSocket Client Example

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3000');

// Join a poll room
socket.emit('joinPoll', 'POLL_ID');

// Listen for real-time updates
socket.on('pollResults', (data) => {
  console.log('Updated poll results:', data);
});
```

## Development

### Database Management

```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (development only)
npx prisma db push --force-reset
```

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run database migrations
- `npm run db:studio` - Open Prisma Studio

## Security Considerations

- Change the JWT_SECRET in production
- Use HTTPS in production
- Implement rate limiting for API endpoints
- Add input validation and sanitization
- Consider implementing CORS policies for production

## License

ISC
