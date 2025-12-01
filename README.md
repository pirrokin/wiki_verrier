# Technician Wiki - Projet Verrier

Une application web de gestion de procédures techniques ("Wiki") avec gestion des utilisateurs, des rôles et une base de connaissances avancée.

## 🚀 Fonctionnalités Actuelles

- **Interface Moderne** : Design sombre (Dark Mode) avec accents violets, icônes Material Design et fond animé "Aurora" sur la page de connexion.
- **Authentification** : Système de connexion sécurisé avec gestion de session.
- **Gestion des Rôles** :
  - **Admin** : Accès complet (Gestion utilisateurs, Création/Suppression de catégories et processus).
  - **Technicien** : Accès en lecture seule aux documentations.
- **Base de Connaissances (Documentation)** :
  - **Éditeur de Texte Riche** : Création d'articles directement dans l'application (basé sur Quill.js).
  - **Import Word** : Conversion automatique des fichiers `.docx` en articles HTML.
  - **Visualisation PDF** : Lecteur PDF intégré pour consulter les documents techniques.
  - **Recherche** : Moteur de recherche instantané avec surlignage des résultats.
- **Espace Personnel** : 
  - Modification du profil (Avatar, Infos).
  - Changement de mot de passe sécurisé (vérification de complexité).
- **Architecture Modulaire** : Code JavaScript et CSS séparé pour une meilleure maintenabilité.

## 🛠️ Technologies Utilisées

- **Frontend** : HTML5, CSS3, JavaScript (Vanilla).
  - *Librairies* : Quill.js (Éditeur), PDF.js (Lecteur PDF), Mammoth.js (Import Word), OGL.js (WebGL Aurora).
- **Backend** : Node.js, Express.js.
- **Base de Données** : MySQL.
- **Upload** : Multer.

## ⚙️ Installation et Lancement (Local)

### Prérequis
- Node.js (v18+)
- MySQL

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration
Créez un fichier `.env` à la racine du projet (voir `.env.example`) :
```ini
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=technician_wiki
PORT=3000
```

### 3. Base de Données
Assurez-vous que MySQL est lancé et importez le schéma (si nécessaire) :
```bash
mysql -u root < database/schema.sql
```

### 4. Lancement du Serveur
```bash
node server.js
```
Le serveur sera accessible à l'adresse : `http://localhost:3000`

## 🌍 Déploiement
Pour mettre en ligne l'application sur un serveur (VPS), consultez le guide détaillé : [DEPLOY.md](./DEPLOY.md).

## 🔑 Comptes de Test (Local)

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| **Admin** | `admin` | `admin123` |
| **Technicien** | `test` | `12345678` |