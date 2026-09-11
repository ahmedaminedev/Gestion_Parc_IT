pipeline {

    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
    }

    tools {
        nodejs 'NodeJS-22'
    }

    environment {

        CI = 'true'

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
        // SSH JENKINS
        // =========================================================

        SSH_KEY = 'C:/ProgramData/Jenkins/.ssh/jenkins_ed25519'
        SSH_KNOWN_HOSTS = 'C:/ProgramData/Jenkins/.ssh/known_hosts'

        // =========================================================
        // MONGODB SUR LA VM
        // =========================================================

        MONGODB_URI = 'mongodb://172.17.91.144:27017/Gestion_Parc_IT_2'
    }

    stages {

        // =========================================================
        // 1. CHECKOUT
        // =========================================================

        stage('Checkout') {
            steps {

                echo '================================================'
                echo 'Étape 1 : Récupération du code source'
                echo '================================================'

                checkout scm
            }
        }

        // =========================================================
        // 2. ENVIRONNEMENT
        // =========================================================

        stage('Vérification Environnement') {
            steps {

                echo '================================================'
                echo 'Étape 2 : Vérification Node + npm + Docker'
                echo '================================================'

                bat 'node --version'
                bat 'npm --version'
                bat 'docker version'
                bat 'docker info --format "{{.OSType}}"'
            }
        }

        // =========================================================
        // 3. DIAGNOSTIC SSH
        // =========================================================

        stage('Diagnostic SSH') {
            steps {

                echo '================================================'
                echo 'Diagnostic SSH Jenkins'
                echo '================================================'

                bat '''
                    echo.
                    echo ================================================
                    echo COMPTE WINDOWS UTILISÉ PAR JENKINS
                    echo ================================================
                    whoami

                    echo.
                    echo ================================================
                    echo CLE SSH JENKINS
                    echo ================================================
                    if exist "%SSH_KEY%" (
                        echo La clé SSH existe.
                        icacls "%SSH_KEY%"
                    ) else (
                        echo ERREUR : la clé SSH n'existe pas :
                        echo %SSH_KEY%
                        exit /b 1
                    )

                    echo.
                    echo ================================================
                    echo CLE PUBLIQUE
                    echo ================================================
                    if exist "%SSH_KEY%.pub" (
                        type "%SSH_KEY%.pub"
                    ) else (
                        echo Aucune clé publique .pub trouvée.
                    )

                    echo.
                    echo ================================================
                    echo KNOWN HOSTS
                    echo ================================================
                    if exist "%SSH_KNOWN_HOSTS%" (
                        echo known_hosts existe.
                        icacls "%SSH_KNOWN_HOSTS%"
                    ) else (
                        echo known_hosts n'existe pas encore.
                        echo StrictHostKeyChecking=no sera utilisé.
                    )
                '''
            }
        }

        // =========================================================
        // 4. TEST SSH VM
        // =========================================================

        stage('Test SSH VM') {
            steps {

                echo '================================================'
                echo 'Étape 3 : Test SSH Jenkins -> VM'
                echo '================================================'

                bat '''
                    ssh ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o UserKnownHostsFile="%SSH_KNOWN_HOSTS%" ^
                        -o StrictHostKeyChecking=no ^
                        %VM_USER%@%VM_IP% "hostname"
                '''
            }
        }

        // =========================================================
        // 5. INSTALLATION + TESTS
        // =========================================================

        stage('Installation Dépendances & Tests') {
            steps {

                echo '================================================'
                echo 'Étape 4 : Installation dépendances + tests'
                echo '================================================'

                bat 'call npm install --include=dev --no-audit --no-fund'

                bat '''
                    call npm install --no-save ^
                        @rollup/rollup-win32-x64-msvc ^
                        lightningcss-win32-x64-msvc ^
                        @tailwindcss/oxide-win32-x64-msvc
                '''

                bat 'call npx tsc --noEmit'

                bat 'call npx vitest run'
            }
        }

        // =========================================================
        // 6. BUILD APPLICATION
        // =========================================================

        stage('Compilation Production') {
            steps {

                echo '================================================'
                echo 'Étape 5 : Build production'
                echo '================================================'

                bat 'call npm run build'
            }
        }

        // =========================================================
        // 7. BUILD IMAGE DOCKER
        // =========================================================

        stage('Build Image Docker') {
            steps {

                echo '================================================'
                echo 'Étape 6 : Construction image Docker'
                echo '================================================'

                bat '''
                    docker build ^
                        -t %IMAGE_NAME%:%IMAGE_TAG% ^
                        -t %IMAGE_NAME%:%BUILD_NUMBER% ^
                        .
                '''
            }
        }

        // =========================================================
        // 8. SAUVEGARDE IMAGE
        // =========================================================

        stage('Sauvegarde de l’image') {
            steps {

                echo '================================================'
                echo 'Étape 7 : Sauvegarde image Docker'
                echo '================================================'

                bat '''
                    docker save ^
                        -o "%IMAGE_NAME%.tar" ^
                        "%IMAGE_NAME%:%IMAGE_TAG%"
                '''
            }
        }

        // =========================================================
        // 9. ENVOI VERS VM
        // =========================================================

        stage('Envoi vers la VM') {
            steps {

                echo '================================================'
                echo 'Étape 8 : Envoi image Docker vers la VM'
                echo '================================================'

                bat '''
                    scp ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o UserKnownHostsFile="%SSH_KNOWN_HOSTS%" ^
                        -o StrictHostKeyChecking=no ^
                        "%IMAGE_NAME%.tar" ^
                        %VM_USER%@%VM_IP%:C:/Users/Administrateur/
                '''
            }
        }

        // =========================================================
        // 10. DEPLOIEMENT VM
        // =========================================================

        stage('Déploiement sur la VM') {
            steps {

                echo '================================================'
                echo 'Étape 9 : Déploiement Docker sur la VM'
                echo '================================================'

                bat '''
                    ssh ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o UserKnownHostsFile="%SSH_KNOWN_HOSTS%" ^
                        -o StrictHostKeyChecking=no ^
                        %VM_USER%@%VM_IP% ^
                        "docker load -i C:\\Users\\Administrateur\\%IMAGE_NAME%.tar && docker rm -f %CONTAINER_NAME% 2>nul & docker run -d --name %CONTAINER_NAME% --restart unless-stopped -p 3000:3000 -e NODE_ENV=production -e PORT=3000 -e MONGODB_URI=%MONGODB_URI% -e JWT_SECRET=Secret_Key_OMODA_JAECOO_WindowsServer_2025 -v app_uploads:C:\\app\\uploads %IMAGE_NAME%:%IMAGE_TAG%"
                '''
            }
        }

        // =========================================================
        // 11. VERIFICATION DEPLOIEMENT
        // =========================================================

        stage('Vérification Déploiement') {
            steps {

                echo '================================================'
                echo 'Étape 10 : Vérification conteneur sur la VM'
                echo '================================================'

                bat '''
                    ssh ^
                        -i "%SSH_KEY%" ^
                        -o IdentitiesOnly=yes ^
                        -o UserKnownHostsFile="%SSH_KNOWN_HOSTS%" ^
                        -o StrictHostKeyChecking=no ^
                        %VM_USER%@%VM_IP% ^
                        "docker ps --filter name=%CONTAINER_NAME% --format \"table {{.Names}}\\t{{.Status}}\\t{{.Ports}}\""
                '''
            }
        }
    }

    // =============================================================
    // POST PIPELINE
    // =============================================================

    post {

        success {

            echo '================================================'
            echo 'PIPELINE TERMINÉ AVEC SUCCÈS'
            echo '================================================'

            echo 'Application déployée sur la VM Windows Server.'
            echo 'VM : 172.17.91.144'
            echo 'Conteneur : parc-it-app'
            echo 'Port : 3000'
        }

        failure {

            echo '================================================'
            echo 'ÉCHEC DU PIPELINE'
            echo '================================================'

            echo 'Consulter les logs Jenkins pour identifier l étape en échec.'
        }

        always {

            echo '================================================'
            echo 'NETTOYAGE'
            echo '================================================'

            bat '''
                if exist "%IMAGE_NAME%.tar" (
                    del /f /q "%IMAGE_NAME%.tar"
                    echo Fichier Docker TAR supprimé.
                ) else (
                    echo Aucun fichier TAR à supprimer.
                )
            '''
        }
    }
}
