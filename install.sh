#!/bin/bash

# FCopier Installer Script
# This script will install dependencies and set up fcopier for global use.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       FCopier Installer             ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install it first.${NC}"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install it first.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing NPM dependencies...${NC}"
npm install

echo -e "${YELLOW}Step 2: Installing Playwright Chromium...${NC}"
npx playwright install chromium

echo -e "${YELLOW}Step 3: Setting permissions...${NC}"
chmod +x bin/fcopier.js

echo -e "${YELLOW}Step 4: Registering 'fcopier' command...${NC}"
# Use npm link or direct symlink to local bin
if npm link --quiet; then
    echo -e "${GREEN}Successfully linked using npm.${NC}"
else
    LOCAL_BIN="$HOME/.local/bin"
    mkdir -p "$LOCAL_BIN"
    ln -sf "$(pwd)/bin/fcopier.js" "$LOCAL_BIN/fcopier"
    echo -e "${GREEN}Created symlink in $LOCAL_BIN/fcopier${NC}"
    
    if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
        echo -e "${YELLOW}Warning: $LOCAL_BIN is not in your PATH. Please add it to use fcopier globally.${NC}"
        echo -e "Add this to your .bashrc: export PATH=\"\$PATH:$LOCAL_BIN\""
    fi
fi

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}    FCopier installed successfully!    ${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "You can now run it using the command: ${BLUE}fcopier${NC}"
echo -e "Example: ${BLUE}fcopier analyze http://example.com${NC}"
echo -e "${BLUE}=======================================${NC}"
