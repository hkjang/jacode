#!/usr/bin/env node
/**
 * Seed Data Management Script for JaCode
 * 
 * Usage:
 *   npx ts-node prisma/seed-manager.ts [command]
 * 
 * Commands:
 *   seed     - Run full seed (default)
 *   reset    - Clear all data and re-seed
 *   clear    - Clear all data only
 *   status   - Show current data counts
 *   export   - Export current data to JSON
 *   import   - Import data from JSON file
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ============================================================================
// Commands
// ============================================================================

async function showStatus() {
  console.log('\n📊 Database Status\n');
  
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.file.count(),
    prisma.fileVersion.count(),
    prisma.projectSnapshot.count(),
    prisma.agentTask.count(),
    prisma.artifact.count(),
    prisma.artifactFeedback.count(),
    prisma.knowledgeEntry.count(),
    prisma.aIModelSetting.count(),
  ]);

  const labels = [
    'Users',
    'Projects',
    'Files',
    'File Versions',
    'Snapshots',
    'Agent Tasks',
    'Artifacts',
    'Feedback',
    'Knowledge Entries',
    'AI Models',
  ];

  labels.forEach((label, i) => {
    console.log(`  ${label.padEnd(18)} ${counts[i]}`);
  });

  const totalRecords = counts.reduce((a, b) => a + b, 0);
  console.log(`\n  ${'Total'.padEnd(18)} ${totalRecords}`);
}

async function clearData() {
  console.log('\n🗑️  Clearing all data...\n');
  
  // Delete in correct order to avoid FK violations
  await prisma.artifactFeedback.deleteMany();
  console.log('  ✓ Cleared artifact_feedbacks');
  
  await prisma.artifact.deleteMany();
  console.log('  ✓ Cleared artifacts');
  
  await prisma.agentTask.deleteMany();
  console.log('  ✓ Cleared agent_tasks');
  
  await prisma.fileVersion.deleteMany();
  console.log('  ✓ Cleared file_versions');
  
  await prisma.file.deleteMany();
  console.log('  ✓ Cleared files');
  
  await prisma.projectSnapshot.deleteMany();
  console.log('  ✓ Cleared project_snapshots');
  
  await prisma.knowledgeEntry.deleteMany();
  console.log('  ✓ Cleared knowledge_entries');
  
  await prisma.project.deleteMany();
  console.log('  ✓ Cleared projects');
  
  await prisma.aIModelSetting.deleteMany();
  console.log('  ✓ Cleared ai_model_settings');
  
  await prisma.user.deleteMany();
  console.log('  ✓ Cleared users');
  
  console.log('\n✅ All data cleared!');
}

async function exportData() {
  console.log('\n📤 Exporting data...\n');
  
  const data = {
    exportedAt: new Date().toISOString(),
    users: await prisma.user.findMany(),
    projects: await prisma.project.findMany(),
    files: await prisma.file.findMany(),
    fileVersions: await prisma.fileVersion.findMany(),
    snapshots: await prisma.projectSnapshot.findMany(),
    agentTasks: await prisma.agentTask.findMany(),
    artifacts: await prisma.artifact.findMany(),
    feedback: await prisma.artifactFeedback.findMany(),
    knowledgeEntries: await prisma.knowledgeEntry.findMany(),
    aiModels: await prisma.aIModelSetting.findMany(),
  };

  const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
  const filepath = path.join(__dirname, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  
  console.log(`✅ Data exported to: ${filepath}`);
  console.log(`   Total records: ${Object.values(data).slice(1).reduce((a: any, b: any) => a + b.length, 0)}`);
}

async function importData(filepath: string) {
  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    process.exit(1);
  }

  console.log(`\n📥 Importing data from: ${filepath}\n`);
  
  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  
  // Clear existing data first
  await clearData();
  
  console.log('\n📝 Importing records...\n');
  
  // Import in correct order
  if (data.users?.length) {
    await prisma.user.createMany({ data: data.users, skipDuplicates: true });
    console.log(`  ✓ Imported ${data.users.length} users`);
  }
  
  if (data.projects?.length) {
    await prisma.project.createMany({ data: data.projects, skipDuplicates: true });
    console.log(`  ✓ Imported ${data.projects.length} projects`);
  }
  
  if (data.files?.length) {
    await prisma.file.createMany({ data: data.files, skipDuplicates: true });
    console.log(`  ✓ Imported ${data.files.length} files`);
  }
  
  if (data.fileVersions?.length) {
    await prisma.fileVersion.createMany({ data: data.fileVersions, skipDuplicates: true });
    console.log(`  ✓ Imported ${data.fileVersions.length} file versions`);
  }
  
  if (data.snapshots?.length) {
    await prisma.projectSnapshot.createMany({ data: data.snapshots, skipDuplicates: true });
    console.log(`  ✓ Imported ${data.snapshots.length} snapshots`);
  }
  
  if (data.agentTasks?.length) {
    await prisma.agentTask.createMany({ data: data.agentTasks, skipDuplicates: true });
    console.log(`  ✓ Imported ${data.agentTasks.length} agent tasks`);
  }
  
  if (data.artifacts?.length) {
    await prisma.artifact.createMany({ data: data.artifacts, skipDuplicates: true });
    console.log(`  ✓ Imported ${data.artifacts.length} artifacts`);
  }
  
  if (data.feedback?.length) {
    await prisma.artifactFeedback.createMany({ data: data.feedback, skipDuplicates: true });
    console.log(`  ✓ Imported ${data.feedback.length} feedback entries`);
  }
  
  if (data.knowledgeEntries?.length) {
    await prisma.knowledgeEntry.createMany({ data: data.knowledgeEntries, skipDuplicates: true });
    console.log(`  ✓ Imported ${data.knowledgeEntries.length} knowledge entries`);
  }
  
  if (data.aiModels?.length) {
    await prisma.aIModelSetting.createMany({ data: data.aiModels, skipDuplicates: true });
    console.log(`  ✓ Imported ${data.aiModels.length} AI models`);
  }
  
  console.log('\n✅ Import completed!');
}

async function runSeed() {
  console.log('\n🌱 Running seed script...\n');
  
  // Import and run the seed file
  const seed = await import('./seed');
  // The seed file runs on import
}

// ============================================================================
// CLI Handler
// ============================================================================

async function main() {
  const command = process.argv[2] || 'status';
  const arg = process.argv[3];

  console.log('🔧 JaCode Seed Manager');
  console.log('─'.repeat(40));

  switch (command) {
    case 'seed':
      await runSeed();
      break;
    case 'reset':
      await clearData();
      await runSeed();
      break;
    case 'clear':
      await clearData();
      break;
    case 'status':
      await showStatus();
      break;
    case 'export':
      await exportData();
      break;
    case 'import':
      if (!arg) {
        console.error('❌ Please provide a file path');
        console.log('   Usage: npx ts-node prisma/seed-manager.ts import <filepath>');
        process.exit(1);
      }
      await importData(arg);
      break;
    case 'help':
      console.log(`
Available commands:
  seed     - Run full seed
  reset    - Clear all data and re-seed
  clear    - Clear all data only
  status   - Show current data counts
  export   - Export current data to JSON
  import   - Import data from JSON file
  help     - Show this help message

Examples:
  npx ts-node prisma/seed-manager.ts status
  npx ts-node prisma/seed-manager.ts seed
  npx ts-node prisma/seed-manager.ts export
  npx ts-node prisma/seed-manager.ts import backup-2024-01-01.json
`);
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('   Run with "help" for available commands');
      process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
