import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const aiModels = await prisma.aIModelSetting.findMany({
      select: { id: true, name: true, serverId: true }
    });
    console.log(`AI Models count: ${aiModels.length}`);
    aiModels.forEach(m => {
      console.log(`Model: ${m.name}, ServerId: ${m.serverId}`);
    });
  } catch (e) {
    console.error('Error connecting to DB:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
