# Technician Wiki - Projet Verrier

Une application web de gestion de procédures techniques ("Wiki") avec gestion des utilisateurs, des rôles et une base de connaissances avancée.

## 🚀 Fonctionnalités Actuelles

- **Interface Moderne** : Design sombre (Dark Mode) avec accents violets et icônes Material Design.
- **Authentification** : Système de connexion sécurisé.
- **Gestion des Rôles** :
  - **Admin** : Accès complet (Gestion utilisateurs, Création de catégories/processus).
  - **Invité (Technicien)** : Accès en lecture seule aux documentations.
- **Base de Connaissances (Documentation)** :
  - Organisation par **Catégories** et **Processus**.
  - Recherche intelligente de processus.
  - Visualisation de PDF intégrée sans téléchargement.
  - Upload de fichiers PDF liés aux processus.
- **PDMS** : Page dédiée (En construction).
- **Espace Personnel** : Gestion du profil utilisateur (Avatar, Infos).

## 🛠️ Technologies Utilisées

- **Frontend** : HTML5, CSS3, JavaScript (Vanilla).
- **Backend** : Node.js, Express.js.
- **Base de Données** : MySQL.
- **Upload** : Multer.

## ⚙️ Installation et Lancement

### Prérequis
- Node.js
- MySQL

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration de la Base de Données
Assurez-vous que MySQL est lancé :
```bash
brew services start mysql
```
Créez la base de données et les tables :
```bash
mysql -u root < database/schema.sql
```

### 3. Lancement du Serveur
```bash
node server.js
```
Le serveur sera accessible à l'adresse : `http://localhost:3000`

## 🔑 Comptes de Test

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| **Admin** | `admin` | `admin123` |
| **Invité** | `test` | `12345678` |