import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@common/guards/auth.guard';
import { Request } from 'express';
import { GetNotificationsQuery } from './cqrs/queries/get-notifications.query';
import { GetNotificationStatsQuery } from './cqrs/queries/get-notification-stats.query';
import { MarkNotificationReadCommand } from './cqrs/commands/mark-notification-read.command';
import { MarkAllNotificationsReadCommand } from './cqrs/commands/mark-all-notifications-read.command';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for the current user' })
  getAll(
    @Query('filter') filter: 'all' | 'unread' | 'high-priority' = 'all',
    @Req() req: Request & { user: any },
  ) {
    return this.queryBus.execute(
      new GetNotificationsQuery(req.user.tenantId, req.user.userId, filter),
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification stat counts' })
  getStats(@Req() req: Request & { user: any }) {
    return this.queryBus.execute(
      new GetNotificationStatsQuery(req.user.tenantId, req.user.userId),
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  markRead(@Param('id') id: string, @Req() req: Request & { user: any }) {
    return this.commandBus.execute(
      new MarkNotificationReadCommand(id, req.user.userId, req.user.tenantId),
    );
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@Req() req: Request & { user: any }) {
    return this.commandBus.execute(
      new MarkAllNotificationsReadCommand(req.user.userId, req.user.tenantId),
    );
  }
}
