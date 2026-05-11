import nodemailer from 'nodemailer'

/** True when outbound mail can be sent (configure in .env — never commit secrets). */
export function mailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim(),
  )
}

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (!mailConfigured()) return null
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587)
    const secure = process.env.SMTP_SECURE === 'true'
    const debug = process.env.SMTP_DEBUG === '1' || process.env.SMTP_DEBUG === 'true'

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER!.trim(),
        pass: process.env.SMTP_PASS!.trim().replace(/\s+/g, ''),
      },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      tls: {
        minVersion: 'TLSv1.2',
      },
      requireTLS: !secure && port === 587,
      debug,
      logger: debug,
    })
  }
  return transporter
}

export async function sendMail(opts: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<{ ok: boolean; skipped: boolean; err?: string }> {
  const t = getTransporter()
  if (!t) {
    console.warn('[mail] SMTP not configured, skip:', opts.subject)
    return { ok: false, skipped: true }
  }
  const fromAddr = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER!.trim()
  try {
    await t.sendMail({
      from: `Tanit Talent <${fromAddr}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    })
    return { ok: true, skipped: false }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[mail]', msg)
    return { ok: false, skipped: false, err: msg }
  }
}
