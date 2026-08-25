export class FakeRedisService {
  delMany = jest.fn().mockResolvedValue(undefined);
}

export class FakeQueue {
  jobs: Array<{ name: string; data: any; opts: any }> = [];
  add = jest.fn((name: string, data: any, opts: any) => {
    this.jobs.push({ name, data, opts });
    return Promise.resolve({ id: opts?.jobId ?? `job_${this.jobs.length}` });
  });
}

export class FakeCommandBus {
  executed: any[] = [];
  execute = jest.fn((command: any) => {
    this.executed.push(command);
    return Promise.resolve(undefined);
  });
}

export class FakeConflictDetectionService {
  detect = jest.fn().mockResolvedValue(undefined);
}
