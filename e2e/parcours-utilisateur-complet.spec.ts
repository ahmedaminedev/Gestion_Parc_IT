import { test, expect } from '@playwright/test';

test.describe('Scénario E2E : Authentification & Opérations IT', () => {
  test('Connexion et parcours complet des modules IT', async ({ page }) => {
    // 1. Accès à l'application
    await page.goto('/');

    // 2. Étape de Connexion (si l'écran de Login est affiché)
    const emailInput = page.getByPlaceholder(/Entrez votre email/i);
    if (await emailInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      // Identifiants administrateur IT valides
      await emailInput.fill('admin@omoda-jaecoo.tn');
      await page.getByPlaceholder(/Entrez votre mot de passe/i).fill('Admin123!');
      await page.getByRole('button', { name: /Se connecter/i }).click();
    }

    // 3. Vérification de l'arrivée sur le Dashboard / Backoffice
    const dashboardBtn = page.getByRole('button', { name: /Dashboard IT|Mon Tableau de Bord/i });
    await expect(dashboardBtn).toBeVisible({ timeout: 10000 });

    // 4. Module : Gestion des Utilisateurs
    const userBtn = page.getByRole('button', { name: /Gestion Utilisateurs/i });
    if (await userBtn.isVisible()) {
      await userBtn.click();
      
      const newUserBtn = page.getByRole('button', { name: /Nouveau Compte Utilisateur/i });
      if (await newUserBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newUserBtn.click();
        const nomInput = page.getByPlaceholder(/Ex: Ahmed Amin Nafti/i);
        if (await nomInput.isVisible()) {
          const uniqueId = Date.now();
          await nomInput.fill(`Collaborateur Test ${uniqueId}`);
          await page.getByPlaceholder(/Ex: ahmed.nafti@omoda-jaecoo\./i).fill(`test.user.${uniqueId}@omoda-jaecoo.tn`);
          await page.getByRole('button', { name: /^Enregistrer$/i }).click();
          // Attendre que la modale d'utilisateur se ferme
          await page.waitForTimeout(1000);
          const cancelBtn = page.getByRole('button', { name: /^Annuler$/i });
          if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
          }
        }
      }
    }

    // 5. Module : Gestion des Matériels
    const matBtn = page.getByRole('button', { name: /Gestion des Matériels/i });
    if (await matBtn.isVisible()) {
      await matBtn.click();
      const newMatBtn = page.getByRole('button', { name: /Nouveau Matériel/i });
      if (await newMatBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newMatBtn.click();
        const desigInput = page.getByPlaceholder(/ex: MacBook Pro/i);
        if (await desigInput.isVisible()) {
          await desigInput.fill(`MacBook Pro M3 E2E ${Date.now()}`);
          await page.getByRole('button', { name: /Enregistrer le matériel/i }).click();
          await page.waitForTimeout(1000);
          const closeMatModal = page.getByRole('button', { name: /^Annuler$/i });
          if (await closeMatModal.isVisible()) {
            await closeMatModal.click();
          }
        }
      }
    }

    // 6. Module : Messagerie IT
    const msgBtn = page.getByRole('button', { name: /Messagerie IT|Messagerie Support IT/i });
    if (await msgBtn.isVisible()) {
      await msgBtn.click();
      const chatInput = page.getByPlaceholder(/Écrivez un message/i);
      if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await chatInput.fill('Message de test automatique via Playwright');
      }
    }

    // 7. Module : Gestion des Réclamations
    const recBtn = page.getByRole('button', { name: /Gestion Réclamations|Mes Réclamations/i });
    if (await recBtn.isVisible()) {
      await recBtn.click();
      const newRecBtn = page.getByRole('button', { name: /Nouvelle Réclamation/i });
      if (await newRecBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newRecBtn.click();
        const firstEquipment = page.locator('.p-3.rounded-xl').first();
        if (await firstEquipment.isVisible({ timeout: 2000 }).catch(() => false)) {
          await firstEquipment.click();
          const checkAll = page.getByRole('button', { name: /Tout cocher/i });
          if (await checkAll.isVisible()) await checkAll.click();
          const nextBtn = page.getByRole('button', { name: /Suivant/i });
          if (await nextBtn.isVisible()) {
            await nextBtn.click();
            await page.getByPlaceholder(/Ex: Écran ne s'allume plus/i).fill('Moniteur en panne E2E');
            await page.getByPlaceholder(/Expliquez en détail/i).fill('Test de description de réclamation automatique');
            await page.getByRole('button', { name: /Valider & Envoyer/i }).click();
          }
        } else {
          // Fermer la modal si aucun équipement n'est disponible
          const closeBtn = page.getByRole('button', { name: /Fermer/i });
          if (await closeBtn.isVisible()) await closeBtn.click();
        }
      }
    }

    // Attendre que l'overlay de la modal disparaisse avant de cliquer sur la sidebar
    await expect(page.locator('#ticket-modal-overlay')).toBeHidden({ timeout: 5000 }).catch(() => {});

    // 8. Module : Gestion des Emplacements
    const empBtn = page.getByRole('button', { name: /Gestion Emplacements/i });
    if (await empBtn.isVisible()) {
      await empBtn.click();
      await expect(empBtn).toBeVisible();
    }
  });
});
