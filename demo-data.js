const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoData() {
  try {
    console.log('Creating demo data...');

    // Create demo users
    const user1 = await prisma.user.upsert({
      where: { email: 'john@example.com' },
      update: {},
      create: {
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: await bcrypt.hash('password123', 10)
      }
    });

    const user2 = await prisma.user.upsert({
      where: { email: 'jane@example.com' },
      update: {},
      create: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        passwordHash: await bcrypt.hash('password123', 10)
      }
    });

    console.log('✅ Demo users created');

    // Create demo polls
    const poll1 = await prisma.poll.upsert({
      where: { id: 'demo-poll-1' },
      update: {},
      create: {
        id: 'demo-poll-1',
        question: 'What is your favorite programming language?',
        isPublished: true,
        creatorId: user1.id,
        options: {
          create: [
            { text: 'JavaScript' },
            { text: 'Python' },
            { text: 'Java' },
            { text: 'Go' }
          ]
        }
      }
    });

    const poll2 = await prisma.poll.upsert({
      where: { id: 'demo-poll-2' },
      update: {},
      create: {
        id: 'demo-poll-2',
        question: 'Which framework do you prefer for web development?',
        isPublished: true,
        creatorId: user2.id,
        options: {
          create: [
            { text: 'React' },
            { text: 'Vue.js' },
            { text: 'Angular' },
            { text: 'Svelte' }
          ]
        }
      }
    });

    const poll3 = await prisma.poll.upsert({
      where: { id: 'demo-poll-3' },
      update: {},
      create: {
        id: 'demo-poll-3',
        question: 'What is your preferred database?',
        isPublished: false,
        creatorId: user1.id,
        options: {
          create: [
            { text: 'PostgreSQL' },
            { text: 'MySQL' },
            { text: 'MongoDB' },
            { text: 'Redis' }
          ]
        }
      }
    });

    console.log('✅ Demo polls created');

    // Create some demo votes
    const poll1Options = await prisma.pollOption.findMany({
      where: { pollId: poll1.id }
    });

    const poll2Options = await prisma.pollOption.findMany({
      where: { pollId: poll2.id }
    });

    // Add some votes to poll1
    await prisma.vote.upsert({
      where: { 
        userId_pollOptionId: {
          userId: user1.id,
          pollOptionId: poll1Options[0].id // JavaScript
        }
      },
      update: {},
      create: {
        userId: user1.id,
        pollOptionId: poll1Options[0].id
      }
    });

    await prisma.vote.upsert({
      where: { 
        userId_pollOptionId: {
          userId: user2.id,
          pollOptionId: poll1Options[1].id // Python
        }
      },
      update: {},
      create: {
        userId: user2.id,
        pollOptionId: poll1Options[1].id
      }
    });

    // Add some votes to poll2
    await prisma.vote.upsert({
      where: { 
        userId_pollOptionId: {
          userId: user1.id,
          pollOptionId: poll2Options[0].id // React
        }
      },
      update: {},
      create: {
        userId: user1.id,
        pollOptionId: poll2Options[0].id
      }
    });

    await prisma.vote.upsert({
      where: { 
        userId_pollOptionId: {
          userId: user2.id,
          pollOptionId: poll2Options[1].id // Vue.js
        }
      },
      update: {},
      create: {
        userId: user2.id,
        pollOptionId: poll2Options[1].id
      }
    });

    console.log('✅ Demo votes created');

    console.log('\n🎉 Demo data created successfully!');
    console.log('\nDemo accounts:');
    console.log('Email: john@example.com, Password: password123');
    console.log('Email: jane@example.com, Password: password123');
    console.log('\nVisit http://localhost:3000 to see the application!');

  } catch (error) {
    console.error('Error creating demo data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoData();
