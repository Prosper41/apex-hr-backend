import { Department } from './department.entity';

export const DEPARTMENT_REPOSITORY = 'DEPARTMENT_REPOSITORY';

export interface DepartmentRepository {
  create(data: {
    name: string;
    description?: string;
    tenantId: string;
  }): Promise<Department>;
  findAll(tenantId: string): Promise<Department[]>;
  findById(id: string): Promise<Department | null>;
  update(
    id: string,
    data: { name?: string; description?: string },
  ): Promise<Department>;
  remove(id: string): Promise<void>;
}
