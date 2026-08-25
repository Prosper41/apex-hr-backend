import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { ConflictDetectionService } from 'modules/leave-request/services/conflict-detection.service';
import { SubmitLeaveRequestHandler } from 'modules/leave-request/cqrs/handlers/submit-leave-request.handler';

describe('SubmitLeaveRequestHandler', () => {
  let handler: SubmitLeaveRequestHandler;

  const prismaMock = {
    leavePolicy: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    leaveRequest: {
      create: jest.fn(),
    },
  };

  const commandBusMock = {
    execute: jest.fn(),
  };

  const conflictMock = {
    detect: jest.fn().mockResolvedValue(null),
  };

  const baseCommand = {
    submitLeaveRequestDto: {
      leavePolicyId: 'policy-1',
      departmentId: 'dept-1',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      reason: 'vacation',
      isHalfDay: false,
    },
    tenantId: 'tenant-1',
    userId: 'user-1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitLeaveRequestHandler,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ConflictDetectionService,
          useValue: conflictMock,
        },
        {
          provide: CommandBus,
          useValue: commandBusMock,
        },
      ],
    }).compile();

    handler = module.get<SubmitLeaveRequestHandler>(SubmitLeaveRequestHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  // Team Lead
  it('should set TEAM_LEAD_COMMENTED for TEAM_LEAD role', async () => {
    prismaMock.leavePolicy.findFirst.mockResolvedValue({
      id: 'p1',
    });

    prismaMock.user.findUnique.mockResolvedValue({
      role: 'TEAM_LEAD',
    });

    prismaMock.leaveRequest.create.mockResolvedValue({
      id: 'lr1',
      user: {},
      leavePolicy: {},
    });

    const result = await handler.execute(baseCommand as any);

    expect(prismaMock.leaveRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'TEAM_LEAD_COMMENTED',
        teamLeadApproverId: 'user-1',
      }),
    );

    expect(commandBusMock.execute).toHaveBeenCalled();
    expect(conflictMock.detect).toHaveBeenCalled();

    expect(result.leaveRequest.id).toBe('lr1');
  });

  // Department Head
  it('should set DEPT_APPROVED for DEPT_HEAD role', async () => {
    prismaMock.leavePolicy.findFirst.mockResolvedValue({
      id: 'p1',
    });

    prismaMock.user.findUnique.mockResolvedValue({
      role: 'DEPT_HEAD',
    });

    prismaMock.leaveRequest.create.mockResolvedValue({
      id: 'lr2',
    });

    await handler.execute(baseCommand as any);

    expect(prismaMock.leaveRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'DEPT_APPROVED',
        teamLeadApproverId: 'user-1',
        deptApproverId: 'user-1',
      }),
    );
  });

  // Normal employee
  it('should set PENDING for normal employee role', async () => {
    prismaMock.leavePolicy.findFirst.mockResolvedValue({
      id: 'p1',
    });

    prismaMock.user.findUnique.mockResolvedValue({
      role: 'EMPLOYEE',
    });

    prismaMock.leaveRequest.create.mockResolvedValue({
      id: 'lr3',
    });

    await handler.execute(baseCommand as any);

    expect(prismaMock.leaveRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PENDING',
      }),
    );
  });

  // Policy does not exist
  it('should throw NotFoundException if leave policy not found', async () => {
    prismaMock.leavePolicy.findFirst.mockResolvedValue(null);

    await expect(handler.execute(baseCommand as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  // User does not exist
  it('should throw NotFoundException if user not found', async () => {
    prismaMock.leavePolicy.findFirst.mockResolvedValue({
      id: 'p1',
    });

    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(handler.execute(baseCommand as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  // Invalid dates
  it('should throw BadRequestException if end date is before start date', async () => {
    prismaMock.leavePolicy.findFirst.mockResolvedValue({
      id: 'p1',
    });

    prismaMock.user.findUnique.mockResolvedValue({
      role: 'EMPLOYEE',
    });

    const invalidCommand = {
      ...baseCommand,
      submitLeaveRequestDto: {
        ...baseCommand.submitLeaveRequestDto,
        startDate: '2026-06-05',
        endDate: '2026-06-01',
      },
    };

    await expect(handler.execute(invalidCommand as any)).rejects.toThrow(
      BadRequestException,
    );
  });
});
