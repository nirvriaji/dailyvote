#!/bin/bash

# Firebase Deployment Script for DailyVote
# Este script despliega la app completa a Firebase Hosting + Firestore

set -e

echo "🚀 Desplegando DailyVote a Firebase..."

# Verificar si Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI no está instalado"
    echo "Instálalo con: npm install -g firebase-tools"
    exit 1
fi

# Verificar si está logueado en Firebase
if ! firebase projects:list &> /dev/null; then
    echo "🔑 Iniciando sesión en Firebase..."
    firebase login
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Build de producción
echo "🔨 Compilando app..."
npm run build

# Desplegar a Firebase
echo "🌐 Desplegando a Firebase Hosting + Firestore..."
firebase deploy --only hosting,firestore:rules --project exitpollsimulator

echo ""
echo "✅ ¡Despliegue completado!"
echo ""
echo "🌎 Tu app está disponible en:"
echo "   https://exitpollsimulator.web.app"
echo ""
echo "📊 Panel de Firebase:"
echo "   https://console.firebase.google.com/project/exitpollsimulator"
