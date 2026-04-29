import nodemailer from "nodemailer";

function transport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const t = transport();
  const from = process.env.MAIL_FROM || "Property CRM <noreply@localhost>";

  if (!t) {
    if (process.env.NODE_ENV === "development") {
      console.log("[email skipped—no SMTP]", opts.subject, "→", opts.to);
    }
    return { ok: true, skipped: true };
  }

  await t.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  return { ok: true };
}

export function templateNewLead(params: {
  leadName: string;
  priority: string;
  dashboardUrl: string;
}) {
  const html = `
  <div style="font-family:system-ui,sans-serif;line-height:1.5">
    <h2>New lead alert</h2>
    <p><strong>${escapeHtml(params.leadName)}</strong> was added with priority <strong>${escapeHtml(params.priority)}</strong>.</p>
    <p><a href="${params.dashboardUrl}">Open CRM dashboard</a></p>
  </div>`;
  return html;
}

export function templateAssignment(params: {
  agentName: string;
  leadName: string;
  leadUrl: string;
}) {
  const html = `
  <div style="font-family:system-ui,sans-serif;line-height:1.5">
    <h2>Lead assigned to you</h2>
    <p>Hi ${escapeHtml(params.agentName)},</p>
    <p>The lead <strong>${escapeHtml(params.leadName)}</strong> has been assigned to you.</p>
    <p><a href="${params.leadUrl}">View lead</a></p>
  </div>`;
  return html;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
