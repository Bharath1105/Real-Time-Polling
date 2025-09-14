const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Prisma configuration - automatically chooses between Accelerate and regular client
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const prisma = require('./prisma-config');
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Enhanced logging utility
const logger = {
  info: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, data);
  },
  error: (message, error = null, data = {}) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error ? error.message : '', data);
  },
  warn: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, data);
  },
  success: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] SUCCESS: ${message}`, data);
  },
  auth: (action, user = null, data = {}) => {
    const timestamp = new Date().toISOString();
    const userInfo = user ? `User: ${user.name} (${user.email})` : 'Unknown user';
    console.log(`[${timestamp}] AUTH: ${action} - ${userInfo}`, data);
  },
  poll: (action, pollId = null, data = {}) => {
    const timestamp = new Date().toISOString();
    const pollInfo = pollId ? `Poll ID: ${pollId}` : 'Unknown poll';
    console.log(`[${timestamp}] POLL: ${action} - ${pollInfo}`, data);
  },
  websocket: (action, socketId = null, data = {}) => {
    const timestamp = new Date().toISOString();
    const socketInfo = socketId ? `Socket: ${socketId}` : 'Unknown socket';
    console.log(`[${timestamp}] WEBSOCKET: ${action} - ${socketInfo}`, data);
  },
  api: (method, path, status, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] API: ${method} ${path} - Status: ${status}`, data);
  }
};

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

// API request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log the incoming request
  logger.api(req.method, req.path, 'STARTED', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    logger.api(req.method, req.path, res.statusCode, {
      duration: `${duration}ms`,
      responseSize: JSON.stringify(data).length
    });
    return originalJson.call(this, data);
  };
  
  next();
});

// IP Whitelist Middleware
const ipWhitelist = (req, res, next) => {
  // Skip IP whitelist if disabled for public access
  if (DISABLE_IP_WHITELIST) {
    logger.info('IP whitelist disabled - allowing all connections');
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
  
  logger.info(`Request from IP: ${actualIP}`);
  
  if (ALLOWED_IPS.includes(actualIP)) {
    next();
  } else {
    logger.warn(`Blocked request from IP: ${actualIP}`, { ip: actualIP });
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

    logger.auth('USER_REGISTERED', user, { 
      userId: user.id, 
      email: user.email,
      name: user.name 
    });
    res.status(201).json(user);
  } catch (error) {
    logger.error('Error creating user:', error, { email: req.body.email });
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

    logger.auth('USER_LOGGED_IN', user, { 
      userId: user.id,
      loginTime: loginTime.toISOString(),
      totalActiveUsers: activeUsers.size,
      socketId: null // Will be set when WebSocket connects
    });
    logger.info(`Total active users: ${activeUsers.size}`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Error logging in user:', error, { email: req.body.email });
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
    logger.error('Error fetching users:', error);
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
    logger.error('Error fetching user:', error, { userId: req.params.id });
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

    logger.poll('POLL_CREATED', poll.id, {
      userId: user.id,
      question: poll.question,
      optionsCount: poll.options.length,
      isPublished: poll.isPublished
    });
    res.status(201).json(poll);
  } catch (error) {
    logger.error('Error creating poll:', error, { userId: user.id });
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
    logger.error('Error fetching polls:', error, { published: req.query.published });
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
    logger.error('Error fetching poll:', error, { pollId: req.params.id });
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

    logger.poll('POLL_PUBLISHED', pollId, {
      userId: user.id,
      question: updatedPoll.question,
      totalVotes: updatedPoll.totalVotes
    });
    
    // Emit real-time update to all connected clients
    io.emit('pollPublished', {
      pollId: updatedPoll.id,
      question: updatedPoll.question,
      publishedAt: updatedPoll.updatedAt
    });
    
    res.json(updatedPoll);
  } catch (error) {
    logger.error('Error publishing poll:', error, { pollId, userId: user.id });
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

    logger.poll('VOTE_CAST', pollId, {
      userId: user.id,
      optionId: optionId,
      pollQuestion: poll.question,
      optionText: option.text
    });
    
    // Emit real-time update to all clients in the poll room
    io.to(`poll-${pollId}`).emit('voteCast', {
      pollId: pollId,
      optionId: optionId,
      totalVotes: poll.totalVotes,
      optionVotes: option.votes
    });
    
    res.status(201).json(vote);
  } catch (error) {
    logger.error('Error creating vote:', error, { pollId, userId: user.id, optionId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.websocket('CONNECTED', socket.id, {
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // Join a specific poll room for real-time updates
  socket.on('joinPoll', (pollId) => {
    socket.join(`poll-${pollId}`);
    logger.websocket('JOINED_POLL', socket.id, { pollId });
  });

  // Leave a poll room
  socket.on('leavePoll', (pollId) => {
    socket.leave(`poll-${pollId}`);
    logger.websocket('LEFT_POLL', socket.id, { pollId });
  });

  // Handle user identification when they connect
  socket.on('identifyUser', (userId) => {
    if (activeUsers.has(userId)) {
      const userData = activeUsers.get(userId);
      userData.socketId = socket.id;
      logger.websocket('USER_IDENTIFIED', socket.id, { 
        userId, 
        userName: userData.user.name,
        userEmail: userData.user.email 
      });
    } else {
      logger.warn('Unknown user tried to identify with socket', { userId, socketId: socket.id });
    }
  });

  socket.on('disconnect', (reason) => {
    logger.websocket('DISCONNECTED', socket.id, { 
      reason,
      timestamp: new Date().toISOString()
    });
    
    // Find and remove user from active users if they disconnect
    for (let [userId, userData] of activeUsers.entries()) {
      if (userData.socketId === socket.id) {
        activeUsers.delete(userId);
        logger.auth('USER_DISCONNECTED', userData.user, {
          userId,
          socketId: socket.id,
          sessionDuration: Date.now() - userData.loginTime.getTime(),
          remainingActiveUsers: activeUsers.size
        });
        break;
      }
    }
  });
});

// Stats endpoint for admin dashboard
app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalPolls = await prisma.poll.count();
    const publishedPolls = await prisma.poll.count({ where: { isPublished: true } });
    const totalVotes = await prisma.vote.count();
    
    // Get active users data
    const activeUsersData = Array.from(activeUsers.values()).map(userData => ({
      id: userData.user.id,
      name: userData.user.name,
      email: userData.user.email,
      loginTime: userData.loginTime,
      socketId: userData.socketId
    }));
    
    const stats = {
      totalUsers,
      totalPolls,
      publishedPolls,
      totalVotes,
      activeUsers: activeUsersData,
      activeUserCount: activeUsers.size,
      timestamp: new Date().toISOString()
    };
    
    logger.info('Stats requested', { 
      totalUsers, 
      totalPolls, 
      activeUserCount: activeUsers.size 
    });
    
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  logger.success('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  logger.info('WebSocket server ready for connections');
  logger.info('Server access URLs:', {
    local: `http://localhost:${PORT}`,
    network: `http://[YOUR_IP_ADDRESS]:${PORT}`,
    render: 'https://real-time-polling.onrender.com'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  logger.info('Database disconnected, server shutdown complete');
  process.exit(0);
});

module.exports = { app, server, io };
