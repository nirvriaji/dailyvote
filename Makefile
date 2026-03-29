# Makefile for DailyVote - Firebase Deployment
# Usage: make deploy

.PHONY: help install build deploy deploy-rules deploy-hosting clean

# Default target
help:
	@echo "DailyVote - Firebase Deployment Commands"
	@echo ""
	@echo "  make install       - Install dependencies"
	@echo "  make build         - Build production app"
	@echo "  make deploy        - Deploy everything (rules + hosting)"
	@echo "  make deploy-rules  - Deploy only Firestore rules"
	@echo "  make deploy-hosting - Deploy only hosting"
	@echo "  make clean         - Clean build files"
	@echo "  make open          - Open Firebase Console"
	@echo "  make url           - Show app URL"
	@echo ""
	@echo "Project: exitpollsimulator"
	@echo "URL: https://exitpollsimulator.web.app"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install

# Build production app
build: install
	@echo "🔨 Building production app..."
	npm run build
	@echo "✅ Build complete in build/"

# Deploy everything (Firestore rules + Hosting)
deploy: build
	@echo "🚀 Deploying to Firebase..."
	@which firebase > /dev/null 2>&1 || (echo "❌ Firebase CLI not found. Run: npm install -g firebase-tools" && exit 1)
	@firebase projects:list > /dev/null 2>&1 || (echo "🔑 Please login first: firebase login" && exit 1)
	firebase deploy --only hosting,firestore:rules --project exitpollsimulator
	@echo ""
	@echo "✅ Deploy complete!"
	@echo "🌎 App live at: https://exitpollsimulator.web.app"
	@echo "📊 Console: https://console.firebase.google.com/project/exitpollsimulator"

# Deploy only Firestore rules
deploy-rules:
	@echo "📋 Deploying Firestore rules..."
	@which firebase > /dev/null 2>&1 || (echo "❌ Firebase CLI not found. Run: npm install -g firebase-tools" && exit 1)
	firebase deploy --only firestore:rules --project exitpollsimulator
	@echo "✅ Rules deployed"

# Deploy only hosting (app)
deploy-hosting: build
	@echo "🌐 Deploying hosting..."
	@which firebase > /dev/null 2>&1 || (echo "❌ Firebase CLI not found. Run: npm install -g firebase-tools" && exit 1)
	firebase deploy --only hosting --project exitpollsimulator
	@echo "✅ Hosting deployed"
	@echo "🌎 https://exitpollsimulator.web.app"

# Clean build files
clean:
	@echo "🧹 Cleaning build files..."
	rm -rf build/
	rm -rf .svelte-kit/
	@echo "✅ Cleaned"

# Open Firebase Console
open:
	@echo "🔥 Opening Firebase Console..."
	@which xdg-open > /dev/null 2>&1 && xdg-open "https://console.firebase.google.com/project/exitpollsimulator" || \
	which open > /dev/null 2>&1 && open "https://console.firebase.google.com/project/exitpollsimulator" || \
	echo "Open manually: https://console.firebase.google.com/project/exitpollsimulator"

# Show app URL
url:
	@echo "🌎 Your app: https://exitpollsimulator.web.app"
	@echo "📊 Console:  https://console.firebase.google.com/project/exitpollsimulator"
	@echo "🔧 Rules:    https://console.firebase.google.com/project/exitpollsimulator/firestore/rules"

# Quick check - verify Firebase is ready
check:
	@echo "🔍 Checking Firebase setup..."
	@which firebase > /dev/null 2>&1 && echo "✅ Firebase CLI installed" || echo "❌ Install: npm install -g firebase-tools"
	@firebase projects:list > /dev/null 2>&1 && echo "✅ Logged in to Firebase" || echo "❌ Login: firebase login"
	@test -f .firebaserc && echo "✅ .firebaserc exists" || echo "❌ Missing .firebaserc"
	@test -f firebase.json && echo "✅ firebase.json exists" || echo "❌ Missing firebase.json"
	@test -f firestore.rules && echo "✅ firestore.rules exists" || echo "❌ Missing firestore.rules"
	@echo ""
	@echo "Project: exitpollsimulator"
