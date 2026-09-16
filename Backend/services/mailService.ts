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

export interface SendAccountUpdatedMailParams {
  email: string;
  beneficiaire: string;
  role: string;
  accesApp: string;
  passwordUpdated?: boolean;
  newPassword?: string;
  statut?: string;
  emplacementNom?: string;
}

export interface SendTicketCreatedMailParams {
  demandeurEmail: string;
  demandeurNom: string;
  code: string;
  titre: string;
  description: string;
  priorite: string;
  slaHours?: number;
  dateEcheanceSla?: Date;
}

export interface SendTicketStatusMailParams {
  demandeurEmail: string;
  demandeurNom: string;
  code: string;
  titre: string;
  nouveauStatut: string;
  technicienNom?: string;
  solution?: string;
  dateResolution?: Date;
}

/**
 * Checks if SMTP configuration has the minimal credentials to operate.
 */
export function isSmtpConfigured(): boolean {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();
  return Boolean(user && pass);
}

/**
 * Safe database logger for email events.
 * Never throws even if MongoDB is in offline/in-memory mode.
 */
async function safeLogEmail(data: any): Promise<any> {
  try {
    return await EmailLog.create(data);
  } catch (err: any) {
    console.warn('[MAIL AUDIT ⚠️] Impossible d\'enregistrer le log email dans MongoDB:', err?.message || err);
    return null;
  }
}

/**
 * Returns a summary of the SMTP configuration.
 */
export function getSmtpConfigSummary() {
  const configured = isSmtpConfigured();
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = (process.env.SMTP_USER || '').trim();
  const maskedUser = user ? user.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 'Non configuré';
  const from = (process.env.SMTP_FROM || `Support IT OMODA & JAECOO <${user || 'support@omoda-jaecoo.tn'}>`).trim();

  return {
    configured,
    host,
    port,
    user: maskedUser,
    from,
    mode: configured ? 'SMTP Réel Actif' : 'Simulation locale (identifiants SMTP manquants dans .env)',
  };
}

/**
 * Creates and returns a nodemailer Transporter.
 */
async function getMailTransporter(): Promise<nodemailer.Transporter | null> {
  if (!isSmtpConfigured()) {
    return null;
  }

  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT) || (host.includes('gmail') ? 465 : 587);
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
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}

// ================= EMAIL: BIENVENUE NOUVEL UTILISATEUR =================
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
    .cred-label { color: #94a3b8; font-size: 12px; font-weight: 600; }
    .cred-value { color: #ffffff; font-size: 14px; font-weight: bold; }
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
        Bienvenue dans l'application <strong>OMODA | JAECOO Backoffice</strong>. Votre compte a été configuré avec succès avec les accès nécessaires.
      </p>
      
      <div class="credentials-box">
        <div style="font-size: 12px; font-weight: bold; color: #e2e8f0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
          Vos Identifiants de Connexion
        </div>
        <div style="margin-bottom: 10px;">
          <div class="cred-label">Identifiant / Email professionnel :</div>
          <div class="cred-value">${destinataireEmail}</div>
        </div>
        <div style="margin-bottom: 10px;">
          <div class="cred-label">Mot de passe temporaire :</div>
          <div style="color: #f43f5e; font-size: 16px; font-weight: 900; font-family: monospace; background: rgba(244,63,94,0.1); padding: 4px 10px; border-radius: 6px; display: inline-block; margin-top: 4px;">${motDePasse}</div>
        </div>
        <div>
          <div class="cred-label">Rôle & Espace attribué :</div>
          <div style="color: #38bdf8; font-size: 13px; font-weight: 600; margin-top: 2px;">${roleLabel} (${isDSI ? 'Gestion IT Globale' : 'Espace Réclamations & Matériels'})</div>
        </div>
      </div>

      <p class="message" style="font-size: 13px; color: #94a3b8;">
        Veuillez vous connecter avec cet email et ce mot de passe. Il est conseillé de personnaliser votre mot de passe depuis votre profil lors de votre première session.
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
    console.warn(`[MAIL SERVICE ⚠️ SIMULATION] SMTP non configuré dans .env. Envoi simulé pour ${destinataireEmail}`);
    const log = await safeLogEmail({
      destinataireEmail,
      destinataireNom,
      sujet,
      contenuHtml: html,
      type: 'BIENVENUE_USER',
      statut: 'Simulation (SMTP non configuré)',
      errorMessage: 'SMTP_USER ou SMTP_PASS non renseigné dans .env (Mode simulation)',
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
    console.log(`[MAIL SERVICE 📧] ✅ Email de bienvenue délivré avec succès à ${destinataireEmail}`);
  } catch (err: any) {
    errorMessage = err?.message || String(err);
    statutEnvoi = "Échec d'envoi";
    console.error(`[MAIL SERVICE ❌ ERREUR SMTP] Échec de l'envoi de l'email à ${destinataireEmail}:`, errorMessage);
  }

  const log = await safeLogEmail({
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

// ================= EMAIL: MISE À JOUR D'UTILISATEUR / COMPTE =================
export function generateAccountUpdatedEmailHtml(params: SendAccountUpdatedMailParams): string {
  const isDSI = params.accesApp === 'GLOBAL_BACKOFFICE';
  const roleLabel = params.role || (isDSI ? 'Responsable IT / Admin' : 'Collaborateur');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Mise à jour de votre compte OMODA | JAECOO</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c1017; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #161c24; border: 1px solid #2d3748; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0c1017 0%, #1a2230 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid #38bdf8; }
    .logo-text { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #ffffff; margin: 0; }
    .logo-text span { color: #38bdf8; }
    .sub-brand { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #94a3b8; margin-top: 6px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 14px; }
    .message { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px; }
    .info-box { background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
    .info-row { margin-bottom: 8px; font-size: 13px; }
    .info-label { color: #94a3b8; font-weight: 600; font-size: 12px; }
    .info-value { color: #f1f5f9; font-weight: 600; margin-top: 2px; }
    .pwd-badge { color: #f43f5e; font-size: 15px; font-weight: 900; font-family: monospace; background: rgba(244,63,94,0.12); padding: 3px 8px; border-radius: 6px; display: inline-block; margin-top: 3px; }
    .footer { padding: 20px 24px; background-color: #0c1017; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">OMODA <span>|</span> JAECOO</div>
      <div class="sub-brand">Direction des Systèmes d'Information • Gestion des Accès</div>
    </div>
    <div class="content">
      <div class="greeting">Bonjour ${params.beneficiaire},</div>
      <p class="message">
        Nous vous informons que les paramètres de votre compte professionnel <strong>OMODA | JAECOO</strong> ont été mis à jour par l'administrateur système.
      </p>
      
      <div class="info-box">
        <div style="font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
          Récapitulatif de votre profil
        </div>
        <div class="info-row">
          <div class="info-label">Email de connexion :</div>
          <div class="info-value">${params.email}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Rôle attribué :</div>
          <div class="info-value" style="color: #38bdf8;">${roleLabel}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Espace applicatif :</div>
          <div class="info-value">${isDSI ? 'Backoffice Global IT' : 'Espace Réclamations & Matériels'}</div>
        </div>
        ${params.statut ? `
        <div class="info-row">
          <div class="info-label">Statut du compte :</div>
          <div class="info-value">${params.statut}</div>
        </div>` : ''}
        ${params.passwordUpdated && params.newPassword ? `
        <div class="info-row" style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #334155;">
          <div class="info-label" style="color: #f43f5e; font-weight: 700;">Nouveau mot de passe attribué :</div>
          <div class="pwd-badge">${params.newPassword}</div>
        </div>` : `
        <div class="info-row" style="margin-top: 8px;">
          <div class="info-label">Mot de passe :</div>
          <div class="info-value" style="color: #94a3b8; font-style: italic;">Votre mot de passe actuel reste inchangé.</div>
        </div>`}
      </div>

      <p class="message" style="font-size: 13px; color: #94a3b8;">
        Si vous n'êtes pas à l'origine de cette demande ou si vous rencontrez des difficultés de connexion, veuillez contacter votre Responsable IT.
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

export async function sendAccountUpdatedEmail(params: SendAccountUpdatedMailParams): Promise<{
  success: boolean;
  isSimulation: boolean;
  message: string;
  emailLog?: any;
  error?: string;
}> {
  const destinataireEmail = params.email.toLowerCase().trim();
  const destinataireNom = params.beneficiaire || 'Collaborateur';
  const html = generateAccountUpdatedEmailHtml(params);
  const sujet = 'Mise à jour de votre compte professionnel - OMODA | JAECOO';

  if (!isSmtpConfigured()) {
    console.warn(`[MAIL SERVICE ⚠️ SIMULATION] Mise à jour compte simulée pour ${destinataireEmail}`);
    const log = await safeLogEmail({
      destinataireEmail,
      destinataireNom,
      sujet,
      contenuHtml: html,
      type: 'MISE_A_JOUR_USER',
      statut: 'Simulation (SMTP non configuré)',
      errorMessage: 'SMTP_USER ou SMTP_PASS non renseigné dans .env (Mode simulation)',
      tempPasswordPreview: params.passwordUpdated ? params.newPassword : 'Non modifié',
      dateEnvoi: new Date(),
    });

    return {
      success: true,
      isSimulation: true,
      message: `Notification de mise à jour simulée pour ${destinataireEmail}`,
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
    console.log(`[MAIL SERVICE 📧] ✅ Email de mise à jour de compte envoyé à ${destinataireEmail}`);
  } catch (err: any) {
    errorMessage = err?.message || String(err);
    statutEnvoi = "Échec d'envoi";
    console.error(`[MAIL SERVICE ❌] Erreur envoi email mise à jour à ${destinataireEmail}:`, errorMessage);
  }

  const log = await safeLogEmail({
    destinataireEmail,
    destinataireNom,
    sujet,
    contenuHtml: html,
    type: 'MISE_A_JOUR_USER',
    statut: statutEnvoi,
    errorMessage: errorMessage || undefined,
    tempPasswordPreview: params.passwordUpdated ? params.newPassword : 'Non modifié',
    dateEnvoi: new Date(),
  });

  return {
    success: statutEnvoi === 'Envoyé',
    isSimulation: false,
    message: statutEnvoi === 'Envoyé'
      ? `Email de mise à jour envoyé à ${destinataireEmail}`
      : `Échec d'envoi SMTP: ${errorMessage}`,
    emailLog: log,
    error: errorMessage || undefined,
  };
}

// ================= EMAIL: CRÉATION DE RÉCLAMATION =================
export function generateTicketCreatedEmailHtml(params: SendTicketCreatedMailParams): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ticket IT Créé - ${params.code}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c1017; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #161c24; border: 1px solid #2d3748; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0c1017 0%, #1a2230 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid #ef4444; }
    .logo-text { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #ffffff; margin: 0; }
    .logo-text span { color: #ef4444; }
    .sub-brand { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #94a3b8; margin-top: 6px; }
    .content { padding: 32px 24px; }
    .ticket-badge { display: inline-block; background-color: rgba(239, 68, 68, 0.15); color: #f87171; font-weight: 800; font-size: 13px; padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3); margin-bottom: 16px; font-family: monospace; }
    .greeting { font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px; }
    .ticket-box { background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 20px; }
    .ticket-title { font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 10px; }
    .footer { padding: 20px 24px; background-color: #0c1017; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">OMODA <span>|</span> JAECOO</div>
      <div class="sub-brand">Direction des Systèmes d'Information • Support IT</div>
    </div>
    <div class="content">
      <div class="ticket-badge">Ticket ${params.code}</div>
      <div class="greeting">Bonjour ${params.demandeurNom},</div>
      <p class="message">
        Votre demande d'assistance IT a bien été enregistrée. L'équipe technique OMODA | JAECOO a été notifiée et prendra en charge votre réclamation dans les meilleurs délais.
      </p>

      <div class="ticket-box">
        <div class="ticket-title">${params.titre}</div>
        <p style="font-size: 13px; color: #94a3b8; margin: 0 0 12px 0;">${params.description}</p>
        <div style="font-size: 12px; color: #cbd5e1;">
          <strong>Priorité :</strong> <span style="color: #f87171;">${params.priorite}</span> • 
          <strong>Délai SLA :</strong> ${params.slaHours || 24}h
        </div>
      </div>

      <p class="message" style="font-size: 13px; color: #94a3b8;">
        Vous pouvez suivre l'avancement de votre ticket en temps réel depuis votre espace collaborateur.
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

export async function sendTicketCreatedEmail(params: SendTicketCreatedMailParams): Promise<void> {
  if (!params.demandeurEmail || !params.demandeurEmail.includes('@')) return;

  const destinataireEmail = params.demandeurEmail.toLowerCase().trim();
  const html = generateTicketCreatedEmailHtml(params);
  const sujet = `[Support IT] Confirmation du ticket ${params.code} : ${params.titre}`;

  if (!isSmtpConfigured()) {
    await safeLogEmail({
      destinataireEmail,
      destinataireNom: params.demandeurNom,
      sujet,
      contenuHtml: html,
      type: 'NOTIFICATION_RECLAMATION',
      statut: 'Simulation (SMTP non configuré)',
      errorMessage: 'SMTP non configuré',
      dateEnvoi: new Date(),
    });
    return;
  }

  try {
    const transporter = await getMailTransporter();
    if (transporter) {
      const fromAddress = process.env.SMTP_FROM || `Support IT OMODA & JAECOO <${process.env.SMTP_USER}>`;
      await transporter.sendMail({
        from: fromAddress,
        to: destinataireEmail,
        subject: sujet,
        html,
      });
      await safeLogEmail({
        destinataireEmail,
        destinataireNom: params.demandeurNom,
        sujet,
        contenuHtml: html,
        type: 'NOTIFICATION_RECLAMATION',
        statut: 'Envoyé',
        dateEnvoi: new Date(),
      });
    }
  } catch (err: any) {
    console.error(`[MAIL ERROR] Échec envoi confirmation ticket ${params.code}:`, err?.message || err);
    await safeLogEmail({
      destinataireEmail,
      destinataireNom: params.demandeurNom,
      sujet,
      contenuHtml: html,
      type: 'NOTIFICATION_RECLAMATION',
      statut: "Échec d'envoi",
      errorMessage: err?.message || String(err),
      dateEnvoi: new Date(),
    });
  }
}

// ================= EMAIL: MISE À JOUR DE RÉCLAMATION =================
export function generateTicketStatusEmailHtml(params: SendTicketStatusMailParams): string {
  const isResolved = params.nouveauStatut === 'Résolue';
  const color = isResolved ? '#10b981' : '#38bdf8';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Mise à jour du Ticket IT - ${params.code}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c1017; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #161c24; border: 1px solid #2d3748; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0c1017 0%, #1a2230 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid ${color}; }
    .logo-text { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #ffffff; margin: 0; }
    .logo-text span { color: ${color}; }
    .sub-brand { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #94a3b8; margin-top: 6px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px; }
    .ticket-box { background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 20px; }
    .status-badge { display: inline-block; background-color: rgba(56, 189, 248, 0.15); color: ${color}; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 8px; margin-bottom: 12px; }
    .footer { padding: 20px 24px; background-color: #0c1017; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">OMODA <span>|</span> JAECOO</div>
      <div class="sub-brand">Direction des Systèmes d'Information • Support IT</div>
    </div>
    <div class="content">
      <div class="greeting">Bonjour ${params.demandeurNom},</div>
      <p class="message">
        Le statut de votre ticket d'assistance <strong>${params.code}</strong> (${params.titre}) a évolué :
      </p>

      <div class="ticket-box">
        <div class="status-badge">Nouveau Statut : ${params.nouveauStatut}</div>
        ${params.technicienNom ? `
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 8px;">
          <strong>Technicien en charge :</strong> ${params.technicienNom}
        </div>` : ''}
        ${params.solution ? `
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #334155;">
          <div style="font-size: 12px; font-weight: 700; color: #38bdf8; margin-bottom: 4px;">Compte-rendu d'intervention :</div>
          <p style="font-size: 13px; color: #ffffff; margin: 0;">${params.solution}</p>
        </div>` : ''}
      </div>

      <p class="message" style="font-size: 13px; color: #94a3b8;">
        Pour toute question ou complément d'information, n'hésitez pas à répondre ou à consulter votre espace réclamations.
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

export async function sendTicketStatusEmail(params: SendTicketStatusMailParams): Promise<void> {
  if (!params.demandeurEmail || !params.demandeurEmail.includes('@')) return;

  const destinataireEmail = params.demandeurEmail.toLowerCase().trim();
  const html = generateTicketStatusEmailHtml(params);
  const isResolved = params.nouveauStatut === 'Résolue';
  const typeAction = isResolved ? 'RESOLUTION_RECLAMATION' : 'NOTIFICATION_RECLAMATION';
  const sujet = `[Support IT] Ticket ${params.code} : Statut mis à jour (${params.nouveauStatut})`;

  if (!isSmtpConfigured()) {
    await safeLogEmail({
      destinataireEmail,
      destinataireNom: params.demandeurNom,
      sujet,
      contenuHtml: html,
      type: typeAction,
      statut: 'Simulation (SMTP non configuré)',
      errorMessage: 'SMTP non configuré',
      dateEnvoi: new Date(),
    });
    return;
  }

  try {
    const transporter = await getMailTransporter();
    if (transporter) {
      const fromAddress = process.env.SMTP_FROM || `Support IT OMODA & JAECOO <${process.env.SMTP_USER}>`;
      await transporter.sendMail({
        from: fromAddress,
        to: destinataireEmail,
        subject: sujet,
        html,
      });
      await safeLogEmail({
        destinataireEmail,
        destinataireNom: params.demandeurNom,
        sujet,
        contenuHtml: html,
        type: typeAction,
        statut: 'Envoyé',
        dateEnvoi: new Date(),
      });
    }
  } catch (err: any) {
    console.error(`[MAIL ERROR] Échec envoi mise à jour ticket ${params.code}:`, err?.message || err);
    await safeLogEmail({
      destinataireEmail,
      destinataireNom: params.demandeurNom,
      sujet,
      contenuHtml: html,
      type: typeAction,
      statut: "Échec d'envoi",
      errorMessage: err?.message || String(err),
      dateEnvoi: new Date(),
    });
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
    const log = await safeLogEmail({
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

  const log = await safeLogEmail({
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
    const log = await safeLogEmail({
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

  const log = await safeLogEmail({
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

// ================= TEST DE CONNEXION SMTP & DIAGNOSTIC =================
export async function testSmtpConnection(testRecipient?: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  if (!isSmtpConfigured()) {
    return {
      success: false,
      message: 'SMTP non configuré : SMTP_USER et SMTP_PASS sont absents dans le fichier .env ou les variables d\'environnement.',
      details: {
        ...getSmtpConfigSummary(),
        astuce: 'Pour Gmail, activez la validation en 2 étapes sur votre compte Google et générez un Mot de passe d\'application (App Password) de 16 caractères.',
      },
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

      await safeLogEmail({
        destinataireEmail: testRecipient.trim().toLowerCase(),
        destinataireNom: 'Testeur Administrateur',
        sujet: 'Test de connexion SMTP - OMODA & JAECOO IT Park',
        contenuHtml: '<p>Test de connexion SMTP</p>',
        type: 'TEST_SMTP',
        statut: 'Envoyé',
        dateEnvoi: new Date(),
      });
    }

    return {
      success: true,
      message: 'Connexion SMTP établie et vérifiée avec succès !' + (testRecipient ? ` Email de test envoyé à ${testRecipient}` : ''),
      details: getSmtpConfigSummary(),
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    let suggestion = '';

    if (errorMsg.includes('535') || errorMsg.includes('BadCredentials') || errorMsg.includes('Username and Password not accepted')) {
      suggestion = 'Erreur 535 : Mot de passe ou nom d\'utilisateur refusé. Si vous utilisez Gmail, vous DEVEZ utiliser un "Mot de passe d\'application" généré depuis myaccount.google.com/apppasswords et non votre mot de passe habituel.';
    } else if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('ECONNREFUSED')) {
      suggestion = 'Délai d\'attente dépassé ou connexion refusée. Vérifiez que le port SMTP (587 ou 465) n\'est pas bloqué par le pare-feu du serveur Windows ou votre fournisseur d\'accès.';
    }

    return {
      success: false,
      message: `Échec de connexion SMTP : ${errorMsg}`,
      details: {
        ...getSmtpConfigSummary(),
        error: errorMsg,
        suggestion: suggestion || undefined,
      },
    };
  }
}
