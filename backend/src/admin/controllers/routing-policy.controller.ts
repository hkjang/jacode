import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export class CreateRoutingPolicyDto {
  name: string;
  description?: string;
  rules: {
    costWeight: number;
    performanceWeight: number;
    availabilityWeight: number;
    modelPreferences?: any;
    maxCostPerRequest?: number;
    preferredProvider?: string;
  };
  priority?: number;
  isActive?: boolean;
}

export class UpdateRoutingPolicyDto {
  name?: string;
  description?: string;
  rules?: any;
  priority?: number;
  isActive?: boolean;
}

@Controller('api/admin/routing-policies')
@UseGuards(JwtAuthGuard)
export class RoutingPolicyController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all routing policies
   */
  @Get()
  async getAll() {
    return this.prisma.modelRoutingPolicy.findMany({
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Get active policies
   */
  @Get('active')
  async getActive() {
    return this.prisma.modelRoutingPolicy.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Get policy by ID
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.prisma.modelRoutingPolicy.findUnique({
      where: { id },
    });
  }

  /**
   * Create new routing policy
   */
  @Post()
  async create(@Body() dto: CreateRoutingPolicyDto) {
    return this.prisma.modelRoutingPolicy.create({
      data: {
        name: dto.name,
        description: dto.description,
        rules: dto.rules as any,
        priority: dto.priority || 100,
        isActive: dto.isActive !== false,
      },
    });
  }

  /**
   * Update routing policy
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRoutingPolicyDto) {
    return this.prisma.modelRoutingPolicy.update({
      where: { id },
      data: dto as any,
    });
  }

  /**
   * Delete routing policy
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.modelRoutingPolicy.delete({
      where: { id },
    });
  }

  /**
   * Toggle policy active status
   */
  @Put(':id/toggle')
  async toggle(@Param('id') id: string) {
    const policy = await this.prisma.modelRoutingPolicy.findUnique({
      where: { id },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    return this.prisma.modelRoutingPolicy.update({
      where: { id },
      data: { isActive: !policy.isActive },
    });
  }

  /**
   * Duplicate policy
   */
  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string) {
    const policy = await this.prisma.modelRoutingPolicy.findUnique({
      where: { id },
    });

    const { id: _, createdAt, updatedAt, ...data } = policy as any;

    return this.prisma.modelRoutingPolicy.create({
      data: {
        ...data,
        name: `${data.name} (Copy)`,
        isActive: false,
      },
    });
  }
}
