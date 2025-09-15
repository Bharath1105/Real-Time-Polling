const prisma = require('./prisma-config');
const fs = require('fs');

async function exportData() {
  try {
    console.log('Exporting data from SQLite database...');
    
    // Export users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);
    
    // Export polls with options
    const polls = await prisma.poll.findMany({
      include: {
        options: true,
        creator: true
      }
    });
    console.log(`Found ${polls.length} polls`);
    
    // Export votes
    const votes = await prisma.vote.findMany({
      include: {
        user: true,
        pollOption: {
          include: {
            poll: true
          }
        }
      }
    });
    console.log(`Found ${votes.length} votes`);
    
    // Create SQL export
    let sql = `-- Data export from SQLite to PostgreSQL
-- Generated on ${new Date().toISOString()}

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Insert users
`;
    
    for (const user of users) {
      sql += `INSERT INTO users (id, name, email, "passwordHash", "createdAt", "updatedAt") VALUES ('${user.id}', '${user.name.replace(/'/g, "''")}', '${user.email}', '${user.passwordHash}', '${user.createdAt.toISOString()}', '${user.updatedAt.toISOString()}');\n`;
    }
    
    sql += `\n-- Insert polls\n`;
    for (const poll of polls) {
      sql += `INSERT INTO polls (id, question, "isPublished", "createdAt", "updatedAt", "creatorId") VALUES ('${poll.id}', '${poll.question.replace(/'/g, "''")}', ${poll.isPublished}, '${poll.createdAt.toISOString()}', '${poll.updatedAt.toISOString()}', '${poll.creatorId}');\n`;
    }
    
    sql += `\n-- Insert poll options\n`;
    for (const poll of polls) {
      for (const option of poll.options) {
        sql += `INSERT INTO poll_options (id, text, "createdAt", "pollId") VALUES ('${option.id}', '${option.text.replace(/'/g, "''")}', '${option.createdAt.toISOString()}', '${option.pollId}');\n`;
      }
    }
    
    sql += `\n-- Insert votes\n`;
    for (const vote of votes) {
      sql += `INSERT INTO votes (id, "createdAt", "userId", "pollOptionId") VALUES ('${vote.id}', '${vote.createdAt.toISOString()}', '${vote.userId}', '${vote.pollOptionId}');\n`;
    }
    
    sql += `\n-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;
`;
    
    // Write to file
    fs.writeFileSync('data_export.sql', sql);
    console.log('✅ Data exported to data_export.sql');
    console.log(`Exported: ${users.length} users, ${polls.length} polls, ${votes.length} votes`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error exporting data:', error);
    process.exit(1);
  }
}

exportData();



