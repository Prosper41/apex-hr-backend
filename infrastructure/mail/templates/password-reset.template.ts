export function passwordResetTemplate(
  firstName: string,
  resetLink: string,
): string {
  return `
    <h2>Password Reset Request</h2>
    <p>Hi ${firstName},</p>
    <p>We received a request to reset your ApexHR password.</p>
    <p>Click the button below to set a new password:</p>
    <p>
      <a href="${resetLink}"
         style="display:inline-block;padding:12px 24px;background:#1E3A5F;color:#fff;
                text-decoration:none;border-radius:6px;font-weight:bold;">
        Reset My Password
      </a>
    </p>
    <p>Or copy this link into your browser:</p>
    <p>${resetLink}</p>
    <p>This link contains a one-time token. Once used it will no longer be valid.</p>
    <p>If you did not request a password reset, ignore this email — your password will not change.</p>
  `;
}
