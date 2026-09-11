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
        IMAGE_TAG = 'latest'
        CONTAINER_NAME = 'parc-it-app'

        // =========================================================
        // VM WINDOWS SERVER
        // =========================================================
        VM_IP = '172.17.91.144'
        VM_USER = 'Administrateur'

        // =========================================================
        // SSH
        // Jenkins fonctionne sous LocalSystem
        // Cette clé a été testée avec succès sous SYSTEM
        // =========================================================
        SSH_KEY = 'C:/Windows/System32/config/systemprofile/.ssh/jenkins_system_ed25519'

        SSH_EXE = 'C:/Windows/System32/OpenSSH/ssh.exe'
        SCP_EXE = 'C:/Windows/System32/OpenSSH/scp.exe'

        // =========================================================
        // MONGODB
        // MongoDB tourne sur la VM Windows Server
        // =========================================================
        MONGODB_URI = 'mongodb://172.17.91.144:27017/Gestion_Parc_IT_2'

        // =========================================================
        // JWT
        // TODO : déplacer plus tard dans Jenkins Credentials
        // =========================================================
        JWT_SECRET = 'Secret_Key_OMODA_JAECOO_WindowsServer_2025'

        // =========================================================
        // DOCKER TAR
        // =========================================================
        DOCKER_TAR = 'omoda-jaecoo-parc-it.tar'
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
        // 2. ENVIRONNEMENT
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

                    echo.
                    echo ===== DOCKER INFO =====
                    docker info
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
                    echo ===== SSH EXECUTABLE =====
                    "%SSH_EXE%" -V

                    echo.
                    echo ===== SCP EXECUTABLE =====
                    "%SCP_EXE%" -V

                    echo.
                    echo ===== SSH KEY =====
                    if exist "%SSH_KEY%" (
                        echo SSH KEY FOUND
                    ) else (
                        echo ERROR: SSH KEY NOT FOUND
                        exit /b 1
                    )
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
                    echo ===== TEST SSH =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "hostname"

                    if errorlevel 1 (
                        echo ERROR: SSH VERS LA VM ECHOUE
                        exit /b 1
                    )

                    echo.
                    echo SSH VM OK
                '''
            }
        }


        // =========================================================
        // 5. INSTALLATION DEPENDANCES
        // =========================================================

        stage('Installation Dependances') {
            steps {
                echo '=============================================='
                echo 'INSTALLATION DES DEPENDANCES'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== INSTALLATION NPM =====

                    npm install --include=dev --no-audit --no-fund

                    if errorlevel 1 (
                        echo ERROR: npm install a echoue
                        exit /b 1
                    )

                    echo.
                    echo ===== INSTALLATION BINAIRES WINDOWS =====

                    npm install --no-save ^
                        @rollup/rollup-win32-x64-msvc ^
                        lightningcss-win32-x64-msvc ^
                        @tailwindcss/oxide-win32-x64-msvc

                    if errorlevel 1 (
                        echo ERROR: installation des binaires Windows echouee
                        exit /b 1
                    )
                '''
            }
        }


        // =========================================================
        // 6. TYPESCRIPT
        // =========================================================

        stage('Verification TypeScript') {
            steps {
                echo '=============================================='
                echo 'VERIFICATION TYPESCRIPT'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== TSC =====

                    npx tsc --noEmit

                    if errorlevel 1 (
                        echo ERROR: TypeScript contient des erreurs
                        exit /b 1
                    )

                    echo.
                    echo TYPESCRIPT OK
                '''
            }
        }


        // =========================================================
        // 7. TESTS
        // =========================================================

        stage('Tests') {
            steps {
                echo '=============================================='
                echo 'TESTS VITEST'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== VITEST =====

                    npx vitest run

                    if errorlevel 1 (
                        echo ERROR: Les tests ont echoue
                        exit /b 1
                    )

                    echo.
                    echo TESTS OK
                '''
            }
        }


        // =========================================================
        // 8. BUILD FRONTEND
        // =========================================================

        stage('Build Application') {
            steps {
                echo '=============================================='
                echo 'BUILD APPLICATION'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== BUILD =====

                    npm run build

                    if errorlevel 1 (
                        echo ERROR: npm run build a echoue
                        exit /b 1
                    )

                    echo.
                    echo BUILD OK
                '''
            }
        }


        // =========================================================
        // 9. DOCKER BUILD
        // =========================================================

        stage('Docker Build') {
            steps {
                echo '=============================================='
                echo 'DOCKER BUILD'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== DOCKER OS TYPE =====
                    docker info --format "{{.OSType}}"

                    echo.
                    echo ===== DOCKER BUILD =====

                    docker build ^
                        -t "%IMAGE_NAME%:%IMAGE_TAG%" ^
                        -t "%IMAGE_NAME%:%BUILD_NUMBER%" ^
                        .

                    if errorlevel 1 (
                        echo ERROR: Docker build a echoue
                        exit /b 1
                    )

                    echo.
                    echo DOCKER BUILD OK

                    echo.
                    echo ===== IMAGES =====
                    docker images "%IMAGE_NAME%"
                '''
            }
        }


        // =========================================================
        // 10. DOCKER SAVE
        // =========================================================

        stage('Docker Save') {
            steps {
                echo '=============================================='
                echo 'EXPORT IMAGE DOCKER'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== DOCKER SAVE =====

                    if exist "%DOCKER_TAR%" (
                        del /F /Q "%DOCKER_TAR%"
                    )

                    docker save ^
                        -o "%DOCKER_TAR%" ^
                        "%IMAGE_NAME%:%IMAGE_TAG%"

                    if errorlevel 1 (
                        echo ERROR: docker save a echoue
                        exit /b 1
                    )

                    echo.
                    echo ===== TAR CREE =====
                    dir "%DOCKER_TAR%"
                '''
            }
        }


        // =========================================================
        // 11. COPIE IMAGE VERS VM
        // =========================================================

        stage('SCP Image vers VM') {
            steps {
                echo '=============================================='
                echo 'COPIE IMAGE VERS VM'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== CREATION DOSSIER TEMPORAIRE VM =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "if not exist C:\\Temp mkdir C:\\Temp"

                    if errorlevel 1 (
                        echo ERROR: impossible de creer C:\\Temp sur la VM
                        exit /b 1
                    )

                    echo.
                    echo ===== SCP IMAGE =====

                    "%SCP_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%DOCKER_TAR%" ^
                        "%VM_USER%@%VM_IP%:C:/Temp/%DOCKER_TAR%"

                    if errorlevel 1 (
                        echo ERROR: SCP de l'image echoue
                        exit /b 1
                    )

                    echo.
                    echo SCP OK
                '''
            }
        }


        // =========================================================
        // 12. DEPLOIEMENT SUR VM
        // =========================================================

        stage('Deploy VM') {
            steps {
                echo '=============================================='
                echo 'DEPLOIEMENT SUR VM'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== DOCKER LOAD SUR VM =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker load -i C:\\Temp\\%DOCKER_TAR%"

                    if errorlevel 1 (
                        echo ERROR: docker load a echoue
                        exit /b 1
                    )


                    echo.
                    echo ===== SUPPRESSION ANCIEN CONTENEUR =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker rm -f %CONTAINER_NAME% 2^>nul || echo Ancien conteneur absent"


                    echo.
                    echo ===== CREATION DU CONTENEUR =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker run -d --name %CONTAINER_NAME% --restart unless-stopped -p 3000:3000 -e NODE_ENV=production -e PORT=3000 -e MONGODB_URI=%MONGODB_URI% -e JWT_SECRET=%JWT_SECRET% -v app_uploads:C:\\app\\uploads %IMAGE_NAME%:%IMAGE_TAG%"

                    if errorlevel 1 (
                        echo ERROR: docker run a echoue
                        exit /b 1
                    )


                    echo.
                    echo ===== VERIFICATION CONTENEUR =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker ps --filter name=%CONTAINER_NAME%"

                    if errorlevel 1 (
                        echo ERROR: verification docker ps echouee
                        exit /b 1
                    )


                    echo.
                    echo ===== CONTENEUR DEPLOYE =====
                '''
            }
        }


        // =========================================================
        // 13. VERIFICATION APPLICATION
        // =========================================================

        stage('Verification Application') {
            steps {
                echo '=============================================='
                echo 'VERIFICATION APPLICATION'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== CONTAINER STATUS =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker inspect -f \"{{.Status}}\" %CONTAINER_NAME%"

                    echo.
                    echo ===== PORT 3000 =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker port %CONTAINER_NAME%"

                    echo.
                    echo ===== DERNIERS LOGS =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker logs --tail 30 %CONTAINER_NAME%"
                '''
            }
        }
    }


    // =============================================================
    // POST
    // =============================================================

    post {

        success {
            echo '''
==============================================
 PIPELINE TERMINE AVEC SUCCES
==============================================

Application :
OMODA & JAECOO - Gestion de Parc Informatique

VM :
172.17.91.144

Container :
parc-it-app

Port :
3000

Image :
omoda-jaecoo-parc-it:latest

==============================================
'''
        }

        failure {
            echo '''
==============================================
 PIPELINE EN ECHEC
==============================================

Verifier l'etape Jenkins qui a echoue.

==============================================
'''
        }

        always {
            echo 'Nettoyage des fichiers temporaires Jenkins...'

            bat '''
                if exist "%DOCKER_TAR%" (
                    del /F /Q "%DOCKER_TAR%"
                    echo TAR Docker supprime.
                )
            '''
        }
    }
}
