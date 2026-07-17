# 🗺️ Démarche de développement — Intégration Google Agenda

Ce document détaille le plan pour l'intégration de Google Agenda (Phase 4.4 de `demarche.md`).

## 📋 Objectif
Permettre aux utilisateurs de synchroniser automatiquement les échéances de leurs tâches avec leur propre calendrier Google.

---

## 🔒 PHASE 4.4.a — Cadrage & Sécurité

### Objectifs
- Obtenir les credentials Google (Client ID / Client Secret).
- Sécuriser le stockage des tokens.

### Tâches
- [ ] Créer un projet sur Google Cloud Console.
- [ ] Configurer l'écran de consentement OAuth.
- [ ] Activer l'API Google Calendar.
- [ ] Ajouter `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `.env`.
- [ ] Créer le modèle SQLAlchemy `GoogleCredential` (id, user_id, access_token, refresh_token, token_expiry).

---

## 🌐 PHASE 4.4.b — Backend (OAuth2)

### Objectifs
- Gérer la liaison de compte sécurisée.

### Tâches
- [ ] Créer `Backend/modules/google/routes.py`.
- [ ] Route `GET /api/v1/google/auth` (redirection vers Google).
- [ ] Route `GET /api/v1/google/callback` (réception du token et sauvegarde).
- [ ] Route `GET /api/v1/google/status` (vérifier si le compte est lié).

---

## 🔄 PHASE 4.4.c — Backend (Synchronisation)

### Objectifs
- Pousser les tâches vers Google Agenda.

### Tâches
- [ ] Créer `Backend/modules/google/service.py` (utilisation de `google-api-python-client`).
- [ ] Logique pour créer/mettre à jour un événement lors d'un changement de date d'échéance d'une tâche.
- [ ] Intégrer cette logique dans le service des tâches (via un signal ou un hook).

---

## 🎨 PHASE 4.4.d — Frontend

### Objectifs
- Interface utilisateur pour activer la synchronisation.

### Tâches
- [ ] Ajouter une section "Integrations" dans l'écran Profil utilisateur.
- [ ] Bouton "Lier Google Agenda".
- [ ] Affichage de l'état de la connexion.

---

## 🧪 PHASE 4.4.e — Tests & Validation

### Tâches
- [ ] Tester le flux OAuth complet (de bout en bout).
- [ ] Tester la création d'événement lors de la création d'une tâche.
- [ ] Tester la mise à jour d'événement lors de la modification d'une tâche.
- [ ] Tester la suppression d'événement lors de la suppression d'une tâche.

**✅ Critère de sortie :** La synchronisation est active, sécurisée, et testée bilatéralement.
