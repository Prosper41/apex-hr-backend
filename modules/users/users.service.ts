// import {
//   Injectable,
//   NotFoundException,
//   BadRequestException,
// } from '@nestjs/common';
// import { PrismaService } from '@infra/database/prisma/prisma.service';
// import { PaginationQueryDto } from '../common/pagination/dtos/pagination-query.dto';

// @Injectable()
// export class UsersService {
//   constructor(private readonly prismaService: PrismaService) {}

//   private readonly userSelect = {
//     id: true,
//     email: true,
//     firstName: true,
//     lastName: true,
//     contact: true,
//     houseAddress: true,
//     dateOfBirth: true,
//     role: true,
//     departmentId: true,
//     department: {
//       select: {
//         id: true,
//         name: true,
//       },
//     },
//     createdAt: true,
//     updatedAt: true,
//   };

//   private paginate(total: number, page: number, limit: number) {
//     return {
//       total,
//       page,
//       limit,
//       totalPages: Math.ceil(total / limit),
//       hasNextPage: page < Math.ceil(total / limit),
//       hasPrevPage: page > 1,
//     };
//   }

//   async findAll(tenantId: string, pagination: PaginationQueryDto) {
//     const page = pagination.page ?? 1;
//     const limit = pagination.limit ?? 20;
//     const skip = (page - 1) * limit;

//     const [users, total] = await this.prismaService.$transaction([
//       this.prismaService.user.findMany({
//         where: { tenantId },
//         select: this.userSelect,
//         skip,
//         take: limit,
//         orderBy: { createdAt: 'desc' },
//       }),
//       this.prismaService.user.count({ where: { tenantId } }),
//     ]);

//     return { data: users, meta: this.paginate(total, page, limit) };
//   }

//   async findOne(email: string, tenantId: string) {
//     const user = await this.prismaService.user.findFirst({
//       where: { email, tenantId },
//       select: this.userSelect,
//     });

//     if (!user) throw new NotFoundException('User not found');

//     return user;
//   }

//   async findByName(
//     tenantId: string,
//     pagination: PaginationQueryDto,
//     firstName?: string,
//     lastName?: string,
//   ) {
//     const page = pagination.page ?? 1;
//     const limit = pagination.limit ?? 20;
//     const skip = (page - 1) * limit;

//     const where = {
//       tenantId,
//       OR: [
//         ...(firstName ? [{ firstName }] : []),
//         ...(lastName ? [{ lastName }] : []),
//       ],
//     };

//     const [users, total] = await this.prismaService.$transaction([
//       this.prismaService.user.findMany({
//         where,
//         select: this.userSelect,
//         skip,
//         take: limit,
//         orderBy: { createdAt: 'desc' },
//       }),
//       this.prismaService.user.count({ where }),
//     ]);

//     if (!users.length) {
//       throw new NotFoundException('No users found with that name');
//     }

//     return { data: users, meta: this.paginate(total, page, limit) };
//   }

//   async remove(
//     tenantId: string,
//     email?: string,
//     firstName?: string,
//     lastName?: string,
//   ) {
//     const conditions = [
//       ...(email ? [{ email }] : []),
//       ...(firstName ? [{ firstName }] : []),
//       ...(lastName ? [{ lastName }] : []),
//     ];

//     if (!conditions.length) {
//       throw new BadRequestException(
//         'Provide at least one of: email, firstName, lastName',
//       );
//     }

//     const user = await this.prismaService.user.findFirst({
//       where: { tenantId, OR: conditions },
//     });

//     if (!user) throw new NotFoundException('User not found');

//     await this.prismaService.refreshToken.deleteMany({
//       where: { userId: user.id },
//     });

//     await this.prismaService.user.delete({ where: { id: user.id } });

//     return { message: 'User deleted successfully' };
//   }
// }
