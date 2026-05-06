// =============================================================================
// Jenkinsfile — Angular Frontend CI/CD Pipeline
// Project  : Learnivo — Modules Stage & Certification
// Image    : imedakrimi/imed-frontend
// Author   : Akrimi
// =============================================================================

pipeline {

    // Run on any available Jenkins agent
    agent any

    // ── Environment variables ─────────────────────────────────────────────────
    environment {
        // Docker Hub image name (no credentials hardcoded here)
        IMAGE_NAME = 'imedakrimi/imed-frontend'
    }

    stages {

        // ── Stage 1: Checkout ─────────────────────────────────────────────────
        // Clone the source code from the configured SCM (GitHub)
        stage('Checkout') {
            steps {
                echo '📥 Cloning source code from GitHub...'
                checkout scm
            }
        }

        // ── Stage 2: Install Dependencies ─────────────────────────────────────
        // Install Node.js packages using npm ci (clean install from lock file)
        // npm ci is preferred over npm install for reproducible CI builds
        stage('Install Dependencies') {
            steps {
                echo '📦 Installing Node.js dependencies with npm ci...'
                sh 'npm ci'
            }
        }

        // ── Stage 3: Test ─────────────────────────────────────────────────────
        // Run Angular unit tests in headless Chrome mode (no display required)
        // --watch=false ensures the test runner exits after one run (CI mode)
        stage('Test') {
            steps {
                echo '✅ Running Angular unit tests in headless Chrome...'
                sh 'npm test -- --watch=false --browsers=ChromeHeadless'
            }
        }

        // ── Stage 4: Build ───────────────────────────────────────────────────
        // Compile the Angular app in production mode
        // Output will be placed in dist/frontend-v21/browser/
        stage('Build') {
            steps {
                echo '🏗️  Building Angular application in production mode...'
                sh 'npm run build'
            }
        }

        // ── Stage 5: Docker Build ─────────────────────────────────────────────
        // Build the Docker image using the multi-stage Dockerfile (node → nginx)
        // Two tags are applied at once: latest and the Jenkins build number
        stage('Docker Build') {
            steps {
                echo "🐳 Building Docker image: ${IMAGE_NAME}:latest and ${IMAGE_NAME}:${BUILD_NUMBER}..."
                sh """
                    docker build \
                        -t ${IMAGE_NAME}:latest \
                        -t ${IMAGE_NAME}:${BUILD_NUMBER} \
                        .
                """
            }
        }

        // ── Stage 6: Docker Hub Login ─────────────────────────────────────────
        // Authenticate to Docker Hub using Jenkins credentials
        // The credential ID 'dockerhub-credentials' must be configured in:
        //   Jenkins → Manage Jenkins → Credentials → Global → Add Credentials
        //   Kind: Username with password
        //   ID  : dockerhub-credentials
        stage('Docker Hub Login') {
            steps {
                echo '🔐 Logging in to Docker Hub using Jenkins credentials...'
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKERHUB_USER',
                    passwordVariable: 'DOCKERHUB_PASS'
                )]) {
                    sh 'echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USER" --password-stdin'
                }
            }
        }

        // ── Stage 7: Docker Push ──────────────────────────────────────────────
        // Push both tags to Docker Hub:
        //   - latest      : always up-to-date image
        //   - BUILD_NUMBER: traceable, immutable build reference
        stage('Docker Push') {
            steps {
                echo "🚀 Pushing Docker images to Docker Hub..."
                sh "docker push ${IMAGE_NAME}:latest"
                sh "docker push ${IMAGE_NAME}:${BUILD_NUMBER}"
                echo "✅ Images pushed successfully:"
                echo "   → ${IMAGE_NAME}:latest"
                echo "   → ${IMAGE_NAME}:${BUILD_NUMBER}"
            }
        }
    }

    // ── Post-build actions ────────────────────────────────────────────────────
    post {
        success {
            echo '🎉 Pipeline completed successfully! Frontend image is available on Docker Hub.'
        }
        failure {
            echo '❌ Pipeline failed. Check the logs above for details.'
        }
        always {
            // Log out from Docker Hub after the pipeline finishes (success or failure)
            sh 'docker logout || true'
            echo '🔒 Logged out from Docker Hub.'
        }
    }
}
