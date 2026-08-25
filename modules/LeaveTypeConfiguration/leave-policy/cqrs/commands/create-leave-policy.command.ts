import { CreateLeavePolicyDto } from '../../dto/create-leave-policy.dto';

export class CreateLeavePolicyCommand {
  constructor(
    public readonly tenantId: string,
    public readonly dto: CreateLeavePolicyDto,
  ) {}
}
