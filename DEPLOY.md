# Guide de Migration - Serveur Local (LAN)

Ce guide explique comment migrer votre projet actuel vers un serveur local (ex: un vieux PC, un Raspberry Pi, ou un serveur d'entreprise) pour qu'il soit accessible sur votre réseau local.

## 1. Préparer le Serveur (La machine cible)

Avant de copier les fichiers, assurez-vous que le serveur a les logiciels nécessaires.

### Installer Node.js et MySQL
Ouvrez un terminal sur le serveur et lancez :

```bash
# Mettre à jour
sudo apt update && sudo apt upgrade -y

# Installer Node.js (v18 ou plus)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installer MySQL
sudo apt install -y mysql-server
```

### Configurer la Base de Données
Connectez-vous à MySQL sur le serveur :
```bash
sudo mysql
```

Créez la base de données et l'utilisateur (changez `votre_mot_de_passe`) :
```sql
CREATE DATABASE technician_wiki;
CREATE USER 'wiki_user'@'localhost' IDENTIFIED BY 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON technician_wiki.* TO 'wiki_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 2. Copier les Fichiers

1.  **Sur votre ordinateur de développement** :
    *   Prenez tout le dossier `projet_verrier`.
    *   Copiez-le sur une clé USB ou transférez-le via le réseau vers le serveur.
    *   *Note : Ne copiez pas le dossier `node_modules` si possible (c'est lourd et il vaut mieux le réinstaller proprement).*

2.  **Sur le serveur** :
    *   Placez le dossier où vous voulez (ex: `/home/votre_nom/projet_verrier` ou `/var/www/projet_verrier`).

---

## 3. Installation et Configuration

Allez dans le dossier du projet sur le serveur :
```bash
cd /chemin/vers/projet_verrier
```

### Installer les dépendances
```bash
npm install
```

### Configurer la connexion Base de Données
Créez un fichier `.env` à la racine du projet :
```bash
nano .env
```
Collez-y ceci (avec le mot de passe défini à l'étape 1) :
```ini
DB_HOST=localhost
DB_USER=wiki_user
DB_PASSWORD=votre_mot_de_passe
DB_NAME=technician_wiki
PORT=3000
```
*Sauvegardez avec `Ctrl+O`, `Entrée`, puis quittez avec `Ctrl+X`.*

### Importer vos données actuelles (Optionnel)
Si vous voulez garder vos utilisateurs/articles actuels :
1.  Sur votre PC dev, exportez la base : `mysqldump -u root -p technician_wiki > backup.sql`
2.  Copiez ce fichier `backup.sql` sur le serveur.
3.  Importez-le : `mysql -u wiki_user -p technician_wiki < backup.sql`

---

## 4. Lancer le Serveur

### Test rapide
Pour vérifier que tout marche :
```bash
node server.js
```
Si vous voyez `Server running at http://0.0.0.0:3000`, c'est gagné ! Faites `Ctrl+C` pour arrêter.

### Lancement permanent (Recommandé)
Pour que le site tourne tout le temps, même après un redémarrage, utilisez **PM2** :

```bash
# Installer PM2
sudo npm install -g pm2

# Lancer le projet
pm2 start server.js --name "wiki-app"

# Figer la configuration pour le redémarrage
pm2 save
pm2 startup
# (Exécutez la commande que pm2 vous affiche ensuite)
```

---

## 5. Accéder au Site

Le site est maintenant accessible depuis n'importe quel ordinateur connecté au même réseau (WiFi/Câble).

1.  **Trouver l'IP du serveur** :
    Sur le serveur, tapez : `hostname -I`
    (Exemple de résultat : `192.168.1.25`)

2.  **Accéder depuis un autre PC** :
    Ouvrez un navigateur et tapez : `http://192.168.1.25:3000` (remplacez par l'IP trouvée).

---

## Dépannage (Firewall)

Si le site ne charge pas depuis un autre PC, c'est souvent le pare-feu. Ouvrez le port 3000 :

```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```
