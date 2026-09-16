pipeline {

    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
        disableConcurrentBuilds()
    }

    tools {
        nodejs 'NodeJS-22'
    }

    environment {

        // =========================================================
        // APPLICATION
        // =========================================================

        IMAGE_NAME = 'omoda-jaecoo-parc-it'
        IMAGE_TAG = 'nano-test'
        CONTAINER_NAME = 'parc-it-app'
        DOCKER_TAR = 'omoda-jaecoo-parc-it-nano.tar'


        // =========================================================
        // VM WINDOWS SERVER
        // =========================================================

        VM_IP = '172.17.91.174'
        VM_USER = 'administrateur'


        // =========================================================
        // SSH - JENKINS LOCAL SYSTEM
        // =========================================================

        SSH_KEY = 'C:/Windows/System32/config/systemprofile/.ssh/jenkins_system_ed25519'

        SSH_EXE = 'C:/Windows/System32/OpenSSH/ssh.exe'

        SCP_EXE = 'C:/Windows/System32/OpenSSH/scp.exe'


        // =========================================================
        // MONGODB SUR LA VM
        // =========================================================

        MONGODB_URI = 'mongodb://172.17.91.174:27017/Gestion_Parc_IT_2'


        // =========================================================
        // JWT
        // =========================================================

        JWT_SECRET = 'Secret_Key_OMODA_JAECOO_WindowsServer_2025'


        // =========================================================
        // NOTIFICATIONS PAR EMAIL (SMTP GMAIL)
        // =========================================================

        SMTP_HOST = 'smtp.gmail.com'
        SMTP_PORT = '465'
        SMTP_SECURE = 'true'
        SMTP_USER = 'ahmedaminenafti20267@gmail.com'
        SMTP_PASS = 'gtgahjcnevwqrdip'
    }


    stages {


        // =========================================================
        // 1. CHECKOUT
        // =========================================================

        stage('Checkout') {

            steps {

                echo '=============================================='
                echo 'CHECKOUT DU PROJET'
                echo '=============================================='

                checkout scm

                bat '''
                    echo.
                    echo ===== GIT STATUS =====
                    git status

                    echo.
                    echo ===== GIT COMMIT =====
                    git log -1 --oneline
                '''
            }
        }


        // =========================================================
        // 2. VERIFICATION ENVIRONNEMENT
        // =========================================================

        stage('Verification Environnement') {

            steps {

                echo '=============================================='
                echo 'VERIFICATION ENVIRONNEMENT'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== NODE =====
                    node --version

                    echo.
                    echo ===== NPM =====
                    npm --version

                    echo.
                    echo ===== DOCKER VERSION =====
                    docker version

                    echo.
                    echo ===== DOCKER OS TYPE =====
                    docker info --format "{{.OSType}}"

                    echo.
                    echo ===== DOCKER CONTEXT =====
                    docker context show
                '''
            }
        }


        // =========================================================
        // 3. DIAGNOSTIC SSH
        // =========================================================

        stage('Diagnostic SSH') {

            steps {

                echo '=============================================='
                echo 'DIAGNOSTIC SSH'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== SSH VERSION =====

                    "%SSH_EXE%" -V

                    if errorlevel 1 (
                        echo ERREUR : SSH introuvable
                        exit /b 1
                    )

                    echo.
                    echo ===== SCP EXECUTABLE =====

                    if exist "%SCP_EXE%" (
                        echo SCP TROUVE
                        echo Chemin :
                        echo %SCP_EXE%
                    ) else (
                        echo ERREUR : SCP INTROUVABLE
                        exit /b 1
                    )

                    echo.
                    echo ===== VERIFICATION CLE SSH =====

                    if exist "%SSH_KEY%" (
                        echo CLE SSH TROUVEE
                    ) else (
                        echo ERREUR : CLE SSH INTROUVABLE
                        exit /b 1
                    )

                    echo.
                    echo ===== CHEMIN CLE SSH =====

                    echo %SSH_KEY%

                    echo.
                    echo ===== TEST SSH CONFIGURATION =====

                    "%SSH_EXE%" ^
                        -G ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%VM_USER%@%VM_IP%" ^
                        >nul

                    if errorlevel 1 (
                        echo ERREUR : configuration SSH invalide
                        exit /b 1
                    )

                    echo.
                    echo ===== DIAGNOSTIC SSH OK =====
                '''
            }
        }


        // =========================================================
        // 4. TEST SSH VM
        // =========================================================

        stage('Test SSH VM') {

            steps {

                echo '=============================================='
                echo 'TEST SSH VERS LA VM'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== CONNEXION SSH =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%VM_USER%@%VM_IP%" ^
                        "hostname"

                    if errorlevel 1 (
                        echo.
                        echo ERREUR : CONNEXION SSH ECHOUEE
                        exit /b 1
                    )

                    echo.
                    echo CONNEXION SSH OK
                '''
            }
        }


        // =========================================================
        // 5. NETTOYAGE NODE_MODULES
        // =========================================================

        stage('Nettoyage Node Modules') {

            steps {

                echo '=============================================='
                echo 'NETTOYAGE NODE_MODULES'
                echo '=============================================='

                bat '''
                    if exist node_modules (
                        rmdir /S /Q node_modules
                    )

                    if exist node_modules (
                        echo ERREUR : node_modules existe encore
                        exit /b 1
                    )

                    echo NODE_MODULES SUPPRIME
                '''
            }
        }


        // =========================================================
        // 6. INSTALLATION DEPENDANCES
        // =========================================================

        stage('Installation Dependances') {

            steps {

                echo '=============================================='
                echo 'INSTALLATION DEPENDANCES'
                echo '=============================================='

                bat '''
                    npm install --include=dev --no-audit --no-fund

                    if errorlevel 1 (
                        echo ERREUR : npm install a echoue
                        exit /b 1
                    )

                    echo INSTALLATION NPM TERMINEE
                '''
            }
        }


        // =========================================================
        // 7. DEPENDANCES NATIVES WINDOWS
        // =========================================================

        stage('Dependances Natives Windows') {

            steps {

                echo '=============================================='
                echo 'DEPENDANCES NATIVES WINDOWS'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== ROLLUP WINDOWS =====

                    npm install --no-save --force @rollup/rollup-win32-x64-msvc

                    if errorlevel 1 (
                        echo ERREUR : installation Rollup echouee
                        exit /b 1
                    )

                    echo.
                    echo ===== LIGHTNINGCSS WINDOWS =====

                    npm install --no-save --force lightningcss-win32-x64-msvc

                    if errorlevel 1 (
                        echo ERREUR : installation LightningCSS echouee
                        exit /b 1
                    )

                    echo.
                    echo ===== VERIFICATION ROLLUP =====

                    if exist "node_modules\\@rollup\\rollup-win32-x64-msvc" (
                        echo ROLLUP WINDOWS OK
                    ) else (
                        echo ERREUR : Rollup Windows introuvable
                        exit /b 1
                    )

                    echo.
                    echo ===== VERIFICATION LIGHTNINGCSS =====

                    if exist "node_modules\\lightningcss-win32-x64-msvc" (
                        echo LIGHTNINGCSS WINDOWS OK
                    ) else (
                        echo ERREUR : LightningCSS Windows introuvable
                        exit /b 1
                    )

                    echo.
                    echo DEPENDANCES NATIVES WINDOWS OK
                '''
            }
        }


        // =========================================================
        // 8. TYPESCRIPT
        // =========================================================

        stage('Verification TypeScript') {

            steps {

                echo '=============================================='
                echo 'VERIFICATION TYPESCRIPT'
                echo '=============================================='

                bat '''
                    npx tsc --noEmit

                    if errorlevel 1 (
                        echo ERREUR : TypeScript contient des erreurs
                        exit /b 1
                    )

                    echo TYPESCRIPT OK
                '''
            }
        }


        // =========================================================
        // 9. TESTS
        // =========================================================

        stage('Tests') {

            steps {

                echo '=============================================='
                echo 'TESTS VITEST'
                echo '=============================================='

                bat '''
                    npx vitest run

                    if errorlevel 1 (
                        echo ERREUR : les tests ont echoue
                        exit /b 1
                    )

                    echo TESTS VITEST OK
                '''
            }
        }


        // =========================================================
        // 10. BUILD
        // =========================================================

        stage('Build Application') {

            steps {

                echo '=============================================='
                echo 'BUILD APPLICATION'
                echo '=============================================='

                bat '''
                    npm run build

                    if errorlevel 1 (
                        echo ERREUR : npm run build a echoue
                        exit /b 1
                    )

                    if exist dist (
                        echo DOSSIER DIST PRESENT
                        dir dist
                    ) else (
                        echo ERREUR : dossier dist absent
                        exit /b 1
                    )

                    echo BUILD APPLICATION OK
                '''
            }
        }


        // =========================================================
        // 11. DOCKER BUILD NANO
        // =========================================================

        stage('Docker Build Nano') {

            steps {

                echo '=============================================='
                echo 'DOCKER BUILD NANO SERVER 2025'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== DOCKER OS TYPE =====
                    docker info --format "{{.OSType}}"

                    echo.
                    echo ===== DOCKER CONTEXT =====
                    docker context show

                    echo.
                    echo ===== SUPPRESSION ANCIENNE IMAGE =====

                    docker image rm "%IMAGE_NAME%:%IMAGE_TAG%" 2>nul || echo Aucune ancienne image

                    echo.
                    echo ===== BUILD IMAGE NANO =====

                    docker build ^
                        -f Dockerfile.nano ^
                        -t "%IMAGE_NAME%:%IMAGE_TAG%" ^
                        .

                    if errorlevel 1 (
                        echo ERREUR : Docker build Nano echoue
                        exit /b 1
                    )

                    echo.
                    echo ===== IMAGE CREEE =====

                    docker images "%IMAGE_NAME%"

                    echo.
                    echo ===== TAILLE IMAGE =====

                    docker image inspect ^
                        "%IMAGE_NAME%:%IMAGE_TAG%" ^
                        --format "{{.Size}} bytes"

                    echo.
                    echo DOCKER BUILD NANO OK
                '''
            }
        }


        // =========================================================
        // 12. DOCKER SAVE
        // =========================================================

        stage('Docker Save') {

            steps {

                echo '=============================================='
                echo 'EXPORT IMAGE DOCKER'
                echo '=============================================='

                bat '''
                    if exist "%DOCKER_TAR%" (
                        del /F /Q "%DOCKER_TAR%"
                    )

                    docker save ^
                        -o "%DOCKER_TAR%" ^
                        "%IMAGE_NAME%:%IMAGE_TAG%"

                    if errorlevel 1 (
                        echo ERREUR : docker save a echoue
                        exit /b 1
                    )

                    if exist "%DOCKER_TAR%" (
                        echo FICHIER TAR CREE
                        dir "%DOCKER_TAR%"
                    ) else (
                        echo ERREUR : fichier TAR absent
                        exit /b 1
                    )
                '''
            }
        }


        // =========================================================
        // 13. PREPARATION VM
        // =========================================================

        stage('Preparation VM') {

            steps {

                echo '=============================================='
                echo 'PREPARATION VM'
                echo '=============================================='

                bat '''
                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%VM_USER%@%VM_IP%" ^
                        "if not exist C:\\Temp mkdir C:\\Temp"

                    if errorlevel 1 (
                        echo ERREUR : impossible de preparer C:\\Temp
                        exit /b 1
                    )

                    echo PREPARATION VM OK
                '''
            }
        }


        // =========================================================
        // 14. SCP IMAGE VERS VM
        // =========================================================

        stage('SCP Image vers VM') {

            steps {

                echo '=============================================='
                echo 'COPIE IMAGE VERS VM'
                echo '=============================================='

                bat '''
                    "%SCP_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%DOCKER_TAR%" ^
                        "%VM_USER%@%VM_IP%:C:/Temp/%DOCKER_TAR%"

                    if errorlevel 1 (
                        echo ERREUR : SCP de l image echoue
                        exit /b 1
                    )

                    echo SCP IMAGE OK
                '''
            }
        }


        // =========================================================
        // 15. DOCKER LOAD VM
        // =========================================================

        stage('Docker Load VM') {

            steps {

                echo '=============================================='
                echo 'DOCKER LOAD SUR VM'
                echo '=============================================='

                bat '''
                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker load -i C:\\Temp\\%DOCKER_TAR%"

                    if errorlevel 1 (
                        echo ERREUR : docker load a echoue
                        exit /b 1
                    )

                    echo DOCKER LOAD OK

                    echo.
                    echo ===== SUPPRESSION TAR SUR VM =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%VM_USER%@%VM_IP%" ^
                        "del /F /Q C:\\Temp\\%DOCKER_TAR%"
                '''
            }
        }


        // =========================================================
        // 16. DEPLOIEMENT CONTENEUR
        // =========================================================

        stage('Deploy VM Nano') {

            steps {

                echo '=============================================='
                echo 'DEPLOIEMENT CONTENEUR NANO'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== SUPPRESSION ANCIEN CONTENEUR =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker rm -f %CONTAINER_NAME% 2^>nul || echo Aucun ancien conteneur"

                    echo.
                    echo ===== CREATION NOUVEAU CONTENEUR =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker run -d --name %CONTAINER_NAME% --restart unless-stopped -p 3000:3000 -e NODE_ENV=production -e PORT=3000 -e MONGODB_URI=%MONGODB_URI% -e JWT_SECRET=%JWT_SECRET% -e SMTP_HOST=%SMTP_HOST% -e SMTP_PORT=%SMTP_PORT% -e SMTP_SECURE=%SMTP_SECURE% -e SMTP_USER=%SMTP_USER% -e SMTP_PASS=%SMTP_PASS% -v app_uploads:C:\\app\\uploads %IMAGE_NAME%:%IMAGE_TAG%"

                    if errorlevel 1 (
                        echo ERREUR : docker run a echoue
                        exit /b 1
                    )

                    echo CONTENEUR DEPLOYE
                '''
            }
        }


        // =========================================================
        // 17. VERIFICATION DOCKER
        // =========================================================

        stage('Verification Docker') {

            steps {

                echo '=============================================='
                echo 'VERIFICATION DOCKER'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== DOCKER PS =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker ps -a --filter name=%CONTAINER_NAME%"

                    echo.
                    echo ===== ETAT CONTENEUR =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker inspect -f "{{.State.Status}}" %CONTAINER_NAME%"

                    if errorlevel 1 (
                        echo ERREUR : conteneur introuvable
                        exit /b 1
                    )

                    echo.
                    echo ===== VERIFICATION RUNNING =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker inspect -f "{{.State.Status}}" %CONTAINER_NAME%" ^
                        | findstr /I "running"

                    if errorlevel 1 (
                        echo ERREUR : le conteneur n est pas RUNNING
                        exit /b 1
                    )

                    echo CONTENEUR RUNNING OK

                    echo.
                    echo ===== PORTS =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker port %CONTAINER_NAME%"
                '''
            }
        }


        // =========================================================
        // 18. LOGS APPLICATION
        // =========================================================

        stage('Logs Application') {

            steps {

                echo '=============================================='
                echo 'LOGS APPLICATION'
                echo '=============================================='

                bat '''
                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        -o UserKnownHostsFile=NUL ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker logs --tail 50 %CONTAINER_NAME%"
                '''
            }
        }


        // =========================================================
        // 19. VERIFICATION HTTP ET MONGODB
        // =========================================================

        stage('Verification HTTP') {

            steps {

                echo '=============================================='
                echo 'VERIFICATION API ET MONGODB'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== TEST API HEALTH =====

                    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
                        "$r = Invoke-RestMethod -Uri 'http://%VM_IP%:3000/api/health' -TimeoutSec 15; $r | ConvertTo-Json -Depth 10; if ($r.status -ne 'ok') { exit 1 }; if ($r.dbConnected -ne $true) { exit 1 }"

                    if errorlevel 1 (
                        echo.
                        echo ERREUR : API HEALTH OU MONGODB INACCESSIBLE

                        echo.
                        echo ===== DOCKER PS =====

                        "%SSH_EXE%" ^
                            -i "%SSH_KEY%" ^
                            -o IdentitiesOnly=yes ^
                            -o StrictHostKeyChecking=no ^
                            -o UserKnownHostsFile=NUL ^
                            "%VM_USER%@%VM_IP%" ^
                            "docker ps -a --filter name=%CONTAINER_NAME%"

                        echo.
                        echo ===== LOGS CONTENEUR =====

                        "%SSH_EXE%" ^
                            -i "%SSH_KEY%" ^
                            -o IdentitiesOnly=yes ^
                            -o StrictHostKeyChecking=no ^
                            -o UserKnownHostsFile=NUL ^
                            "%VM_USER%@%VM_IP%" ^
                            "docker logs --tail 100 %CONTAINER_NAME%"

                        exit /b 1
                    )

                    echo.
                    echo ==============================================
                    echo API HEALTH OK
                    echo MONGODB CONNECTION OK
                    echo APPLICATION OK
                    echo ==============================================
                '''
            }
        }
    }


    // =============================================================
    // POST ACTIONS
    // =============================================================

    post {

        success {

            echo '''
==============================================
       PIPELINE NANO SERVER TERMINE
==============================================

Projet :
OMODA & JAECOO
Gestion de Parc Informatique & Support IT

VM :
172.17.91.174

Container :
parc-it-app

Image :
omoda-jaecoo-parc-it:nano-test

Base :
Windows Nano Server 2025

MongoDB :
mongodb://172.17.91.174:27017/Gestion_Parc_IT_2

Port :
3000

Application :
DEPLOYEE ET ACCESSIBLE

==============================================
'''
        }


        failure {

            echo '''
==============================================
          PIPELINE EN ECHEC
==============================================

Une des etapes du pipeline a echoue.

Verifier l etape en rouge dans Jenkins.

Points a verifier :
- Dockerfile.nano
- Node.js Nano Server
- Dependances natives Windows
- MongoDB Windows Service
- bindIp dans mongod.cfg
- Firewall TCP 27017
- docker logs
- connexion SSH
- compatibilite Nano Server

==============================================
'''
        }


        always {

            echo '=============================================='
            echo 'NETTOYAGE FICHIER TAR'
            echo '=============================================='

            bat '''
                if exist "%DOCKER_TAR%" (
                    del /F /Q "%DOCKER_TAR%"
                    echo FICHIER TAR SUPPRIME
                )
            '''
        }
    }
}
