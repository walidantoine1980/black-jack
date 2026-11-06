const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Utiliser le port fourni par l'hébergeur (Dokploy, Hostinger, Heroku, etc.), ou 3000 par défaut
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

// Servir tous les fichiers statiques (index.html, styles.css, app.js, Antoine.jpg, q_table_casino_aoun.json, historique_casino_aoun.csv)
app.use(express.static(__dirname));

// Endpoints API pour accès direct au JSON et au CSV
app.get('/api/qtable', (req, res) => {
    const filePath = path.join(__dirname, 'q_table_casino_aoun.json');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'q_table_casino_aoun.json non trouvé' });
    }
});

app.get('/api/history', (req, res) => {
    const filePath = path.join(__dirname, 'historique_casino_aoun.csv');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'historique_casino_aoun.csv non trouvé' });
    }
});

// Pour toute autre route, renvoyer index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Écouter impérativement sur 0.0.0.0 pour que Dokploy / Traefik puisse joindre le conteneur (évite le 502 Bad Gateway)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Casino Aoun Blackjack Super-IA démarré avec succès sur http://0.0.0.0:${PORT}`);
});
