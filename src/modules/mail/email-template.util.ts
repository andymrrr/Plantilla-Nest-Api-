export interface TransactionalEmailShellParams {
  brandName?: string;
  preheader: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  footerNote?: string;
  tone?: TransactionalEmailTone;
}

export type TransactionalEmailTone = 'neutral' | 'success' | 'warning';
export type EmailCardTone = 'neutral' | 'success' | 'warning';

const DEFAULT_BRAND_NAME = 'Mi Aplicación';

const EMAIL_TONE_STYLES: Record<
  TransactionalEmailTone,
  { headerBackground: string; footerBackground: string }
> = {
  neutral: {
    headerBackground: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    footerBackground: '#f8fafc',
  },
  success: {
    headerBackground: 'linear-gradient(135deg,#0f766e,#16a34a)',
    footerBackground: '#f0fdf4',
  },
  warning: {
    headerBackground: 'linear-gradient(135deg,#b45309,#d97706)',
    footerBackground: '#fffbeb',
  },
};

const EMAIL_CARD_STYLES: Record<
  EmailCardTone,
  { background: string; border: string; text: string }
> = {
  neutral: {
    background: '#f8fafc',
    border: '#e2e8f0',
    text: '#334155',
  },
  success: {
    background: '#f0fdf4',
    border: '#86efac',
    text: '#14532d',
  },
  warning: {
    background: '#fffbeb',
    border: '#fcd34d',
    text: '#92400e',
  },
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildTransactionalEmailShell(
  params: TransactionalEmailShellParams,
): string {
  const {
    brandName = DEFAULT_BRAND_NAME,
    preheader,
    eyebrow,
    title,
    subtitle,
    body,
    footerNote,
    tone = 'neutral',
  } = params;
  const styles = EMAIL_TONE_STYLES[tone];
  const safeBrand = escapeHtml(brandName);
  const defaultFooter = `Este mensaje fue enviado automáticamente por ${safeBrand}.`;

  return `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:${styles.headerBackground};padding:20px 24px;color:#ffffff;">
                <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.2px;">${safeBrand}</p>
                <p style="margin:8px 0 0 0;font-size:13px;opacity:0.92;">${escapeHtml(eyebrow)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 10px 0;font-size:22px;line-height:1.3;color:#111827;">${escapeHtml(title)}</h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.65;color:#334155;">${subtitle}</p>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px;border-top:1px solid #e2e8f0;background:${styles.footerBackground};">
                <p style="margin:0;font-size:12px;line-height:1.55;color:#64748b;">
                  ${footerNote ?? defaultFooter}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

export function buildInfoCard(params: {
  title?: string;
  content: string;
  tone?: EmailCardTone;
}): string {
  const { title, content, tone = 'neutral' } = params;
  const styles = EMAIL_CARD_STYLES[tone];
  const titleHtml = title
    ? `<p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#0f172a;">${escapeHtml(title)}</p>`
    : '';

  return `
<div style="padding:14px 16px;border-radius:12px;background:${styles.background};border:1px solid ${styles.border};margin:0 0 16px 0;">
  ${titleHtml}
  <div style="margin:0;font-size:13px;line-height:1.65;color:${styles.text};">${content}</div>
</div>`.trim();
}

export function buildHighlightBox(params: {
  content: string;
  tone?: EmailCardTone;
}): string {
  const { content, tone = 'neutral' } = params;
  const styles = EMAIL_CARD_STYLES[tone];
  return `
<div style="padding:12px 14px;border-radius:10px;background:${styles.background};border:1px solid ${styles.border};margin:0 0 14px 0;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:${styles.text};">
    ${content}
  </p>
</div>`.trim();
}
