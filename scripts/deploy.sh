#!/bin/bash
# -------------------------------
# deploy.sh - Auto-deploy Proof project with rollback capability
# -------------------------------

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration
PROJECT_DIR="/root/proof"
BACKUP_DIR="/root/proof-backups"
PM2_PROCESS="proof-server"
HEALTH_CHECK_URL="http://localhost:3000/api/test"
MAX_BACKUPS=5  # Keep last 5 backups
HEALTH_CHECK_TIMEOUT=30  # seconds
HEALTH_CHECK_RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to create backup
create_backup() {
    local backup_name="backup-$(date +'%Y%m%d-%H%M%S')"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    log "Creating backup: ${backup_name}"
    
    # Create backup directory if it doesn't exist
    mkdir -p "${BACKUP_DIR}"
    
    # Create backup of current working version
    if [ -d "${PROJECT_DIR}/.next" ]; then
        mkdir -p "${backup_path}"
        cp -r "${PROJECT_DIR}/.next" "${backup_path}/.next" 2>/dev/null || true
        cp -r "${PROJECT_DIR}/node_modules" "${backup_path}/node_modules" 2>/dev/null || true
        cp "${PROJECT_DIR}/package.json" "${backup_path}/package.json" 2>/dev/null || true
        cp "${PROJECT_DIR}/package-lock.json" "${backup_path}/package-lock.json" 2>/dev/null || true
        git -C "${PROJECT_DIR}" rev-parse HEAD > "${backup_path}/git-commit.txt" 2>/dev/null || true
        
        log "Backup created successfully: ${backup_name}"
        echo "${backup_name}"
    else
        warn "No .next directory found, skipping backup creation"
        echo ""
    fi
}

# Function to rollback to previous version
rollback() {
    local backup_name=$1
    
    if [ -z "$backup_name" ] || [ ! -d "${BACKUP_DIR}/${backup_name}" ]; then
        error "No valid backup found for rollback"
        return 1
    fi
    
    error "Rolling back to backup: ${backup_name}"
    
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    # Restore .next directory
    if [ -d "${backup_path}/.next" ]; then
        rm -rf "${PROJECT_DIR}/.next"
        cp -r "${backup_path}/.next" "${PROJECT_DIR}/.next"
        log "Restored .next directory from backup"
    fi
    
    # Restore node_modules if needed
    if [ -d "${backup_path}/node_modules" ] && [ ! -d "${PROJECT_DIR}/node_modules" ]; then
        log "Restoring node_modules from backup"
        cp -r "${backup_path}/node_modules" "${PROJECT_DIR}/node_modules"
    fi
    
    # Restore package files if they differ
    if [ -f "${backup_path}/package.json" ]; then
        if ! cmp -s "${PROJECT_DIR}/package.json" "${backup_path}/package.json"; then
            warn "Package.json differs, restoring from backup"
            cp "${backup_path}/package.json" "${PROJECT_DIR}/package.json"
            cp "${backup_path}/package-lock.json" "${PROJECT_DIR}/package-lock.json" 2>/dev/null || true
            log "Running npm install to sync dependencies..."
            cd "${PROJECT_DIR}"
            npm install --production=false
        fi
    fi
    
    # Restore git commit if available
    if [ -f "${backup_path}/git-commit.txt" ]; then
        local commit_hash=$(cat "${backup_path}/git-commit.txt")
        log "Restoring git commit: ${commit_hash}"
        cd "${PROJECT_DIR}"
        git checkout "${commit_hash}" 2>/dev/null || warn "Could not restore git commit"
    fi
    
    # Restart PM2 with restored version
    log "Restarting PM2 process with previous version..."
    pm2 restart "${PM2_PROCESS}" --update-env || pm2 start "${PM2_PROCESS}" --update-env
    
    # Wait a bit for the process to start
    sleep 5
    
    # Verify rollback
    if check_health; then
        log "Rollback successful! Application is running with previous version."
        return 0
    else
        error "Rollback completed but health check failed. Manual intervention may be required."
        return 1
    fi
}

# Function to check application health
check_health() {
    local retries=0
    local max_retries=${HEALTH_CHECK_RETRIES}
    
    log "Checking application health at ${HEALTH_CHECK_URL}..."
    
    while [ $retries -lt $max_retries ]; do
        # Check if PM2 process is running
        if ! pm2 describe "${PM2_PROCESS}" > /dev/null 2>&1; then
            warn "PM2 process ${PM2_PROCESS} is not running"
            retries=$((retries + 1))
            if [ $retries -lt $max_retries ]; then
                warn "Retrying in 5 seconds..."
                sleep 5
            fi
            continue
        fi
        
        # Check HTTP health endpoint (don't use -f flag to capture response even on errors)
        local http_code=$(curl -s -o /tmp/health_check_response.txt -w "%{http_code}" -m ${HEALTH_CHECK_TIMEOUT} "${HEALTH_CHECK_URL}" 2>&1)
        local curl_exit=$?
        local response=$(cat /tmp/health_check_response.txt 2>/dev/null || echo "")
        
        # Check if curl succeeded and got HTTP 200
        if [ $curl_exit -eq 0 ] && [ "$http_code" = "200" ]; then
            # Check if response contains success field (JSON response)
            if echo "$response" | grep -q '"success"'; then
                # Check if success is true
                if echo "$response" | grep -q '"success"\s*:\s*true'; then
                    log "Health check passed! (HTTP $http_code)"
                    rm -f /tmp/health_check_response.txt
                    return 0
                else
                    warn "Health check returned success=false in response"
                    warn "Response preview: $(echo "$response" | head -c 200)"
                fi
            else
                # If not JSON, check if it's at least a valid HTTP 200 response
                if [ -n "$response" ]; then
                    warn "Health check returned non-JSON response (HTTP $http_code)"
                    warn "Response preview: $(echo "$response" | head -c 200)"
                else
                    warn "Health check returned empty response (HTTP $http_code)"
                fi
            fi
        else
            if [ $curl_exit -ne 0 ]; then
                warn "Health check HTTP request failed (curl exit code: $curl_exit, HTTP code: $http_code)"
            else
                warn "Health check returned non-200 status (HTTP $http_code)"
                if [ -n "$response" ]; then
                    warn "Response preview: $(echo "$response" | head -c 200)"
                fi
            fi
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $max_retries ]; then
            warn "Health check failed (attempt ${retries}/${max_retries}), retrying in 5 seconds..."
            sleep 5
        fi
    done
    
    error "Health check failed after ${max_retries} attempts"
    # Log PM2 status for debugging
    log "PM2 process status:"
    pm2 describe "${PM2_PROCESS}" || true
    rm -f /tmp/health_check_response.txt
    return 1
}

# Function to clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups (keeping last ${MAX_BACKUPS})..."
    
    # Get list of backups sorted by modification time (newest first)
    local backups=($(ls -t "${BACKUP_DIR}" 2>/dev/null | grep "^backup-" || true))
    local backup_count=${#backups[@]}
    
    if [ $backup_count -gt $MAX_BACKUPS ]; then
        local to_remove=$((backup_count - MAX_BACKUPS))
        for ((i=MAX_BACKUPS; i<backup_count; i++)); do
            local old_backup="${BACKUP_DIR}/${backups[$i]}"
            log "Removing old backup: ${backups[$i]}"
            rm -rf "${old_backup}"
        done
        log "Cleaned up ${to_remove} old backup(s)"
    else
        log "No old backups to clean up"
    fi
}

# Main deployment function
main() {
    log "Starting deployment for Proof project..."
    
    # Navigate to project directory
    cd "${PROJECT_DIR}" || {
        error "Project directory not found: ${PROJECT_DIR}"
        exit 1
    }
    
    # Create backup of current working version
    local current_backup=$(create_backup)
    
    # Clean up old backups
    cleanup_old_backups
    
    # Store current git commit for potential rollback
    local current_commit=$(git rev-parse HEAD 2>/dev/null || echo "")
    
    # Pull latest changes from GitHub
    log "Pulling latest code from GitHub..."
    if ! git fetch origin main; then
        error "Failed to fetch from GitHub"
        if [ -n "$current_backup" ]; then
            rollback "$current_backup"
        fi
        exit 1
    fi
    
    # Store the commit we're about to deploy
    local new_commit=$(git rev-parse origin/main 2>/dev/null || echo "")
    
    # Reset to latest
    git reset --hard origin/main || {
        error "Failed to reset to latest commit"
        if [ -n "$current_backup" ]; then
            rollback "$current_backup"
        fi
        exit 1
    }
    
    # Install/update npm dependencies
    log "Installing npm dependencies..."
    if ! npm install; then
        error "Failed to install dependencies"
        if [ -n "$current_backup" ]; then
            rollback "$current_backup"
        fi
        exit 1
    fi
    
    # Build the Next.js project
    log "Building Next.js project..."
    if ! npm run build; then
        error "Build failed!"
        if [ -n "$current_backup" ]; then
            log "Attempting to rollback to previous version..."
            rollback "$current_backup"
        fi
        exit 1
    fi
    
    # Verify build output exists
    if [ ! -d "${PROJECT_DIR}/.next" ]; then
        error "Build output not found!"
        if [ -n "$current_backup" ]; then
            log "Attempting to rollback to previous version..."
            rollback "$current_backup"
        fi
        exit 1
    fi
    
    # Restart PM2 process with new build
    log "Restarting PM2 process: ${PM2_PROCESS}..."
    if ! pm2 restart "${PM2_PROCESS}" --update-env; then
        error "Failed to restart PM2 process"
        if [ -n "$current_backup" ]; then
            log "Attempting to rollback to previous version..."
            rollback "$current_backup"
        fi
        exit 1
    fi
    
    # Wait for application to start
    log "Waiting for application to start..."
    sleep 15
    
    # Perform health check
    if ! check_health; then
        error "Health check failed after deployment!"
        if [ -n "$current_backup" ]; then
            log "Attempting to rollback to previous version..."
            if rollback "$current_backup"; then
                log "Rollback successful! Previous version is now running."
                log "Deployment was not applied due to health check failure."
                log "Previous commit remains active: ${current_commit}"
                # Exit with 0 (success) since rollback was successful
                # The previous version is running, which is what we want
                exit 0
            else
                error "Rollback failed! Manual intervention required."
                exit 1
            fi
        else
            error "No backup available for rollback. Manual intervention required."
            exit 1
        fi
    fi
    
    log "Deployment completed successfully!"
    log "Deployed commit: ${new_commit}"
    if [ -n "$current_backup" ]; then
        log "Previous version backed up as: ${current_backup}"
    fi
}

# Run main function
main "$@"
