pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'
    }

    environment {
        CI = 'true'

        // ==============================
        // APPLICATION
        // ==============================
        IMAGE_NAME = 'omoda-jaecoo-parc-it'
        IMAGE_TAG = 'latest'
        CONTAINER_NAME = 'parc-it-app'

        // ==============================
        // VM WINDOWS
        // ==============================
        VM_IP = '172.17.91.144'
        VM_USER = 'Administrateur'

        // Clé SSH dédiée au service Jenkins (LocalSystem)
        SSH_KEY = 'C:/Windows/System32/config/systemprofile/.ssh/jenkins_ed25519'

        // ==============================
        // MONGODB SUR LA MÊME VM
        // ==============================
        MONGODB_URI = 'mongodb://172.17.91.144:27017/Gestion_Parc_IT_2'
    }

    stages {

        // ==========================================
        // 1. RÉCUPÉRATION DU CODE
        // ==========================================
        stage('Checkout') {
            steps {
                echo '=== Étape 1 : Récupération du code source ==='
                checkout scm
            }
        }

        // ==========================================
        // 2. VÉRIFICATION ENVIRONNEMENT
        // ==========================================
        stage('Vérification Environnement') {
            steps {
                echo '=== Étape 2 : Vérification Node + Docker ==='

                bat 'node --version'
                bat 'npm --version'
                bat 'docker version'
                bat 'docker info --format "{{.OSType}}"'
            }
        }

        // ==========================================
        // 3. TEST CONNEXION SSH VERS LA VM
        // ==========================================
        stage('Test SSH VM') {
            steps {
                echo '=== Étape 3 : Test SSH Jenkins -> VM ==='

                bat '''
                    ssh ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        %VM_USER%@%VM_IP% "hostname"
                '''
            }
        }

        // ==========================================
        // 4. INSTALLATION + TESTS
        // ==========================================
        stage('Installation Dépendances & Tests') {
            steps {
                echo '=== Étape 4 : Installation des dépendances et tests ==='

                bat 'call npm install --include=dev --no-audit --no-fund'

                bat 'call npm install --no-save @rollup/rollup-win32-x64-msvc lightningcss-win32-x64-msvc @tailwindcss/oxide-win32-x64-msvc'

                bat 'call npx tsc --noEmit'

                bat 'call npx vitest run'
            }
        }

        // ==========================================
        // 5. BUILD PRODUCTION
        // ==========================================
        stage('Compilation Production') {
            steps {
                echo '=== Étape 5 : Build de l’application ==='

                bat 'call npm run build'
            }
        }

        // ==========================================
        // 6. BUILD IMAGE DOCKER
        // ==========================================
        stage('Build Image Docker') {
            steps {
                echo '=== Étape 6 : Construction de l’image Docker ==='

                bat 'docker build -t %IMAGE_NAME%:%IMAGE_TAG% -t %IMAGE_NAME%:%BUILD_NUMBER% .'
            }
        }

        // ==========================================
        // 7. SAUVEGARDE IMAGE DOCKER
        // ==========================================
        stage('Sauvegarde de l’image') {
            steps {
                echo '=== Étape 7 : Sauvegarde de l’image Docker en .tar ==='

                bat 'docker save -o %IMAGE_NAME%.tar %IMAGE_NAME%:%IMAGE_TAG%'
            }
        }

        // ==========================================
        // 8. ENVOI IMAGE VERS VM
        // ==========================================
        stage('Envoi vers la VM') {
            steps {
                echo '=== Étape 8 : Envoi de l’image Docker vers la VM ==='

                bat '''
                    scp ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%IMAGE_NAME%.tar" ^
                        %VM_USER%@%VM_IP%:C:/Users/Administrateur/
                '''
            }
        }

        // ==========================================
        // 9. DÉPLOIEMENT SUR VM
        // ==========================================
        stage('Déploiement sur la VM') {
            steps {
                echo '=== Étape 9 : Déploiement Docker sur la VM ==='

                bat '''
                    ssh ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        %VM_USER%@%VM_IP% ^
                        "docker load -i C:\\Users\\Administrateur\\%IMAGE_NAME%.tar && docker stop %CONTAINER_NAME% 2>nul & docker rm -f %CONTAINER_NAME% 2>nul & docker run -d --name %CONTAINER_NAME% --restart unless-stopped -p 3000:3000 -e NODE_ENV=production -e PORT=3000 -e MONGODB_URI=%MONGODB_URI% -e JWT_SECRET=Secret_Key_OMODA_JAECOO_WindowsServer_2025 -v app_uploads:C:\\app\\uploads %IMAGE_NAME%:%IMAGE_TAG%"
                '''
            }
        }

        // ==========================================
        // 10. VÉRIFICATION DU CONTENEUR
        // ==========================================
        stage('Vérification Déploiement') {
            steps {
                echo '=== Étape 10 : Vérification du conteneur sur la VM ==='

                bat '''
                    ssh ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        %VM_USER%@%VM_IP% ^
                        "docker ps --filter name=%CONTAINER_NAME%"
                '''
            }
        }
    }

    // ==========================================
    // POST BUILD
    // ==========================================
    post {

        success {
            echo '=========================================='
            echo 'PIPELINE TERMINÉ AVEC SUCCÈS'
            echo 'Application déployée sur la VM !'
            echo '=========================================='
        }

        failure {
            echo '=========================================='
            echo 'ÉCHEC DU PIPELINE'
            echo '=========================================='
        }

        always {
            echo '=== Nettoyage du fichier Docker .tar ==='

            bat 'del /f /q %IMAGE_NAME%.tar 2>nul || echo Rien à nettoyer'
        }
    }
}
