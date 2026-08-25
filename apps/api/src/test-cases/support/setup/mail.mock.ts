export function createMockMailService() {
  return {
    sendTenantWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendUserWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendLeaveNotificationEmail: jest.fn().mockResolvedValue(undefined),
  };
}

export type MockMailService = ReturnType<typeof createMockMailService>;
