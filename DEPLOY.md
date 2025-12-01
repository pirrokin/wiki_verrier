# Guide de Déploiement - Technician Wiki

Ce guide vous explique comment déployer votre application sur un serveur Linux (Ubuntu recommandé).

## 1. Prérequis
- Un serveur VPS (ex: DigitalOcean, OVH, AWS) avec Ubuntu 20.04 ou 22.04.
- Accès SSH au serveur (`ssh root@votre-ip`).
- Un nom de domaine (optionnel, mais recommandé pour le HTTPS).

## 2. Préparation du Serveur

Connectez-vous à votre serveur et mettez à jour les paquets :
```bash
sudo apt update && sudo apt upgrade -y
```

### Installer Node.js (v18 ou v20)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Installer MySQL
```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
# Suivez les instructions pour sécuriser (définir un mot de passe root, supprimer les utilisateurs anonymes, etc.)
```

### Créer la Base de Données et l'Utilisateur
Connectez-vous à MySQL :
```bash
sudo mysql -u root -p
```
Exécutez les commandes SQL suivantes (remplacez `votre_mot_de_passe` par un mot de passe fort) :
```sql
CREATE DATABASE technician_wiki;
CREATE USER 'wiki_user'@'localhost' IDENTIFIED BY 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON technician_wiki.* TO 'wiki_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Transfert de l'Application

La méthode recommandée est d'utiliser Git.

1.  **Sur votre PC local** : Assurez-vous que votre code est sur un dépôt (GitHub/GitLab).
2.  **Sur le serveur** : Clonez le dépôt.
    ```bash
    cd /var/www
    git clone https://github.com/votre-pseudo/projet_verrier.git
    cd projet_verrier
    ```
    *(Alternative sans Git : Utilisez FileZilla ou `scp` pour copier les fichiers dans `/var/www/projet_verrier`)*.

3.  **Installer les dépendances** :
    ```bash
    npm install
    ```

## 4. Configuration

1.  **Configurer les variables d'environnement** :
    Copiez le fichier d'exemple et éditez-le.
    ```bash
    cp .env.example .env
    nano .env
    ```
    Modifiez les valeurs pour correspondre à votre serveur :
    ```ini
    DB_HOST=localhost
    DB_USER=wiki_user
    DB_PASSWORD=votre_mot_de_passe
    DB_NAME=technician_wiki
    PORT=3000
    ```

2.  **Importer les données** :
    Si vous avez un fichier `.sql` exporté de votre PC local (ex: `backup.sql`), importez-le :
    ```bash
    mysql -u wiki_user -p technician_wiki < backup.sql
    ```

## 5. Lancement de l'Application (PM2)

Utilisez PM2 pour garder l'application active en arrière-plan.

```bash
sudo npm install -g pm2
pm2 start server.js --name "wiki-app"
pm2 save
pm2 startup
# Exécutez la commande affichée par pm2 startup pour activer le lancement au démarrage
```

## 6. Configuration du Proxy Inverse (Nginx)

Pour rendre le site accessible via le port 80 (HTTP) au lieu de 3000.

1.  **Installer Nginx** :
    ```bash
    sudo apt install -y nginx
    ```

2.  **Configurer le site** :
    Créez un fichier de configuration :
    ```bash
    sudo nano /etc/nginx/sites-available/wiki-app
    ```
    Collez ceci (remplacez `votre_domaine_ou_ip` par votre IP ou nom de domaine) :
    ```nginx
    server {
        listen 80;
        server_name votre_domaine_ou_ip;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
        
        # Augmenter la taille limite d'upload (pour les images/PDF)
        client_max_body_size 50M;
    }
    ```

3.  **Activer le site** :
    ```bash
    sudo ln -s /etc/nginx/sites-available/wiki-app /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

## 7. Sécurisation (HTTPS) - Optionnel mais recommandé

Si vous avez un nom de domaine :

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre_domaine.com
```

Votre site est maintenant en ligne !
