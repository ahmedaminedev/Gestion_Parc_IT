pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'
    }

    environment {
        CI = 'true'
        NODE_ENV = 'test'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Execute All Tests (482+ Tests)') {
            steps {
                echo 'Running Vitest full test suite...'
                sh 'npm run test:run'
            }
        }

        stage('TypeScript Linting') {
            steps {
                echo 'Checking types and lint...'
                sh 'npm run lint'
            }
        }

        stage('Production Build') {
            steps {
                echo 'Building production bundle...'
                sh 'npm run build'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo '✅ Pipeline execution successful: All tests passed.'
        }
        failure {
            echo '❌ Pipeline failed: Please check test or build logs.'
        }
    }
}
