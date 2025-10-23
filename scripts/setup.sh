#!/bin/bash

# DocAiProduction Setup Script
# This script sets up the development environment and builds the application

set -e  # Exit on any error

echo "🚀 Setting up DocAiProduction..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    print_status "Checking Node.js installation..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
        
        # Check if version is 18 or higher
        NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
            print_warning "Node.js version 18 or higher is recommended. Current version: $NODE_VERSION"
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm is installed: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Check if package-lock.json exists
    if [ -f "package-lock.json" ]; then
        print_status "Using npm ci for faster, reliable builds..."
        npm ci
    else
        print_status "Using npm install..."
        npm install
    fi
    
    print_success "Dependencies installed successfully"
}

# Build the application
build_app() {
    print_status "Building the application..."
    
    # Build renderer
    print_status "Building renderer..."
    npm run build:renderer
    
    # Build main process
    print_status "Building main process..."
    npm run build:main
    
    print_success "Application built successfully"
}

# Create distribution packages
create_distributions() {
    print_status "Creating distribution packages..."
    
    # Check platform and create appropriate distributions
    case "$(uname -s)" in
        Darwin*)
            print_status "Creating macOS distribution..."
            npm run dist:mac
            ;;
        Linux*)
            print_status "Creating Linux distribution..."
            npm run dist:linux
            ;;
        CYGWIN*|MINGW32*|MSYS*|MINGW*)
            print_status "Creating Windows distribution..."
            npm run dist:win
            ;;
        *)
            print_warning "Unknown platform. Creating all distributions..."
            npm run dist:all
            ;;
    esac
    
    print_success "Distribution packages created successfully"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    if [ -f "jest.config.js" ] || [ -f "package.json" ] && grep -q "jest" package.json; then
        npm test
        print_success "Tests completed successfully"
    else
        print_warning "No test configuration found. Skipping tests."
    fi
}

# Check environment variables
check_env() {
    print_status "Checking environment variables..."
    
    # Check for required environment variables
    if [ -f ".env.example" ]; then
        if [ ! -f ".env" ]; then
            print_warning ".env file not found. Copying from .env.example..."
            cp .env.example .env
            print_warning "Please update .env file with your actual values"
        else
            print_success ".env file exists"
        fi
    fi
    
    # Check for GitHub token (for releases)
    if [ -z "$GITHUB_TOKEN" ]; then
        print_warning "GITHUB_TOKEN not set. Releases will not work without it."
    else
        print_success "GITHUB_TOKEN is set"
    fi
}

# Main setup function
main() {
    echo "🎯 DocAiProduction Setup Script"
    echo "================================"
    
    # Check prerequisites
    check_node
    check_npm
    
    # Check environment
    check_env
    
    # Install dependencies
    install_dependencies
    
    # Build application
    build_app
    
    # Run tests
    run_tests
    
    # Create distributions (optional)
    read -p "Do you want to create distribution packages? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_distributions
    fi
    
    print_success "Setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Update .env file with your configuration"
    echo "2. Run 'npm run dev' to start development"
    echo "3. Run 'npm run dist' to create installers"
    echo "4. Run 'npm run release:patch' to create a new release"
    echo ""
    echo "🔗 Useful commands:"
    echo "- npm run dev          # Start development server"
    echo "- npm run build        # Build for production"
    echo "- npm run dist         # Create installers"
    echo "- npm run release:patch # Create patch release"
    echo "- npm run release:minor # Create minor release"
    echo "- npm run release:major # Create major release"
}

# Run main function
main "$@"
