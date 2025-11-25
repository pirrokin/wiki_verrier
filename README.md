# Technician Wiki - Projet Verrier

Une application web de gestion de procédures techniques ("Wiki") avec gestion des utilisateurs et des rôles.

## 🚀 Fonctionnalités Actuelles

- **Interface Moderne** : Design sombre (Dark Mode) avec accents violets.
- **Authentification** : Système de connexion sécurisé (Login/Mot de passe).
- **Gestion des Rôles** :
  - **Admin** : Accès au tableau de bord administrateur.
  - **Technicien** : Accès limité aux procédures.
- **Backend** : Serveur Node.js avec Express.
- **Base de Données** : Stockage des utilisateurs via MySQL.

## 🛠️ Technologies Utilisées

- **Frontend** : HTML5, CSS3, JavaScript (Vanilla).
- **Backend** : Node.js, Express.js.
- **Base de Données** : MySQL.

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
| **Admin** | `admin` | `password123` |
| **Technicien** | `test` | `12345678` |