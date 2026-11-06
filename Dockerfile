# Utiliser l'image officielle Node.js (plus fiable pour la gestion du $PORT dynamique sur Dokploy)
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /usr/src/app

# Copier les dépendances
COPY package.json ./

# Installer Express
RUN npm install

# Copier le reste des fichiers (HTML, JS, CSS, JSON, CSV, JPG)
COPY . .

# Exposer le port par défaut (Dokploy va injecter sa propre variable d'environnement $PORT)
EXPOSE 3000

# Démarrer le serveur avec le script Node.js
CMD ["node", "server.js"]
