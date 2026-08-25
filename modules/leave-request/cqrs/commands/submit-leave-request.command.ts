import { SubmitLeaveRequestDto } from '../../dto/submit-leave-request.dto';

export class SubmitLeaveRequestCommand {
  constructor(
    public readonly dto: SubmitLeaveRequestDto,
    public readonly tenantId: string,
    public readonly userId: string,
  ) {}
}
