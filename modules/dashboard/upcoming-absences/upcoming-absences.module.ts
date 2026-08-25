import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { UpcomingAbsencesController } from './upcoming-absences.controller';
import { GetUpcomingAbsencesHandler } from './queries/handlers/get-upcoming-absences.handler';

@Module({
  imports: [CqrsModule],
  controllers: [UpcomingAbsencesController],
  providers: [PrismaService, GetUpcomingAbsencesHandler],
})
export class UpcomingAbsencesModule {}
