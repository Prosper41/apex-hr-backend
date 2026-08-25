import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() means you only import PrismaModule ONCE in AppModule
// and PrismaService becomes available everywhere automatically
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
