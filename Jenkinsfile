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

        MONGODB_URI = 'mongodb://172.17.91.130:27017/Gestion_Parc_IT_2'
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
                echo '=== Étape 4 : Compilation de l application (Vite + Server) ==='

                bat 'call npm run build'
            }
        }

        stage('Build Image Docker Windows') {
            steps {
                echo '=== Étape 5 : Construction de l image Docker (Windows Server 2025) ==='

                bat "docker build -t %IMAGE_NAME%:%IMAGE_TAG% -t %IMAGE_NAME%:%BUILD_NUMBER% ."
            }
        }

        stage('Déploiement Conteneur Windows') {
            steps {
                echo '=== Étape 6 : Déploiement du conteneur sur Windows Server ==='

                bat '''
                    @echo off

                    echo ========================================
                    echo Arret de l ancien conteneur
                    echo ========================================

                    docker stop %CONTAINER_NAME% 2>nul || echo Aucun conteneur en cours

                    docker rm -f %CONTAINER_NAME% 2>nul || echo Aucun conteneur a supprimer

                    echo.
                    echo ========================================
                    echo Demarrage du nouveau conteneur
                    echo ========================================

                    docker run -d ^
                      --name %CONTAINER_NAME% ^
                      --restart unless-stopped ^
                      -p 3000:3000 ^
                      -e NODE_ENV=production ^
                      -e PORT=3000 ^
                      -e MONGODB_URI=%MONGODB_URI% ^
                      -e JWT_SECRET="Secret_Key_OMODA_JAECOO_WindowsServer_2025" ^
                      -v app_uploads:C:\\app\\uploads ^
                      %IMAGE_NAME%:%IMAGE_TAG%

                    if errorlevel 1 (
                        echo.
                        echo ERREUR : impossible de demarrer le conteneur.
                        exit /b 1
                    )

                    echo.
                    echo Conteneur demarre avec succes.
                '''
            }
        }

        stage('Vérification Santé Application') {
            steps {
                echo '=== Étape 7 : Vérification de la santé de l application ==='

                bat '''
                    @echo off

                    echo ========================================
                    echo Attente du demarrage du serveur
                    echo ========================================

                    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Start-Sleep -Seconds 12; try { $res = Invoke-RestMethod -Uri 'http://localhost:3000/api/health' -TimeoutSec 15; Write-Host '========================================'; Write-Host '      HEALTH CHECK APPLICATION'; Write-Host '========================================'; $res | ConvertTo-Json; Write-Host '========================================'; if ($res.status -ne 'ok') { throw 'ERREUR : status != ok' }; if ($res.dbConnected -ne $true) { throw 'ERREUR : MongoDB non connecte' }; if ($res.mongooseState -ne 1) { throw 'ERREUR : Mongoose state != 1' }; Write-Host 'Health check OK : application et MongoDB sont operationnels.' } catch { Write-Error $_; exit 1 }"

                    if errorlevel 1 (
                        echo.
                        echo ========================================
                        echo ERREUR : HEALTH CHECK ECHOUE
                        echo ========================================
                        echo.
                        echo Etat du conteneur :
                        docker ps -a --filter "name=%CONTAINER_NAME%"
                        echo.
                        echo Derniers logs du conteneur :
                        docker logs --tail 80 %CONTAINER_NAME%
                        exit /b 1
                    )
                '''
            }
        }
    }

    post {

        success {
            echo '========================================'
            echo 'PIPELINE TERMINE AVEC SUCCES'
            echo '========================================'
            echo 'Application OMODA & JAECOO déployée sur Windows Server 2025.'
            echo 'MongoDB : connexion vérifiée.'
            echo 'Application : health check OK.'
        }

        failure {
            echo '========================================'
            echo 'ECHEC DU PIPELINE'
            echo '========================================'
            echo 'Le déploiement ou le health check a échoué.'
        }
    }
}
