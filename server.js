const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Utiliser le port fourni par l'hébergeur (Dokploy, Hostinger, Heroku, etc.), ou 3000 par défaut
const PORT = process.env.PORT || 3000;

// Dossier de persistance Cloud (compatible Volume Mount Dokploy `/usr/src/app/data`)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(express.json({ limit: '50mb' }));

// Servir tous les fichiers statiques (index.html, styles.css, app.js, Antoine.jpg, q_table_casino_aoun.json, historique_casino_aoun.csv)
app.use(express.static(__dirname));

// 1. Endpoint Cloud : Charger la Q-Table (priorité à la sauvegarde Cloud persistante, sinon fichier initial)
app.get('/api/qtable', (req, res) => {
    const cloudPath = path.join(DATA_DIR, 'q_table_casino_aoun_cloud.json');
    const defaultPath = path.join(__dirname, 'q_table_casino_aoun.json');
    if (fs.existsSync(cloudPath)) {
        res.sendFile(cloudPath);
    } else if (fs.existsSync(defaultPath)) {
        res.sendFile(defaultPath);
    } else {
        res.status(404).json({ error: 'q_table_casino_aoun.json non trouvé' });
    }
});

// 2. Endpoint Cloud : Sauvegarder la Q-Table et la session directement dans le Cloud Dokploy
app.post('/api/cloud-save', (req, res) => {
    try {
        const payload = req.body;
        const cloudSessionPath = path.join(DATA_DIR, 'casino_aoun_cloud_session.json');
        fs.writeFileSync(cloudSessionPath, JSON.stringify(payload, null, 2), 'utf-8');
        if (payload && payload.qTable) {
            const cloudQPath = path.join(DATA_DIR, 'q_table_casino_aoun_cloud.json');
            fs.writeFileSync(cloudQPath, JSON.stringify(payload.qTable, null, 2), 'utf-8');
        }
        res.json({ ok: true, savedAt: new Date().toISOString(), path: cloudSessionPath });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// 3. Endpoint Cloud : Récupérer la dernière session sauvegardée dans le Cloud Dokploy
app.get('/api/cloud-load', (req, res) => {
    const cloudSessionPath = path.join(DATA_DIR, 'casino_aoun_cloud_session.json');
    if (fs.existsSync(cloudSessionPath)) {
        res.sendFile(cloudSessionPath);
    } else {
        res.status(404).json({ ok: false, message: 'Aucune session Cloud enregistrée' });
    }
});

// 4. Endpoint Cloud : Télécharger l'historique CSV
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
