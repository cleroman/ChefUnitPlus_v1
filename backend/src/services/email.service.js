// =============================================================
// ChefUnitPlus - Service Email (Gmail SMTP)
// Envoi d'emails via Nodemailer + Gmail
// =============================================================
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn('[email.service] GMAIL_USER ou GMAIL_APP_PASSWORD non configure');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  console.log('[email.service] Gmail SMTP pret : ' + user);
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) return { success: false, error: 'Gmail non configure' };

  try {
    const from = '"ChefUnitPlus" <' + process.env.GMAIL_USER + '>';
    const info = await t.sendMail({ from, to, subject, html, text });
    console.log('[email.service] Envoye a ' + to + ' (' + info.messageId + ')');
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[email.service] Erreur :', err.message);
    return { success: false, error: err.message };
  }
}

async function sendActivationEmail({ to, fullName }) {
  const name = fullName || 'Cher membre';
  const loginUrl = process.env.APP_URL || 'https://chefunitplus-v1-0.onrender.com';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #6B4E8C; text-align: center;">ChefUnitPlus</h1>
      <div style="background: #F5F0FA; border-radius: 12px; padding: 30px; text-align: center;">
        <div style="font-size: 60px;">&#127881;</div>
        <h2 style="color: #2E7D32;">Felicitations ${name} !</h2>
        <p style="font-size: 16px; color: #555;">
          Votre compte a ete <strong>valide par notre equipe</strong>.
        </p>
      </div>
      <div style="margin: 30px 0; padding: 20px; background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px;">
        <h3>Vous pouvez maintenant :</h3>
        <ul style="color: #555; line-height: 1.8;">
          <li>Vous connecter avec votre email et mot de passe</li>
          <li>Acceder a toutes les formations disponibles</li>
          <li>Suivre votre progression</li>
          <li>Obtenir vos certificats</li>
        </ul>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: #6B4E8C; color: #FFFFFF; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Se connecter
        </a>
      </div>
      <div style="text-align: center; color: #999; font-size: 12px; border-top: 1px solid #EEE; padding-top: 20px;">
        <p>Merci de votre confiance,</p>
        <p><strong>L'equipe ChefUnitPlus</strong></p>
      </div>
    </div>
  `;

  const text = `Felicitations ${name} !

Votre compte ChefUnitPlus a ete valide.

Connectez-vous : ${loginUrl}

L'equipe ChefUnitPlus`;

  return sendMail({
    to,
    subject: 'Felicitations ! Votre compte ChefUnitPlus est active',
    html,
    text,
  });
}

module.exports = { sendMail, sendActivationEmail };