const io = require('socket.io-client');

// Connect to the WebSocket server
const socket = io('http://localhost:3000');

console.log('Connecting to WebSocket server...');

socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
  
  // Example: Join a poll room (replace with actual poll ID)
  const pollId = 'example-poll-id';
  socket.emit('joinPoll', pollId);
  console.log(`Joined poll room: ${pollId}`);
});

socket.on('pollResults', (data) => {
  console.log('📊 Real-time poll results update:');
  console.log('Poll ID:', data.pollId);
  console.log('Results:', data.results);
  console.log('---');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Keep the client running
process.on('SIGINT', () => {
  console.log('\nClosing WebSocket connection...');
  socket.disconnect();
  process.exit(0);
});
