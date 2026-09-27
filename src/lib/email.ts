import "server-only";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderEmailHtml(body: string, churchName: string) {
  const paragraphs = escapeHtml(body)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto">
<div style="border-bottom:3px solid #244680;padding:16px 0;margin-bottom:24px;font-size:18px;font-weight:bold;color:#152a4d">${escapeHtml(churchName)}</div>
${paragraphs}
<p style="margin-top:32px;font-size:12px;color:#64748b">You are receiving this because you are on the ${escapeHtml(churchName)} register.</p>
</div>`;
}

/** Sends one email per recipient (so addresses stay private) via Resend's batch API. Returns how many were accepted. */
export async function sendBulkEmail(recipients: string[], subject: string, body: string, churchName: string): Promise<number> {
  const html = renderEmailHtml(body, churchName);
  let sent = 0;
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(chunk.map((to) => ({ from: process.env.EMAIL_FROM, to: [to], subject, text: body, html }))),
    });
    if (!res.ok) {
      console.error("Resend batch failed", res.status, await res.text());
      break;
    }
    sent += chunk.length;
  }
  return sent;
}
