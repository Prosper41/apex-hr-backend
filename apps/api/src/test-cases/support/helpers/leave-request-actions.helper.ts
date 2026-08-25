import request from 'supertest';
import { INestApplication } from '@nestjs/common';

/**
 * Builds a weekday-safe future date range as ISO date strings
 * (YYYY-MM-DD), starting `startOffsetDays` from today and lasting
 * `durationDays`. Always in the future so tests never depend on "today".
 */
export function futureDateRange(
  startOffsetDays: number,
  durationDays: number,
): { startDate: string; endDate: string } {
  const start = new Date();
  start.setDate(start.getDate() + startOffsetDays);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

/**
 * Submits a leave request via the real API (POST /v1/leave-requests).
 * This is the Act step shared by nearly every leave-request test.
 *
 * `departmentId` remains REQUIRED by SubmitLeaveRequestDto for frontend
 * backward compatibility, but SubmitLeaveRequestHandler no longer trusts
 * its value for routing — it is always overridden server-side with the
 * submitter's own departmentId. Callers of this helper therefore never
 * need to pass a real department id; a placeholder is sent by default.
 * Tests that specifically need to prove the value is ignored (see
 * routing.e2e-spec.ts) can pass an explicit, deliberately wrong one via
 * `departmentId`.
 */
export function submitLeaveRequest(
  app: INestApplication,
  accessToken: string,
  params: {
    leavePolicyId: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    isHalfDay?: boolean;
  },
) {
  const range =
    params.startDate && params.endDate
      ? { startDate: params.startDate, endDate: params.endDate }
      : futureDateRange(10, 2);

  return request(app.getHttpServer())
    .post('/v1/leave-requests')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      leavePolicyId: params.leavePolicyId,
      // Required by the DTO for shape/presence validation only; the
      // handler ignores this value and derives the real departmentId from
      // the authenticated submitter. Any non-empty string satisfies
      // @IsString @IsNotEmpty.
      departmentId: params.departmentId ?? 'client-value-is-ignored-by-handler',
      startDate: range.startDate,
      endDate: range.endDate,
      isHalfDay: params.isHalfDay ?? false,
      reason: params.reason ?? 'Test leave request reason for e2e testing',
    });
}
