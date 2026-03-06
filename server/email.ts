import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    console.warn("[email] SMTP not configured — emails will be logged to console only");
    console.warn(`[email] Missing vars: host=${!!host} user=${!!user} pass=${!!pass}`);
    return null;
  }

  console.log(`[email] SMTP config: host=${host} port=${port} secure=${secure} user=${user}`);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

export async function testSmtpConnection(): Promise<void> {
  const transport = createTransport();
  if (!transport) return;
  try {
    await transport.verify();
    console.log("[email] ✓ SMTP connection verified successfully");
  } catch (err: any) {
    console.error("[email] ✗ SMTP connection FAILED:", err.message);
  }
}

const FROM_ADDRESS = process.env.SMTP_FROM || "noreply@fermenta.to";
const APP_URL = process.env.APP_URL || "https://fermenta.to";

function verificationEmailHtml(verificationUrl: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conferma il tuo account Fermenta.to</title>
</head>
<body style="margin:0;padding:0;background:#fafaf8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b,#ea580c);padding:40px 40px 32px;text-align:center;">
              <div style="font-size:48px;margin-bottom:8px;">🍺</div>
              <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0 0 8px;">Fermenta.to</h1>
              <p style="color:rgba(255,255,255,0.9);font-size:15px;margin:0;">La birra artigianale italiana</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1f2937;font-size:22px;font-weight:600;margin:0 0 16px;">Conferma il tuo indirizzo email</h2>
              <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">
                Benvenuto su Fermenta.to! Clicca sul pulsante qui sotto per verificare il tuo indirizzo email e attivare il tuo account.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${verificationUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                  ✉️ Conferma email
                </a>
              </div>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:24px 0 0;">
                Il link è valido per <strong>24 ore</strong>. Se non hai creato un account su Fermenta.to, puoi ignorare questa email.
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                Se il pulsante non funziona, copia e incolla questo link nel browser:<br>
                <a href="${verificationUrl}" style="color:#f59e0b;word-break:break-all;">${verificationUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Fermenta.to — La birra artigianale italiana<br>
                <a href="${APP_URL}" style="color:#f59e0b;text-decoration:none;">fermenta.to</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(toEmail: string, token: string): Promise<void> {
  const verificationUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;
  const transport = createTransport();

  if (!transport) {
    console.log(`[email] VERIFICA EMAIL → ${toEmail}`);
    console.log(`[email] Link verifica: ${verificationUrl}`);
    return;
  }

  await transport.sendMail({
    from: `"Fermenta.to" <${FROM_ADDRESS}>`,
    to: toEmail,
    subject: "Conferma il tuo account Fermenta.to",
    html: verificationEmailHtml(verificationUrl),
    text: `Benvenuto su Fermenta.to!\n\nConferma il tuo account cliccando qui:\n${verificationUrl}\n\nIl link è valido per 24 ore.`,
  });

  console.log(`[email] Email di verifica inviata a ${toEmail}`);
}
