import { UpdateLeavePolicyDto } from '../../dto/update-leave-policy.dto';

export class UpdateLeavePolicyCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
    public readonly dto: UpdateLeavePolicyDto,
  ) {}
}
