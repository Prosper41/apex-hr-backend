export function userWelcomeTemplate(
  pageLink: string,
  firstName: string,
  tenantName: string,
  tempPassword: string,
  email: string,
): string {
  return `
    <div style="font-family: Arial, sans-serif; color:#333;">

      <h2 style="color:#1E3A5F;">
        Welcome to ApexHR, ${firstName}!
      </h2>

      <p>
        You have been added to 
        <strong>${tenantName}</strong> on ApexHR.
      </p>

      <p>
        You can access your account using the credentials below:
      </p>

      <p>
        <strong>Email:</strong> ${email}<br>
        <strong>Temporary Password:</strong> ${tempPassword}
      </p>

      <p>
        Please click the button below to log in:
      </p>

      <a 
        href="${pageLink}"
        style="
          display:inline-block;
          padding:12px 24px;
          background:#1E3A5F;
          color:#ffffff;
          text-decoration:none;
          border-radius:6px;
          font-weight:bold;
        "
      >
        Login to ApexHR
      </a>

      <p style="margin-top:20px;">
        You will be required to change your password after your first login.
      </p>

      <p>
        For security reasons, do not share your password with anyone.
      </p>

      <p>
        Regards,<br>
        ApexHR Team
      </p>

    </div>
  `;
}
