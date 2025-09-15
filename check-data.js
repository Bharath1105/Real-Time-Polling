const prisma = require('./prisma-config');

async function checkData() {
  try {
    console.log('Checking current database data...');
    
    const userCount = await prisma.user.count();
    const pollCount = await prisma.poll.count();
    const voteCount = await prisma.vote.count();
    
    console.log(`Users: ${userCount}`);
    console.log(`Polls: ${pollCount}`);
    console.log(`Votes: ${voteCount}`);
    
    if (userCount > 0) {
      console.log('\nSample users:');
      const users = await prisma.user.findMany({ take: 3 });
      users.forEach(user => console.log(`- ${user.name} (${user.email})`));
    }
    
    if (pollCount > 0) {
      console.log('\nSample polls:');
      const polls = await prisma.poll.findMany({ take: 3, include: { creator: true } });
      polls.forEach(poll => console.log(`- "${poll.question}" by ${poll.creator.name}`));
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkData();

