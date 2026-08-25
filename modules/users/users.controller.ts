// src/users/users.controller.ts

import {
  Controller,
  Get,
  Delete,
  Patch,
  Query,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
  ApiTags,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '../../packages/common/guards/roles.guard';
import { Roles } from '../../packages/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { RequestWithUser } from 'modules/auth/dto/interfaces/request-with-user.interfaces';
import { PaginationQueryDto } from '@common/pagination/pagination-query.dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetAllUsersQuery } from './cqrs/queries/get-all-users.query';
import { GetUserByEmailQuery } from './cqrs/queries/get-user-by-email.query';
import { GetUsersByNameQuery } from './cqrs/queries/get-users-by-name.query';
import { RemoveUserCommand } from './cqrs/commands/remove-user.command';
import { UpdateUserCommand } from './cqrs/commands/update-user.command'; //
import { UpdateUserDto } from './dto/update-user.dto'; //

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all users in your organisation' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findAll(
    @Req() req: RequestWithUser,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.queryBus.execute(
      new GetAllUsersQuery(req.user.tenantId, pagination),
    );
  }

  @Get('search/email')
  @ApiOperation({ summary: 'Find a user by email' })
  @ApiQuery({ name: 'email' })
  findOne(@Query('email') email: string, @Req() req: RequestWithUser) {
    return this.queryBus.execute(
      new GetUserByEmailQuery(email, req.user.tenantId),
    );
  }

  @Get('search/name')
  @ApiOperation({ summary: 'Find users by first and last name' })
  @ApiQuery({ name: 'firstName', required: false })
  @ApiQuery({ name: 'lastName', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findByName(
    @Req() req: RequestWithUser,
    @Query() pagination: PaginationQueryDto,
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
  ) {
    return this.queryBus.execute(
      new GetUsersByNameQuery(
        req.user.tenantId,
        pagination,
        firstName,
        lastName,
      ),
    );
  }

  //  New: PATCH /users/:id — update a user's details including role
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: RequestWithUser,
  ) {
    return this.commandBus.execute(
      new UpdateUserCommand(id, req.user.tenantId, dto),
    );
  }

  @Delete('remove')
  @ApiOperation({ summary: 'Remove a user by email, firstName, or lastName' })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'firstName', required: false })
  @ApiQuery({ name: 'lastName', required: false })
  remove(
    @Req() req: RequestWithUser,
    @Query('email') email?: string,
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
  ) {
    return this.commandBus.execute(
      new RemoveUserCommand(req.user.tenantId, email, firstName, lastName),
    );
  }
}
