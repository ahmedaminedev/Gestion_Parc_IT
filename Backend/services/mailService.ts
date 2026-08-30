import nodemailer from 'nodemailer';
import { EmailLog } from '../models/EmailLog';

export interface SendWelcomeMailParams {
  destinataireEmail?: string;
  email?: string;
  destinataireNom?: string;
  beneficiaire?: string;
  motDePasse?: string;
  tempPassword?: string;
  accesApp?: 'GLOBAL_BACKOFFICE' | 'ESPACE_RECLAMATIONS' | string;
  roleNom?: string;
  role?: string;
}

export function isSmtpConfigured(): boolean {
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();
  return Boolean(host && user && pass);
}

export function getSmtpConfigSummary() {
  const configured = isSmtpConfigured();
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = (process.env.SMTP_USER || '').trim();
  const maskedUser = user ? user.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 'Non configuré';
  const from = (process.env.SMTP_FROM || `Support Parc IT OMODA & JAECOO <${user || 'support@omoda-jaecoo.tn'}>`).trim();

  return {
    configured,
    host,
    port,
    user: maskedUser,
    from,
    mode: configured ? 'SMTP Réel Actif (Gmail)' : 'Simulation locale (identifiants SMTP manquants dans .env)',
  };
}

async function getMailTransporter(): Promise<nodemailer.Transporter | null> {
  if (!isSmtpConfigured()) {
    return null;
  }

  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = (process.env.SMTP_USER || '').trim();
  // Strip whitespace from Gmail app passwords (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });
}

export function generateWelcomeEmailHtml(params: SendWelcomeMailParams): string {
  const destinataireEmail = params.destinataireEmail || params.email || '';
  const destinataireNom = params.destinataireNom || params.beneficiaire || 'Collaborateur';
  const motDePasse = params.motDePasse || params.tempPassword || '••••••••';
  const accesApp = params.accesApp || 'ESPACE_RECLAMATIONS';
  const roleNom = params.roleNom || params.role || '';

  const isDSI = accesApp === 'GLOBAL_BACKOFFICE';
  const roleLabel = roleNom || (isDSI ? 'Responsable IT / Admin' : 'Collaborateur OMODA | JAECOO');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bienvenue sur OMODA | JAECOO Backoffice</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c1017; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #161c24; border: 1px solid #2d3748; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0c1017 0%, #1a2230 100%); padding: 30px 24px; text-align: center; border-bottom: 2px solid #ef4444; }
    .logo-text { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #ffffff; margin: 0; }
    .logo-text span { color: #ef4444; }
    .sub-brand { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #94a3b8; margin-top: 6px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 16px; }
    .message { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
    .credentials-box { background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .cred-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
    .cred-label { color: #94a3b8; font-weight: 600; }
    .cred-value { color: #38bdf8; font-weight: 700; font-family: monospace; }
    .cred-pwd { color: #f43f5e; font-weight: 900; letter-spacing: 1px; }
    .btn-login { display: inline-block; background-color: #ef4444; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-align: center; margin: 10px 0 20px 0; }
    .footer { padding: 20px 24px; background-color: #0c1017; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">OMODA <span>|</span> JAECOO</div>
      <div class="sub-brand">Direction des Systèmes d'Information • Tunisie</div>
    </div>
    <div class="content">
      <div class="greeting">Bonjour ${destinataireNom},</div>
      <p class="message">
        Bienvenue dans l'application <strong>OMODA | JAECOO Backoffice</strong>. Vous êtes désormais configuré comme utilisateur avec accès à la plateforme.
      </p>
      
      <div class="credentials-box">
        <div style="font-size: 12px; font-weight: bold; color: #e2e8f0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
          Vos Identifiants de Connexion
        </div>
        <div style="margin-bottom: 8px;">
          <span style="color: #94a3b8; font-size: 12px;">Email professionnel :</span><br/>
          <span style="color: #ffffff; font-size: 14px; font-weight: bold;">${destinataireEmail}</span>
        </div>
        <div style="margin-bottom: 8px;">
          <span style="color: #94a3b8; font-size: 12px;">Mot de passe temporaire :</span><br/>
          <span style="color: #f43f5e; font-size: 16px; font-weight: 900; font-family: monospace; background: rgba(244,63,94,0.1); padding: 2px 8px; border-radius: 6px; display: inline-block; margin-top: 2px;">${motDePasse}</span>
        </div>
        <div>
          <span style="color: #94a3b8; font-size: 12px;">Rôle / Accès attribué :</span><br/>
          <span style="color: #38bdf8; font-size: 13px; font-weight: 600;">${roleLabel} (${isDSI ? 'Backoffice Global IT' : 'Espace Réclamations & Matériels'})</span>
        </div>
      </div>

      <p class="message" style="font-size: 13px; color: #94a3b8;">
        Merci d'entrer votre email professionnel avec le mot de passe ci-dessus lors de votre première connexion. Vous pourrez ensuite suivre vos réclamations et vos matériels en temps réel.
      </p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} OMODA & JAECOO Tunisie. Direction des Systèmes d'Information (DSI). Ce message est confidentiel.
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendWelcomeEmail(params: SendWelcomeMailParams): Promise<{
  success: boolean;
  isSimulation: boolean;
  message: string;
  emailLog?: any;
  error?: string;
}> {
  const destinataireEmail = (params.destinataireEmail || params.email || '').toLowerCase().trim();
  const destinataireNom = params.destinataireNom || params.beneficiaire || 'Collaborateur';
  const motDePasse = params.motDePasse || params.tempPassword || '';
  const html = generateWelcomeEmailHtml(params);
  const sujet = "Bienvenue dans l'application OMODA | JAECOO Backoffice - Vos identifiants d'accès";

  if (!isSmtpConfigured()) {
    console.warn(
      `[MAIL SERVICE ⚠️ SIMULATION] SMTP_USER ou SMTP_PASS n'est pas renseigné dans Backend/.env ou .env. ` +
      `L'email pour ${destinataireEmail} a été simulé et archivé dans le journal d'audit (Mot de passe: ${motDePasse}).`
    );

    const log = await EmailLog.create({
      destinataireEmail,
      destinataireNom,
      sujet,
      contenuHtml: html,
      type: 'BIENVENUE_USER',
      statut: 'Simulation (SMTP non configuré)',
      errorMessage: 'SMTP_USER ou SMTP_PASS non renseigné dans Backend/.env (Simulation)',
      tempPasswordPreview: motDePasse,
      dateEnvoi: new Date(),
    });

    return {
      success: true,
      isSimulation: true,
      message: `Email simulé avec succès pour ${destinataireEmail} (SMTP non configuré dans .env).`,
      emailLog: log,
    };
  }

  let statutEnvoi: 'Envoyé' | "Échec d'envoi" = 'Envoyé';
  let errorMessage = '';
  let messageId: string | undefined;

  try {
    const transporter = await getMailTransporter();
    if (!transporter) throw new Error('Impossible d\'initialiser le transporteur SMTP.');

    const fromAddress = process.env.SMTP_FROM || `Support Parc IT <${process.env.SMTP_USER}>`;
    const info = await transporter.sendMail({
      from: fromAddress,
      to: destinataireEmail,
      subject: sujet,
      html: html,
    });
    messageId = info?.messageId;
    console.log(`[MAIL SERVICE 📧] ✅ Email de bienvenue délivré avec succès via SMTP à ${destinataireEmail} (Msg ID: ${messageId})`);
  } catch (err: any) {
    errorMessage = err?.message || String(err);
    statutEnvoi = "Échec d'envoi";
    console.error(`[MAIL SERVICE ❌ ERREUR SMTP] Échec de l'envoi de l'email à ${destinataireEmail}:`, errorMessage);
  }

  const log = await EmailLog.create({
    destinataireEmail,
    destinataireNom,
    sujet,
    contenuHtml: html,
    type: 'BIENVENUE_USER',
    statut: statutEnvoi,
    errorMessage: errorMessage || undefined,
    tempPasswordPreview: motDePasse,
    dateEnvoi: new Date(),
  });

  return {
    success: statutEnvoi === 'Envoyé',
    isSimulation: false,
    message: statutEnvoi === 'Envoyé'
      ? `Email envoyé avec succès via SMTP à ${destinataireEmail}`
      : `Échec d'envoi SMTP: ${errorMessage}`,
    emailLog: log,
    error: errorMessage || undefined,
  };
}

export async function testSmtpConnection(testRecipient?: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  if (!isSmtpConfigured()) {
    return {
      success: false,
      message: 'SMTP non configuré : SMTP_USER et SMTP_PASS sont vides dans votre fichier .env ou Backend/.env.',
      details: getSmtpConfigSummary(),
    };
  }

  try {
    const transporter = await getMailTransporter();
    if (!transporter) throw new Error('Impossible de créer le transporteur SMTP.');

    await transporter.verify();

    if (testRecipient && testRecipient.includes('@')) {
      const fromAddress = process.env.SMTP_FROM || `Support Parc IT <${process.env.SMTP_USER}>`;
      await transporter.sendMail({
        from: fromAddress,
        to: testRecipient.trim().toLowerCase(),
        subject: 'Test de connexion SMTP - OMODA & JAECOO IT Park',
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #0c1017; color: #fff; border-radius: 10px;">
            <h2 style="color: #ef4444;">OMODA | JAECOO</h2>
            <p>Le test de connexion du serveur SMTP a réussi avec succès.</p>
            <p style="color: #38bdf8;">Date du test : ${new Date().toLocaleString('fr-FR')}</p>
          </div>
        `,
      });
    }

    return {
      success: true,
      message: 'Connexion SMTP vérifiée avec succès !' + (testRecipient ? ` Email de test envoyé à ${testRecipient}` : ''),
      details: getSmtpConfigSummary(),
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erreur de connexion SMTP : ${err.message || err}`,
      details: {
        ...getSmtpConfigSummary(),
        error: err.message,
      },
    };
  }
}

// ================= EMAIL: MOT DE PASSE MODIFIÉ =================
export function generatePasswordChangedEmailHtml(params: {
  destinataireNom: string;
  destinataireEmail: string;
  dateModification?: Date;
  methode?: 'ANCIEN_MOT_DE_PASSE' | 'CODE_OTP';
}): string {
  const dateStr = (params.dateModification || new Date()).toLocaleString('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });
  const methodeLabel = params.methode === 'CODE_OTP' 
    ? 'Réinitialisation sécurisée par Code de vérification (OTP)' 
    : 'Modification directe via l\'ancien mot de passe';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Sécurité : Mot de passe modifié</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c1017; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #161c24; border: 1px solid #2d3748; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0c1017 0%, #1a2230 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid #10b981; }
    .logo-text { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #ffffff; margin: 0; }
    .logo-text span { color: #10b981; }
    .sub-brand { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #94a3b8; margin-top: 6px; }
    .content { padding: 32px 24px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; background-color: rgba(16,185,129,0.15); color: #34d399; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; border: 1px solid rgba(16,185,129,0.3); margin-bottom: 20px; }
    .greeting { font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 14px; }
    .message { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px; }
    .info-box { background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
    .info-row { margin-bottom: 8px; font-size: 13px; color: #cbd5e1; }
    .info-label { color: #94a3b8; font-weight: 600; font-size: 12px; }
    .info-value { color: #f1f5f9; font-weight: 600; margin-top: 2px; }
    .alert-box { background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; color: #fca5a5; line-height: 1.5; }
    .footer { padding: 20px 24px; background-color: #0c1017; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">OMODA <span>|</span> JAECOO</div>
      <div class="sub-brand">Direction des Systèmes d'Information • Sécurité des Comptes</div>
    </div>
    <div class="content">
      <div class="status-badge">
        ✓ Mot de passe mis à jour avec succès
      </div>
      <div class="greeting">Bonjour ${params.destinataireNom},</div>
      <p class="message">
        Nous vous confirmons que le mot de passe associé à votre compte professionnel <strong>OMODA | JAECOO</strong> a été modifié avec succès.
      </p>
      
      <div class="info-box">
        <div style="font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
          Détails de l'opération
        </div>
        <div class="info-row">
          <div class="info-label">Compte utilisateur :</div>
          <div class="info-value">${params.destinataireEmail}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Date & Heure :</div>
          <div class="info-value">${dateStr}</div>
        </div>
        <div class="info-row" style="margin-bottom: 0;">
          <div class="info-label">Méthode employée :</div>
          <div class="info-value" style="color: #38bdf8;">${methodeLabel}</div>
        </div>
      </div>

      <div class="alert-box">
        <strong>⚠️ Vous n'êtes pas à l'origine de cette modification ?</strong><br/>
        Si vous n'avez pas demandé ce changement, votre compte a peut-être été compromis. Contactez immédiatement votre Responsable IT ou la Direction des Systèmes d'Information.
      </div>

      <p class="message" style="font-size: 13px; color: #94a3b8; margin-bottom: 0;">
        Ce message automatique a été généré pour assurer la sécurité et la traçabilité de votre accès.
      </p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} OMODA & JAECOO Tunisie • Direction des Systèmes d'Information (DSI)
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendPasswordChangedEmail(params: {
  email: string;
  beneficiaire: string;
  methode?: 'ANCIEN_MOT_DE_PASSE' | 'CODE_OTP';
}): Promise<{ success: boolean; isSimulation: boolean; message: string; emailLog?: any }> {
  const destinataireEmail = params.email.toLowerCase().trim();
  const destinataireNom = params.beneficiaire || 'Collaborateur';
  const html = generatePasswordChangedEmailHtml({
    destinataireEmail,
    destinataireNom,
    methode: params.methode || 'ANCIEN_MOT_DE_PASSE',
  });
  const sujet = 'Sécurité du compte : Votre mot de passe OMODA | JAECOO a été modifié';

  if (!isSmtpConfigured()) {
    const log = await EmailLog.create({
      destinataireEmail,
      destinataireNom,
      sujet,
      contenuHtml: html,
      type: 'PASSWORD_CHANGED',
      statut: 'Simulation (SMTP non configuré)',
      errorMessage: 'SMTP non configuré (Mode simulation)',
      dateEnvoi: new Date(),
    });

    return {
      success: true,
      isSimulation: true,
      message: `Notification de changement de mot de passe simulée pour ${destinataireEmail}`,
      emailLog: log,
    };
  }

  let statutEnvoi: 'Envoyé' | "Échec d'envoi" = 'Envoyé';
  let errorMessage = '';

  try {
    const transporter = await getMailTransporter();
    if (!transporter) throw new Error('Impossible d\'initialiser le transporteur SMTP.');

    const fromAddress = process.env.SMTP_FROM || `Support Parc IT <${process.env.SMTP_USER}>`;
    await transporter.sendMail({
      from: fromAddress,
      to: destinataireEmail,
      subject: sujet,
      html,
    });
  } catch (err: any) {
    errorMessage = err?.message || String(err);
    statutEnvoi = "Échec d'envoi";
    console.error(`[MAIL SERVICE ❌] Erreur envoi confirmation mot de passe à ${destinataireEmail}:`, errorMessage);
  }

  const log = await EmailLog.create({
    destinataireEmail,
    destinataireNom,
    sujet,
    contenuHtml: html,
    type: 'PASSWORD_CHANGED',
    statut: statutEnvoi,
    errorMessage: errorMessage || undefined,
    dateEnvoi: new Date(),
  });

  return {
    success: statutEnvoi === 'Envoyé',
    isSimulation: false,
    message: statutEnvoi === 'Envoyé'
      ? `Email de confirmation envoyé avec succès à ${destinataireEmail}`
      : `Échec d'envoi SMTP: ${errorMessage}`,
    emailLog: log,
  };
}

// ================= EMAIL: CODE OTP POUR MOT DE PASSE OUBLIÉ =================
export function generateOtpResetEmailHtml(params: {
  destinataireNom: string;
  destinataireEmail: string;
  otpCode: string;
  expiresMinutes?: number;
}): string {
  const expiresMin = params.expiresMinutes || 15;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Code de vérification OTP - Réinitialisation mot de passe</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c1017; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #161c24; border: 1px solid #2d3748; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0c1017 0%, #1a2230 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid #ef4444; }
    .logo-text { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #ffffff; margin: 0; }
    .logo-text span { color: #ef4444; }
    .sub-brand { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #94a3b8; margin-top: 6px; }
    .content { padding: 32px 24px; text-align: center; }
    .greeting { font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 14px; text-align: left; }
    .message { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; text-align: left; }
    .otp-card { background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); border: 2px dashed #ef4444; border-radius: 14px; padding: 24px; margin: 24px 0; display: inline-block; width: calc(100% - 48px); max-width: 420px; }
    .otp-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 8px; }
    .otp-code { font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #f87171; font-family: monospace; text-shadow: 0 0 20px rgba(239,68,68,0.3); }
    .otp-expiry { font-size: 12px; color: #facc15; margin-top: 10px; font-weight: 600; }
    .security-notice { text-align: left; background-color: #0f172a; border-radius: 10px; padding: 14px 16px; margin-top: 20px; font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .footer { padding: 20px 24px; background-color: #0c1017; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">OMODA <span>|</span> JAECOO</div>
      <div class="sub-brand">Direction des Systèmes d'Information • Authentification Sécurisée</div>
    </div>
    <div class="content">
      <div class="greeting">Bonjour ${params.destinataireNom},</div>
      <p class="message">
        Une demande de réinitialisation de mot de passe a été initiée pour votre compte <strong>${params.destinataireEmail}</strong>. Utilisez le code de vérification sécurisé à usage unique (OTP) ci-dessous pour finaliser l'opération :
      </p>
      
      <div class="otp-card">
        <div class="otp-label">Votre Code de Sécurité (OTP)</div>
        <div class="otp-code">${params.otpCode}</div>
        <div class="otp-expiry">⏱️ Ce code expire dans ${expiresMin} minutes</div>
      </div>

      <div class="security-notice">
        <strong style="color: #f1f5f9;">🛡️ Règle de sécurité stricte :</strong><br/>
        Ne communiquez jamais ce code. Les administrateurs et le support IT d'OMODA | JAECOO ne vous demanderont jamais votre code OTP ni votre mot de passe.
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} OMODA & JAECOO Tunisie • Direction des Systèmes d'Information (DSI)
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendOtpResetEmail(params: {
  email: string;
  beneficiaire: string;
  otpCode: string;
  expiresMinutes?: number;
}): Promise<{ success: boolean; isSimulation: boolean; message: string; emailLog?: any }> {
  const destinataireEmail = params.email.toLowerCase().trim();
  const destinataireNom = params.beneficiaire || 'Collaborateur';
  const html = generateOtpResetEmailHtml({
    destinataireEmail,
    destinataireNom,
    otpCode: params.otpCode,
    expiresMinutes: params.expiresMinutes || 15,
  });
  const sujet = `Code de vérification [${params.otpCode}] - Réinitialisation mot de passe OMODA | JAECOO`;

  if (!isSmtpConfigured()) {
    const log = await EmailLog.create({
      destinataireEmail,
      destinataireNom,
      sujet,
      contenuHtml: html,
      type: 'OTP_RESET_PASSWORD',
      statut: 'Simulation (SMTP non configuré)',
      errorMessage: 'SMTP non configuré (Mode simulation)',
      tempPasswordPreview: `OTP: ${params.otpCode}`,
      dateEnvoi: new Date(),
    });

    return {
      success: true,
      isSimulation: true,
      message: `Code OTP généré avec succès pour ${destinataireEmail} (Simulation: ${params.otpCode})`,
      emailLog: log,
    };
  }

  let statutEnvoi: 'Envoyé' | "Échec d'envoi" = 'Envoyé';
  let errorMessage = '';

  try {
    const transporter = await getMailTransporter();
    if (!transporter) throw new Error('Impossible d\'initialiser le transporteur SMTP.');

    const fromAddress = process.env.SMTP_FROM || `Support Parc IT <${process.env.SMTP_USER}>`;
    await transporter.sendMail({
      from: fromAddress,
      to: destinataireEmail,
      subject: sujet,
      html,
    });
  } catch (err: any) {
    errorMessage = err?.message || String(err);
    statutEnvoi = "Échec d'envoi";
    console.error(`[MAIL SERVICE ❌] Erreur envoi code OTP à ${destinataireEmail}:`, errorMessage);
  }

  const log = await EmailLog.create({
    destinataireEmail,
    destinataireNom,
    sujet,
    contenuHtml: html,
    type: 'OTP_RESET_PASSWORD',
    statut: statutEnvoi,
    errorMessage: errorMessage || undefined,
    tempPasswordPreview: `OTP: ${params.otpCode}`,
    dateEnvoi: new Date(),
  });

  return {
    success: statutEnvoi === 'Envoyé',
    isSimulation: false,
    message: statutEnvoi === 'Envoyé'
      ? `Code OTP envoyé avec succès à ${destinataireEmail}`
      : `Échec d'envoi SMTP: ${errorMessage}`,
    emailLog: log,
  };
}

