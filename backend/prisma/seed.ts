import { PrismaClient, UserRole, AgentType, AgentStatus, ArtifactType, ArtifactStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// Seed Data Generators
// ============================================================================

const generatePassword = async (password: string) => {
  return bcrypt.hash(password, 10);
};

const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ============================================================================
// Sample Data
// ============================================================================

const sampleProjectNames = [
  'E-Commerce Platform',
  'Blog CMS',
  'Task Management App',
  'Real-time Chat',
  'Analytics Dashboard',
  'API Gateway',
  'Mobile App Backend',
  'Microservices Starter',
];

const sampleFileContents = {
  'index.ts': `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router } from './routes';
import { errorHandler } from './middleware/error';

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use('/api', router);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`,
  'package.json': `{
  "name": "sample-project",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0"
  }
}`,
  'README.md': `# Sample Project

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## API Endpoints

- GET /api/health - Health check
- GET /api/users - List users
- POST /api/users - Create user
`,
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}`,
};

const samplePrompts = [
  'Create a REST API endpoint for user authentication with JWT tokens',
  'Implement pagination for the products listing API',
  'Add rate limiting middleware to prevent abuse',
  'Write unit tests for the payment service',
  'Refactor the database queries to use connection pooling',
  'Create a WebSocket handler for real-time notifications',
  'Implement file upload with S3 integration',
  'Add caching layer using Redis for frequently accessed data',
];

const sampleCodePatterns = [
  {
    title: 'Repository Pattern',
    content: `export interface Repository<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}`,
    description: 'Generic repository interface for data access layer',
    tags: ['pattern', 'repository', 'typescript'],
    language: 'typescript',
  },
  {
    title: 'Singleton Pattern',
    content: `class Database {
  private static instance: Database;
  private constructor() {}
  
  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
}`,
    description: 'Singleton pattern for database connection',
    tags: ['pattern', 'singleton', 'typescript'],
    language: 'typescript',
  },
  {
    title: 'Error Handler Middleware',
    content: `export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};`,
    description: 'Express error handling middleware',
    tags: ['middleware', 'error-handling', 'express'],
    language: 'typescript',
  },
];

const sampleSnippets = [
  {
    title: 'Async Error Wrapper',
    content: `const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);`,
    description: 'Wrap async route handlers to catch errors',
    tags: ['async', 'error-handling', 'express'],
    language: 'typescript',
  },
  {
    title: 'JWT Token Generation',
    content: `const generateToken = (payload: object): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
};`,
    description: 'Generate JWT token with expiration',
    tags: ['jwt', 'auth', 'security'],
    language: 'typescript',
  },
  {
    title: 'Debounce Function',
    content: `function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}`,
    description: 'Debounce function for performance optimization',
    tags: ['utility', 'performance', 'javascript'],
    language: 'typescript',
  },
];

const samplePromptTemplates = [
  {
    title: 'Code Review Request',
    content: `Please review the following code for:
1. Performance issues
2. Security vulnerabilities
3. Code style and best practices
4. Potential bugs

Code:
{{code}}

Provide specific suggestions for improvement.`,
    description: 'Template for requesting code review from AI',
    tags: ['review', 'prompt'],
  },
  {
    title: 'Bug Fix Request',
    content: `I'm encountering the following error:
{{error}}

The relevant code is:
{{code}}

Please identify the root cause and provide a fix.`,
    description: 'Template for requesting bug fixes',
    tags: ['bugfix', 'prompt'],
  },
  {
    title: 'Feature Implementation',
    content: `Please implement the following feature:
{{feature_description}}

Requirements:
- Follow existing code patterns
- Add appropriate error handling
- Include TypeScript types
- Write clear comments`,
    description: 'Template for feature implementation requests',
    tags: ['feature', 'prompt'],
  },
];

// ============================================================================
// Main Seed Function
// ============================================================================

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.artifactFeedback.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.agentTask.deleteMany();
  await prisma.fileVersion.deleteMany();
  await prisma.file.deleteMany();
  await prisma.projectSnapshot.deleteMany();
  await prisma.knowledgeEntry.deleteMany();
  await prisma.project.deleteMany();
  await prisma.aIModelSetting.deleteMany();
  await prisma.user.deleteMany();

  console.log('✓ Cleared existing data');

  // ==================== Users ====================
  const adminPassword = await generatePassword('admin123');
  const userPassword = await generatePassword('user123');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@jacode.io',
      password: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      preferences: { theme: 'dark', fontSize: 14, autoSave: true },
    },
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john@example.com',
        password: userPassword,
        name: 'John Developer',
        role: UserRole.USER,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
        preferences: { theme: 'dark', fontSize: 14.5, autoSave: true },
      },
    }),
    prisma.user.create({
      data: {
        email: 'jane@example.com',
        password: userPassword,
        name: 'Jane Engineer',
        role: UserRole.USER,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
        preferences: { theme: 'light', fontSize: 13, autoSave: false },
      },
    }),
    prisma.user.create({
      data: {
        email: 'dev@example.com',
        password: userPassword,
        name: 'Dev Team',
        role: UserRole.USER,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev',
        preferences: { theme: 'system', fontSize: 14, autoSave: true },
      },
    }),
  ]);

  console.log(`✓ Created ${users.length + 1} users`);

  // ==================== Projects ====================
  const projects = [];
  for (const user of [admin, ...users]) {
    const numProjects = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numProjects; i++) {
      const project = await prisma.project.create({
        data: {
          name: randomElement(sampleProjectNames) + ` - ${i + 1}`,
          description: `A sample project for ${user.name}`,
          userId: user.id,
          settings: { language: 'typescript', framework: 'nestjs', linting: true },
          createdAt: randomDate(new Date('2024-01-01'), new Date()),
        },
      });
      projects.push({ project, user });
    }
  }

  console.log(`✓ Created ${projects.length} projects`);

  // ==================== Files ====================
  let fileCount = 0;
  for (const { project } of projects) {
    // Create directories
    const srcDir = await prisma.file.create({
      data: {
        path: 'src',
        name: 'src',
        isDirectory: true,
        projectId: project.id,
      },
    });

    // Create files
    for (const [filename, content] of Object.entries(sampleFileContents)) {
      const ext = filename.split('.').pop() || '';
      const file = await prisma.file.create({
        data: {
          path: filename.includes('.') ? `src/${filename}` : filename,
          name: filename,
          extension: ext,
          content,
          size: content.length,
          isDirectory: false,
          projectId: project.id,
        },
      });

      // Create file versions
      await prisma.fileVersion.create({
        data: {
          fileId: file.id,
          version: 1,
          content,
          message: 'Initial commit',
          createdAt: project.createdAt,
        },
      });

      // Random chance of additional versions
      if (Math.random() > 0.5) {
        await prisma.fileVersion.create({
          data: {
            fileId: file.id,
            version: 2,
            content: content + '\n// Updated',
            message: 'Minor update',
            createdAt: new Date(),
          },
        });
      }

      fileCount++;
    }

    // Create snapshot
    await prisma.projectSnapshot.create({
      data: {
        name: 'v1.0.0',
        description: 'Initial release',
        projectId: project.id,
        fileVersionIds: [],
      },
    });
  }

  console.log(`✓ Created ${fileCount} files with versions`);

  // ==================== Agent Tasks ====================
  const statuses = Object.values(AgentStatus);
  const types = Object.values(AgentType);
  let taskCount = 0;

  for (const { project, user } of projects) {
    const numTasks = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < numTasks; i++) {
      const status = randomElement(statuses);
      const task = await prisma.agentTask.create({
        data: {
          type: randomElement(types),
          status,
          priority: Math.floor(Math.random() * 5) + 1,
          prompt: randomElement(samplePrompts),
          context: { files: ['src/index.ts'], language: 'typescript' },
          progress: status === AgentStatus.COMPLETED ? 100 : Math.floor(Math.random() * 80),
          projectId: project.id,
          userId: user.id,
          createdAt: randomDate(new Date('2024-06-01'), new Date()),
          completedAt: status === AgentStatus.COMPLETED ? new Date() : null,
        },
      });

      // Create artifacts for completed/waiting tasks
      if (status === AgentStatus.COMPLETED || status === AgentStatus.WAITING_APPROVAL) {
        const artifact = await prisma.artifact.create({
          data: {
            type: randomElement([ArtifactType.CODE, ArtifactType.DIFF, ArtifactType.PLAN]),
            status: status === AgentStatus.COMPLETED ? ArtifactStatus.APPLIED : ArtifactStatus.DRAFT,
            title: `Generated code for ${task.type}`,
            content: `// Generated code\nexport const result = () => {\n  console.log('Task completed');\n};`,
            metadata: { language: 'typescript', lines: 4 },
            agentTaskId: task.id,
          },
        });

        // Random feedback
        if (Math.random() > 0.6) {
          await prisma.artifactFeedback.create({
            data: {
              artifactId: artifact.id,
              rating: Math.random() > 0.3 ? 1 : -1,
              comment: Math.random() > 0.5 ? 'Good implementation!' : null,
              lineComments: [],
            },
          });
        }
      }

      taskCount++;
    }
  }

  console.log(`✓ Created ${taskCount} agent tasks with artifacts`);

  // ==================== Knowledge Entries ====================
  let knowledgeCount = 0;

  for (const user of [admin, ...users]) {
    // Add code patterns
    for (const pattern of sampleCodePatterns) {
      await prisma.knowledgeEntry.create({
        data: {
          type: 'CODE_PATTERN',
          ...pattern,
          userId: user.id,
          usageCount: Math.floor(Math.random() * 50),
        },
      });
      knowledgeCount++;
    }

    // Add snippets
    for (const snippet of sampleSnippets) {
      await prisma.knowledgeEntry.create({
        data: {
          type: 'SNIPPET',
          ...snippet,
          userId: user.id,
          usageCount: Math.floor(Math.random() * 100),
        },
      });
      knowledgeCount++;
    }

    // Add prompt templates
    for (const template of samplePromptTemplates) {
      await prisma.knowledgeEntry.create({
        data: {
          type: 'PROMPT_TEMPLATE',
          ...template,
          userId: user.id,
          usageCount: Math.floor(Math.random() * 30),
        },
      });
      knowledgeCount++;
    }
  }

  console.log(`✓ Created ${knowledgeCount} knowledge entries`);

  // ==================== AI Model Settings ====================
  await prisma.aIModelSetting.createMany({
    data: [
      {
        name: 'CodeLlama 13B',
        provider: 'ollama',
        model: 'codellama:13b',
        settings: { temperature: 0.7, maxTokens: 4096, topP: 0.9 },
        isDefault: true,
        isActive: true,
      },
      {
        name: 'CodeLlama 7B (Fast)',
        provider: 'ollama',
        model: 'codellama:7b',
        settings: { temperature: 0.6, maxTokens: 2048, topP: 0.85 },
        isDefault: false,
        isActive: true,
      },
      {
        name: 'DeepSeek Coder',
        provider: 'ollama',
        model: 'deepseek-coder:6.7b',
        settings: { temperature: 0.5, maxTokens: 4096, topP: 0.9 },
        isDefault: false,
        isActive: true,
      },
      {
        name: 'vLLM CodeLlama',
        provider: 'vllm',
        model: 'codellama/CodeLlama-13b-hf',
        settings: { temperature: 0.7, maxTokens: 8192, topP: 0.9 },
        isDefault: false,
        isActive: false,
      },
    ],
  });

  console.log('✓ Created AI model settings');

  // ==================== Summary ====================
  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  • Users: ${users.length + 1}`);
  console.log(`  • Projects: ${projects.length}`);
  console.log(`  • Files: ${fileCount}`);
  console.log(`  • Agent Tasks: ${taskCount}`);
  console.log(`  • Knowledge Entries: ${knowledgeCount}`);
  console.log(`  • AI Models: 4`);
  console.log('\n🔑 Login credentials:');
  console.log('  • Admin: admin@jacode.io / admin123');
  console.log('  • User: john@example.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
