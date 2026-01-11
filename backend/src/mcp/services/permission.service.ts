import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a user has permission to execute a specific tool
   */
  async checkPermission(userId: string, toolName: string, requiredPermissions: string[] = []): Promise<boolean> {
    // If no specific permissions required, allow (default safe)
    // In a stricter system, you might default to deny. 
    // For now, we assume public tools are safe, and sensitive tools explicitly declare permissions.
    if (requiredPermissions.length === 0) {
      return true;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }, // Assuming simple role-based for now
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found during permission check`);
        return false;
      }

      // Admin bypass
      if (user.role === 'ADMIN') {
        return true;
      }

      // Check specific permissions (Placeholder for more complex logic)
      // This could involve a separate Permission/Policy table
      // For now, let's assume 'requiredPermissions' maps to roles or specific flags
      
      // Simplification: If requiredPermissions includes 'ADMIN', only admin can use
      if (requiredPermissions.includes('ADMIN')) {
        return false;
      }

      // Add more granular checks here as needed
      return true;
    } catch (error) {
      this.logger.error(`Permission check failed for user ${userId} tool ${toolName}`, error);
      return false;
    }
  }

  /**
   * Check if a user has access to a specific project
   */
  async checkProjectAccess(userId: string, projectId: string, userRole?: string): Promise<boolean> {
    // Admins can access all projects
    if (userRole === 'ADMIN') {
        return true;
    }

    // Check if user owns the project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true }
    });

    if (project && project.userId === userId) {
        return true;
    }

    // TODO: Add team-based access check if implemented
    return false;
  }
}
