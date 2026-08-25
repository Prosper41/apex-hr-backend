export function leaveNotificationTemplate(
  subject: string,
  message: string,
  viewLink: string,
): string {
  return `
    <h2>${subject}</h2>
    <p>${message}</p>
    <p>
      <a href="${viewLink}"
         style="display:inline-block;padding:12px 24px;background:#1E3A5F;color:#fff;
                text-decoration:none;border-radius:6px;font-weight:bold;">
        View Leave Request
      </a>
    </p>
    <p>This is an automated notification from ApexHR. If the button above doesn't work, copy this link:</p>
    <p>${viewLink}</p>
  `;
}
