import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { IsString, IsOptional, IsObject, IsNumber, IsBoolean, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// Rules 유효성 검사를 위한 중첩 클래스
export class RoutingRulesDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  costWeight: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  performanceWeight: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  availabilityWeight: number;

  @IsOptional()
  @IsObject()
  modelPreferences?: Record<string, string[]>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCostPerRequest?: number;

  @IsOptional()
  @IsString()
  preferredProvider?: string;
}

export class CreateRoutingPolicyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => RoutingRulesDto)
  rules: RoutingRulesDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRoutingPolicyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RoutingRulesDto)
  rules?: RoutingRulesDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority?: number;

  @IsOptional()
  @IsBoolean()
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
      throw new NotFoundException('Policy not found');
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

    if (!policy) {
      throw new NotFoundException('Policy not found');
    }

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
