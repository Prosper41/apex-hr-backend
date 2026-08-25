import { PrismaService } from '@infra/database/prisma/prisma.service';

export class TestDataTracker {
  private tenantIds: string[] = [];
  private userEmails: string[] = [];

  trackTenant(id: string): void {
    this.tenantIds.push(id);
  }

  trackUserEmail(email: string): void {
    this.userEmails.push(email);
  }

  async cleanup(prisma: PrismaService): Promise<void> {
    if (this.tenantIds.length) {
      await prisma.tenant.deleteMany({
        where: { id: { in: this.tenantIds } },
      });
    }

    if (this.userEmails.length) {
      await prisma.user.deleteMany({
        where: { email: { in: this.userEmails } },
      });
    }
  }
}
