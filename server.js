const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// User tracking
const activeUsers = new Map(); // userId -> { user, loginTime, socketId }
const userSessions = []; // Array of all user sessions for tracking

// IP Whitelist
const ALLOWED_IPS = [
  '127.0.0.1',        // localhost
  '::1',              // localhost IPv6
  '192.168.0.105',    // local network IP
  '152.57.136.104',   // whitelisted IP
  '157.45.203.75',    // your public IP
  '0.0.0.0'           // allow all IPs for public access
];

// For public access, you can disable IP whitelist by setting this to true
const DISABLE_IP_WHITELIST = true;

// IP Whitelist Middleware
const ipWhitelist = (req, res, next) => {
  // Skip IP whitelist if disabled for public access
  if (DISABLE_IP_WHITELIST) {
    console.log('IP whitelist disabled - allowing all connections');
    return next();
  }
  
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const forwardedIP = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  
  // Get the actual client IP (handle proxy headers)
  let actualIP = clientIP;
  if (forwardedIP) {
    actualIP = forwardedIP.split(',')[0].trim();
  } else if (realIP) {
    actualIP = realIP;
  }
  
  // Remove IPv6 prefix if present
  if (actualIP.startsWith('::ffff:')) {
    actualIP = actualIP.substring(7);
  }
  
  console.log(`Request from IP: ${actualIP}`);
  
  if (ALLOWED_IPS.includes(actualIP)) {
    next();
  } else {
    console.log(`Blocked request from IP: ${actualIP}`);
    res.status(403).json({ 
      error: 'Access denied. Your IP address is not whitelisted.',
      yourIP: actualIP,
      allowedIPs: ALLOWED_IPS
    });
  }
};

// Middleware
app.use(ipWhitelist);
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Serve the test page
app.get('/test', (req, res) => {
  res.sendFile(__dirname + '/test-api.html');
});

// Serve the admin page
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

// User statistics endpoint
app.get('/api/stats', (req, res) => {
  const now = new Date();
  const activeUsersList = Array.from(activeUsers.values()).map(userData => ({
    id: userData.user.id,
    name: userData.user.name,
    email: userData.user.email,
    loginTime: userData.loginTime,
    sessionDuration: Math.floor((now - userData.loginTime) / 1000), // seconds
    socketId: userData.socketId
  }));

  const stats = {
    totalActiveUsers: activeUsers.size,
    activeUsers: activeUsersList,
    totalSessions: userSessions.length,
    serverStartTime: new Date(process.uptime() * 1000 - Date.now()),
    currentTime: now
  };

  res.json(stats);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// User Routes
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Track user login
    const loginTime = new Date();
    const userData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      loginTime: loginTime,
      socketId: null // Will be set when they connect via WebSocket
    };
    
    activeUsers.set(user.id, userData);
    userSessions.push({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      loginTime: loginTime,
      logoutTime: null
    });

    console.log(`User logged in: ${user.name} (${user.email}) at ${loginTime.toLocaleString()}`);
    console.log(`Total active users: ${activeUsers.size}`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (admin endpoint)
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        polls: {
          select: {
            id: true,
            question: true,
            isPublished: true,
            createdAt: true
          }
        },
        votes: {
          select: {
            id: true,
            createdAt: true,
            pollOption: {
              select: {
                text: true,
                poll: {
                  select: {
                    question: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        polls: {
          select: {
            id: true,
            question: true,
            isPublished: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Poll Routes
app.post('/api/polls', authenticateToken, async (req, res) => {
  try {
    const { question, options } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question and at least 2 options are required' });
    }

    const poll = await prisma.poll.create({
      data: {
        question,
        creatorId: req.user.userId,
        options: {
          create: options.map(optionText => ({
            text: optionText
          }))
        }
      },
      include: {
        options: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(poll);
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/polls', async (req, res) => {
  try {
    const { published } = req.query;
    
    const where = {};
    if (published === 'true') {
      where.isPublished = true;
    }

    const polls = await prisma.poll.findMany({
      where,
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: { options: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(polls);
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/polls/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const poll = await prisma.poll.findUnique({
      where: { id },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json(poll);
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/polls/:id/publish', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the poll
    const poll = await prisma.poll.findFirst({
      where: {
        id,
        creatorId: req.user.userId
      }
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found or you do not have permission to publish it' });
    }

    const updatedPoll = await prisma.poll.update({
      where: { id },
      data: { isPublished: true },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(updatedPoll);
  } catch (error) {
    console.error('Error publishing poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vote Routes
app.post('/api/votes', authenticateToken, async (req, res) => {
  try {
    const { pollOptionId } = req.body;

    if (!pollOptionId) {
      return res.status(400).json({ error: 'Poll option ID is required' });
    }

    // Check if poll option exists and get poll info
    const pollOption = await prisma.pollOption.findUnique({
      where: { id: pollOptionId },
      include: {
        poll: true
      }
    });

    if (!pollOption) {
      return res.status(404).json({ error: 'Poll option not found' });
    }

    if (!pollOption.poll.isPublished) {
      return res.status(400).json({ error: 'Cannot vote on unpublished poll' });
    }

    // Check if user already voted on this poll option
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_pollOptionId: {
          userId: req.user.userId,
          pollOptionId
        }
      }
    });

    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted on this option' });
    }

    // Create vote
    const vote = await prisma.vote.create({
      data: {
        userId: req.user.userId,
        pollOptionId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        pollOption: {
          include: {
            poll: {
              select: {
                id: true,
                question: true
              }
            }
          }
        }
      }
    });

    // Get updated poll results for broadcasting
    const pollWithResults = await prisma.poll.findUnique({
      where: { id: pollOption.poll.id },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        }
      }
    });

    // Broadcast updated results to all clients viewing this poll
    io.to(`poll-${pollOption.poll.id}`).emit('pollResults', {
      pollId: pollOption.poll.id,
      results: pollWithResults.options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option._count.votes
      }))
    });

    res.status(201).json(vote);
  } catch (error) {
    console.error('Error creating vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('WebSocket connected:', socket.id);

  // Join a specific poll room for real-time updates
  socket.on('joinPoll', (pollId) => {
    socket.join(`poll-${pollId}`);
    console.log(`User ${socket.id} joined poll ${pollId}`);
  });

  // Leave a poll room
  socket.on('leavePoll', (pollId) => {
    socket.leave(`poll-${pollId}`);
    console.log(`User ${socket.id} left poll ${pollId}`);
  });

  // Handle user identification when they connect
  socket.on('identifyUser', (userId) => {
    if (activeUsers.has(userId)) {
      activeUsers.get(userId).socketId = socket.id;
      console.log(`User ${userId} identified with socket ${socket.id}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected:', socket.id);
    
    // Find and remove user from active users if they disconnect
    for (let [userId, userData] of activeUsers.entries()) {
      if (userData.socketId === socket.id) {
        activeUsers.delete(userId);
        console.log(`User ${userData.user.name} disconnected from WebSocket`);
        console.log(`Remaining active users: ${activeUsers.size}`);
        break;
      }
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`Access from other devices:`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Network: http://[YOUR_IP_ADDRESS]:${PORT}`);
  console.log(`- Find your IP with: ipconfig`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = { app, server, io };
