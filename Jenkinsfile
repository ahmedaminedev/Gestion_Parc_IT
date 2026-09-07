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
    }

    stages {
        stage('Checkout') {
            steps {
                echo '=== Étape 1 : Récupération du code source ==='
                checkout scm
            }
        }

        stage('Vérification Environnement Windows') {
            steps {
                echo '=== Étape 2 : Vérification du système et de Docker ==='
                bat 'node --version'
                bat 'npm --version'
                bat 'docker version'
                bat 'docker info --format "{{.OSType}}"'
            }
        }

        stage('Installation Dépendances & Tests') {
            steps {
                echo '=== Étape 3 : Installation et Tests Unitaires ==='
                bat 'call npm install --include=dev --no-audit --no-fund'
                bat 'call npm install --no-save @rollup/rollup-win32-x64-msvc lightningcss-win32-x64-msvc @tailwindcss/oxide-win32-x64-msvc'
                bat 'call npx tsc --noEmit'
                bat 'call npx vitest run'
            }
        }

        stage('Compilation Bundle de Production') {
            steps {
                echo '=== Étape 4 : Compilation de l\'application (Vite + Server) ==='
                bat 'call npm run build'
            }
        }

        stage('Build Image Docker Windows') {
            steps {
                echo '=== Étape 5 : Construction de l\'image Docker (Windows Server 2025) ==='
                bat "docker build -t %IMAGE_NAME%:%IMAGE_TAG% -t %IMAGE_NAME%:%BUILD_NUMBER% ."
            }
        }

        stage('Déploiement Conteneur Windows') {
            steps {
                echo '=== Étape 6 : Déploiement du conteneur sur Windows Server ==='
                bat '''
                    @echo off
                    echo Arret et suppression de l ancien conteneur s il existe...
                    docker stop %CONTAINER_NAME% 2>nul || echo Aucun conteneur en cours
                    docker rm -f %CONTAINER_NAME% 2>nul || echo Aucun conteneur a supprimer

                    echo Demarrage du nouveau conteneur...
                    docker run -d ^
                      --name %CONTAINER_NAME% ^
                      --restart unless-stopped ^
                      -p 3000:3000 ^
                      -e NODE_ENV=production ^
                      -e PORT=3000 ^
                      -e MONGODB_URI="mongodb://host.docker.internal:27017/Gestion_Parc_IT_2" ^
                      -e JWT_SECRET="Secret_Key_OMODA_JAECOO_WindowsServer_2025" ^
                      -v app_uploads:C:\\app\\uploads ^
                      %IMAGE_NAME%:%IMAGE_TAG%
                '''
            }
        }

        stage('Vérification Santé Application') {
            steps {
                echo '=== Étape 7 : Test de santé de l\'application ==='
                bat '''
                    @echo off
                    echo Attente du demarrage du serveur...
                    timeout /t 10 /nobreak >nul
                    powershell -Command "try { $res = Invoke-RestMethod -Uri 'http://localhost:3000/api/health' -TimeoutSec 10; Write-Host 'Reponse de l API:'; $res | ConvertTo-Json } catch { Write-Error $_; exit 1 }"
                '''
            }
        }
    }

    post {
        success {
            echo 'Pipeline Jenkins terminé avec succès : Application OMODA & JAECOO déployée sur Windows Server 2025 !'
        }

        failure {
            echo 'Échec du Pipeline Jenkins.'
        }
    }
}
