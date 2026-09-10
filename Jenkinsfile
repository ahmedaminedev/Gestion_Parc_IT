pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'
    }

    environment {
        CI = 'true'
        IMAGE_NAME = 'omoda-jaecoo-parc-it'
        IMAGE_TAG = 'latest'
        CONTAINER_NAME = 'parc-it-app'
        VM_IP = '172.17.91.130'
        VM_USER = 'administrateur'
        MONGODB_URI = 'mongodb://172.17.91.130:27017/Gestion_Parc_IT_2'
    }

    stages {
        stage('Checkout') {
            steps {
                echo '=== Étape 1 : Récupération du code source ==='
                checkout scm
            }
        }

        stage('Vérification Environnement') {
            steps {
                echo '=== Étape 2 : Vérification Node + Docker ==='
                bat 'node --version'
                bat 'npm --version'
                bat 'docker version'
                bat 'docker info --format "{{.OSType}}"'
            }
        }

        stage('Installation Dépendances & Tests') {
            steps {
                echo '=== Étape 3 : Installation et Tests ==='
                bat 'call npm install --include=dev --no-audit --no-fund'
                bat 'call npm install --no-save @rollup/rollup-win32-x64-msvc lightningcss-win32-x64-msvc @tailwindcss/oxide-win32-x64-msvc'
                bat 'call npx tsc --noEmit'
                bat 'call npx vitest run'
            }
        }

        stage('Compilation Production') {
            steps {
                echo '=== Étape 4 : Build de l\'application ==='
                bat 'call npm run build'
            }
        }

        stage('Build Image Docker') {
            steps {
                echo '=== Étape 5 : Construction de l\'image Docker ==='
                bat "docker build -t %IMAGE_NAME%:%IMAGE_TAG% -t %IMAGE_NAME%:%BUILD_NUMBER% ."
            }
        }

        stage('Sauvegarde de l\'image') {
            steps {
                echo '=== Étape 6 : Sauvegarde de l\'image en fichier .tar ==='
                bat "docker save -o %IMAGE_NAME%.tar %IMAGE_NAME%:%IMAGE_TAG%"
            }
        }

        stage('Envoi vers la VM') {
            steps {
                echo '=== Étape 7 : Envoi de l\'image vers la VM ==='
                bat "scp -o StrictHostKeyChecking=no %IMAGE_NAME%.tar %VM_USER%@%VM_IP%:C:/Users/Administrateur/"
            }
        }

        stage('Déploiement sur la VM') {
            steps {
                echo '=== Étape 8 : Chargement et démarrage du conteneur sur la VM ==='
                bat """
                    ssh -o StrictHostKeyChecking=no %VM_USER%@%VM_IP% "docker load -i C:\\Users\\Administrateur\\%IMAGE_NAME%.tar && docker stop %CONTAINER_NAME% 2>nul & docker rm -f %CONTAINER_NAME% 2>nul & docker run -d --name %CONTAINER_NAME% --restart unless-stopped -p 3000:3000 -e NODE_ENV=production -e PORT=3000 -e MONGODB_URI=%MONGODB_URI% -e JWT_SECRET=Secret_Key_OMODA_JAECOO_WindowsServer_2025 -v app_uploads:C:\\app\\uploads %IMAGE_NAME%:%IMAGE_TAG%"
                """
            }
        }
    }

    post {
        success {
            echo 'Pipeline terminé avec succès : Application déployée sur la VM !'
        }
        failure {
            echo 'Échec du pipeline.'
        }
        always {
            // Nettoyage du fichier .tar sur le PC
            bat "del /f /q %IMAGE_NAME%.tar 2>nul || echo Rien à nettoyer"
        }
    }
}
