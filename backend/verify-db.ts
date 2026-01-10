import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log(`Users count: ${users.length}`);
    users.forEach(u => {
      console.log(`User: ${u.email}, Role: ${u.role}, ID: ${u.id}`);
    });
  } catch (e) {
    console.error('Error connecting to DB:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
