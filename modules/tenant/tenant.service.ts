import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTenantDto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { name: createTenantDto.name },
    });
    if (existing) {
      throw new ConflictException('Company with this name already exists');
    }
    return this.prisma.tenant.create({
      data: {
        name: createTenantDto.name,
        companyType: createTenantDto.companyType,
        companyPhone: createTenantDto.companyPhone,
        companyLocation: createTenantDto.companyLocation,
        registeredAt: new Date(),
      },
    });
  }

  findAll() {
    return this.prisma.tenant.findMany();
  }

  async findOne(name: string) {
    const existingSlug = await this.prisma.tenant.findUnique({
      where: { name },
    });
    if (!existingSlug) {
      throw new NotFoundException('company not found');
    }
    return existingSlug;
  }

  async update(name: string, updateTenantDto: UpdateTenantDto) {
    await this.findOne(name);
    return this.prisma.tenant.update({
      where: { name },
      data: updateTenantDto,
    });
  }

  async remove(name: string) {
    const tenant = await this.findOne(name);
    return this.prisma.tenant.delete({ where: { id: tenant.id } });
  }

  async removeAll() {
    return this.prisma.tenant.deleteMany();
  }
}
