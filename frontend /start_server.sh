#!/bin/bash

# Script de démarrage du serveur TaskManager
# Tue les processus existants et démarre le serveur proprement

echo "🛑 Arrêt des processus Uvicorn existants..."
pkill -f uvicorn || echo "Aucun processus uvicorn trouvé"

echo "🛑 Arrêt des processus sur le port 8000..."
fuser -k 8000/tcp 2>/dev/null || lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "Aucun processus sur le port 8000"

echo "⏳ Attente de libération du port..."
sleep 3

echo "🔍 Vérification du port..."
if netstat -tlnp | grep :8000 > /dev/null; then
    echo "❌ Port 8000 encore occupé !"
    netstat -tlnp | grep :8000
    exit 1
fi

echo "🚀 Démarrage du serveur..."
cd "$(dirname "$0")"
source .venv/bin/activate
uvicorn Backend.main:app --reload --host 0.0.0.0 --port 8000