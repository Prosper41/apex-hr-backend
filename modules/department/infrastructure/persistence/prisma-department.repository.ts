import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { DepartmentRepository } from '../../domain/department.repository.interface';
import { Department } from '../../domain/department.entity';

@Injectable()
export class PrismaDepartmentRepository implements DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    description?: string;
    tenantId: string;
  }): Promise<Department> {
    const record = await this.prisma.department.create({ data });
    return new Department(
      record.id,
      record.name,
      record.description,
      record.tenantId,
    );
  }

  async findAll(tenantId: string): Promise<Department[]> {
    const records = await this.prisma.department.findMany({
      where: { tenantId },
    });
    return records.map(
      (r) => new Department(r.id, r.name, r.description, r.tenantId),
    );
  }

  async findById(id: string): Promise<Department | null> {
    const record = await this.prisma.department.findUnique({ where: { id } });
    if (!record) return null;
    return new Department(
      record.id,
      record.name,
      record.description,
      record.tenantId,
    );
  }

  async update(
    id: string,
    data: { name?: string; description?: string },
  ): Promise<Department> {
    const record = await this.prisma.department.update({ where: { id }, data });
    return new Department(
      record.id,
      record.name,
      record.description,
      record.tenantId,
    );
  }

  async remove(id: string): Promise<void> {
    await this.prisma.department.delete({ where: { id } });
  }
}
