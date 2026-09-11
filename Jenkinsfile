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
        DOCKER_TAR = 'omoda-jaecoo-parc-it.tar'


        // =========================================================
        // VM WINDOWS SERVER
        // =========================================================

        VM_IP = '172.17.91.144'
        VM_USER = 'Administrateur'


        // =========================================================
        // SSH
        // Jenkins tourne sous LocalSystem
        // =========================================================

        SSH_KEY = 'C:/Windows/System32/config/systemprofile/.ssh/jenkins_system_ed25519'

        SSH_EXE = 'C:/Windows/System32/OpenSSH/ssh.exe'

        SCP_EXE = 'C:/Windows/System32/OpenSSH/scp.exe'


        // =========================================================
        // MONGODB
        // =========================================================

        MONGODB_URI = 'mongodb://172.17.91.144:27017/Gestion_Parc_IT_2'


        // =========================================================
        // JWT
        // TODO : déplacer dans Jenkins Credentials
        // =========================================================

        JWT_SECRET = 'Secret_Key_OMODA_JAECOO_WindowsServer_2025'
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
                    echo ===== SSH EXECUTABLE =====

                    "%SSH_EXE%" -V


                    echo.
                    echo ===== SCP EXECUTABLE =====

                    where scp.exe


                    echo.
                    echo ===== SSH KEY =====

                    if exist "%SSH_KEY%" (
                        echo SSH KEY FOUND
                    ) else (
                        echo ERROR: SSH KEY NOT FOUND
                        exit /b 1
                    )


                    echo.
                    echo ===== SSH KEY PATH =====

                    echo %SSH_KEY%


                    echo.
                    echo ===== SSH DIAGNOSTIC OK =====
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
                        echo.
                        echo ERROR: SSH VERS LA VM ECHOUE
                        exit /b 1
                    )


                    echo.
                    echo SSH VM OK
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
                    echo.
                    echo ===== SUPPRESSION NODE_MODULES =====

                    if exist node_modules (
                        rmdir /S /Q node_modules
                    )


                    echo.
                    echo ===== VERIFICATION =====

                    if exist node_modules (
                        echo ERROR: node_modules existe encore
                        exit /b 1
                    )


                    echo.
                    echo NODE_MODULES CLEAN
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
                    echo.
                    echo ===== NPM INSTALL =====

                    npm install --include=dev --no-audit --no-fund


                    if errorlevel 1 (
                        echo.
                        echo ERROR: npm install a echoue
                        exit /b 1
                    )


                    echo.
                    echo NPM INSTALL TERMINE
                '''
            }
        }


        // =========================================================
        // 7. CORRECTION ROLLUP WINDOWS
        // =========================================================

        stage('Correction Rollup Windows') {

            steps {

                echo '=============================================='
                echo 'ROLLUP WINDOWS'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== INSTALLATION ROLLUP WINDOWS =====

                    npm install --no-save --force @rollup/rollup-win32-x64-msvc


                    if errorlevel 1 (
                        echo.
                        echo ERROR: installation Rollup Windows echouee
                        exit /b 1
                    )


                    echo.
                    echo ===== VERIFICATION ROLLUP =====

                    if exist "node_modules\\@rollup\\rollup-win32-x64-msvc" (
                        echo ROLLUP WINDOWS FOUND
                    ) else (
                        echo ERROR: ROLLUP WINDOWS NOT FOUND
                        exit /b 1
                    )


                    echo.
                    echo ROLLUP WINDOWS OK
                '''
            }
        }


        // =========================================================
        // 8. VERIFICATION TYPESCRIPT
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
                        echo.
                        echo ERROR: TypeScript contient des erreurs
                        exit /b 1
                    )


                    echo.
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
                    echo.
                    echo ===== VITEST =====

                    npx vitest run


                    if errorlevel 1 (
                        echo.
                        echo ERROR: LES TESTS ONT ECHOUE
                        exit /b 1
                    )


                    echo.
                    echo TESTS OK
                '''
            }
        }


        // =========================================================
        // 10. BUILD APPLICATION
        // =========================================================

        stage('Build Application') {

            steps {

                echo '=============================================='
                echo 'BUILD APPLICATION'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== NPM RUN BUILD =====

                    npm run build


                    if errorlevel 1 (
                        echo.
                        echo ERROR: npm run build a echoue
                        exit /b 1
                    )


                    echo.
                    echo BUILD OK
                '''
            }
        }


        // =========================================================
        // 11. DOCKER BUILD
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
                    echo ===== DOCKER CONTEXT =====

                    docker context show


                    echo.
                    echo ===== DOCKER BUILD =====

                    docker build ^
                        -t "%IMAGE_NAME%:%IMAGE_TAG%" ^
                        -t "%IMAGE_NAME%:%BUILD_NUMBER%" ^
                        .


                    if errorlevel 1 (
                        echo.
                        echo ERROR: Docker build a echoue
                        exit /b 1
                    )


                    echo.
                    echo ===== DOCKER BUILD OK =====

                    docker images "%IMAGE_NAME%"
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
                    echo.
                    echo ===== SUPPRESSION ANCIEN TAR =====

                    if exist "%DOCKER_TAR%" (
                        del /F /Q "%DOCKER_TAR%"
                    )


                    echo.
                    echo ===== DOCKER SAVE =====

                    docker save ^
                        -o "%DOCKER_TAR%" ^
                        "%IMAGE_NAME%:%IMAGE_TAG%"


                    if errorlevel 1 (
                        echo.
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
        // 13. PREPARATION VM
        // =========================================================

        stage('Preparation VM') {

            steps {

                echo '=============================================='
                echo 'PREPARATION VM'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== CREATION C:\\Temp =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "if not exist C:\\Temp mkdir C:\\Temp"


                    if errorlevel 1 (
                        echo.
                        echo ERROR: impossible de creer C:\\Temp
                        exit /b 1
                    )


                    echo.
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
                    echo.
                    echo ===== SCP IMAGE =====

                    "%SCP_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%DOCKER_TAR%" ^
                        "%VM_USER%@%VM_IP%:C:/Temp/%DOCKER_TAR%"


                    if errorlevel 1 (
                        echo.
                        echo ERROR: SCP DE L IMAGE ECHOUE
                        exit /b 1
                    )


                    echo.
                    echo SCP OK
                '''
            }
        }


        // =========================================================
        // 15. DOCKER LOAD SUR VM
        // =========================================================

        stage('Docker Load VM') {

            steps {

                echo '=============================================='
                echo 'DOCKER LOAD SUR VM'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== DOCKER LOAD =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker load -i C:\\Temp\\%DOCKER_TAR%"


                    if errorlevel 1 (
                        echo.
                        echo ERROR: docker load a echoue
                        exit /b 1
                    )


                    echo.
                    echo DOCKER LOAD OK
                '''
            }
        }


        // =========================================================
        // 16. DEPLOIEMENT CONTENEUR
        // =========================================================

        stage('Deploy VM') {

            steps {

                echo '=============================================='
                echo 'DEPLOIEMENT CONTENEUR SUR VM'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== SUPPRESSION ANCIEN CONTENEUR =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker rm -f %CONTAINER_NAME% 2^>nul || echo Aucun ancien conteneur"


                    echo.
                    echo ===== DEPLOIEMENT NOUVEAU CONTENEUR =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker run -d --name %CONTAINER_NAME% --restart unless-stopped -p 3000:3000 -e NODE_ENV=production -e PORT=3000 -e MONGODB_URI=%MONGODB_URI% -e JWT_SECRET=%JWT_SECRET% -v app_uploads:C:\\app\\uploads %IMAGE_NAME%:%IMAGE_TAG%"


                    if errorlevel 1 (
                        echo.
                        echo ERROR: docker run a echoue
                        exit /b 1
                    )


                    echo.
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
                        "%VM_USER%@%VM_IP%" ^
                        "docker ps --filter name=%CONTAINER_NAME%"


                    echo.
                    echo ===== DOCKER INSPECT =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker inspect -f \"{{.State.Status}}\" %CONTAINER_NAME%"


                    if errorlevel 1 (
                        echo.
                        echo ERROR: conteneur introuvable
                        exit /b 1
                    )


                    echo.
                    echo ===== VERIFICATION ETAT RUNNING =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "for /f \"delims=\" %%A in ('docker inspect -f \"{{.State.Status}}\" %CONTAINER_NAME%') do @if /I not \"%%A\"==\"running\" exit /b 1"


                    if errorlevel 1 (
                        echo.
                        echo ERROR: le conteneur n'est pas RUNNING
                        exit /b 1
                    )


                    echo.
                    echo CONTENEUR RUNNING OK


                    echo.
                    echo ===== PORT =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
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
                echo 'VERIFICATION LOGS APPLICATION'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== DERNIERS LOGS =====

                    "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker logs --tail 50 %CONTAINER_NAME%"
                '''
            }
        }


        // =========================================================
        // 19. VERIFICATION HTTP
        // =========================================================

        stage('Verification HTTP') {

            steps {

                echo '=============================================='
                echo 'VERIFICATION HTTP'
                echo '=============================================='

                bat '''
                    echo.
                    echo ===== TEST PORT 3000 SUR VM =====

                    powershell.exe -NoProfile -Command ^
                        "$r = Test-NetConnection -ComputerName '%VM_IP%' -Port 3000 -WarningAction SilentlyContinue; if (-not $r.TcpTestSucceeded) { exit 1 }"


                    if errorlevel 1 (
                        echo.
                        echo ERROR: port 3000 non accessible depuis Jenkins
                        echo.
                        echo ===== VERIFICATION CONTAINER =====

                        "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker ps -a --filter name=%CONTAINER_NAME%"


                        echo.
                        echo ===== LOGS CONTAINER =====

                        "%SSH_EXE%" ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o StrictHostKeyChecking=no ^
                        "%VM_USER%@%VM_IP%" ^
                        "docker logs --tail 100 %CONTAINER_NAME%"


                        exit /b 1
                    )


                    echo.
                    echo PORT 3000 ACCESSIBLE
                '''
            }
        }
    }


    // =============================================================
    // POST ACTIONS
    // =============================================================

    post {


        // =========================================================
        // SUCCESS
        // =========================================================

        success {

            echo '''
==============================================
          PIPELINE TERMINE AVEC SUCCES
==============================================

Projet :
OMODA & JAECOO
Gestion de Parc Informatique & Support IT

VM :
172.17.91.144

Container :
parc-it-app

Image :
omoda-jaecoo-parc-it:latest

Port :
3000

Application :
DEPLOYEE ET ACCESSIBLE

==============================================
'''
        }


        // =========================================================
        // FAILURE
        // =========================================================

        failure {

            echo '''
==============================================
             PIPELINE EN ECHEC
==============================================

Une des etapes du pipeline a echoue.

Verifier l'etape en rouge dans Jenkins.

Les logs Jenkins permettent d'identifier
precisement le probleme.

==============================================
'''
        }


        // =========================================================
        // ALWAYS
        // =========================================================

        always {

            echo '=============================================='
            echo 'NETTOYAGE'
            echo '=============================================='

            bat '''
                if exist "%DOCKER_TAR%" (
                    del /F /Q "%DOCKER_TAR%"
                    echo TAR Docker supprime.
                )
            '''
        }
    }
}
