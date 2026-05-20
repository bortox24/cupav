const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const isValidHttpUrl = (url: string) => /^https?:\/\//i.test(url.trim());

export const buildEmailHtml = (
  titolo: string,
  testo: string,
  genitoreNome: string,
  ctaLabel?: string,
  ctaUrl?: string,
) => {
  const titoloSafe = escapeHtml(titolo);
  const testoSafe = escapeHtml(testo).replace(/\\n/g, '<br/>').replace(/\r\n|\r|\n/g, '<br/>');
  const genitoreSafe = escapeHtml(genitoreNome || 'Genitore');

  const hasCta = !!ctaLabel && !!ctaUrl && ctaLabel.trim().length > 0 && isValidHttpUrl(ctaUrl);
  const ctaLabelSafe = hasCta ? escapeHtml(ctaLabel!.trim()) : '';
  const ctaUrlSafe = hasCta ? escapeHtml(ctaUrl!.trim()) : '';

  const ctaBlock = hasCta
    ? `
      <tr>
        <td style="padding: 0 40px 32px 40px; text-align:center;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td align="center" style="background-color:#1a5c2e; border-radius:6px;">
                <a href="${ctaUrlSafe}" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block; padding:14px 32px; color:#ffffff; font-family: Arial, sans-serif; font-size:15px; font-weight:bold; text-decoration:none; border-radius:6px;">
                  ${ctaLabelSafe}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Comunicazione CUPAV 2026</title></head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding: 30px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-family: Arial, sans-serif;">
<tr><td style="background-color:#f2c10f; padding: 30px; text-align:center;">
<img src="https://lymuvosryafhpeaiqcba.supabase.co/storage/v1/object/public/branding/logo.png?t=1774111967982" alt="CUPAV" width="160" style="display:block; margin:0 auto; max-width:160px;" />
<h1 style="color:#000000; margin: 16px 0 4px 0; font-size:20px; letter-spacing:1px; font-family: Arial, sans-serif;">Campeggio Unità Pastorale Altavilla Valmarana</h1>
<p style="color:#000000; margin:0; font-size:13px; font-family: Arial, sans-serif;">CUPAV</p>
</td></tr>
<tr><td style="padding: 36px 40px 0 40px;">
<h2 style="color:#1a5c2e; margin:0 0 28px 0; font-size:22px; font-family: Arial, sans-serif;">${titoloSafe}</h2>
<p style="color:#444444; font-size:15px; line-height:1.6; margin:0; font-family: Arial, sans-serif;">Gentile <strong>${genitoreSafe}</strong>,</p>
</td></tr>
<tr><td style="padding: 4px 40px 32px 40px;">
<p style="color:#444444; font-size:15px; line-height:1.8; margin:0; font-family: Arial, sans-serif;">${testoSafe}</p>
</td></tr>
${ctaBlock}
<tr><td style="padding: 0 40px 30px 40px; text-align:center;">
<p style="color:#888888; font-size:13px; line-height:1.7; margin:0; font-family: Arial, sans-serif;">Per qualsiasi domanda o informazione contattaci a<br/>cupavdirettivo@gmail.com</p>
</td></tr>
<tr><td style="background-color:#1a5c2e; padding: 24px 40px; text-align:center;">
<p style="color:#c8e6c9; font-size:12px; margin:0 0 6px 0; font-family: Arial, sans-serif;"><strong style="color:#ffffff;">CUPAV</strong> — Campeggio Unità Pastorale Altavilla Valmarana</p>
<p style="color:#a5d6a7; font-size:11px; margin:0; font-family: Arial, sans-serif;">Questa è un'email automatica di comunicazione.</p>
</td></tr>
</table></td></tr></table></body></html>`;
};
