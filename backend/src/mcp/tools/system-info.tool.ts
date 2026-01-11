import { Injectable } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';
import * as os from 'os';
import * as process from 'process';

@Injectable()
export class SystemInfoTool implements McpTool {
  name = 'system_info';
  description = 'Get system information including OS, memory, CPU, Node.js version, and environment details.';

  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      info: {
        type: 'string',
        enum: ['all', 'os', 'memory', 'cpu', 'node', 'env'],
        description: 'Type of system info to retrieve (default: all)',
      },
      envVar: {
        type: 'string',
        description: 'Specific environment variable name (for env info)',
      },
    },
    required: [],
  };

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { info = 'all', envVar } = args;

    switch (info) {
      case 'os':
        return this.getOsInfo();
      case 'memory':
        return this.getMemoryInfo();
      case 'cpu':
        return this.getCpuInfo();
      case 'node':
        return this.getNodeInfo();
      case 'env':
        return this.getEnvInfo(envVar);
      case 'all':
      default:
        return this.getAllInfo();
    }
  }

  private getOsInfo(): McpToolResult {
    const info = {
      platform: os.platform(),
      release: os.release(),
      type: os.type(),
      arch: os.arch(),
      hostname: os.hostname(),
      homedir: os.homedir(),
      tmpdir: os.tmpdir(),
      uptime: this.formatUptime(os.uptime()),
    };

    return {
      content: [{ 
        type: 'text', 
        text: `OS: ${info.type} ${info.release} (${info.platform})\nArch: ${info.arch}\nHostname: ${info.hostname}\nUptime: ${info.uptime}`
      }],
      metadata: info
    };
  }

  private getMemoryInfo(): McpToolResult {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const info = {
      total: this.formatBytes(totalMem),
      free: this.formatBytes(freeMem),
      used: this.formatBytes(usedMem),
      usagePercent: ((usedMem / totalMem) * 100).toFixed(1) + '%',
    };

    return {
      content: [{ 
        type: 'text', 
        text: `Memory: ${info.used} / ${info.total} (${info.usagePercent} used)\nFree: ${info.free}`
      }],
      metadata: { ...info, totalBytes: totalMem, freeBytes: freeMem, usedBytes: usedMem }
    };
  }

  private getCpuInfo(): McpToolResult {
    const cpus = os.cpus();
    const avgLoad = os.loadavg();

    const info = {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
      speed: cpus[0]?.speed ? `${cpus[0].speed} MHz` : 'Unknown',
      loadAvg: avgLoad.map(l => l.toFixed(2)).join(', '),
    };

    return {
      content: [{ 
        type: 'text', 
        text: `CPU: ${info.model}\nCores: ${info.cores}\nSpeed: ${info.speed}\nLoad Average: ${info.loadAvg}`
      }],
      metadata: info
    };
  }

  private getNodeInfo(): McpToolResult {
    const info = {
      nodeVersion: process.version,
      v8Version: process.versions.v8,
      npmVersion: process.env.npm_package_version || 'N/A',
      pid: process.pid,
      cwd: process.cwd(),
      memoryUsage: process.memoryUsage(),
    };

    const heapUsed = this.formatBytes(info.memoryUsage.heapUsed);
    const heapTotal = this.formatBytes(info.memoryUsage.heapTotal);

    return {
      content: [{ 
        type: 'text', 
        text: `Node.js: ${info.nodeVersion}\nV8: ${info.v8Version}\nPID: ${info.pid}\nHeap: ${heapUsed} / ${heapTotal}`
      }],
      metadata: info
    };
  }

  private getEnvInfo(envVar?: string): McpToolResult {
    if (envVar) {
      const value = process.env[envVar];
      if (value !== undefined) {
        return {
          content: [{ type: 'text', text: `${envVar}=${value}` }],
          metadata: { [envVar]: value }
        };
      }
      return {
        content: [{ type: 'text', text: `Environment variable "${envVar}" is not set` }],
        metadata: { found: false }
      };
    }

    // List safe env variables (exclude sensitive ones)
    const safeEnvKeys = Object.keys(process.env)
      .filter(key => !key.toLowerCase().includes('key') && 
                     !key.toLowerCase().includes('secret') && 
                     !key.toLowerCase().includes('password') &&
                     !key.toLowerCase().includes('token'))
      .slice(0, 20);

    const envList = safeEnvKeys.map(key => `${key}=${process.env[key]?.slice(0, 50)}`).join('\n');

    return {
      content: [{ type: 'text', text: `Environment variables (first 20, excluding secrets):\n${envList}` }],
      metadata: { count: safeEnvKeys.length }
    };
  }

  private getAllInfo(): McpToolResult {
    const osInfo = `${os.type()} ${os.release()} (${os.arch()})`;
    const memInfo = `${this.formatBytes(os.totalmem() - os.freemem())} / ${this.formatBytes(os.totalmem())}`;
    const cpuInfo = `${os.cpus().length} cores`;
    const nodeInfo = process.version;

    return {
      content: [{ 
        type: 'text', 
        text: `System Information:\n- OS: ${osInfo}\n- Memory: ${memInfo}\n- CPU: ${cpuInfo}\n- Node.js: ${nodeInfo}\n- Uptime: ${this.formatUptime(os.uptime())}`
      }],
      metadata: {
        os: osInfo,
        memory: memInfo,
        cpu: cpuInfo,
        node: nodeInfo,
      }
    };
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }
}
