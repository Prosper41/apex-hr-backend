export function tenantWelcomeTemplate(
  firstName: string,
  tenantName: string,
  tempPassword: string,
  pageLink: string,
): string {
  return `
    <div style="font-family: Arial, sans-serif; color:#333;">
      
      <h2 style="color:#1E3A5F;">
        Welcome to ApexHR, ${firstName}!
      </h2>

      <p>
        Your company <strong>${tenantName}</strong> has been successfully registered.
      </p>

      <p>
        Your temporary password is:
        <strong>${tempPassword}</strong>
      </p>

      <p>
        Please log in using the button below:
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
        Visit ApexHR
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
