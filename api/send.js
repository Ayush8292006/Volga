// Vercel serverless function: POST /api/send  ->  sends the enquiry email with Nodemailer (Gmail SMTP)
// Set these in Vercel > Project > Settings > Environment Variables:
//   GMAIL_USER          the Gmail that sends the mail        e.g. volgalifebiosciences@gmail.com
//   GMAIL_APP_PASSWORD  16-letter Google "App password" (not the normal Gmail password)
//   TO_EMAIL            where enquiries should arrive         e.g. volgalifebiosciences@gmail.com
//   CC_EMAIL            (optional) second inbox for a copy
const nodemailer = require('nodemailer');

const ALLOWED = ['https://volgalife.com', 'https://www.volgalife.com', 'https://volga-mu.vercel.app', 'http://localhost:3000'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const one = s => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw); } catch { return Object.fromEntries(new URLSearchParams(raw)); }
}

function emailHtml({ name, phone, email, interest, message, when }) {
  const tel = phone.replace(/[^0-9+]/g, '');
  let wa = phone.replace(/\D/g, ''); if (wa.length === 10) wa = '91' + wa;
  const msg = message ? esc(message).replace(/\n/g, '<br>') : '<span style="color:#7d8fa3">No message added.</span>';
  const row = (l, v) => `<tr><td style="padding:14px 0;border-bottom:1px solid #1d2c44;font-family:Consolas,Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8ea3b9;width:150px;vertical-align:top">${l}</td><td style="padding:14px 0;border-bottom:1px solid #1d2c44;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#e9efee;vertical-align:top">${v}</td></tr>`;
  const btn = (href, label, primary) => `<a href="${href}" style="display:inline-block;${primary ? 'background:#ff5a2c;color:#1a0804;padding:13px 20px;' : 'border:1px solid #2c3d58;color:#e9efee;padding:12px 20px;'}font-family:Consolas,Menlo,monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;margin:0 8px 8px 0">${label}</a>`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#040d1c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#040d1c;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#08182e;border:1px solid #1d2c44">
<tr><td style="height:3px;background:#ff5a2c;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:28px 32px 8px"><div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:bold;letter-spacing:3px;color:#fff">VOLGA</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:4px;color:#8ea3b9;margin-top:2px">LIFE BIOSCIENCES</div></td></tr>
<tr><td style="padding:22px 32px 6px">
<div style="display:inline-block;font-family:Consolas,Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ffa27a;border:1px solid #ff5a2c;border-radius:99px;padding:6px 12px">&#9679; ${esc(interest)}</div>
<h1 style="margin:16px 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:normal;color:#fff">New enquiry from ${esc(name)}</h1>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8ea3b9">Received on ${esc(when)} via the website contact form</p></td></tr>
<tr><td style="padding:14px 32px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row('Name', esc(name))}
${row('Mobile', `<a href="tel:${esc(tel)}" style="color:#ffa27a;text-decoration:none">${esc(phone)}</a>`)}
${row('Email', `<a href="mailto:${esc(email)}" style="color:#ffa27a;text-decoration:none">${esc(email)}</a>`)}
${row('Interested in', esc(interest))}
</table></td></tr>
<tr><td style="padding:18px 32px 6px"><div style="font-family:Consolas,Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8ea3b9;margin-bottom:10px">Message</div>
<div style="background:#040d1c;border:1px solid #1d2c44;border-left:3px solid #ff5a2c;padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#e9efee">${msg}</div></td></tr>
<tr><td style="padding:22px 32px 30px">${btn(`mailto:${esc(email)}?subject=${encodeURIComponent('Re: Your enquiry with Volga Life Biosciences')}`, 'Reply by email', true)}${btn(`tel:${esc(tel)}`, 'Call')}${btn(`https://wa.me/${esc(wa)}`, 'WhatsApp')}</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #1d2c44;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#6f8297">Sent automatically from <a href="https://volgalife.com" style="color:#8ea3b9">volgalife.com</a> &middot; Volga Life Biosciences LLP &middot; GSTIN 19ABCFV2071R1ZI</td></tr>
</table></td></tr></table></body></html>`;
}

function thanksHtml({ name, interest, message }) {
  const msg = message ? esc(message).replace(/\n/g, '<br>') : '';
  return `<!doctype html><html><body style="margin:0;padding:0;background:#040d1c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#040d1c;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#08182e;border:1px solid #1d2c44">
<tr><td style="height:3px;background:#ff5a2c;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:28px 32px 8px"><div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:bold;letter-spacing:3px;color:#fff">VOLGA</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:4px;color:#8ea3b9;margin-top:2px">LIFE BIOSCIENCES</div></td></tr>
<tr><td style="padding:24px 32px 6px">
<h1 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:normal;color:#fff">Thank you, ${esc(name)}!</h1>
<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#c3cfcf">We have received your enquiry about <b style="color:#ffa27a;font-weight:normal">${esc(interest)}</b>. Our team will get back to you within two working days.</p>
${msg ? `<div style="font-family:Consolas,Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8ea3b9;margin:18px 0 10px">Your message</div><div style="background:#040d1c;border:1px solid #1d2c44;border-left:3px solid #ff5a2c;padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#e9efee">${msg}</div>` : ''}
</td></tr>
<tr><td style="padding:22px 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#c3cfcf">Need help sooner? Reach us at<br>
<a href="tel:+918910751212" style="color:#ffa27a;text-decoration:none">+91 89107 51212</a> &middot; <a href="mailto:volgalifebiosciences@gmail.com" style="color:#ffa27a;text-decoration:none">volgalifebiosciences@gmail.com</a></td></tr>
<tr><td style="padding:18px 32px 30px"><a href="https://volgalife.com" style="display:inline-block;background:#ff5a2c;color:#1a0804;font-family:Consolas,Menlo,monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:13px 20px">Visit volgalife.com</a></td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #1d2c44;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#6f8297">Volga Life Biosciences LLP &middot; Kolkata, India &middot; GSTIN 19ABCFV2071R1ZI<br>You are receiving this because you submitted the enquiry form on volgalife.com.</td></tr>
</table></td></tr></table></body></html>`;
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  if (ALLOWED.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') { // settings check: open /api/send in the browser
    const mask = e => e ? e.replace(/^(.{3}).*(.{2}@.*)$/, '$1*****$2') : 'NOT SET';
    return res.status(200).json({
      sender_GMAIL_USER: mask(process.env.GMAIL_USER),
      receiver_TO_EMAIL: process.env.TO_EMAIL ? mask(process.env.TO_EMAIL) : 'NOT SET (falls back to GMAIL_USER)',
      app_password_set: !!process.env.GMAIL_APP_PASSWORD,
      cc: process.env.CC_EMAIL ? mask(process.env.CC_EMAIL) : 'none',
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const b = await readBody(req);
    if (b.botcheck) return res.status(200).json({ success: true }); // spam trap
    const name = one(b.name), phone = one(b.phone), email = one(b.email);
    const interest = one(b.interest) || 'General enquiry';
    const message = String(b.message ?? '').trim().slice(0, 5000);
    if (!name || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length > 120 || phone.length > 30)
      return res.status(422).json({ success: false, message: 'Please fill in name, mobile and a valid email.' });

    const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });

    await transporter.sendMail({
      from: `"Volga Life Website" <${process.env.GMAIL_USER}>`,
      to: process.env.TO_EMAIL || process.env.GMAIL_USER,
      cc: process.env.CC_EMAIL || undefined,
      replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
      subject: `New enquiry: ${interest} | ${name}`,
      text: `New enquiry from ${name}\nInterested in: ${interest}\nMobile: ${phone}\nEmail: ${email}\n\nMessage:\n${message || '-'}\n\nReceived: ${when}`,
      html: emailHtml({ name, phone, email, interest, message, when }),
    });

    // confirmation to the customer (set SEND_CONFIRMATION=false in Vercel to turn it off)
    if (process.env.SEND_CONFIRMATION !== 'false') {
      try {
        await transporter.sendMail({
          from: `"Volga Life Biosciences" <${process.env.GMAIL_USER}>`,
          to: email,
          replyTo: process.env.TO_EMAIL || process.env.GMAIL_USER,
          subject: 'We received your enquiry | Volga Life Biosciences',
          text: `Hi ${name},\n\nThank you for contacting Volga Life Biosciences. We have received your enquiry about ${interest} and our team will get back to you within two working days.\n\nNeed help sooner? Call +91 89107 51212 or email volgalifebiosciences@gmail.com.\n\nVolga Life Biosciences LLP\nhttps://volgalife.com`,
          html: thanksHtml({ name, interest, message }),
        });
      } catch (e) { console.error('confirmation error:', e && e.message); } // owner mail already sent, so still success
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('send error:', err && err.message);
    return res.status(500).json({ success: false, message: 'Could not send right now.' });
  }
};

module.exports.emailHtml = emailHtml;
module.exports.thanksHtml = thanksHtml;