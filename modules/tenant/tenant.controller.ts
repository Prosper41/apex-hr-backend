// This is for super-admin to create tenants (to an already existing tenant)
// also to delete all tenants in database
//  , using backend only .
// Tenants however are created using ( register-tenant in auth )
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '../../packages/common/guards/roles.guard';
import { Roles } from '../../packages/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.TENANT_ADMIN, Role.HR_ADMIN)
@ApiTags('Tenants/Companies')
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant/company' })
  @ApiResponse({ status: 201, description: 'Tenant successfully created' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @ApiResponse({ status: 409, description: 'Tenant slug already exists' })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tenants/companies' })
  @ApiResponse({ status: 200, description: 'List of all tenants' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  findAll() {
    return this.tenantService.findAll();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get a tenant by name' })
  @ApiParam({ name: 'name', example: 'Code Raccoon' })
  @ApiResponse({ status: 200, description: 'Tenant found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  findOne(@Param('name') name: string) {
    return this.tenantService.findOne(name);
  }

  @Patch(':name')
  @ApiOperation({ summary: 'Update a tenant by name' })
  @ApiParam({ name: 'name', example: 'Code Raccoon' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  update(
    @Param('name') name: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.tenantService.update(name, updateTenantDto);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all tenants/companies' })
  @ApiResponse({ status: 200, description: 'All tenants deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  removeAll() {
    return this.tenantService.removeAll();
  }

  @Delete(':name')
  @ApiOperation({ summary: 'Delete a tenant by name' })
  @ApiParam({ name: 'name', example: 'Code Raccoon' })
  @ApiResponse({ status: 200, description: 'Tenant deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  remove(@Param('name') name: string) {
    return this.tenantService.remove(name);
  }
}
