# 📐 Architecture Technique & Fondements Mathématiques — Casino Aoun Super-IA

Ce document détaille les équations mathématiques, l'architecture algorithmique et les tests statistiques implémentés dans [`Casino_Aoun_Blackjack_AI.html`](../Casino_Aoun_Blackjack_AI.html) et le Laboratoire d'Audit JSON.

---

## 1. Représentation de l'Espace d'États JSON `Q(s, a)`

Dans le fichier [`q_table_casino_aoun.json`](../q_table_casino_aoun.json), chaque état du jeu est identifié par la clé :

```text
"{Total_Joueur}_{Is_Soft}_{Carte_Visible_Croupier}"
```

- **`Total_Joueur`** $\in \{4, 5, \dots, 21\}$ : Somme actuelle de la main du joueur.
- **`Is_Soft`** $\in \{\text{True}, \text{False}\}$ : Indique si la main contient au moins un As valorisé à `11` sans dépasser `21` (main souple).
- **`Carte_Visible_Croupier`** $\in \{2, 3, \dots, 10, 11\}$ : Carte ouverte (*Upcard*) de la banque (`11` = As).

Pour chaque clé $s$, le dictionnaire associe les valeurs d'espérance mathématique $Q(s,a)$ exprimées en **unités de mise initiale** :
- `"H"` (*HIT* / Tirer)
- `"S"` (*STAND* / Rester)
- `"D"` (*DOUBLE* / Doubler la mise et recevoir exactement une carte)

La politique gloutonne optimale est donnée par :
$$\pi^*(s) = \arg\max_{a \in \{H, S, D\}} Q(s, a)$$

---

## 2. Moteur 1 : Solveur Combinatoire Exact (`ExactShoeSolver`)

À chaque instant $t$, le sabot est représenté par le vecteur exact des effectifs restants des 10 valeurs de cartes :
$$\mathbf{n} = (n_2, n_3, n_4, n_5, n_6, n_7, n_8, n_9, n_{10}, n_{11}), \quad N_{\text{cartes}} = \sum_{r=2}^{11} n_r$$

### 2.1 Probabilités exactes du Croupier sans remise
En tirant successivement sans remise depuis $\mathbf{n}$ jusqu'à atteindre un total $\ge 17$ (règle *S17 : Dealer Stands on all 17s*), le solveur calcule les probabilités exactes :
$$P_{\text{Dealer}}(k \mid \mathbf{n}, u), \quad k \in \{17, 18, 19, 20, 21, \text{BJ}, \text{Bust}\}$$

### 2.2 Espérances exactes des actions du Joueur
1. **Rester (`STAND`)** :
   $$E_{\text{STAND}}(T_P) = P(\text{Dealer Bust}) + \sum_{k < T_P} P(\text{Dealer} = k) - \sum_{k > T_P} P(\text{Dealer} = k)$$
2. **Doubler (`DOUBLE`)** :
   $$E_{\text{DOUBLE}}(T_P, \text{soft}) = 2 \times \sum_{r=2}^{11} \frac{n_r}{N_{\text{cartes}}} E_{\text{STAND}}(T_P \oplus r)$$
3. **Tirer (`HIT`)** (programmation dynamique récursive) :
   $$E_{\text{HIT}}(T_P, \text{soft}) = \sum_{r=2}^{11} \frac{n_r}{N_{\text{cartes}}} \max\Big(E_{\text{STAND}}(T_P \oplus r), \; E_{\text{HIT}}(T_P \oplus r)\Big)$$
4. **Abandonner (`SURRENDER`)** :
   $$E_{\text{SURRENDER}} = -0,50$$
5. **Assurance (`INSURANCE` face à un As)** :
   $$\text{Rentable si et seulement si } \frac{n_{10}}{N_{\text{cartes}}} > \frac{1}{3} \quad (33,33\%)$$

---

## 3. Moteur 2 : Réseau de Neurones `Dueling DQN (16D)`

L'état complet du sabot et de la main est encodé dans un vecteur $\mathbf{x} \in \mathbb{R}^{16}$ :
- $x_0 \dots x_5$ : Total joueur normalisé, indicateur *Soft*, carte croupier normalisée, *True Count* normalisé, indicateur de Paire, pénétration du sabot.
- $x_6 \dots x_{15}$ : Écarts de densité des 10 rangs par rapport à un sabot neuf.

Le réseau sépare l'estimation de la valeur intrinsèque de l'état $V(s)$ et l'avantage relatif de chaque action $A(s, a)$ :
$$Q_{\theta}(s, a) = V_{\theta}(s) + \left(A_{\theta}(s, a) - \frac{1}{|\mathcal{A}|}\sum_{a'} A_{\theta}(s, a')\right)$$

---

## 4. Les 8 Calculs Statistiques du Laboratoire d'Audit JSON

Soit $(g_1, g_2, \dots, g_N)$ la suite des gains nets en Euros sur $N$ mains et $(m_1, \dots, m_N)$ les mises engagées :

1. **Moyenne par main & Espérance / 100 mains** :
   $$\bar{x} = \frac{1}{N}\sum_{i=1}^N g_i, \qquad \text{EV}_{100} = 100 \times \bar{x}$$
2. **ROI / Avantage Réel (%)** :
   $$\text{ROI}(\%) = \frac{\sum_{i=1}^N g_i}{\sum_{i=1}^N m_i} \times 100$$
3. **Écart-Type $\sigma$ et Intervalle de Confiance à 95%** :
   $$\sigma = \sqrt{\frac{1}{N}\sum_{i=1}^N (g_i - \bar{x})^2}, \qquad \text{IC}_{95\%} = \left[\bar{x} - 1,96\frac{\sigma}{\sqrt{N}} \; ; \; \bar{x} + 1,96\frac{\sigma}{\sqrt{N}}\right]$$
4. **Z-Score & Significativité Statistique** :
   $$Z = \frac{\bar{x}}{\sigma / \sqrt{N}}$$
   Un $Z \ge +1,96\sigma$ rejette l'hypothèse nulle de simple chance avec une certitude $> 95\%$ ($p < 0,05$).
5. **Ratio de Sharpe sur 100 mains** :
   $$\text{Sharpe}_{100} = \frac{\bar{x}}{\sigma} \times \sqrt{100}$$
6. **Profit Factor** :
   $$\text{PF} = \frac{\sum_{g_i > 0} g_i}{\sum_{g_i < 0} |g_i|}$$
7. **Risque de Ruine ($\text{RoR}$)** :
   $$\text{RoR} = \exp\left(\frac{-2 \cdot \mu \cdot B}{\sigma^2}\right)$$
8. **Erreur Quadratique Moyenne (RMSE du JSON)** :
   $$\text{RMSE} = \sqrt{\frac{1}{|\mathcal{S}|}\sum_{s \in \mathcal{S}} \Big(Q_{\text{JSON}}(s, a^*) - Q_{\text{Exact}}(s, a^*)\Big)^2}$$
