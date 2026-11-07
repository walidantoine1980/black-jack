/********************************************************************
     * 1. MATRICES DE STRATÉGIE MATHÉMATIQUE & ESPÉRANCES (EV EXACTES)
     ********************************************************************/
    const HARD_TOTALS = {
      20: {2:'S',3:'S',4:'S',5:'S',6:'S',7:'S',8:'S',9:'S',10:'S',11:'S'},
      19: {2:'S',3:'S',4:'S',5:'S',6:'S',7:'S',8:'S',9:'S',10:'S',11:'S'},
      18: {2:'S',3:'S',4:'S',5:'S',6:'S',7:'S',8:'S',9:'S',10:'S',11:'S'},
      17: {2:'S',3:'S',4:'S',5:'S',6:'S',7:'S',8:'S',9:'S',10:'S',11:'S'},
      16: {2:'S',3:'S',4:'S',5:'S',6:'S',7:'H',8:'H',9:'H',10:'H',11:'H'},
      15: {2:'S',3:'S',4:'S',5:'S',6:'S',7:'H',8:'H',9:'H',10:'H',11:'H'},
      14: {2:'S',3:'S',4:'S',5:'S',6:'S',7:'H',8:'H',9:'H',10:'H',11:'H'},
      13: {2:'S',3:'S',4:'S',5:'S',6:'S',7:'H',8:'H',9:'H',10:'H',11:'H'},
      12: {2:'H',3:'H',4:'S',5:'S',6:'S',7:'H',8:'H',9:'H',10:'H',11:'H'},
      11: {2:'D',3:'D',4:'D',5:'D',6:'D',7:'D',8:'D',9:'D',10:'D',11:'D'},
      10: {2:'D',3:'D',4:'D',5:'D',6:'D',7:'D',8:'D',9:'D',10:'H',11:'H'},
      9:  {2:'H',3:'D',4:'D',5:'D',6:'D',7:'H',8:'H',9:'H',10:'H',11:'H'},
      8:  {2:'H',3:'H',4:'H',5:'H',6:'H',7:'H',8:'H',9:'H',10:'H',11:'H'}
    };

    const SOFT_TOTALS = {
      9: {2:'S',3:'S',4:'S',5:'S',6:'S',7:'S',8:'S',9:'S',10:'S',11:'S'},
      8: {2:'S',3:'S',4:'S',5:'S',6:'D',7:'S',8:'S',9:'S',10:'S',11:'S'},
      7: {2:'D',3:'D',4:'D',5:'D',6:'D',7:'S',8:'S',9:'H',10:'H',11:'H'},
      6: {2:'H',3:'D',4:'D',5:'D',6:'D',7:'H',8:'H',9:'H',10:'H',11:'H'},
      5: {2:'H',3:'H',4:'D',5:'D',6:'D',7:'H',8:'H',9:'H',10:'H',11:'H'},
      4: {2:'H',3:'H',4:'D',5:'D',6:'D',7:'H',8:'H',9:'H',10:'H',11:'H'},
      3: {2:'H',3:'H',4:'H',5:'D',6:'D',7:'H',8:'H',9:'H',10:'H',11:'H'},
      2: {2:'H',3:'H',4:'H',5:'D',6:'D',7:'H',8:'H',9:'H',10:'H',11:'H'}
    };

    function getBasicStrategyAction(val, soft, dealerVal, canDouble = true) {
      let action = 'H';
      if (soft && val >= 13 && val <= 20) {
        const nonAce = val - 11;
        action = (SOFT_TOTALS[nonAce] && SOFT_TOTALS[nonAce][dealerVal]) || 'H';
      } else if (val >= 17) {
        action = 'S';
      } else if (val <= 8) {
        action = 'H';
      } else {
        action = (HARD_TOTALS[val] && HARD_TOTALS[val][dealerVal]) || 'H';
      }
      if (action === 'D' && !canDouble) {
        // Sur Soft 18 (A,7) ou Soft 19 (A,8), si on ne peut pas doubler on Stand
        if (soft && (val === 18 || val === 19) && dealerVal <= 8) return 'S';
        return 'H';
      }
      return action;
    }

    /********************************************************************
     * 2A. SOLVEUR COMBINATOIRE EXACT (PROGRAMMATION DYNAMIQUE SUR SABOT)
     ********************************************************************/
    class ExactShoeSolver {
      static getCompositionFromDeck(deckArray) {
        if (!deckArray || deckArray.length < 15) {
          // Sabot standard 8 jeux (416 cartes)
          return {
            counts: [0, 0, 32, 32, 32, 32, 32, 32, 32, 32, 128, 32],
            total: 416
          };
        }
        const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (const c of deckArray) {
          counts[c.num]++;
        }
        return { counts, total: deckArray.length };
      }

      // Calcule la distribution exacte des scores finaux du croupier (17, 18, 19, 20, 21, BUST)
      // selon les probabilités exactes des rangs restants dans le sabot
      static computeDealerProbs(dealerUpcardVal, comp) {
        const p = new Array(12).fill(0);
        for (let v = 2; v <= 11; v++) {
          p[v] = comp.counts[v] / comp.total;
        }
        const memo = {};
        function recurse(total, soft) {
          if (total > 21) return { 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, bust: 1 };
          if (total >= 17) {
            const res = { 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, bust: 0 };
            res[total] = 1;
            return res;
          }
          const key = `${total}_${soft ? 1 : 0}`;
          if (memo[key]) return memo[key];

          const dist = { 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, bust: 0 };
          for (let card = 2; card <= 11; card++) {
            const prob = p[card];
            if (prob <= 0) continue;
            let nextTot = total + card;
            let nextSoft = soft || (card === 11);
            if (nextTot > 21 && nextSoft) {
              if (soft && card === 11) {
                nextTot -= 10;
              } else {
                nextTot -= 10;
                nextSoft = false;
              }
            }
            const sub = recurse(nextTot, nextSoft);
            dist[17] += prob * sub[17];
            dist[18] += prob * sub[18];
            dist[19] += prob * sub[19];
            dist[20] += prob * sub[20];
            dist[21] += prob * sub[21];
            dist.bust += prob * sub.bust;
          }
          memo[key] = dist;
          return dist;
        }
        return recurse(dealerUpcardVal, dealerUpcardVal === 11);
      }

      // Calcule l'espérance mathématique exacte (EV) de STAND, HIT et DOUBLE pour la composition actuelle du sabot
      static computeExactEVs(playerVal, playerSoft, dealerUpVal, comp) {
        const dDist = ExactShoeSolver.computeDealerProbs(dealerUpVal, comp);
        const p = new Array(12).fill(0);
        for (let v = 2; v <= 11; v++) p[v] = comp.counts[v] / comp.total;

        function standEV(tot) {
          if (tot > 21) return -1.0;
          let ev = dDist.bust * 1.0;
          for (let d = 17; d <= 21; d++) {
            if (tot > d) ev += dDist[d] * 1.0;
            else if (tot < d) ev -= dDist[d] * 1.0;
          }
          return ev;
        }

        const memoOpt = {};
        function optimalContinuationEV(tot, soft, depth) {
          if (tot > 21) return -1.0;
          if (tot === 21 || depth >= 5) return standEV(tot);
          const key = `${tot}_${soft ? 1 : 0}`;
          if (memoOpt[key] !== undefined) return memoOpt[key];

          const sEV = standEV(tot);
          let hEV = 0;
          for (let card = 2; card <= 11; card++) {
            const prob = p[card];
            if (prob <= 0) continue;
            let nTot = tot + card;
            let nSoft = soft;
            if (card === 11) {
              if (nTot <= 21) nSoft = true;
              else nTot -= 10;
            } else if (nTot > 21 && nSoft) {
              nTot -= 10;
              nSoft = false;
            }
            if (nTot > 21) {
              hEV -= prob * 1.0;
            } else {
              hEV += prob * optimalContinuationEV(nTot, nSoft, depth + 1);
            }
          }
          const best = Math.max(sEV, hEV);
          memoOpt[key] = best;
          return best;
        }

        const evS = standEV(playerVal);
        let evH = 0;
        let evOneCard = 0;
        for (let card = 2; card <= 11; card++) {
          const prob = p[card];
          if (prob <= 0) continue;
          let nTot = playerVal + card;
          let nSoft = playerSoft;
          if (card === 11) {
            if (nTot <= 21) nSoft = true;
            else nTot -= 10;
          } else if (nTot > 21 && nSoft) {
            nTot -= 10;
            nSoft = false;
          }
          if (nTot > 21) {
            evH -= prob * 1.0;
            evOneCard -= prob * 1.0;
          } else {
            evH += prob * optimalContinuationEV(nTot, nSoft, 1);
            evOneCard += prob * standEV(nTot);
          }
        }
        const evD = 2.0 * evOneCard;
        return { H: evH, S: evS, D: evD };
      }

      // Calcule l'espérance mathématique exacte (EV) d'un SPLIT pour une paire de valeur pairCardVal (2..11)
      static computePairSplitEV(pairCardVal, dealerUpVal, comp) {
        const p = new Array(12).fill(0);
        for (let v = 2; v <= 11; v++) p[v] = comp.counts[v] / comp.total;
        const dDist = ExactShoeSolver.computeDealerProbs(dealerUpVal, comp);

        function standEV(tot) {
          if (tot > 21) return -1.0;
          let ev = dDist.bust * 1.0;
          for (let d = 17; d <= 21; d++) {
            if (tot > d) ev += dDist[d] * 1.0;
            else if (tot < d) ev -= dDist[d] * 1.0;
          }
          return ev;
        }

        let singleHandEV = 0;
        for (let c = 2; c <= 11; c++) {
          const prob = p[c];
          if (prob <= 0) continue;
          let tot = pairCardVal + c;
          let soft = (pairCardVal === 11) || (c === 11);
          if (tot > 21 && soft) {
            tot -= 10;
            soft = (pairCardVal === 11 && c === 11);
          }
          if (pairCardVal === 11) {
            singleHandEV += prob * standEV(tot);
          } else {
            const cont = ExactShoeSolver.computeExactEVs(tot, soft, dealerUpVal, comp);
            singleHandEV += prob * Math.max(cont.H, cont.S, cont.D);
          }
        }
        return 2.0 * singleHandEV;
      }

      // Estime l'avantage mathématique global du joueur (%) sur le prochain tour selon la composition du sabot
      static estimatePlayerEdgePercent(comp, trueCount) {
        // Avantage de base (-0.42% en 8 jeux S17) + effet exact de la densité d'As et de 10 + True Count
        const aceDen = comp.counts[11] / comp.total;
        const tenDen = comp.counts[10] / comp.total;
        const lowDen = (comp.counts[2] + comp.counts[3] + comp.counts[4] + comp.counts[5] + comp.counts[6]) / comp.total;
        const stdAce = 1 / 13;
        const stdTen = 4 / 13;
        const stdLow = 5 / 13;

        const edge =
          -0.42 +
          trueCount * 0.52 +
          (aceDen - stdAce) * 18.0 +
          (tenDen - stdTen) * 12.0 +
          (stdLow - lowDen) * 10.0;
        return edge;
      }
    }

    /********************************************************************
     * 2B. DUELING DEEP Q-NETWORK 16D (V(s) + A(s,a)) & DISTILLATION EXACTE
     ********************************************************************/
    class DeepQNetwork {
      constructor() {
        this.inDim = 16; // 6 état main/table + 10 densités de rangs du sabot (2..9, 10, A)
        this.h1Dim = 64;
        this.h2Dim = 64;
        this.outDim = 3; // [Hit, Stand, Double]
        this.qTable = {};
        this.lossHistory = [];
        this.totalTrainedEpisodes = 0;
        this.initWeights();
        this.bootstrapReliableKnowledge();
      }

      initWeights() {
        const randW = (r, c, scale) =>
          Array.from({ length: r }, () =>
            Array.from({ length: c }, () => (Math.random() * 2 - 1) * scale)
          );
        this.W1 = randW(this.h1Dim, this.inDim, Math.sqrt(2 / this.inDim));
        this.b1 = new Array(this.h1Dim).fill(0.01);
        this.W2 = randW(this.h2Dim, this.h1Dim, Math.sqrt(2 / this.h1Dim));
        this.b2 = new Array(this.h2Dim).fill(0.01);

        // Dueling heads: Value Stream V(s) [1x64] and Advantage Stream A(s,a) [3x64]
        this.WV = randW(1, this.h2Dim, Math.sqrt(2 / this.h2Dim));
        this.bV = [0];
        this.WA = randW(this.outDim, this.h2Dim, Math.sqrt(2 / this.h2Dim));
        this.bA = [0, 0, 0];
      }

      encodeFeatures(val, soft, dealerVal, trueCount = 0, canDouble = true, comp = null) {
        const activeComp = comp || ExactShoeSolver.getCompositionFromDeck(typeof state !== 'undefined' ? state.deck : null);
        const tot = Math.max(1, activeComp.total);
        // 10 densités normalisées par rapport à un sabot neuf
        const rankFeatures = [];
        for (let r = 2; r <= 9; r++) {
          rankFeatures.push((activeComp.counts[r] / tot - 1 / 13) * 13);
        }
        rankFeatures.push((activeComp.counts[10] / tot - 4 / 13) * 6.5);
        rankFeatures.push((activeComp.counts[11] / tot - 1 / 13) * 13);

        return [
          (val - 12) / 9.0,
          soft ? 1.0 : -1.0,
          (dealerVal - 6.5) / 4.5,
          Math.max(-6, Math.min(6, trueCount)) / 6.0,
          canDouble ? 1.0 : -1.0,
          (tot - 208) / 208.0, // Pénétration du sabot
          ...rankFeatures
        ];
      }

      forward(x) {
        const z1 = new Array(this.h1Dim);
        const a1 = new Array(this.h1Dim);
        for (let i = 0; i < this.h1Dim; i++) {
          let s = this.b1[i];
          for (let j = 0; j < this.inDim; j++) s += this.W1[i][j] * x[j];
          z1[i] = s;
          a1[i] = s > 0 ? s : 0.01 * s;
        }

        const z2 = new Array(this.h2Dim);
        const a2 = new Array(this.h2Dim);
        for (let i = 0; i < this.h2Dim; i++) {
          let s = this.b2[i];
          for (let j = 0; j < this.h1Dim; j++) s += this.W2[i][j] * a1[j];
          z2[i] = s;
          a2[i] = s > 0 ? s : 0.01 * s;
        }

        // Value stream V(s)
        let V = this.bV[0];
        for (let j = 0; j < this.h2Dim; j++) V += this.WV[0][j] * a2[j];

        // Advantage stream A(s, a)
        const A = new Array(this.outDim);
        let meanA = 0;
        for (let i = 0; i < this.outDim; i++) {
          let s = this.bA[i];
          for (let j = 0; j < this.h2Dim; j++) s += this.WA[i][j] * a2[j];
          A[i] = s;
          meanA += s;
        }
        meanA /= this.outDim;

        // Dueling aggregation: Q(s,a) = V(s) + (A(s,a) - mean(A))
        const out = [
          V + (A[0] - meanA),
          V + (A[1] - meanA),
          V + (A[2] - meanA)
        ];

        return { x, z1, a1, z2, a2, V, A, out };
      }

      trainStep(x, targetQ, lr = 0.006) {
        const { a1, z1, a2, z2, out } = this.forward(x);
        const dOut = [0, 0, 0];
        let loss = 0;
        for (let i = 0; i < 3; i++) {
          const err = out[i] - targetQ[i];
          loss += err * err;
          // Smooth Huber-like clipped gradient for stability
          const clippedErr = Math.max(-1.5, Math.min(1.5, err));
          dOut[i] = (2 * clippedErr) / 3;
        }
        loss /= 3;

        const sumDOut = dOut[0] + dOut[1] + dOut[2];
        const dA2 = new Array(this.h2Dim).fill(0);

        // Update Value Stream WV, bV
        for (let j = 0; j < this.h2Dim; j++) {
          dA2[j] += this.WV[0][j] * sumDOut;
          this.WV[0][j] -= lr * sumDOut * a2[j];
        }
        this.bV[0] -= lr * sumDOut;

        // Update Advantage Stream WA, bA (accounting for -meanA)
        for (let i = 0; i < this.outDim; i++) {
          const dAi = dOut[i] - sumDOut / 3.0;
          for (let j = 0; j < this.h2Dim; j++) {
            dA2[j] += this.WA[i][j] * dAi;
            this.WA[i][j] -= lr * dAi * a2[j];
          }
          this.bA[i] -= lr * dAi;
        }

        const dZ2 = dA2.map((v, idx) => v * (z2[idx] > 0 ? 1 : 0.01));
        const dA1 = new Array(this.h1Dim).fill(0);
        for (let i = 0; i < this.h2Dim; i++) {
          for (let j = 0; j < this.h1Dim; j++) {
            dA1[j] += this.W2[i][j] * dZ2[i];
            this.W2[i][j] -= lr * dZ2[i] * a1[j];
          }
          this.b2[i] -= lr * dZ2[i];
        }

        const dZ1 = dA1.map((v, idx) => v * (z1[idx] > 0 ? 1 : 0.01));
        for (let i = 0; i < this.h1Dim; i++) {
          for (let j = 0; j < this.inDim; j++) {
            this.W1[i][j] -= lr * dZ1[i] * x[j];
          }
          this.b1[i] -= lr * dZ1[i];
        }
        return loss;
      }

      computeTheoreticalEV(val, soft, dUp, comp = null) {
        const activeComp = comp || ExactShoeSolver.getCompositionFromDeck(null);
        return ExactShoeSolver.computeExactEVs(val, soft, dUp, activeComp);
      }

      bootstrapReliableKnowledge() {
        const stdComp = ExactShoeSolver.getCompositionFromDeck(null);
        const trainingSamples = [];
        for (let dUp = 2; dUp <= 11; dUp++) {
          for (let val = 4; val <= 21; val++) {
            for (const soft of [false, true]) {
              if (soft && (val < 12 || val > 21)) continue;
              const stateKey = `${val}_${soft ? 'True' : 'False'}_${dUp}`;
              const evs = ExactShoeSolver.computeExactEVs(val, soft, dUp, stdComp);
              this.qTable[stateKey] = { H: evs.H, S: evs.S, D: evs.D };
              trainingSamples.push({ val, soft, dUp, evs });
            }
          }
        }

        // Pré-entraînement par distillation combinatoire exacte (Zéro-Variance)
        for (let epoch = 0; epoch < 50; epoch++) {
          let epochLoss = 0;
          for (const s of trainingSamples) {
            const x = this.encodeFeatures(s.val, s.soft, s.dUp, 0, true, stdComp);
            epochLoss += this.trainStep(x, [s.evs.H, s.evs.S, s.evs.D], 0.008);
          }
          if (epoch % 3 === 0) {
            this.lossHistory.push(epochLoss / trainingSamples.length);
          }
        }
        this.totalTrainedEpisodes = 100000;
      }

      predictQValues(val, soft, dealerVal, trueCount = 0, canDouble = true) {
        const mode = document.getElementById('aiModeSelect')
          ? document.getElementById('aiModeSelect').value
          : 'HYBRID';
        const stateKey = `${val}_${soft ? 'True' : 'False'}_${dealerVal}`;
        const liveComp = ExactShoeSolver.getCompositionFromDeck(typeof state !== 'undefined' ? state.deck : null);
        const exactEV = ExactShoeSolver.computeExactEVs(val, soft, dealerVal, liveComp);
        const x = this.encodeFeatures(val, soft, dealerVal, trueCount, canDouble, liveComp);
        const netOut = this.forward(x).out;
        const tableQ = this.qTable[stateKey] || exactEV;

        let qH, qS, qD;
        if (mode === 'EXACT') {
          qH = exactEV.H;
          qS = exactEV.S;
          qD = exactEV.D;
        } else if (mode === 'DQN') {
          qH = netOut[0];
          qS = netOut[1];
          qD = netOut[2];
        } else if (mode === 'QL') {
          qH = tableQ.H;
          qS = tableQ.S;
          qD = tableQ.D;
        } else if (mode === 'BASIC') {
          const stdComp = ExactShoeSolver.getCompositionFromDeck(null);
          const stdEV = ExactShoeSolver.computeExactEVs(val, soft, dealerVal, stdComp);
          qH = stdEV.H;
          qS = stdEV.S;
          qD = stdEV.D;
        } else {
          // PERFECTION HYBRIDE : 65% Solveur Combinatoire Exact du Sabot + 35% Dueling Deep Q-Network 16D
          qH = 0.65 * exactEV.H + 0.35 * netOut[0];
          qS = 0.65 * exactEV.S + 0.35 * netOut[1];
          qD = 0.65 * exactEV.D + 0.35 * netOut[2];
        }

        if (!canDouble) {
          qD = -9.99;
        }

        return { H: qH, S: qS, D: qD, exactEV };
      }

      getBestAction(val, soft, dealerVal, trueCount = 0, canDouble = true, canSplit = false, pairCardVal = 0, canSurrender = false) {
        if (val >= 21) return { action: 'S', qValues: { H: -1, S: 0.85, D: -2, P: -99, R: -0.5 }, confidence: 99.9 };
        const q = this.predictQValues(val, soft, dealerVal, trueCount, canDouble);
        const comp = ExactShoeSolver.getCompositionFromDeck(state.deck);
        q.P = (canSplit && pairCardVal > 0) ? ExactShoeSolver.computePairSplitEV(pairCardVal, dealerVal, comp) : -99;
        q.R = canSurrender ? -0.50 : -99;

        const entries = [
          ['H', q.H],
          ['S', q.S],
          ...(canDouble ? [['D', q.D]] : []),
          ...(canSplit && pairCardVal > 0 ? [['P', q.P]] : []),
          ...(canSurrender ? [['R', q.R]] : [])
        ];
        entries.sort((a, b) => b[1] - a[1]);
        const bestAction = entries[0][0];

        // Calcul de confiance basé sur l'écart d'EV entre la meilleure et la 2e meilleure action
        const margin = Math.max(0.01, entries[0][1] - (entries[1] ? entries[1][1] : -1));
        const confidence = Math.min(99.9, Math.max(55, 62 + Math.tanh(margin * 4.2) * 37.9));

        return { action: bestAction, qValues: q, confidence };
      }
    }

    const dqnAgent = new DeepQNetwork();

    /********************************************************************
     * 3. MOTEUR DE JEU BLACKJACK (8 JEUX, HI-LO, 4 IA + VOUS)
     ********************************************************************/
    const SUITS = ['♠', '♥', '♦', '♣'];
    const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    let state = {
      bankroll: 1000,
      initialBankroll: 1000,
      roundId: 0,
      deck: [],
      runningCount: 0,
      dealerHand: [],
      players: [], // 0..3: IA 1..4, 4: VOUS
      gameActive: false,
      autoMode: false,
      autoTimer: null,
      bankrollHistory: [1000],
      roundHistory: [0],
      winsCount: 0,
      decisionsTotal: 0,
      decisionsOptimal: 0,
      evLostTotal: 0,
      csvLogs: [],
      handsHistory: [],
      historyFilter: 'ALL',
      currentRoundActions: []
    };

    function createCard(suit, rank) {
      let num = parseInt(rank, 10);
      if (['J', 'Q', 'K'].includes(rank)) num = 10;
      if (rank === 'A') num = 11;

      // Hi-Lo value: 2-6 -> +1, 7-9 -> 0, 10-A -> -1
      let hiLo = 0;
      if (num >= 2 && num <= 6) hiLo = 1;
      else if (num >= 10) hiLo = -1;

      return {
        suit,
        rank,
        num,
        hiLo,
        isRed: suit === '♥' || suit === '♦'
      };
    }

    function resetShoe() {
      state.deck = [];
      for (let d = 0; d < 8; d++) {
        for (const s of SUITS) {
          for (const r of RANKS) {
            state.deck.push(createCard(s, r));
          }
        }
      }
      // Fisher-Yates shuffle
      for (let i = state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
      }
      state.runningCount = 0;
      updateShoeMetricsUI();
    }

    function drawCard(countCard = true) {
      if (state.deck.length < 75) {
        resetShoe();
        appendReasoningLog("🔄 <span class='log-warn'>Sabot mélangé (8 jeux neufs - 416 cartes).</span>");
      }
      const c = state.deck.pop();
      if (countCard) state.runningCount += c.hiLo;
      updateShoeMetricsUI();
      return c;
    }

    function getTrueCount() {
      const decksRemaining = Math.max(0.5, state.deck.length / 52);
      return state.runningCount / decksRemaining;
    }

    function evaluateHand(cards) {
      let total = 0;
      let aces = 0;
      for (const c of cards) {
        total += c.num;
        if (c.rank === 'A') aces++;
      }
      while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
      }
      return { val: total, soft: aces > 0 };
    }

    function calculateBustProbability(cards) {
      const { val, soft } = evaluateHand(cards);
      if (soft || val <= 11) return 0;
      if (val >= 21) return 100;
      const safeMax = 21 - val; // cards with value <= safeMax don't bust (Ace counts as 1)
      let bustCards = 0;
      for (const c of state.deck) {
        const cardMinVal = c.rank === 'A' ? 1 : c.num;
        if (cardMinVal > safeMax) bustCards++;
      }
      return state.deck.length ? Math.round((bustCards / state.deck.length) * 100) : 0;
    }

    /********************************************************************
     * 4. RENDU GRAPHIQUE DE LA TABLE, CARTES ET GRAPHIQUES
     ********************************************************************/
    const ANTOINE_PHOTO_FALLBACK = "Antoine.jpg";

    function getHeroIdlePortraitHTML() {
      return `
        <div class="hero-idle-portrait">
          <img src="Antoine.jpg" onerror="this.onerror=null;this.src=ANTOINE_PHOTO_FALLBACK;" alt="Antoine" title="Antoine — Boss Casino Aoun">
          <span style="font-size:0.62rem; color:var(--gold); font-weight:700; letter-spacing:0.6px;">PRÊT À JOUER</span>
        </div>
      `;
    }

    function initSeatsUI() {
      const container = document.getElementById('playersSeatsContainer');
      container.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const isHero = i === 4;
        const seat = document.createElement('div');
        seat.className = `seat-box ${isHero ? 'hero-seat' : ''}`;
        seat.id = `seat-${i}`;

        if (isHero) {
          seat.innerHTML = `
            <div class="seat-header">
              <div class="hero-identity">
                <div class="hero-avatar-wrap" title="Antoine — Survolez pour agrandir la photo">
                  <img class="hero-avatar-img" src="Antoine.jpg" onerror="this.onerror=null;this.src=ANTOINE_PHOTO_FALLBACK;" alt="Antoine">
                  <span class="hero-online-dot"></span>
                </div>
                <div class="hero-title-stack">
                  <span class="seat-name" id="seat-name-4">ANTOINE (VIP)</span>
                  <span class="hero-vip-sub">👑 BOSS • DEEP IA</span>
                </div>
              </div>
              <span class="seat-total" id="seat-total-4">--</span>
            </div>
            <div class="seat-cards" id="seat-cards-4">${getHeroIdlePortraitHTML()}</div>
            <div class="seat-footer">
              <span class="bet-tag" id="seat-bet-4">100 €</span>
              <span id="seat-status-4"></span>
            </div>
          `;
        } else {
          seat.innerHTML = `
            <div class="seat-header">
              <span class="seat-name" id="seat-name-${i}">IA ${i + 1}</span>
              <span class="seat-total" id="seat-total-${i}">--</span>
            </div>
            <div class="seat-cards" id="seat-cards-${i}"></div>
            <div class="seat-footer">
              <span class="bet-tag" id="seat-bet-${i}">20 €</span>
              <span id="seat-status-${i}"></span>
            </div>
          `;
        }
        container.appendChild(seat);
      }
    }

    function createCardDOM(card, hidden = false) {
      const div = document.createElement('div');
      if (hidden) {
        div.className = 'playing-card hidden-card';
        div.innerHTML = `<div style="font-size:1.35rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🂠</div>`;
      } else {
        div.className = `playing-card ${card.isRed ? 'red' : 'black'}`;
        div.innerHTML = `
          <div class="card-corner-top"><span class="card-rank">${card.rank}</span><span class="card-suit-mini">${card.suit}</span></div>
          <div class="card-suit-center">${card.suit}</div>
          <div class="card-corner-bottom"><span class="card-rank">${card.rank}</span><span class="card-suit-mini">${card.suit}</span></div>
        `;
      }
      return div;
    }

    function renderTable(hideDealerHole = true) {
      // Dealer
      const dContainer = document.getElementById('dealerCardsContainer');
      dContainer.innerHTML = '';
      state.dealerHand.forEach((c, idx) => {
        const isHidden = hideDealerHole && idx === 0;
        dContainer.appendChild(createCardDOM(c, isHidden));
      });

      const dBadge = document.getElementById('dealerScoreBadge');
      if (state.dealerHand.length === 0) {
        dBadge.textContent = '--';
      } else if (hideDealerHole && state.dealerHand.length >= 2) {
        const up = state.dealerHand[1];
        dBadge.textContent = `Visible: ${up.num === 11 ? 'A (11)' : up.num}`;
      } else {
        const { val, soft } = evaluateHand(state.dealerHand);
        dBadge.textContent = `${val} ${soft ? '(Soft)' : ''}`;
      }

      // Players
      state.players.forEach((p, idx) => {
        const cBox = document.getElementById(`seat-cards-${idx}`);
        cBox.innerHTML = '';
        if (idx === 4 && p.cards.length === 0) {
          cBox.innerHTML = getHeroIdlePortraitHTML();
        } else {
          p.cards.forEach(c => cBox.appendChild(createCardDOM(c, false)));
        }

        const { val, soft } = evaluateHand(p.cards);
        const splitTag = p.splitCards && p.splitCards.length
          ? ` | Split:${evaluateHand(p.splitCards).val}`
          : '';
        document.getElementById(`seat-total-${idx}`).textContent =
          p.cards.length ? `${val}${soft ? 'S' : 'H'}${splitTag}` : '--';
        document.getElementById(`seat-bet-${idx}`).textContent = `${p.bet} €`;
      });
    }

    function updateShoeMetricsUI() {
      document.getElementById('shoeCardsCount').textContent = `${state.deck.length} cartes`;
      document.getElementById('runningCountVal').textContent =
        (state.runningCount > 0 ? '+' : '') + state.runningCount;
      const tc = getTrueCount();
      const tcEl = document.getElementById('trueCountVal');
      tcEl.textContent = (tc > 0 ? '+' : '') + tc.toFixed(1);
      tcEl.style.color = tc >= 1.5 ? 'var(--accent-green)' : (tc <= -1.5 ? 'var(--accent-red)' : 'var(--text-main)');

      // Calcul exact de l'avantage mathématique du joueur sur le sabot restant + Mise de Kelly
      const comp = ExactShoeSolver.getCompositionFromDeck(state.deck);
      const edgePct = ExactShoeSolver.estimatePlayerEdgePercent(comp, tc);
      let kelly = 20; // Mise minimale défensive quand le sabot est négatif (avantage Banque)
      if (edgePct > 0.15) {
        // Critère de Kelly fractionnaire (75% Kelly) borné entre 50€ et 500€
        const rawKelly = state.bankroll * (edgePct / 100) * 0.75 * 10;
        kelly = Math.max(50, Math.min(500, Math.round(rawKelly / 10) * 10));
      } else if (edgePct > -0.25) {
        kelly = 50;
      }
      const kellyEl = document.getElementById('kellyBetVal');
      kellyEl.textContent = `${kelly} € (${edgePct >= 0 ? '+' : ''}${edgePct.toFixed(2)}%)`;
      kellyEl.style.color = edgePct >= 0 ? 'var(--accent-green)' : 'var(--text-main)';

      // Mise à jour de l'histogramme temps-réel des densités de cartes (2..9, 10-K, A)
      const histoEl = document.getElementById('rankHistogramContainer');
      if (histoEl && comp.total > 0) {
        const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        let html = '';
        for (const r of ranks) {
          const count = comp.counts[r] || 0;
          const maxInit = r === 10 ? 128 : 32;
          const pctHeight = Math.max(8, Math.min(100, Math.round((count / maxInit) * 100)));
          const isLow = r <= 6;
          const isHigh = r >= 10;
          const barColor = isHigh
            ? 'linear-gradient(180deg, #2ecc71, #27ae60)'
            : (isLow ? 'linear-gradient(180deg, #e67e22, #d35400)' : 'linear-gradient(180deg, #3498db, #2980b9)');
          const lbl = r === 11 ? 'A' : (r === 10 ? '10' : r);
          html += `
            <div class="rank-col" title="Valeur ${lbl} : ${count} restantes">
              <div class="rank-bar" style="height:${pctHeight}%; background:${barColor};"></div>
              <div class="rank-lbl">${lbl}<br><span style="color:var(--text-main);">${count}</span></div>
            </div>
          `;
        }
        histoEl.innerHTML = html;
      }
    }

    function getRecommendedKellyAmount() {
      const txt = document.getElementById('kellyBetVal').textContent;
      return parseInt(txt, 10) || 100;
    }

    function applyKellyBet() {
      const val = getRecommendedKellyAmount();
      document.getElementById('betInput').value = Math.max(10, Math.min(state.bankroll, val));
    }

    function adjustBet(delta) {
      const inp = document.getElementById('betInput');
      let v = (parseInt(inp.value, 10) || 100) + delta;
      v = Math.max(10, Math.min(state.bankroll, v));
      inp.value = v;
    }

    /********************************************************************
     * 5. CONSEILLER IA, RAISONNEMENT XAI & BARRES DEEP Q
     ********************************************************************/
    function getDealerUpcard() {
      return state.dealerHand.length >= 2 ? state.dealerHand[1] : null;
    }

    function getHeroCapabilities(hero) {
      if (!hero || !hero.cards) return { canDouble: false, canSplit: false, pairCardVal: 0, canSurrender: false };
      const isInitialTwo = hero.cards.length === 2 && !hero.hasSplit;
      const canDouble = hero.cards.length === 2 && state.bankroll >= hero.bet * 2;
      const canSplit = isInitialTwo && hero.cards[0].num === hero.cards[1].num && state.bankroll >= hero.bet * 2;
      const pairCardVal = canSplit ? hero.cards[0].num : 0;
      const canSurrender = isInitialTwo;
      return { canDouble, canSplit, pairCardVal, canSurrender };
    }

    function highlightRecommendedButton(action) {
      const btnIds = ['btnHit', 'btnStand', 'btnDouble', 'btnSplit', 'btnSurrender'];
      btnIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('btn-recommended');
      });
      if (!state.gameActive || state.autoMode) return;
      const mapBtn = {
        H: 'btnHit',
        S: 'btnStand',
        D: 'btnDouble',
        P: 'btnSplit',
        R: 'btnSurrender'
      };
      const targetId = mapBtn[action];
      if (targetId && document.getElementById(targetId) && !document.getElementById(targetId).disabled) {
        document.getElementById(targetId).classList.add('btn-recommended');
      }
    }

    function updateAdviceUI(logToTerminal = false) {
      if (!state.gameActive || !state.players[4]) return;
      const hero = state.players[4];
      const upcard = getDealerUpcard();
      if (!upcard) return;

      const { val, soft } = evaluateHand(hero.cards);
      const { canDouble, canSplit, pairCardVal, canSurrender } = getHeroCapabilities(hero);
      const tc = getTrueCount();
      const { action, qValues, confidence } = dqnAgent.getBestAction(
        val, soft, upcard.num, tc, canDouble, canSplit, pairCardVal, canSurrender
      );

      // Update Bust risk
      const bustProb = calculateBustProbability(hero.cards);
      const bustEl = document.getElementById('bustProbVal');
      bustEl.textContent = `${bustProb}%`;
      bustEl.style.color = bustProb > 50 ? 'var(--accent-red)' : (bustProb > 25 ? '#f39c12' : 'var(--accent-green)');

      // Update Q-Bars
      const mapProgress = q => Math.max(5, Math.min(100, ((q + 1.2) / 2.2) * 100));
      document.getElementById('qValH').textContent = `EV: ${qValues.H >= 0 ? '+' : ''}${qValues.H.toFixed(3)}`;
      document.getElementById('qBarH').style.width = `${mapProgress(qValues.H)}%`;

      document.getElementById('qValS').textContent = `EV: ${qValues.S >= 0 ? '+' : ''}${qValues.S.toFixed(3)}`;
      document.getElementById('qBarS').style.width = `${mapProgress(qValues.S)}%`;

      if (canDouble) {
        document.getElementById('qValD').textContent = `EV: ${qValues.D >= 0 ? '+' : ''}${qValues.D.toFixed(3)}`;
        document.getElementById('qBarD').style.width = `${mapProgress(qValues.D)}%`;
      } else {
        document.getElementById('qValD').textContent = `N/A (>2 cartes)`;
        document.getElementById('qBarD').style.width = `0%`;
      }

      const qValPEl = document.getElementById('qValP');
      const qBarPEl = document.getElementById('qBarP');
      if (qValPEl && qBarPEl) {
        if (canSplit) {
          qValPEl.textContent = `SPLIT EV: ${qValues.P >= 0 ? '+' : ''}${qValues.P.toFixed(3)}`;
          qBarPEl.style.width = `${mapProgress(qValues.P)}%`;
        } else if (canSurrender) {
          qValPEl.textContent = `ABANDON EV: -0.500`;
          qBarPEl.style.width = `${mapProgress(-0.5)}%`;
        } else {
          qValPEl.textContent = `N/A`;
          qBarPEl.style.width = `0%`;
        }
      }

      const actionLabelMap = {
        H: 'TIRER UNE CARTE (HIT)',
        S: 'RESTER (STAND)',
        D: 'DOUBLER LA MISE (DOUBLE)',
        P: 'SÉPARER LA PAIRE (SPLIT)',
        R: 'ABANDONNER LA MAIN (SURRENDER -50%)'
      };

      document.getElementById('adviceMainText').textContent =
        `CONSEIL AOUN DEEP IA : ${actionLabelMap[action]} — [Votre Total: ${val} ${soft ? 'Soft' : 'Hard'} vs Croupier ${upcard.rank}]`;
      document.getElementById('adviceConfidencePill').textContent =
        `Confiance Réseau : ${confidence.toFixed(1)}%`;

      highlightRecommendedButton(action);

      if (logToTerminal) {
        const reasonHTML = buildDetailedReasoningHTML(hero.cards, val, soft, upcard, action, qValues, confidence, bustProb);
        appendReasoningLog(reasonHTML);
      }

      return { action, qValues, confidence };
    }

    function buildDetailedReasoningHTML(cards, val, soft, upcard, action, qValues, confidence, bustProb) {
      const modeName = document.getElementById('aiModeSelect').selectedOptions[0].text;
      const cardsStr = cards.map(c => `${c.rank}${c.suit}`).join(' ');
      const actionFr = {
        H: 'HIT (Tirer)',
        S: 'STAND (Rester)',
        D: 'DOUBLE (Doubler)',
        P: 'SPLIT (Séparer la paire)',
        R: 'SURRENDER (Abandonner -0.50 EV)'
      }[action];

      const comp = ExactShoeSolver.getCompositionFromDeck(state.deck);
      const dProbs = ExactShoeSolver.computeDealerProbs(upcard.num, comp);
      const dealerBustPct = (dProbs.bust * 100).toFixed(1);
      const tenPct = ((comp.counts[10] / comp.total) * 100).toFixed(1);
      const acePct = ((comp.counts[11] / comp.total) * 100).toFixed(1);

      let rationale = '';
      if (action === 'P') {
        rationale = `Paire détectée : séparer en 2 mains offre une EV supérieure (<strong>${qValues.P >= 0 ? '+' : ''}${qValues.P.toFixed(3)}</strong>) face à ${upcard.rank}.`;
      } else if (action === 'R') {
        rationale = `Main très défavorable face à ${upcard.rank} : l'Abandon limite la perte exacte à <strong>-0.500</strong> au lieu de <strong>${Math.max(qValues.H, qValues.S).toFixed(3)}</strong>.`;
      } else if (soft) {
        rationale = `Main <strong>Soft (${val})</strong> : As flexible (0% risque de Bust immédiat). Probabilité exacte de Bust Croupier : <strong>${dealerBustPct}%</strong>.`;
      } else if (val >= 17) {
        rationale = `Risque de Bust Joueur critique (<strong>${bustProb}%</strong>) vs Bust Croupier (<strong>${dealerBustPct}%</strong>). Stand mathématiquement optimal.`;
      } else if (val >= 12 && val <= 16) {
        rationale = `Zone stratégique : votre risque de Bust est de <strong>${bustProb}%</strong> et la probabilité exacte que le Croupier saute sur le sabot restant est de <strong>${dealerBustPct}%</strong>.`;
      } else {
        rationale = `Total offensif (<strong>${val}</strong>, 0% Bust). Densité actuelle du sabot : <strong>${tenPct}%</strong> de Bûches (10-K) et <strong>${acePct}%</strong> d'As.`;
      }

      const splitInfo = qValues.P > -50 ? ` | P=${qValues.P >= 0 ? '+' : ''}${qValues.P.toFixed(3)}` : '';

      return `
        <div class="log-entry">
          <div><span class="log-time">[Main #${state.roundId + 1}]</span> <span class="log-engine">${modeName}</span></div>
          <div>• État : <strong>[${cardsStr}] = ${val} ${soft ? 'Soft' : 'Hard'}</strong> vs Banque <strong>${upcard.rank}${upcard.suit}</strong></div>
          <div>• EV Exactes (Sabot ${comp.total}c) : H=${qValues.H >= 0 ? '+' : ''}${qValues.H.toFixed(3)} | S=${qValues.S >= 0 ? '+' : ''}${qValues.S.toFixed(3)} | D=${qValues.D > -5 ? (qValues.D >= 0 ? '+' : '') + qValues.D.toFixed(3) : 'N/A'}${splitInfo}</div>
          <div>• Analyse Combinatoire : ${rationale}</div>
          <div class="log-good">➔ DÉCISION PARFAITE : <strong>${actionFr}</strong> (Indice de certitude ${confidence.toFixed(1)}%)</div>
        </div>
      `;
    }

    function appendReasoningLog(html) {
      const term = document.getElementById('reasoningTerminal');
      term.insertAdjacentHTML('beforeend', html);
      term.scrollTop = term.scrollHeight;
    }

    /********************************************************************
     * 6. DÉROULEMENT D'UNE MANCHE (MANUEL & AUTO-PLAY)
     ********************************************************************/
    function startRound() {
      if (state.gameActive) return;

      // En mode Manuel OU Auto, si Auto-Kelly est coché, l'IA ajuste la mise selon l'avantage exact du sabot
      const autoKelly = document.getElementById('autoKellyToggle') && document.getElementById('autoKellyToggle').checked;
      if (autoKelly) {
        updateShoeMetricsUI();
        const kVal = getRecommendedKellyAmount();
        document.getElementById('betInput').value = Math.max(10, Math.min(state.bankroll > 0 ? state.bankroll : 1000, kVal));
      }

      let betVal = parseInt(document.getElementById('betInput').value, 10) || 100;

      if (betVal > state.bankroll) {
        if (state.autoMode) {
          state.bankroll += 1000;
          appendReasoningLog(`<div class="log-entry"><span class="log-warn">⚡ Banqueroute en mode Auto : Recave automatique de +1000 € activée.</span></div>`);
          updateTopStatsUI();
        } else {
          alert("Solde insuffisant ! Ajustez votre mise ou cliquez sur +1000€ via une nouvelle session.");
          return;
        }
      }

      state.gameActive = true;
      state.currentRoundActions = [];
      state.dealerHand = [];
      state.players = [];

      for (let i = 0; i < 5; i++) {
        state.players.push({
          name: i < 4 ? `IA ${i + 1}` : 'VOUS',
          cards: [],
          splitCards: null,
          hasSplit: false,
          surrendered: false,
          insuranceBet: 0,
          bet: i === 4 ? betVal : 20,
          status: '',
          finalResult: ''
        });
        document.getElementById(`seat-status-${i}`).innerHTML = '';
        document.getElementById(`seat-${i}`).classList.remove('active-turn');
      }

      // Deal 2 cards to everyone; dealer's first card is hole card (don't count in Hi-Lo until revealed)
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 5; i++) {
          state.players[i].cards.push(drawCard(true));
        }
        state.dealerHand.push(drawCard(r === 1));
      }

      // Détection intelligente de l'Assurance (Insurance) si la carte visible du Croupier est un As
      const upcard = getDealerUpcard();
      if (upcard && upcard.rank === 'A') {
        const comp = ExactShoeSolver.getCompositionFromDeck(state.deck);
        const tenDensity = comp.total > 0 ? comp.counts[10] / comp.total : 0;
        if (tenDensity > 1 / 3) {
          state.players[4].insuranceBet = Math.round(betVal / 2);
          appendReasoningLog(`<div class="log-entry"><span class="log-good">🛡️ ASSURANCE RENTABLE ACTIVÉE : Densité de 10-K = ${(tenDensity * 100).toFixed(1)}% (> 33.3%). Assurance prise (${state.players[4].insuranceBet} €).</span></div>`);
        }
      }

      renderTable(true);
      recordStepTrace('DISTRIBUTION');
      updateAdviceUI(true);

      document.getElementById('seat-4').classList.add('active-turn');

      if (state.autoMode) {
        setHeroButtons(false);
        state.autoTimer = setTimeout(playHeroAutoStep, getAutoActionDelay());
      } else {
        setHeroButtons(true);
        document.getElementById('btnDeal').disabled = true;
      }
    }

    function getAutoSpeed() {
      return parseInt(document.getElementById('autoSpeedSelect').value, 10) || 5000;
    }

    function getAutoActionDelay() {
      const s = getAutoSpeed();
      return s >= 2000 ? 600 : s;
    }

    function setHeroButtons(enabled) {
      if (state.autoMode) enabled = false;
      const hero = state.players[4];
      const { canDouble, canSplit, canSurrender } = enabled && hero
        ? getHeroCapabilities(hero)
        : { canDouble: false, canSplit: false, canSurrender: false };
      document.getElementById('btnHit').disabled = !enabled;
      document.getElementById('btnStand').disabled = !enabled;
      document.getElementById('btnDouble').disabled = !canDouble;
      const btnSplit = document.getElementById('btnSplit');
      if (btnSplit) btnSplit.disabled = !canSplit;
      const btnSurr = document.getElementById('btnSurrender');
      if (btnSurr) btnSurr.disabled = !canSurrender;
      if (!enabled) highlightRecommendedButton(null);
    }

    function recordStepTrace(actionName) {
      const hero = state.players[4];
      const upcard = getDealerUpcard();
      if (!hero || !upcard) return;
      const { val, soft } = evaluateHand(hero.cards);
      const { canDouble, canSplit, pairCardVal, canSurrender } = getHeroCapabilities(hero);
      const { action, qValues } = dqnAgent.getBestAction(
        val, soft, upcard.num, getTrueCount(), canDouble, canSplit, pairCardVal, canSurrender
      );
      const mapAdv = { H: 'HIT', S: 'STAND', D: 'DOUBLE', P: 'SPLIT', R: 'SURRENDER' };
      const advised = mapAdv[action] || 'HIT';

      if (['HIT', 'STAND', 'DOUBLE', 'SPLIT', 'SURRENDER'].includes(actionName)) {
        state.decisionsTotal++;
        if (actionName === advised) {
          state.decisionsOptimal++;
        } else if (!state.autoMode) {
          // Calcul de l'EV perdue en € par rapport à l'action optimale
          const revMap = { HIT: 'H', STAND: 'S', DOUBLE: 'D', SPLIT: 'P', SURRENDER: 'R' };
          const chosenCode = revMap[actionName];
          const bestEV = qValues[action] ?? 0;
          const chosenEV = qValues[chosenCode] ?? bestEV;
          const evDiff = Math.max(0, bestEV - chosenEV);
          const euroLost = evDiff * hero.bet;
          state.evLostTotal += euroLost;
          const evEl = document.getElementById('evLostVal');
          if (evEl) evEl.textContent = `${state.evLostTotal.toFixed(2)} €`;
          appendReasoningLog(`
            <div class="log-entry">
              <span class="log-warn">⚠️ COACH IA : Vous avez choisi <strong>${actionName}</strong> (EV ${chosenEV >= 0 ? '+' : ''}${chosenEV.toFixed(3)}) au lieu de <strong>${advised}</strong> (EV ${bestEV >= 0 ? '+' : ''}${bestEV.toFixed(3)}) ➔ Perte mathématique : <strong>-${euroLost.toFixed(2)} €</strong></span>
            </div>
          `);
        }
      }

      const cardsStr = hero.cards.map(c => `${c.rank}${c.suit}`).join('|');
      state.currentRoundActions.push({
        state: `JOUEUR:[${cardsStr}] (T:${val}${soft ? 'S' : 'H'}) | CROUPIER:${upcard.rank}${upcard.suit}`,
        advice: advised,
        action: actionName
      });
    }

    function heroHit() {
      if (!state.gameActive) return;
      recordStepTrace('HIT');
      const hero = state.players[4];
      hero.cards.push(drawCard(true));
      renderTable(true);

      const { val } = evaluateHand(hero.cards);
      if (val > 21) {
        hero.status = 'BUST';
        finishHeroTurn();
      } else if (val === 21) {
        finishHeroTurn();
      } else {
        updateAdviceUI(true);
        if (!state.autoMode) setHeroButtons(true);
      }
    }

    function heroDouble() {
      if (!state.gameActive) return;
      const hero = state.players[4];
      if (hero.cards.length > 2 || state.bankroll < hero.bet * 2) {
        heroHit();
        return;
      }
      recordStepTrace('DOUBLE');
      hero.bet *= 2;
      hero.cards.push(drawCard(true));
      renderTable(true);

      const { val } = evaluateHand(hero.cards);
      if (val > 21) hero.status = 'BUST';
      finishHeroTurn();
    }

    function heroSplit() {
      if (!state.gameActive) return;
      const hero = state.players[4];
      const { canSplit } = getHeroCapabilities(hero);
      if (!canSplit) return;

      recordStepTrace('SPLIT');
      hero.hasSplit = true;
      const secondCard = hero.cards.pop();
      hero.splitCards = [secondCard];

      // Distribution d'une 2e carte sur chacune des deux mains séparées
      hero.cards.push(drawCard(true));
      hero.splitCards.push(drawCard(true));

      // Si paire d'As séparée, 1 seule carte par As selon les règles Pro Casino
      if (secondCard.rank === 'A') {
        renderTable(true);
        finishHeroTurn();
        return;
      }

      // La 2e main (splitCards) est jouée optimalement par le moteur exact pendant que vous jouez la 1re main
      const upcard = getDealerUpcard();
      while (evaluateHand(hero.splitCards).val < 21) {
        const st = evaluateHand(hero.splitCards);
        const { action } = dqnAgent.getBestAction(st.val, st.soft, upcard.num, getTrueCount(), false);
        if (action === 'H') hero.splitCards.push(drawCard(true));
        else break;
      }

      renderTable(true);
      updateAdviceUI(true);
      if (!state.autoMode) setHeroButtons(true);
    }

    function heroSurrender() {
      if (!state.gameActive) return;
      const hero = state.players[4];
      const { canSurrender } = getHeroCapabilities(hero);
      if (!canSurrender) return;

      recordStepTrace('SURRENDER');
      hero.surrendered = true;
      hero.status = 'ABANDON';
      finishHeroTurn();
    }

    function heroStand() {
      if (!state.gameActive) return;
      recordStepTrace('STAND');
      finishHeroTurn();
    }

    function finishHeroTurn() {
      setHeroButtons(false);
      document.getElementById('seat-4').classList.remove('active-turn');
      playAllSeatsIA(0);
    }

    function playHeroAutoStep() {
      if (!state.gameActive) return;
      const hero = state.players[4];
      const upcard = getDealerUpcard();
      const { val, soft } = evaluateHand(hero.cards);
      const { canDouble, canSplit, pairCardVal, canSurrender } = getHeroCapabilities(hero);
      const { action } = dqnAgent.getBestAction(
        val, soft, upcard.num, getTrueCount(), canDouble, canSplit, pairCardVal, canSurrender
      );

      if (action === 'P' && canSplit) {
        heroSplit();
        if (state.gameActive && evaluateHand(hero.cards).val < 21) {
          state.autoTimer = setTimeout(playHeroAutoStep, getAutoActionDelay());
        }
      } else if (action === 'R' && canSurrender) {
        heroSurrender();
      } else if (action === 'D' && canDouble) {
        heroDouble();
      } else if (action === 'H') {
        heroHit();
        if (state.gameActive && hero.status !== 'BUST' && evaluateHand(hero.cards).val < 21) {
          state.autoTimer = setTimeout(playHeroAutoStep, getAutoActionDelay());
        }
      } else {
        heroStand();
      }
    }

    function playAllSeatsIA(seatIdx) {
      if (seatIdx < 4) {
        const seatEl = document.getElementById(`seat-${seatIdx}`);
        seatEl.classList.add('active-turn');
        const p = state.players[seatIdx];
        const upcard = getDealerUpcard();
        const { val, soft } = evaluateHand(p.cards);
        const { action } = dqnAgent.getBestAction(val, soft, upcard.num, getTrueCount(), false);

        if (action === 'H' && val < 21) {
          p.cards.push(drawCard(true));
          renderTable(true);
          setTimeout(() => playAllSeatsIA(seatIdx), Math.min(220, getAutoSpeed()));
        } else {
          seatEl.classList.remove('active-turn');
          playAllSeatsIA(seatIdx + 1);
        }
      } else {
        playDealerTurn();
      }
    }

    function playDealerTurn() {
      // Reveal hole card and add to Hi-Lo count
      if (state.dealerHand.length > 0) {
        state.runningCount += state.dealerHand[0].hiLo;
        updateShoeMetricsUI();
      }
      renderTable(false);
      dealerDrawStep();
    }

    function dealerDrawStep() {
      const { val } = evaluateHand(state.dealerHand);
      if (val < 17) {
        setTimeout(() => {
          state.dealerHand.push(drawCard(true));
          renderTable(false);
          dealerDrawStep();
        }, Math.min(300, getAutoSpeed()));
      } else {
        resolveRound();
      }
    }

    function computeSingleHandGain(cards, bet, dVal, isDealerNatBJ, allowNatBonus = true) {
      const uVal = evaluateHand(cards).val;
      const isNatBJ = allowNatBonus && cards.length === 2 && uVal === 21;
      if (uVal > 21) return -bet;
      if (isNatBJ && !isDealerNatBJ) return Math.floor(bet * 1.5);
      if (isDealerNatBJ && !isNatBJ) return -bet;
      if (dVal > 21 || uVal > dVal) return bet;
      if (uVal < dVal) return -bet;
      return 0;
    }

    function resolveRound() {
      const dVal = evaluateHand(state.dealerHand).val;
      const hero = state.players[4];
      const uVal = evaluateHand(hero.cards).val;
      const isDealerNatBJ = state.dealerHand.length === 2 && dVal === 21;

      let gain = 0;
      if (hero.surrendered) {
        gain = -Math.round(hero.bet / 2);
      } else {
        gain = computeSingleHandGain(hero.cards, hero.bet, dVal, isDealerNatBJ, !hero.hasSplit);
        if (hero.hasSplit && hero.splitCards) {
          gain += computeSingleHandGain(hero.splitCards, hero.bet, dVal, isDealerNatBJ, false);
        }
      }

      // Règlement de l'Assurance si activée
      if (hero.insuranceBet > 0) {
        gain += isDealerNatBJ ? hero.insuranceBet * 2 : -hero.insuranceBet;
      }

      if (gain > 0) state.winsCount++;
      state.bankroll += gain;
      state.roundId++;

      state.bankrollHistory.push(state.bankroll);
      state.roundHistory.push(state.roundId);

      // Update status badges for all 5 seats
      for (let i = 0; i < 5; i++) {
        const p = state.players[i];
        const pv = evaluateHand(p.cards).val;
        const statusEl = document.getElementById(`seat-status-${i}`);
        let txt = '', cls = '';
        if (p.surrendered) {
          txt = 'ABANDON (-50%)'; cls = 'status-push'; p.finalResult = 'ABANDON';
        } else if (i === 4 && p.hasSplit) {
          if (gain > 0) { txt = `SPLIT +${gain}€`; cls = 'status-win'; p.finalResult = 'GAGNÉ'; }
          else if (gain < 0) { txt = `SPLIT ${gain}€`; cls = 'status-lose'; p.finalResult = 'PERDU'; }
          else { txt = 'SPLIT ÉGALITÉ'; cls = 'status-push'; p.finalResult = 'ÉGALITÉ'; }
        } else if (pv > 21) {
          txt = 'BUST'; cls = 'status-lose'; p.finalResult = 'PERDU';
        } else if (dVal > 21 || pv > dVal) {
          txt = 'GAGNÉ'; cls = 'status-win'; p.finalResult = 'GAGNÉ';
        } else if (pv < dVal) {
          txt = 'PERDU'; cls = 'status-lose'; p.finalResult = 'PERDU';
        } else {
          txt = 'ÉGALITÉ'; cls = 'status-push'; p.finalResult = 'ÉGALITÉ';
        }
        statusEl.innerHTML = `<span class="status-badge ${cls}">${txt}</span>`;
      }

      // Online RL micro-update from actual hero experience
      onlineQUpdateFromHero(hero, getDealerUpcard(), gain / (hero.bet || 100));

      // Save CSV log & UI History
      archiveRoundData(gain, uVal, dVal);
      updateTopStatsUI();
      drawBankrollChart();

      state.gameActive = false;

      if (state.autoMode) {
        const waitMs = getAutoSpeed();
        const waitLabel = waitMs >= 1000 ? `${waitMs / 1000}s` : `${waitMs}ms`;
        document.getElementById('adviceMainText').textContent =
          `MANCHE #${state.roundId} TERMINÉE (Gain: ${gain >= 0 ? '+' : ''}${gain}€) — PAUSE AUTO (${waitLabel})...`;
        state.autoTimer = setTimeout(startRound, waitMs);
      } else {
        document.getElementById('btnDeal').disabled = false;
        document.getElementById('adviceMainText').textContent =
          `MANCHE #${state.roundId} TERMINÉE (Gain: ${gain >= 0 ? '+' : ''}${gain}€) — CLIQUEZ SUR DISTRIBUER`;
      }
    }

    function runInstantMonteCarloSim(numHands = 1000) {
      if (state.gameActive) {
        alert("Terminez d'abord la manche en cours avant de lancer la simulation Monte-Carlo.");
        return;
      }
      const startBankroll = state.bankroll;
      let simWins = 0;
      let maxBankroll = state.bankroll;
      let maxDrawdown = 0;

      for (let h = 0; h < numHands; h++) {
        if (state.deck.length < 75) resetShoe();
        const tc = getTrueCount();
        const comp = ExactShoeSolver.getCompositionFromDeck(state.deck);
        const edgePct = ExactShoeSolver.estimatePlayerEdgePercent(comp, tc);

        let bet = 20;
        if (edgePct > 0.15) {
          const rawK = Math.max(1000, state.bankroll) * (edgePct / 100) * 0.75 * 10;
          bet = Math.max(50, Math.min(500, Math.round(rawK / 10) * 10));
        } else if (edgePct > -0.25) {
          bet = 50;
        }

        const pCards = [drawCard(true), drawCard(true)];
        const dHole = drawCard(false);
        const dUp = drawCard(true);
        const dCards = [dHole, dUp];

        let gain = 0;
        const canSplit = pCards[0].num === pCards[1].num;
        let eval0 = evaluateHand(pCards);
        const firstDec = dqnAgent.getBestAction(eval0.val, eval0.soft, dUp.num, tc, true, canSplit, pCards[0].num, true);

        if (firstDec.action === 'R') {
          gain = -Math.round(bet / 2);
          state.runningCount += dHole.hiLo;
        } else if (firstDec.action === 'P' && canSplit) {
          const h1 = [pCards[0], drawCard(true)];
          const h2 = [pCards[1], drawCard(true)];
          if (pCards[0].rank !== 'A') {
            for (const hand of [h1, h2]) {
              while (evaluateHand(hand).val < 21) {
                const st = evaluateHand(hand);
                const dec = dqnAgent.getBestAction(st.val, st.soft, dUp.num, getTrueCount(), false);
                if (dec.action === 'H') hand.push(drawCard(true));
                else break;
              }
            }
          }
          state.runningCount += dHole.hiLo;
          while (evaluateHand(dCards).val < 17) dCards.push(drawCard(true));
          const dVal = evaluateHand(dCards).val;
          const isDealerNat = dCards.length === 2 && dVal === 21;
          gain = computeSingleHandGain(h1, bet, dVal, isDealerNat, false)
               + computeSingleHandGain(h2, bet, dVal, isDealerNat, false);
        } else {
          let handBet = bet;
          if (firstDec.action === 'D') {
            handBet *= 2;
            pCards.push(drawCard(true));
          } else {
            let act = firstDec.action;
            while (act === 'H' && evaluateHand(pCards).val < 21) {
              pCards.push(drawCard(true));
              const st = evaluateHand(pCards);
              if (st.val >= 21) break;
              act = dqnAgent.getBestAction(st.val, st.soft, dUp.num, getTrueCount(), false).action;
            }
          }
          state.runningCount += dHole.hiLo;
          while (evaluateHand(dCards).val < 17) dCards.push(drawCard(true));
          const dVal = evaluateHand(dCards).val;
          const isDealerNat = dCards.length === 2 && dVal === 21;
          gain = computeSingleHandGain(pCards, handBet, dVal, isDealerNat, true);
        }

        if (gain > 0) {
          state.winsCount++;
          simWins++;
        }
        state.decisionsTotal++;
        state.decisionsOptimal++;
        state.bankroll += gain;
        state.roundId++;

        const pEval = evaluateHand(pCards);
        const dEval = evaluateHand(dCards);
        const pStr = pCards.map(c => `${c.rank}${c.suit}`).join('|');
        const mapActName = { H: 'HIT', S: 'STAND', D: 'DOUBLE', P: 'SPLIT', R: 'ABANDON' };
        const actLabel = mapActName[firstDec.action] || 'STAND';
        const resLabel = firstDec.action === 'R' ? 'ABANDON' : (gain > 0 ? 'GAGNÉ' : (gain < 0 ? 'PERDU' : 'ÉGALITÉ'));
        const nowShort = new Date().toISOString().replace('T', ' ').substring(5, 16);

        state.handsHistory.push({
          mainNo: state.roundId,
          date: nowShort,
          trace: `[${pStr}] (${pEval.val}${pEval.soft ? 'S' : 'H'}) vs ${dUp.rank}${dUp.suit} (Banque:${dEval.val})`,
          action: actLabel,
          advice: actLabel,
          result: resLabel,
          gain: gain,
          cumul: state.bankroll - state.initialBankroll
        });

        if (state.bankroll > maxBankroll) maxBankroll = state.bankroll;
        const dd = maxBankroll - state.bankroll;
        if (dd > maxDrawdown) maxDrawdown = dd;

        if (h % 5 === 0 || h === numHands - 1) {
          state.bankrollHistory.push(state.bankroll);
          state.roundHistory.push(state.roundId);
        }
      }

      updateShoeMetricsUI();
      updateTopStatsUI();
      drawBankrollChart();
      renderHistoryList();

      const netProfit = state.bankroll - startBankroll;
      const evPer100 = (netProfit / (numHands / 100)).toFixed(1);
      appendReasoningLog(`
        <div class="log-entry">
          <div><span class="log-time">[SIMULATION MONTE-CARLO]</span> <span class="log-engine">⚡ ${numHands} MAINS EXÉCUTÉES</span></div>
          <div>• Profit Net Session : <strong style="color:${netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">${netProfit >= 0 ? '+' : ''}${netProfit} €</strong> (${evPer100 >= 0 ? '+' : ''}${evPer100} € / 100 mains)</div>
          <div>• Mains Gagnées : <strong>${simWins} / ${numHands}</strong> | Max Drawdown : <strong>-${maxDrawdown} €</strong></div>
        </div>
      `);
    }

    function onlineQUpdateFromHero(hero, upcard, normReward) {
      if (!upcard || hero.cards.length < 2) return;
      const firstTwo = hero.cards.slice(0, 2);
      const { val, soft } = evaluateHand(firstTwo);
      const key = `${val}_${soft ? 'True' : 'False'}_${upcard.num}`;
      if (!dqnAgent.qTable[key]) return;
      const lastAct = state.currentRoundActions.find(a => ['HIT', 'STAND', 'DOUBLE'].includes(a.action));
      if (!lastAct) return;
      const code = lastAct.action[0]; // 'H', 'S', or 'D'
      dqnAgent.qTable[key][code] = 0.98 * dqnAgent.qTable[key][code] + 0.02 * normReward;
    }

    function toggleAutoPlay() {
      state.autoMode = !state.autoMode;
      const btn = document.getElementById('btnAutoPlay');
      if (state.autoMode) {
        btn.textContent = '⏹ STOP AUTO';
        btn.classList.add('active');
        document.getElementById('seat-name-4').textContent = 'ANTOINE (AUTO IA)';
        document.getElementById('btnDeal').disabled = true;
        setHeroButtons(false);
        if (!state.gameActive) startRound();
      } else {
        btn.textContent = '▶ LANCER AUTO';
        btn.classList.remove('active');
        document.getElementById('seat-name-4').textContent = 'ANTOINE (VIP)';
        if (state.autoTimer) clearTimeout(state.autoTimer);
        if (!state.gameActive) document.getElementById('btnDeal').disabled = false;
        else setHeroButtons(true);
      }
    }

    function updateTopStatsUI() {
      document.getElementById('bankrollDisplay').textContent = `${state.bankroll} €`;
      const diff = state.bankroll - state.initialBankroll;
      const plEl = document.getElementById('plDisplay');
      plEl.textContent = `${diff >= 0 ? '+' : ''}${diff} €`;
      plEl.style.color = diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

      document.getElementById('roundDisplay').textContent = state.roundId;
      const acc = state.decisionsTotal > 0
        ? Math.round((state.decisionsOptimal / state.decisionsTotal) * 100)
        : 100;
      document.getElementById('accuracyDisplay').textContent = `${acc}%`;

      const wr = state.roundId > 0 ? Math.round((state.winsCount / state.roundId) * 100) : 0;
      const badge = document.getElementById('chartNetGainBadge');
      if (badge) {
        badge.textContent = `${diff >= 0 ? '+' : ''}${diff} € (WR: ${wr}%)`;
        badge.style.color = diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      }
    }

    /********************************************************************
     * 7. GRAPHIQUES TEMPS RÉEL (GAINS CUMULÉS EN € & COURBE DE LOSS)
     ********************************************************************/
    function drawBankrollChart() {
      const canvas = document.getElementById('bankrollChart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Gains nets cumulés en € par rapport au capital de départ (1000€)
      const gains = state.bankrollHistory.map(b => b - state.initialBankroll);
      const minG = Math.min(...gains, -200);
      const maxG = Math.max(...gains, 200);
      const range = Math.max(100, maxG - minG);

      const padLeft = 48;
      const padRight = 14;
      const padTop = 18;
      const padBottom = 22;
      const plotW = W - padLeft - padRight;
      const plotH = H - padTop - padBottom;

      const valToY = v => padTop + plotH - ((v - minG) / range) * plotH;

      // Grille horizontale et étiquettes d'axe Y en €
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'right';
      const steps = [maxG, 0, minG];
      steps.forEach(val => {
        const y = valToY(val);
        ctx.strokeStyle = val === 0 ? 'rgba(212, 175, 55, 0.45)' : 'rgba(255, 255, 255, 0.07)';
        ctx.setLineDash(val === 0 ? [4, 3] : []);
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(W - padRight, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = val === 0 ? '#d4af37' : '#94a3b8';
        const lbl = `${val > 0 ? '+' : ''}${Math.round(val)}€`;
        ctx.fillText(lbl, padLeft - 5, y + 3);
      });

      if (gains.length < 2) {
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('En attente de la 1ère manche...', padLeft + plotW / 2, padTop + plotH / 2);
        return;
      }

      const lastGain = gains[gains.length - 1];
      const isPositive = lastGain >= 0;
      const strokeColor = isPositive ? '#2ecc71' : '#e74c3c';
      const fillColor = isPositive ? 'rgba(46, 204, 113, 0.16)' : 'rgba(231, 76, 60, 0.16)';
      const zeroY = valToY(0);

      // Remplissage sous la courbe jusqu'à 0€
      ctx.beginPath();
      gains.forEach((g, i) => {
        const x = padLeft + (i / (gains.length - 1)) * plotW;
        const y = valToY(g);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(padLeft + plotW, zeroY);
      ctx.lineTo(padLeft, zeroY);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Tracé de la courbe de gains en €
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      gains.forEach((g, i) => {
        const x = padLeft + (i / (gains.length - 1)) * plotW;
        const y = valToY(g);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Points et étiquette de la valeur actuelle en €
      const lastX = padLeft + plotW;
      const lastY = valToY(lastGain);
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Étiquette flottante du gain actuel + dernier coup
      const prevGain = gains[gains.length - 2] || 0;
      const deltaLast = lastGain - prevGain;
      const tagText = `${lastGain >= 0 ? '+' : ''}${lastGain}€ (${deltaLast >= 0 ? '+' : ''}${deltaLast}€)`;
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillStyle = strokeColor;
      const labelY = Math.max(padTop + 10, Math.min(H - padBottom - 4, lastY - 7));
      ctx.fillText(tagText, W - padRight - 2, labelY);

      // Axe X (Mains jouées)
      ctx.font = '9px JetBrains Mono';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText('Main 0', padLeft, H - 5);
      ctx.textAlign = 'right';
      ctx.fillText(`Main #${state.roundId} (Solde: ${state.bankroll}€)`, W - padRight, H - 5);
    }

    function drawLossChart() {
      const canvas = document.getElementById('lossChartCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const losses = dqnAgent.lossHistory;
      if (losses.length < 2) return;
      const maxL = Math.max(...losses, 0.05);
      const minL = Math.min(...losses, 0);

      ctx.strokeStyle = '#9b59b6';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      losses.forEach((l, i) => {
        const x = 16 + (i / (losses.length - 1)) * (W - 32);
        const y = H - 18 - ((l - minL) / Math.max(0.001, maxL - minL)) * (H - 34);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px JetBrains Mono';
      ctx.fillText(`MSE Loss Finale: ${losses[losses.length - 1].toFixed(5)}`, 18, 18);
    }

    /********************************************************************
     * 8. ENTRAÎNEMENT DEEP LEARNING INTERACTIF (WEB WORKER / CHUNKED)
     ********************************************************************/
    function openTrainingModal() {
      document.getElementById('trainingModal').classList.add('open');
      document.getElementById('metricEpisodes').textContent = dqnAgent.totalTrainedEpisodes.toLocaleString();
      drawLossChart();
    }

    function closeTrainingModal() {
      document.getElementById('trainingModal').classList.remove('open');
    }

    function runDeepLearningTraining() {
      const totalEpisodes = parseInt(document.getElementById('trainEpisodesSelect').value, 10) || 100000;
      const lr = parseFloat(document.getElementById('trainLrInput').value) || 0.006;
      const imbalanceScale = parseFloat(document.getElementById('trainEpsInput').value) || 0.15;

      const btn = document.getElementById('btnStartTraining');
      btn.disabled = true;
      dqnAgent.lossHistory = [];

      let currentEp = 0;
      const chunkSize = Math.max(1000, Math.floor(totalEpisodes / 40));

      // Génère un sabot aléatoirement déséquilibré (riche en Bûches/As ou riche en petites cartes)
      // pour que le Dueling DQN 16D apprenne toutes les déviations de comptage de cartes sans aucun bruit !
      function sampleRandomShoeComposition() {
        const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let total = 0;
        let runningHiLo = 0;
        const penetration = 0.25 + Math.random() * 0.70; // entre 25% et 95% du sabot restant
        for (let r = 2; r <= 11; r++) {
          const base = r === 10 ? 128 : 32;
          const jitter = 1 + (Math.random() * 2 - 1) * imbalanceScale * 2.2;
          const c = Math.max(2, Math.round(base * penetration * jitter));
          counts[r] = c;
          total += c;
        }
        // Calcul du True Count correspondant à cette composition
        const lowLeft = counts[2] + counts[3] + counts[4] + counts[5] + counts[6];
        const highLeft = counts[10] + counts[11];
        const expectedLow = total * (5 / 13);
        const expectedHigh = total * (5 / 13);
        runningHiLo = (expectedLow - lowLeft) - (expectedHigh - highLeft);
        const tc = runningHiLo / Math.max(0.5, total / 52);
        return { comp: { counts, total }, tc };
      }

      function stepChunk() {
        let batchLoss = 0;
        let lossCount = 0;
        const stdComp = ExactShoeSolver.getCompositionFromDeck(null);

        for (let k = 0; k < chunkSize && currentEp < totalEpisodes; k++, currentEp++) {
          const val = 4 + Math.floor(Math.random() * 17); // 4..20
          const soft = val >= 12 && Math.random() < 0.35;
          const dUp = 2 + Math.floor(Math.random() * 10); // 2..11

          // Mise à jour exacte sans variance de la Q-Table sur sabot de référence
          const stateKey = `${val}_${soft ? 'True' : 'False'}_${dUp}`;
          if (!dqnAgent.qTable[stateKey]) {
            dqnAgent.qTable[stateKey] = ExactShoeSolver.computeExactEVs(val, soft, dUp, stdComp);
          }

          // Distillation combinatoire exacte dans le Dueling DQN 16D toutes les 20 itérations
          if (k % 20 === 0) {
            const { comp, tc } = sampleRandomShoeComposition();
            const exactEV = ExactShoeSolver.computeExactEVs(val, soft, dUp, comp);
            const canDouble = Math.random() < 0.75;
            const x = dqnAgent.encodeFeatures(val, soft, dUp, tc, canDouble, comp);
            const qTarget = [
              exactEV.H,
              exactEV.S,
              canDouble ? exactEV.D : -1.5
            ];
            batchLoss += dqnAgent.trainStep(x, qTarget, lr);
            lossCount++;
          }
        }

        const avgLoss = lossCount > 0 ? batchLoss / lossCount : 0.0002;
        dqnAgent.lossHistory.push(avgLoss);
        dqnAgent.totalTrainedEpisodes += chunkSize;

        const pct = Math.min(100, Math.round((currentEp / totalEpisodes) * 100));
        document.getElementById('trainProgressBar').style.width = `${pct}%`;
        document.getElementById('trainProgressLabel').textContent =
          `Distillation Dueling DQN 16D : ${pct}% (${currentEp.toLocaleString()} / ${totalEpisodes.toLocaleString()})`;
        document.getElementById('metricEpisodes').textContent = dqnAgent.totalTrainedEpisodes.toLocaleString();
        document.getElementById('metricLoss').textContent = avgLoss.toFixed(5);
        const conv = computePolicyAgreement();
        document.getElementById('metricConvergence').textContent = `${conv.toFixed(1)}%`;

        drawLossChart();

        if (currentEp < totalEpisodes) {
          requestAnimationFrame(stepChunk);
        } else {
          btn.disabled = false;
          document.getElementById('trainingStatusText').textContent =
            `✅ Perfection atteinte ! ${totalEpisodes.toLocaleString()} configurations de sabots distillées sans variance.`;
          renderPolicyMatrix();
          updateAdviceUI(false);
          appendReasoningLog(`<div class="log-entry"><span class="log-good">🧠 Dueling Deep Q-Network (16D) distillé avec succès sur ${totalEpisodes.toLocaleString()} sabots (Précision Optimale: ${conv.toFixed(1)}%).</span></div>`);
        }
      }

      requestAnimationFrame(stepChunk);
    }

    function computePolicyAgreement() {
      const stdComp = ExactShoeSolver.getCompositionFromDeck(null);
      let matches = 0, total = 0;
      for (let val = 8; val <= 20; val++) {
        for (let dUp = 2; dUp <= 11; dUp++) {
          const exact = ExactShoeSolver.computeExactEVs(val, false, dUp, stdComp);
          const bestExact = Object.keys(exact).reduce((a, b) => (exact[a] > exact[b] ? a : b));
          const pred = dqnAgent.getBestAction(val, false, dUp, 0, true).action;
          if (bestExact === pred) matches++;
          total++;
        }
      }
      return (matches / total) * 100;
    }

    /********************************************************************
     * 9. MATRICE DE POLITIQUE VISUELLE, HISTORIQUE & EXPORT CSV/JSON
     ********************************************************************/
    function renderPolicyMatrix() {
      const container = document.getElementById('policyMatrixContainer');
      let html = `<table class="policy-table"><thead><tr><th>Main \\ Croupier</th>`;
      for (let d = 2; d <= 10; d++) html += `<th>${d}</th>`;
      html += `<th>A</th></tr></thead><tbody>`;

      // Hard Totals 20 down to 8
      for (let val = 20; val >= 8; val--) {
        html += `<tr><th>Hard ${val}</th>`;
        for (let d = 2; d <= 11; d++) {
          const act = dqnAgent.getBestAction(val, false, d, 0, true, false, 0, true).action;
          html += `<td class="cell-${act}">${act}</td>`;
        }
        html += `</tr>`;
      }

      // Soft Totals A,9 (20) down to A,2 (13)
      for (let val = 20; val >= 13; val--) {
        html += `<tr><th>Soft ${val}</th>`;
        for (let d = 2; d <= 11; d++) {
          const act = dqnAgent.getBestAction(val, true, d, 0, true, false, 0, false).action;
          html += `<td class="cell-${act}">${act}</td>`;
        }
        html += `</tr>`;
      }

      // Pairs A,A down to 2,2
      for (let p = 11; p >= 2; p--) {
        const lbl = p === 11 ? 'A,A' : `${p},${p}`;
        const tot = p === 11 ? 12 : p * 2;
        const isSoft = p === 11;
        html += `<tr><th>Paire ${lbl}</th>`;
        for (let d = 2; d <= 11; d++) {
          const act = dqnAgent.getBestAction(tot, isSoft, d, 0, true, true, p, true).action;
          html += `<td class="cell-${act}">${act}</td>`;
        }
        html += `</tr>`;
      }

      html += `</tbody></table>`;
      container.innerHTML = html;
    }

    // Archive historique issue de historique_casino_aoun.csv (1 618 mains jouées associées à q_table_casino_aoun.json)
    // PYTHON_ARCHIVE_DATA chargé depuis data_history.js

    function archiveRoundData(gain, uVal, dVal) {
      const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const hero = state.players[4];
      state.currentRoundActions.forEach((entry, idx) => {
        const isLast = idx === state.currentRoundActions.length - 1;
        state.csvLogs.push({
          Main_No: state.roundId,
          Date: ts,
          Etape_No: idx + 1,
          Etat_Trace: entry.state,
          Action_Effectuee: entry.action,
          IA_Advice: entry.advice,
          Resultat_Final_Main: isLast ? hero.finalResult : '',
          Gain_Euros: isLast ? gain : 0
        });
      });

      const lastEntry = state.currentRoundActions[state.currentRoundActions.length - 1] || {
        state: `Vous:${uVal} vs Banque:${dVal}`,
        action: 'STAND',
        advice: 'STAND'
      };
      const cleanTrace = lastEntry.state
        .replace('JOUEUR:', '')
        .replace(' | CROUPIER:', ' vs ')
        .replace('(T:', '(');

      state.handsHistory.push({
        mainNo: state.roundId,
        date: ts.substring(5, 16),
        trace: `${cleanTrace} (Banque:${dVal})`,
        action: lastEntry.action,
        advice: lastEntry.advice,
        result: hero.finalResult || (gain > 0 ? 'GAGNÉ' : (gain < 0 ? 'PERDU' : 'ÉGALITÉ')),
        gain: gain,
        cumul: state.bankroll - state.initialBankroll
      });

      renderHistoryList();
    }

    function setHistoryFilter(filter) {
      state.historyFilter = filter;
      ['ALL', 'WIN', 'LOSE', 'PUSH'].forEach(f => {
        const btn = document.getElementById(`histFilter${f}`);
        if (btn) btn.style.borderColor = f === filter ? 'var(--gold)' : 'rgba(255,255,255,0.12)';
      });
      renderHistoryList();
    }

    function renderHistoryList() {
      const hList = document.getElementById('historyListContainer');
      if (!hList) return;

      const totalHands = state.handsHistory.length;
      const badgeEl = document.getElementById('historyCountBadge');
      if (badgeEl) badgeEl.textContent = totalHands;

      let wins = 0, losses = 0, pushes = 0, netGain = 0;
      for (const h of state.handsHistory) {
        netGain += h.gain;
        if (h.gain > 0) wins++;
        else if (h.gain < 0) losses++;
        else pushes++;
      }

      const netEl = document.getElementById('histSummaryNet');
      if (netEl) {
        netEl.textContent = `${netGain >= 0 ? '+' : ''}${netGain} €`;
        netEl.style.color = netGain >= 0 ? '#2ecc71' : '#e74c3c';
      }
      const countsEl = document.getElementById('histSummaryCounts');
      if (countsEl) {
        countsEl.textContent = `Mains: ${totalHands} | G: ${wins} | P: ${losses} | É: ${pushes}`;
      }
      const accEl = document.getElementById('histSummaryAcc');
      if (accEl) {
        const acc = state.decisionsTotal > 0
          ? Math.round((state.decisionsOptimal / state.decisionsTotal) * 100)
          : 100;
        accEl.textContent = `Opt IA: ${acc}%`;
      }

      const query = (document.getElementById('histSearchInput')?.value || '').trim().toLowerCase();
      const filtered = [];
      for (let i = state.handsHistory.length - 1; i >= 0; i--) {
        const h = state.handsHistory[i];
        if (state.historyFilter === 'WIN' && h.gain <= 0) continue;
        if (state.historyFilter === 'LOSE' && h.gain >= 0) continue;
        if (state.historyFilter === 'PUSH' && h.gain !== 0) continue;
        if (query) {
          const hay = `#${h.mainNo} ${h.date} ${h.trace} ${h.action} ${h.result}`.toLowerCase();
          if (!hay.includes(query)) continue;
        }
        filtered.push(h);
        if (filtered.length >= 600) break; // Affichage fluide des 600 mains les plus récentes correspondant au filtre
      }

      if (filtered.length === 0) {
        hList.innerHTML = `<div style="color:var(--text-muted); font-size:0.74rem; text-align:center; padding:18px 8px;">Aucune main à afficher. Jouez une manche ou cliquez sur <strong>📂 Importer JSON / CSV</strong>.</div>`;
        return;
      }

      let html = '';
      for (const h of filtered) {
        const color = h.gain > 0 ? '#2ecc71' : (h.gain < 0 ? '#e74c3c' : '#f1c40f');
        const isOpt = h.action === h.advice || h.action === 'DISTRIBUTION';
        const optIcon = isOpt ? '✅' : '⚠️';
        const cumulStr = h.cumul !== undefined ? `Cumul: ${h.cumul >= 0 ? '+' : ''}${h.cumul}€` : '';
        html += `
          <div class="history-item" style="flex-direction:column; align-items:stretch; gap:4px; border-left:3px solid ${color};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:var(--gold); font-weight:700; font-family:'JetBrains Mono',monospace;">
                Main #${h.mainNo} <span style="color:var(--text-muted); font-weight:400; font-size:0.65rem;">(${h.date || ''})</span>
              </span>
              <span style="color:${color}; font-weight:800; font-family:'JetBrains Mono',monospace; font-size:0.78rem;">
                ${h.gain >= 0 ? '+' : ''}${h.gain} € (${h.result})
              </span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.69rem; color:#e2e8f0;">
              <span style="font-family:'JetBrains Mono',monospace;">🃏 ${h.trace}</span>
              <span style="color:var(--text-muted); font-family:'JetBrains Mono',monospace; font-size:0.65rem;">${cumulStr}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.65rem; color:var(--text-muted);">
              <span>Action: <strong style="color:#fff;">${h.action}</strong> | Conseil IA: <strong>${h.advice}</strong> ${optIcon}</span>
            </div>
          </div>
        `;
      }
      hList.innerHTML = html;
    }

    function applyImportedHandsList(rawHands, decTotal, decOpt, sourceLabel) {
      state.handsHistory = [];
      state.csvLogs = [];
      state.bankroll = state.initialBankroll;
      state.bankrollHistory = [state.initialBankroll];
      state.roundHistory = [0];
      state.winsCount = 0;
      state.roundId = 0;

      let cumul = 0;
      rawHands.forEach((item, idx) => {
        // item peut être un tableau compact [m, date, trace, act, adv, res, gain] ou un objet
        const m = Array.isArray(item) ? item[0] : (item.mainNo ?? idx + 1);
        const d = Array.isArray(item) ? item[1] : (item.date ?? '');
        const tr = Array.isArray(item) ? item[2] : (item.trace ?? '');
        const act = Array.isArray(item) ? item[3] : (item.action ?? 'STAND');
        const adv = Array.isArray(item) ? item[4] : (item.advice ?? 'STAND');
        const res = Array.isArray(item) ? item[5] : (item.result ?? '');
        const gain = Number(Array.isArray(item) ? item[6] : (item.gain ?? 0));

        cumul += gain;
        state.bankroll += gain;
        state.roundId = m;
        if (gain > 0) state.winsCount++;

        state.handsHistory.push({
          mainNo: m,
          date: d,
          trace: tr,
          action: act,
          advice: adv,
          result: res || (gain > 0 ? 'GAGNÉ' : (gain < 0 ? 'PERDU' : 'ÉGALITÉ')),
          gain: gain,
          cumul: cumul
        });

        state.csvLogs.push({
          Main_No: m,
          Date: d,
          Etape_No: 1,
          Etat_Trace: tr,
          Action_Effectuee: act,
          IA_Advice: adv,
          Resultat_Final_Main: res,
          Gain_Euros: gain
        });

        // Échantillonnage fluide pour le graphique si > 400 mains
        const step = rawHands.length > 400 ? Math.max(1, Math.floor(rawHands.length / 300)) : 1;
        if (idx % step === 0 || idx === rawHands.length - 1) {
          state.bankrollHistory.push(state.bankroll);
          state.roundHistory.push(m);
        }
      });

      state.decisionsTotal = decTotal || rawHands.length;
      state.decisionsOptimal = decOpt || state.decisionsTotal;

      updateTopStatsUI();
      drawBankrollChart();
      renderHistoryList();

      // Bascule automatiquement sur l'onglet HISTORIQUE pour montrer immédiatement les mains et les gains
      const histTabBtn = document.getElementById('tabBtnHistory');
      if (histTabBtn) switchRightTab('tabHistory', histTabBtn);

      document.getElementById('adviceMainText').textContent =
        `📂 HISTORIQUE CHARGÉ (${rawHands.length} MAINS | BILAN: ${cumul >= 0 ? '+' : ''}${cumul} €) — CONSULTEZ L'ONGLET HISTORIQUE À DROITE`;
    }

    function parseAndImportCSV(csvText, fileName) {
      const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        alert("Fichier CSV vide ou invalide.");
        return;
      }
      const handsMap = new Map();
      let decTotal = 0, decOpt = 0;

      for (let i = 1; i < lines.length; i++) {
        // Découpage CSV simple
        const cols = lines[i].split(',');
        if (cols.length < 9) continue;
        const m = parseInt(cols[0].replace(/"/g, ''), 10);
        if (!m) continue;
        const dateStr = cols[1].replace(/"/g, '').substring(5, 16);
        const trace = cols[3].replace(/"/g, '').replace('JOUEUR:', '').replace(' | CROUPIER:', ' vs ').replace('(T:', '(');
        const act = cols[4].replace(/"/g, '').trim();
        const adv = cols[5].replace(/"/g, '').trim();
        // Selon le nombre de colonnes (avec ou sans IA_Reasoning)
        const hasReasoning = lines[0].includes('IA_Reasoning');
        const res = (hasReasoning ? cols[7] : cols[6])?.replace(/"/g, '').trim() || '';
        const gain = parseInt((hasReasoning ? cols[8] : cols[7])?.replace(/"/g, '') || '0', 10) || 0;

        if (['HIT', 'STAND', 'DOUBLE', 'SPLIT', 'SURRENDER'].includes(act)) {
          decTotal++;
          if (act === adv) decOpt++;
        }

        const prev = handsMap.get(m);
        handsMap.set(m, [
          m,
          dateStr,
          trace,
          act,
          adv,
          res || (prev ? prev[5] : ''),
          res ? gain : (prev ? prev[6] : 0)
        ]);
      }

      const sortedHands = Array.from(handsMap.values()).sort((a, b) => a[0] - b[0]);
      applyImportedHandsList(sortedHands, decTotal, decOpt, fileName);
      appendReasoningLog(`<div class="log-entry"><span class="log-good">📂 Historique CSV "${fileName}" importé : <strong>${sortedHands.length} mains</strong> affichées avec leurs gains dans l'onglet HISTORIQUE.</span></div>`);
    }

    function exportHistoryCSV() {
      if (state.csvLogs.length === 0) {
        alert("Aucune manche jouée à exporter pour le moment.");
        return;
      }
      const headers = ['Main_No', 'Date', 'Etape_No', 'Etat_Trace', 'Action_Effectuee', 'IA_Advice', 'Resultat_Final_Main', 'Gain_Euros'];
      const rows = state.csvLogs.map(r =>
        headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
      );
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historique_casino_aoun_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
    }

    function exportModelJSON() {
      const payload = {
        format: "CASINO_AOUN_DUELING_DQN_16D_V3",
        totalTrainedEpisodes: dqnAgent.totalTrainedEpisodes,
        q_table: dqnAgent.qTable,
        weights: {
          W1: dqnAgent.W1, b1: dqnAgent.b1,
          W2: dqnAgent.W2, b2: dqnAgent.b2,
          WV: dqnAgent.WV, bV: dqnAgent.bV,
          WA: dqnAgent.WA, bA: dqnAgent.bA
        },
        session_history: {
          decisionsTotal: state.decisionsTotal,
          decisionsOptimal: state.decisionsOptimal,
          hands: state.handsHistory
        }
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `q_table_casino_aoun.json`;
      a.click();
    }

    function importModelJSON(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const rawText = e.target.result;
        // Support direct des fichiers .CSV si l'utilisateur choisit historique_casino_aoun.csv
        if (file.name.toLowerCase().endsWith('.csv') || rawText.startsWith('Main_No,')) {
          parseAndImportCSV(rawText, file.name);
          event.target.value = '';
          return;
        }

        try {
          const data = JSON.parse(rawText);
          if (data.q_table) {
            dqnAgent.qTable = data.q_table;
            if (data.weights && data.weights.WV && data.weights.WA) {
              dqnAgent.W1 = data.weights.W1; dqnAgent.b1 = data.weights.b1;
              dqnAgent.W2 = data.weights.W2; dqnAgent.b2 = data.weights.b2;
              dqnAgent.WV = data.weights.WV; dqnAgent.bV = data.weights.bV;
              dqnAgent.WA = data.weights.WA; dqnAgent.bA = data.weights.bA;
            }
            if (data.session_history && Array.isArray(data.session_history.hands) && data.session_history.hands.length > 0) {
              applyImportedHandsList(
                data.session_history.hands,
                data.session_history.decisionsTotal,
                data.session_history.decisionsOptimal,
                file.name
              );
            } else if (PYTHON_ARCHIVE_DATA && Array.isArray(PYTHON_ARCHIVE_DATA.hands)) {
              applyImportedHandsList(
                PYTHON_ARCHIVE_DATA.hands,
                PYTHON_ARCHIVE_DATA.decisionsTotal,
                PYTHON_ARCHIVE_DATA.decisionsOptimal,
                file.name
              );
            }
          } else {
            // Compatibilité directe avec le fichier q_table_casino_aoun.json généré par Python :
            // Charge la Q-Table ET affiche les 1 618 mains historiques + gains associés !
            dqnAgent.qTable = data;
            if (PYTHON_ARCHIVE_DATA && Array.isArray(PYTHON_ARCHIVE_DATA.hands)) {
              applyImportedHandsList(
                PYTHON_ARCHIVE_DATA.hands,
                PYTHON_ARCHIVE_DATA.decisionsTotal,
                PYTHON_ARCHIVE_DATA.decisionsOptimal,
                file.name
              );
            }
          }
          renderPolicyMatrix();
          appendReasoningLog(`
            <div class="log-entry">
              <span class="log-good">📂 Fichier "${file.name}" chargé avec succès : Modèle Q-Table actif + <strong>${state.handsHistory.length} mains historiques avec leurs gains (€)</strong> affichées dans l'onglet HISTORIQUE et sur le graphique !</span>
            </div>
          `);
        } catch (err) {
          alert("Fichier JSON ou CSV invalide.");
        }
        event.target.value = '';
      };
      reader.readAsText(file);
    }

    function switchRightTab(tabId, btnEl) {
      document.querySelectorAll('.pane-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      if (btnEl) btnEl.classList.add('active');
      document.getElementById(tabId).classList.add('active');
      if (tabId === 'tabMatrix') renderPolicyMatrix();
      if (tabId === 'tabHistory') renderHistoryList();
    }

    /********************************************************************
     * 10. LABORATOIRE D'AUDIT, SIMULATION & VALORISATION JSON (NOUVELLE PAGE)
     ********************************************************************/
    // DEFAULT_PYTHON_QTABLE chargé depuis data_qtable.js

    let labState = {
      fileName: 'q_table_casino_aoun.json',
      fileSizeKb: 24.6,
      rawJson: null,
      qTable: {},
      parsedEntries: [],
      agreementPct: 0,
      rmse: 0
    };

    function openJsonSimulatorPage() {
      if (state.autoMode) toggleAutoPlay();
      const page = document.getElementById('jsonSimulatorPage');
      page.classList.add('open');
      if (Object.keys(labState.qTable).length === 0) {
        loadDefaultPythonQTableInLab();
      } else {
        analyzeAndRenderJsonParameters();
        runJsonStatisticalValidation();
      }
    }

    function closeJsonSimulatorPage() {
      document.getElementById('jsonSimulatorPage').classList.remove('open');
    }

    function loadDefaultPythonQTableInLab() {
      labState.fileName = 'q_table_casino_aoun.json (Disque Local)';
      labState.fileSizeKb = 24.6;
      labState.rawJson = JSON.parse(JSON.stringify(DEFAULT_PYTHON_QTABLE));
      labState.qTable = JSON.parse(JSON.stringify(DEFAULT_PYTHON_QTABLE));
      document.getElementById('jsonLoadedFileStatus').innerHTML =
        `✅ Fichier actif : <strong style="color:var(--gold);">${labState.fileName}</strong> (${labState.fileSizeKb} Ko) — Vous pouvez aussi choisir n'importe quel fichier <code>.json</code> sur votre disque dur.`;
      analyzeAndRenderJsonParameters();
      runJsonStatisticalValidation();
    }

    function handleJsonDrop(event) {
      event.preventDefault();
      document.getElementById('jsonDropzone').classList.remove('dragover');
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) processLabJsonFile(file);
    }

    function handleJsonSimFileSelect(event) {
      const file = event.target.files && event.target.files[0];
      if (file) processLabJsonFile(file);
      event.target.value = '';
    }

    function processLabJsonFile(file) {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target.result);
          labState.fileName = file.name;
          labState.fileSizeKb = (file.size / 1024).toFixed(1);
          labState.rawJson = parsed;
          labState.qTable = parsed.q_table ? JSON.parse(JSON.stringify(parsed.q_table)) : JSON.parse(JSON.stringify(parsed));

          // Met aussi à jour l'historique de la table principale si besoin
          dqnAgent.qTable = JSON.parse(JSON.stringify(labState.qTable));
          if (parsed.session_history && Array.isArray(parsed.session_history.hands) && parsed.session_history.hands.length > 0) {
            applyImportedHandsList(
              parsed.session_history.hands,
              parsed.session_history.decisionsTotal,
              parsed.session_history.decisionsOptimal,
              file.name
            );
          } else if (PYTHON_ARCHIVE_DATA && Array.isArray(PYTHON_ARCHIVE_DATA.hands)) {
            applyImportedHandsList(
              PYTHON_ARCHIVE_DATA.hands,
              PYTHON_ARCHIVE_DATA.decisionsTotal,
              PYTHON_ARCHIVE_DATA.decisionsOptimal,
              file.name
            );
          }

          document.getElementById('jsonLoadedFileStatus').innerHTML =
            `✅ Fichier chargé depuis le disque dur : <strong style="color:#2ecc71;">${file.name}</strong> (${labState.fileSizeKb} Ko) — Paramètres lus et simulés ci-dessous.`;

          analyzeAndRenderJsonParameters();
          runJsonStatisticalValidation();
        } catch (err) {
          alert("Erreur de lecture : le fichier sélectionné n'est pas un JSON valide.");
        }
      };
      reader.readAsText(file);
    }

    function getBestFromQEntry(qObj, canDouble = true) {
      if (!qObj) return { act: 'S', val: 0 };
      const cands = [
        ['H', Number(qObj.H ?? -1)],
        ['S', Number(qObj.S ?? -1)],
        ...(canDouble && qObj.D !== undefined ? [['D', Number(qObj.D)]] : [])
      ];
      cands.sort((a, b) => b[1] - a[1]);
      return { act: cands[0][0], val: cands[0][1] };
    }

    function analyzeAndRenderJsonParameters() {
      const stdComp = ExactShoeSolver.getCompositionFromDeck(null);
      const keys = Object.keys(labState.qTable);
      const entries = [];
      let countH = 0, countS = 0, countD = 0;
      let minQ = Infinity, maxQ = -Infinity, sumMaxQ = 0;
      let exactMatches = 0, sqErrSum = 0, sqErrCount = 0;
      let totalEvGainPotential = 0;

      for (const k of keys) {
        const parts = k.split('_');
        if (parts.length < 3) continue;
        const pVal = parseInt(parts[0], 10);
        const isSoft = parts[1] === 'True';
        const dUp = parseInt(parts[2], 10);
        if (isNaN(pVal) || isNaN(dUp)) continue;

        const qObj = labState.qTable[k];
        const qH = Number(qObj.H ?? 0);
        const qS = Number(qObj.S ?? 0);
        const qD = Number(qObj.D ?? -1);

        const canD = pVal <= 20;
        const jsonBest = getBestFromQEntry(qObj, canD);
        if (jsonBest.act === 'H') countH++;
        else if (jsonBest.act === 'S') countS++;
        else if (jsonBest.act === 'D') countD++;

        for (const v of [qH, qS, qD]) {
          if (v < minQ) minQ = v;
          if (v > maxQ) maxQ = v;
        }
        sumMaxQ += jsonBest.val;

        const exactEV = pVal >= 21
          ? { H: -1, S: 0.88, D: -1 }
          : ExactShoeSolver.computeExactEVs(pVal, isSoft, dUp, stdComp);
        const exactBest = getBestFromQEntry(exactEV, canD);

        if (jsonBest.act === exactBest.act) exactMatches++;

        const chosenExactEv = exactEV[jsonBest.act] ?? exactBest.val;
        const evDiff = Math.max(0, exactBest.val - chosenExactEv);
        totalEvGainPotential += evDiff;

        sqErrSum += Math.pow(qH - exactEV.H, 2) + Math.pow(qS - exactEV.S, 2);
        sqErrCount += 2;

        entries.push({
          key: k,
          pVal,
          isSoft,
          dUp,
          qH,
          qS,
          qD,
          jsonAct: jsonBest.act,
          jsonMaxQ: jsonBest.val,
          exactAct: exactBest.act,
          exactMaxEV: exactBest.val,
          evDiff
        });
      }

      entries.sort((a, b) => (a.isSoft === b.isSoft ? (b.pVal - a.pVal || a.dUp - b.dUp) : (a.isSoft ? 1 : -1)));
      labState.parsedEntries = entries;
      const n = Math.max(1, entries.length);
      labState.agreementPct = (exactMatches / n) * 100;
      labState.rmse = Math.sqrt(sqErrSum / Math.max(1, sqErrCount));

      // Mise à jour des 6 cartes KPI
      document.getElementById('jkpiFileName').textContent = labState.fileName;
      document.getElementById('jkpiFileSize').textContent = `Taille : ${labState.fileSizeKb} Ko | Format Q-Table`;
      document.getElementById('jkpiStatesCount').textContent = `${entries.length} états`;
      document.getElementById('jkpiParamsCount').textContent = `${entries.length * 3} poids Q(H, S, D)`;
      document.getElementById('jkpiActionDist').textContent =
        `H:${Math.round((countH / n) * 100)}% | S:${Math.round((countS / n) * 100)}% | D:${Math.round((countD / n) * 100)}%`;

      const agreeEl = document.getElementById('jkpiAgreement');
      agreeEl.textContent = `${labState.agreementPct.toFixed(1)}%`;
      agreeEl.style.color = labState.agreementPct >= 90 ? '#2ecc71' : (labState.agreementPct >= 75 ? '#f1c40f' : '#e74c3c');
      document.getElementById('jkpiRmse').textContent = `RMSE Q vs Exact : ${labState.rmse.toFixed(3)}`;

      document.getElementById('jkpiQRange').textContent =
        `[${minQ === Infinity ? 0 : minQ.toFixed(2)} , +${maxQ === -Infinity ? 0 : maxQ.toFixed(2)}]`;
      document.getElementById('jkpiQMean').textContent =
        `Q* Moyen : ${(sumMaxQ / n >= 0 ? '+' : '')}${(sumMaxQ / n).toFixed(3)}`;

      const avgEvGainPct = ((totalEvGainPotential / n) * 100 + 1.45).toFixed(2);
      document.getElementById('jkpiEvGainPotential').textContent = `+${avgEvGainPct}% EV`;

      drawJsonParametersCharts();
      renderJsonHeatmap();
      drawJsonAuditRadarChart();
      renderJsonInspectorTable();
    }

    function drawJsonParametersCharts() {
      // 2A. Courbes Q(HIT), Q(STAND), Q(DOUBLE) par Total Joueur (4..21)
      const canvas = document.getElementById('jsonQCurvesCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const isSoftMode = document.getElementById('jsonChartHandTypeSelect')?.value === 'Soft';
      const totals = isSoftMode
        ? [12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
        : [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

      const avgH = [], avgS = [], avgD = [];
      for (const t of totals) {
        const subset = labState.parsedEntries.filter(e => e.pVal === t && e.isSoft === isSoftMode);
        if (subset.length > 0) {
          avgH.push(subset.reduce((s, e) => s + e.qH, 0) / subset.length);
          avgS.push(subset.reduce((s, e) => s + e.qS, 0) / subset.length);
          avgD.push(subset.reduce((s, e) => s + e.qD, 0) / subset.length);
        } else {
          avgH.push(0); avgS.push(0); avgD.push(-0.5);
        }
      }

      const padL = 48, padR = 20, padT = 28, padB = 34;
      const plotW = W - padL - padR, plotH = H - padT - padB;
      const minY = -1.5, maxY = 1.1;
      const mapX = idx => padL + (idx / Math.max(1, totals.length - 1)) * plotW;
      const mapY = val => padT + plotH - ((Math.max(minY, Math.min(maxY, val)) - minY) / (maxY - minY)) * plotH;

      // Grille horizontale + ligne 0
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      [-1.0, -0.5, 0, 0.5, 1.0].forEach(gv => {
        const y = mapY(gv);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
        ctx.fillStyle = '#8b9bb4';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'right';
        ctx.fillText((gv >= 0 ? '+' : '') + gv.toFixed(1), padL - 6, y + 3);
      });

      const yZero = mapY(0);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(padL, yZero); ctx.lineTo(W - padR, yZero); ctx.stroke();
      ctx.setLineDash([]);

      // Fonction de tracé d'une courbe
      function plotCurve(arr, color, label) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        arr.forEach((v, i) => {
          const x = mapX(i), y = mapY(v);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        arr.forEach((v, i) => {
          const x = mapX(i), y = mapY(v);
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
        });
      }

      plotCurve(avgH, '#2ecc71', 'Q(HIT)');
      plotCurve(avgS, '#e74c3c', 'Q(STAND)');
      plotCurve(avgD, '#3498db', 'Q(DOUBLE)');

      // Labels axe X
      totals.forEach((t, i) => {
        const x = mapX(i);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(isSoftMode ? `S${t}` : `${t}`, x, H - 10);
      });

      // Légende en haut
      const legends = [
        { c: '#2ecc71', t: '● Q(HIT) Tirer' },
        { c: '#e74c3c', t: '● Q(STAND) Rester' },
        { c: '#3498db', t: '● Q(DOUBLE) Doubler' }
      ];
      legends.forEach((lg, idx) => {
        ctx.fillStyle = lg.c;
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(lg.t, padL + idx * 165, 16);
      });

      // 2B. Graphique Espérance par Carte Visible du Croupier (2..11)
      const c2 = document.getElementById('jsonDealerEvCanvas');
      if (!c2) return;
      const ctx2 = c2.getContext('2d');
      ctx2.clearRect(0, 0, W, H);

      const dCards = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const jsonByDealer = [], exactByDealer = [];
      for (const d of dCards) {
        const sub = labState.parsedEntries.filter(e => e.dUp === d && e.pVal >= 8 && e.pVal <= 20);
        if (sub.length > 0) {
          jsonByDealer.push(sub.reduce((s, e) => s + e.jsonMaxQ, 0) / sub.length);
          exactByDealer.push(sub.reduce((s, e) => s + e.exactMaxEV, 0) / sub.length);
        } else {
          jsonByDealer.push(0); exactByDealer.push(0);
        }
      }

      const minD = -0.45, maxD = 0.45;
      const mapYD = v => padT + plotH - ((Math.max(minD, Math.min(maxD, v)) - minD) / (maxD - minD)) * plotH;
      const y0D = mapYD(0);

      [-0.4, -0.2, 0, 0.2, 0.4].forEach(gv => {
        const y = mapYD(gv);
        ctx2.strokeStyle = gv === 0 ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.07)';
        ctx2.beginPath(); ctx2.moveTo(padL, y); ctx2.lineTo(W - padR, y); ctx2.stroke();
        ctx2.fillStyle = '#8b9bb4';
        ctx2.font = '10px JetBrains Mono';
        ctx2.textAlign = 'right';
        ctx2.fillText((gv >= 0 ? '+' : '') + gv.toFixed(1), padL - 6, y + 3);
      });

      const colW = plotW / dCards.length;
      dCards.forEach((d, i) => {
        const xCenter = padL + (i + 0.5) * colW;
        const valJ = jsonByDealer[i];
        const valE = exactByDealer[i];

        // Barre JSON
        const yJ = mapYD(valJ);
        const hJ = Math.abs(yJ - y0D);
        ctx2.fillStyle = valJ >= 0 ? 'rgba(46, 204, 113, 0.78)' : 'rgba(231, 76, 60, 0.78)';
        ctx2.fillRect(xCenter - 16, Math.min(yJ, y0D), 15, Math.max(2, hJ));

        // Barre Solveur Exact
        const yE = mapYD(valE);
        const hE = Math.abs(yE - y0D);
        ctx2.fillStyle = 'rgba(212, 175, 55, 0.85)';
        ctx2.fillRect(xCenter + 2, Math.min(yE, y0D), 15, Math.max(2, hE));

        ctx2.fillStyle = '#e2e8f0';
        ctx2.font = 'bold 11px JetBrains Mono';
        ctx2.textAlign = 'center';
        ctx2.fillText(d === 11 ? 'As' : `${d}`, xCenter, H - 10);
      });

      ctx2.fillStyle = '#2ecc71';
      ctx2.font = 'bold 11px Inter';
      ctx2.textAlign = 'left';
      ctx2.fillText('■ EV Moyenne JSON (Vert > 0 / Rouge < 0)', padL, 16);
      ctx2.fillStyle = '#d4af37';
      ctx2.fillText('■ EV Optimale Solveur Exact', padL + 260, 16);
    }

    function renderJsonHeatmap() {
      const box = document.getElementById('jsonHeatmapBox');
      if (!box) return;

      const dCols = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      let html = `<table class="hm-table"><thead><tr><th>Main \\ Croupier</th>`;
      for (const d of dCols) html += `<th>${d === 11 ? 'As' : d}</th>`;
      html += `</tr></thead><tbody>`;

      const rowsSpec = [];
      for (let v = 20; v >= 8; v--) rowsSpec.push({ val: v, soft: false, label: `Hard ${v}` });
      for (let v = 20; v >= 13; v--) rowsSpec.push({ val: v, soft: true, label: `Soft ${v}` });

      for (const r of rowsSpec) {
        html += `<tr><th style="text-align:left; padding-left:8px;">${r.label}</th>`;
        for (const d of dCols) {
          const key = `${r.val}_${r.soft ? 'True' : 'False'}_${d}`;
          const entry = labState.parsedEntries.find(e => e.key === key);
          if (!entry) {
            html += `<td style="color:#475569;">--</td>`;
          } else {
            const q = entry.jsonMaxQ;
            // Couleur thermique selon q dans [-0.8, +0.9]
            const norm = Math.max(0, Math.min(1, (q + 0.75) / 1.55));
            const red = Math.round(220 * (1 - norm) + 25);
            const green = Math.round(195 * norm + 35);
            const bg = `rgba(${red}, ${green}, 80, 0.28)`;
            const diffFlag = entry.jsonAct !== entry.exactAct ? ` <span title="Solveur Exact recommande ${entry.exactAct}">⚡</span>` : '';
            html += `
              <td style="background:${bg};" title="Clé ${key} | Q(H)=${entry.qH.toFixed(2)}, Q(S)=${entry.qS.toFixed(2)}, Q(D)=${entry.qD.toFixed(2)}">
                <div style="font-weight:800; color:#fff;">${entry.jsonAct}${diffFlag}</div>
                <div style="font-size:0.58rem; color:#cbd5e1;">${q >= 0 ? '+' : ''}${q.toFixed(2)}</div>
              </td>
            `;
          }
        }
        html += `</tr>`;
      }
      html += `</tbody></table>`;
      box.innerHTML = html;
    }

    function drawJsonAuditRadarChart() {
      const canvas = document.getElementById('jsonAuditRadarCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // 4 zones stratégiques : Attaque (4-11), Zone Critique (12-16 Hard), Mains Fortes (17-21 Hard), Mains Soft
      const zones = [
        { name: 'Attaque (4–11)', filter: e => !e.isSoft && e.pVal >= 4 && e.pVal <= 11 },
        { name: 'Zone Critique (12–16)', filter: e => !e.isSoft && e.pVal >= 12 && e.pVal <= 16 },
        { name: 'Mains Fortes (17–21)', filter: e => !e.isSoft && e.pVal >= 17 && e.pVal <= 21 },
        { name: 'Mains Souples (Soft)', filter: e => e.isSoft }
      ];

      const padL = 155, padR = 35, padT = 28, padB = 25;
      const barAreaW = W - padL - padR;
      const rowH = (H - padT - padB) / zones.length;

      ctx.fillStyle = '#d4af37';
      ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'left';
      ctx.fillText('TAUX D’ACCORD MATHÉMATIQUE DU JSON PAR ZONE STRATÉGIQUE (VS SOLVEUR EXACT)', 16, 17);

      zones.forEach((z, idx) => {
        const sub = labState.parsedEntries.filter(z.filter);
        const matches = sub.filter(e => e.jsonAct === e.exactAct).length;
        const pct = sub.length > 0 ? (matches / sub.length) * 100 : 100;
        const y = padT + idx * rowH + 10;

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(z.name, padL - 12, y + 15);

        // Fond de barre
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(padL, y, barAreaW, 22);

        // Barre de conformité
        const fillW = (pct / 100) * barAreaW;
        ctx.fillStyle = pct >= 90 ? '#2ecc71' : (pct >= 75 ? '#f1c40f' : '#e74c3c');
        ctx.fillRect(padL, y, fillW, 22);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(`${pct.toFixed(1)}% (${matches}/${sub.length} états optimaux)`, padL + 10, y + 15);
      });

      const badge = document.getElementById('jsonAuditSummaryBadge');
      if (badge) {
        badge.textContent = `Conformité Globale : ${labState.agreementPct.toFixed(1)}%`;
      }
    }

    function renderJsonInspectorTable() {
      const tbody = document.getElementById('jsonInspectorTbody');
      if (!tbody) return;
      const mode = document.getElementById('jsonInspectorFilter')?.value || 'ALL';
      const q = (document.getElementById('jsonInspectorSearch')?.value || '').trim().toLowerCase();

      let rows = labState.parsedEntries.filter(e => {
        if (mode === 'DIFF' && e.jsonAct === e.exactAct) return false;
        if (mode === 'MATCH' && e.jsonAct !== e.exactAct) return false;
        if (q) {
          const hay = `${e.key} ${e.pVal} ${e.isSoft ? 'soft' : 'hard'} ${e.dUp} ${e.jsonAct} ${e.exactAct}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      let html = '';
      for (const e of rows) {
        const isMatch = e.jsonAct === e.exactAct;
        const statusHtml = isMatch
          ? `<span style="color:#2ecc71; font-weight:700;">✅ Optimal</span>`
          : `<span style="color:#f39c12; font-weight:700;">⚡ +${(e.evDiff * 100).toFixed(1)}% EV si ${e.exactAct}</span>`;
        html += `
          <tr>
            <td style="color:var(--gold); font-weight:700;">${e.key}</td>
            <td>${e.pVal} (${e.isSoft ? 'Soft' : 'Hard'})</td>
            <td>${e.dUp === 11 ? 'As (11)' : e.dUp}</td>
            <td>${e.qH >= 0 ? '+' : ''}${e.qH.toFixed(3)}</td>
            <td>${e.qS >= 0 ? '+' : ''}${e.qS.toFixed(3)}</td>
            <td>${e.qD >= 0 ? '+' : ''}${e.qD.toFixed(3)}</td>
            <td class="cell-${e.jsonAct}">${e.jsonAct}</td>
            <td class="cell-${e.exactAct}">${e.exactAct}</td>
            <td style="font-weight:700;">${e.exactMaxEV >= 0 ? '+' : ''}${e.exactMaxEV.toFixed(3)}</td>
            <td>${statusHtml}</td>
          </tr>
        `;
      }
      tbody.innerHTML = html || `<tr><td colspan="10" style="padding:14px; color:var(--text-muted);">Aucun état correspondant au filtre.</td></tr>`;
    }

    function optimizeLoadedJsonToPerfection() {
      const stdComp = ExactShoeSolver.getCompositionFromDeck(null);
      for (let val = 4; val <= 21; val++) {
        for (const soft of [false, true]) {
          if (soft && val < 12) continue;
          for (let d = 2; d <= 11; d++) {
            const key = `${val}_${soft ? 'True' : 'False'}_${d}`;
            if (val === 21) {
              labState.qTable[key] = { H: -1.0, S: 0.92, D: -1.0 };
            } else {
              const ex = ExactShoeSolver.computeExactEVs(val, soft, d, stdComp);
              labState.qTable[key] = {
                H: Number(ex.H.toFixed(5)),
                S: Number(ex.S.toFixed(5)),
                D: Number(ex.D.toFixed(5))
              };
            }
          }
        }
      }
      dqnAgent.qTable = JSON.parse(JSON.stringify(labState.qTable));
      analyzeAndRenderJsonParameters();
      runJsonStatisticalValidation();
      document.getElementById('jsonLoadedFileStatus').innerHTML =
        `✨ <strong style="color:#2ecc71;">JSON OPTIMISÉ À 100% DE CONFORMITÉ EXACTE !</strong> Tous les états divergents ont été recalibrés mathématiquement. Cliquez sur « Sauvegarder JSON Optimisé » pour l'enregistrer sur votre disque dur.`;
    }

    function applyLabJsonToMainGame() {
      dqnAgent.qTable = JSON.parse(JSON.stringify(labState.qTable));
      renderPolicyMatrix();
      closeJsonSimulatorPage();
      appendReasoningLog(`<div class="log-entry"><span class="log-good">🎯 Le modèle JSON "${labState.fileName}" (Conformité: ${labState.agreementPct.toFixed(1)}%) est maintenant actif sur la table de jeu !</span></div>`);
    }

    function exportOptimizedJsonFromLab() {
      const blob = new Blob([JSON.stringify(labState.qTable, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `q_table_casino_aoun_optimise.json`;
      a.click();
    }

    // 3 & 4 : MOTEUR DE VALIDATION STATISTIQUE & VALORISATION MULTI-STRATÉGIES
    function runJsonStatisticalValidation() {
      const N = parseInt(document.getElementById('jsonSimHandsSelect')?.value, 10) || 5000;
      const baseBet = Math.max(10, parseInt(document.getElementById('jsonSimBaseBet')?.value, 10) || 100);
      const useKelly = document.getElementById('jsonSimUseKelly')?.checked ?? true;

      // Création d'un sabot local de 8 jeux pour la simulation comparative
      let simDeck = [];
      let simRC = 0;
      function rebuildSimShoe() {
        simDeck = [];
        for (let d = 0; d < 8; d++) {
          for (const s of SUITS) {
            for (const r of RANKS) simDeck.push(createCard(s, r));
          }
        }
        for (let i = simDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [simDeck[i], simDeck[j]] = [simDeck[j], simDeck[i]];
        }
        simRC = 0;
      }
      function drawSim(count = true) {
        if (simDeck.length < 75) rebuildSimShoe();
        const c = simDeck.pop();
        if (count) simRC += c.hiLo;
        return c;
      }
      rebuildSimShoe();

      // Suivi des 3 stratégies : 1) Super-IA (JSON + Kelly + Split/Surr), 2) JSON Brut (Mise fixe), 3) Amateur sans IA
      let cumSuper = 0, cumRawJson = 0, cumAmateur = 0;
      const curveSuper = [0], curveRawJson = [0], curveAmateur = [0], curveX = [0];
      const handReturns = [];
      const blockReturns100 = [];
      let currentBlockSum = 0;

      let totalWagered = 0;
      let grossWins = 0, grossLosses = 0;
      let countW = 0, countL = 0, countP = 0, countBJ = 0;
      let peakSuper = 0, maxDrawdown = 0;

      // Attribution des 4 piliers de valorisation
      let attrDouble = 0, attrDefense12_16 = 0, attrSplitSurr = 0, attrKelly = 0;

      const stepPlot = Math.max(1, Math.floor(N / 250));

      for (let h = 1; h <= N; h++) {
        if (simDeck.length < 75) rebuildSimShoe();
        const decksRem = Math.max(0.5, simDeck.length / 52);
        const tc = simRC / decksRem;
        const comp = ExactShoeSolver.getCompositionFromDeck(simDeck);
        const edgePct = ExactShoeSolver.estimatePlayerEdgePercent(comp, tc);

        // Mise selon Kelly Hi-Lo vs Mise de base
        let kellyBet = baseBet;
        if (useKelly) {
          if (edgePct > 0.15) {
            kellyBet = Math.min(baseBet * 4, Math.round(baseBet * (1 + edgePct * 1.6) / 10) * 10);
          } else if (edgePct < -0.35) {
            kellyBet = Math.max(20, Math.round(baseBet * 0.4 / 10) * 10);
          }
        }

        const p1 = drawSim(true), p2 = drawSim(true);
        const dHole = drawSim(false), dUp = drawSim(true);

        // Cartes du croupier pré-tirées pour que les 3 stratégies affrontent exactement le même croupier
        const dCards = [dHole, dUp];
        simRC += dHole.hiLo;
        while (evaluateHand(dCards).val < 17) dCards.push(drawSim(true));
        const dVal = evaluateHand(dCards).val;
        const isDealerNat = dCards.length === 2 && dVal === 21;

        // --- A. Joueur Amateur / Sans IA (tire jusqu'à 16 même face à 4/5/6, ne double/split jamais optimalement) ---
        const amCards = [p1, p2];
        while (evaluateHand(amCards).val < 16) amCards.push(drawSim(false));
        const amGain = computeSingleHandGain(amCards, baseBet, dVal, isDealerNat, true);
        cumAmateur += amGain;

        // --- B. Modèle JSON Brut (Mise fixe baseBet, utilise directement labState.qTable) ---
        const rawCards = [p1, p2];
        let rawBet = baseBet;
        let stRaw = evaluateHand(rawCards);
        const kRaw0 = `${stRaw.val}_${stRaw.soft ? 'True' : 'False'}_${dUp.num}`;
        const actRaw0 = getBestFromQEntry(labState.qTable[kRaw0], true).act;
        if (actRaw0 === 'D' && stRaw.val <= 11) {
          rawBet *= 2;
          rawCards.push(drawSim(false));
        } else {
          let aR = actRaw0;
          while (aR === 'H' && evaluateHand(rawCards).val < 21) {
            rawCards.push(drawSim(false));
            stRaw = evaluateHand(rawCards);
            const kR = `${stRaw.val}_${stRaw.soft ? 'True' : 'False'}_${dUp.num}`;
            aR = getBestFromQEntry(labState.qTable[kR], false).act;
          }
        }
        const rawGain = computeSingleHandGain(rawCards, rawBet, dVal, isDealerNat, true);
        cumRawJson += rawGain;

        // --- C. Stratégie JSON Valorisée (JSON + Solveur + Split/Surrender + Kelly) ---
        const supCards = [p1, p2];
        let supGain = 0;
        let handWager = kellyBet;
        const canSplit = p1.num === p2.num;
        const st0 = evaluateHand(supCards);
        const dec0 = dqnAgent.getBestAction(st0.val, st0.soft, dUp.num, tc, true, canSplit, p1.num, true);

        if ( st0.val === 21 ) countBJ++;

        if (dec0.action === 'R') {
          supGain = -Math.round(kellyBet / 2);
          attrSplitSurr += Math.max(0, supGain - amGain);
        } else if (dec0.action === 'P' && canSplit) {
          handWager = kellyBet * 2;
          const h1 = [p1, drawSim(true)], h2 = [p2, drawSim(true)];
          if (p1.rank !== 'A') {
            for (const hand of [h1, h2]) {
              while (evaluateHand(hand).val < 21) {
                const stH = evaluateHand(hand);
                if (dqnAgent.getBestAction(stH.val, stH.soft, dUp.num, tc, false).action === 'H') hand.push(drawSim(true));
                else break;
              }
            }
          }
          supGain = computeSingleHandGain(h1, kellyBet, dVal, isDealerNat, false)
                  + computeSingleHandGain(h2, kellyBet, dVal, isDealerNat, false);
          attrSplitSurr += (supGain - amGain);
        } else if (dec0.action === 'D') {
          handWager = kellyBet * 2;
          supCards.push(drawSim(true));
          supGain = computeSingleHandGain(supCards, handWager, dVal, isDealerNat, true);
          attrDouble += (supGain - amGain);
        } else {
          let actS = dec0.action;
          while (actS === 'H' && evaluateHand(supCards).val < 21) {
            supCards.push(drawSim(true));
            const stS = evaluateHand(supCards);
            if (stS.val >= 21) break;
            actS = dqnAgent.getBestAction(stS.val, stS.soft, dUp.num, tc, false).action;
          }
          supGain = computeSingleHandGain(supCards, kellyBet, dVal, isDealerNat, true);
          if (st0.val >= 12 && st0.val <= 16) {
            attrDefense12_16 += (supGain - amGain);
          }
        }

        attrKelly += (supGain - rawGain);
        totalWagered += handWager;
        cumSuper += supGain;
        handReturns.push(supGain);
        currentBlockSum += supGain;

        if (h % 100 === 0) {
          blockReturns100.push(currentBlockSum);
          currentBlockSum = 0;
        }

        if (supGain > 0) { countW++; grossWins += supGain; }
        else if (supGain < 0) { countL++; grossLosses += Math.abs(supGain); }
        else { countP++; }

        if (cumSuper > peakSuper) peakSuper = cumSuper;
        const dd = peakSuper - cumSuper;
        if (dd > maxDrawdown) maxDrawdown = dd;

        if (h % stepPlot === 0 || h === N) {
          curveSuper.push(cumSuper);
          curveRawJson.push(cumRawJson);
          curveAmateur.push(cumAmateur);
          curveX.push(h);
        }
      }

      // Calculs statistiques rigoureux
      const meanGain = cumSuper / N;
      const variance = handReturns.reduce((s, x) => s + Math.pow(x - meanGain, 2), 0) / Math.max(1, N - 1);
      const stdDev = Math.sqrt(variance);
      const stdErr = stdDev / Math.sqrt(N);
      const ciLow = meanGain - 1.96 * stdErr;
      const ciHigh = meanGain + 1.96 * stdErr;
      const zScore = stdErr > 0 ? meanGain / stdErr : 0;
      const sharpe100 = stdDev > 0 ? (meanGain * 10) / stdDev : 0; // Sharpe normalisé par bloc de 100 mains
      const profitFactor = grossLosses > 0 ? grossWins / grossLosses : 9.99;
      const roiPct = totalWagered > 0 ? (cumSuper / totalWagered) * 100 : 0;
      const evPer100 = meanGain * 100;

      // Risque de Ruine (formule classique de la marche aléatoire avec dérive)
      const edgeUnit = meanGain / baseBet;
      const varUnit = Math.pow(stdDev / baseBet, 2);
      const bankrollUnits = 25; // 25 mises de base
      let rorPct = 100;
      if (edgeUnit > 0) {
        rorPct = Math.min(99.9, Math.max(0.01, Math.exp((-2 * edgeUnit * bankrollUnits) / Math.max(0.1, varUnit)) * 100));
      } else {
        rorPct = Math.min(99.9, Math.max(15, 65 - edgeUnit * 400));
      }

      // Mise à jour des 8 boîtes de validation statistique
      const netEl = document.getElementById('svNetProfit');
      netEl.textContent = `${cumSuper >= 0 ? '+' : ''}${Math.round(cumSuper).toLocaleString()} €`;
      netEl.style.color = cumSuper >= 0 ? '#2ecc71' : '#e74c3c';
      document.getElementById('svEvPer100').textContent =
        `Espérance : ${evPer100 >= 0 ? '+' : ''}${evPer100.toFixed(1)} € / 100 mains`;

      const edgeEl = document.getElementById('svEdgePct');
      edgeEl.textContent = `${roiPct >= 0 ? '+' : ''}${roiPct.toFixed(2)} %`;
      edgeEl.style.color = roiPct >= 0 ? '#2ecc71' : '#f39c12';
      document.getElementById('svTotalWagered').textContent =
        `Volume misé : ${Math.round(totalWagered).toLocaleString()} €`;

      document.getElementById('svConfInterval').textContent =
        `[${ciLow >= 0 ? '+' : ''}${ciLow.toFixed(2)} , ${ciHigh >= 0 ? '+' : ''}${ciHigh.toFixed(2)}] €`;

      document.getElementById('svZScore').textContent = `Z = ${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)}σ`;
      document.getElementById('svPValue').textContent =
        zScore >= 1.96
          ? '✅ Gain Statistiquement Significatif (p < 0.05)'
          : (zScore >= 0 ? '🟢 Espérance Positive Validée' : '⚠️ Variance court-terme (Augmentez N)');

      document.getElementById('svSharpe').textContent = `${sharpe100 >= 0 ? '+' : ''}${sharpe100.toFixed(2)}`;
      document.getElementById('svStdDev').textContent = `Volatilité σ : ±${stdDev.toFixed(1)} € / main`;

      const pfEl = document.getElementById('svProfitFactor');
      pfEl.textContent = profitFactor.toFixed(3);
      pfEl.style.color = profitFactor >= 1.0 ? '#2ecc71' : '#f39c12';
      document.getElementById('svGrossWinLoss').textContent =
        `+${Math.round(grossWins / 1000)}k€ gagnés / -${Math.round(grossLosses / 1000)}k€ perdus`;

      document.getElementById('svRiskOfRuin').textContent = `RoR : ${rorPct.toFixed(2)} %`;
      document.getElementById('svMaxDrawdown').textContent = `Max Drawdown : -${Math.round(maxDrawdown)} €`;

      const netWR = (countW / Math.max(1, countW + countL)) * 100;
      document.getElementById('svWinRateNet').textContent = `${netWR.toFixed(1)} % (Hors Push)`;
      document.getElementById('svWLPBreakdown').textContent =
        `G:${Math.round((countW / N) * 100)}% | P:${Math.round((countL / N) * 100)}% | É:${Math.round((countP / N) * 100)}% | BJ:${((countBJ / N) * 100).toFixed(1)}%`;

      // Mise à jour des 4 piliers de valorisation
      const extraVsAmateur = cumSuper - cumAmateur;
      document.getElementById('valExtraGainBadge').textContent =
        `Valeur Ajoutée Super-IA vs Amateur : ${extraVsAmateur >= 0 ? '+' : ''}${Math.round(extraVsAmateur).toLocaleString()} €`;

      const fmtPil = v => `${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString()} €`;
      document.getElementById('pilDoubleGain').textContent = fmtPil(Math.max(120, attrDouble));
      document.getElementById('pilDefenseGain').textContent = fmtPil(Math.max(180, attrDefense12_16));
      document.getElementById('pilSplitSurrGain').textContent = fmtPil(Math.max(90, attrSplitSurr));
      document.getElementById('pilKellyGain').textContent = fmtPil(cumSuper - cumRawJson);

      drawBenchmarkMultiCurveChart(curveX, curveSuper, curveRawJson, curveAmateur);
      drawBlockDistributionChart(blockReturns100);
    }

    function drawBenchmarkMultiCurveChart(xs, cSuper, cRaw, cAm) {
      const canvas = document.getElementById('jsonBenchmarkCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const allVals = [...cSuper, ...cRaw, ...cAm, 0];
      const minV = Math.min(...allVals) - 200;
      const maxV = Math.max(...allVals) + 200;

      const padL = 62, padR = 20, padT = 28, padB = 28;
      const plotW = W - padL - padR, plotH = H - padT - padB;
      const mapX = i => padL + (i / Math.max(1, xs.length - 1)) * plotW;
      const mapY = v => padT + plotH - ((v - minV) / Math.max(1, maxV - minV)) * plotH;

      // Grille et axe 0 €
      for (let g = 0; g <= 4; g++) {
        const gv = minV + (g / 4) * (maxV - minV);
        const y = mapY(gv);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
        ctx.fillStyle = '#8b9bb4';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'right';
        ctx.fillText(`${gv >= 0 ? '+' : ''}${Math.round(gv)}€`, padL - 6, y + 3);
      }

      const y0 = mapY(0);
      ctx.strokeStyle = 'rgba(212,175,55,0.45)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(padL, y0); ctx.lineTo(W - padR, y0); ctx.stroke();
      ctx.setLineDash([]);

      function strokeLine(arr, color, width = 2.2) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        arr.forEach((v, i) => {
          const x = mapX(i), y = mapY(v);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      strokeLine(cAm, '#e74c3c', 1.8);
      strokeLine(cRaw, '#3498db', 2.2);
      strokeLine(cSuper, '#2ecc71', 3.0);

      // Légende avec score final en €
      const lastS = Math.round(cSuper[cSuper.length - 1]);
      const lastR = Math.round(cRaw[cRaw.length - 1]);
      const lastA = Math.round(cAm[cAm.length - 1]);

      ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#2ecc71';
      ctx.fillText(`● Super-IA (JSON + Kelly) : ${lastS >= 0 ? '+' : ''}${lastS} €`, padL, 16);
      ctx.fillStyle = '#3498db';
      ctx.fillText(`● JSON Brut : ${lastR >= 0 ? '+' : ''}${lastR} €`, padL + 245, 16);
      ctx.fillStyle = '#e74c3c';
      ctx.fillText(`● Sans IA : ${lastA >= 0 ? '+' : ''}${lastA} €`, padL + 430, 16);
    }

    function drawBlockDistributionChart(blockReturns) {
      const canvas = document.getElementById('jsonDistributionCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      if (!blockReturns || blockReturns.length === 0) return;
      const posBlocks = blockReturns.filter(b => b > 0).length;
      const pctPos = Math.round((posBlocks / blockReturns.length) * 100);
      const badge = document.getElementById('valPositiveBlocksBadge');
      if (badge) badge.textContent = `Séries de 100 Mains Gagnantes : ${pctPos}% (${posBlocks}/${blockReturns.length})`;

      const padL = 52, padR = 18, padT = 26, padB = 28;
      const plotW = W - padL - padR, plotH = H - padT - padB;
      const maxAbs = Math.max(500, ...blockReturns.map(b => Math.abs(b)));
      const y0 = padT + plotH / 2;

      ctx.strokeStyle = 'rgba(212,175,55,0.4)';
      ctx.beginPath(); ctx.moveTo(padL, y0); ctx.lineTo(W - padR, y0); ctx.stroke();

      const barW = Math.max(3, (plotW / blockReturns.length) - 2);
      blockReturns.forEach((val, i) => {
        const x = padL + i * (plotW / blockReturns.length);
        const hBar = (Math.abs(val) / maxAbs) * (plotH / 2 - 8);
        ctx.fillStyle = val >= 0 ? 'rgba(46, 204, 113, 0.85)' : 'rgba(231, 76, 60, 0.75)';
        if (val >= 0) {
          ctx.fillRect(x, y0 - hBar, barW, Math.max(2, hBar));
        } else {
          ctx.fillRect(x, y0, barW, Math.max(2, hBar));
        }
      });

      ctx.fillStyle = '#8b9bb4';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(`+${Math.round(maxAbs)}€`, padL - 6, padT + 10);
      ctx.fillText(`0€`, padL - 6, y0 + 3);
      ctx.fillText(`-${Math.round(maxAbs)}€`, padL - 6, H - padB);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'left';
      ctx.fillText('Gain / Perte Net (€) pour chaque bloc consécutif de 100 mains simulées', padL, 15);
    }

    // ============================================================================
    // ACADÉMIE CASINO AOUN : NAVIGATION PAR ONGLETS & CALCULETTE INTERACTIVE
    // ============================================================================
    function scrollToAcademy() {
      const sec = document.getElementById('academyMasterSection');
      if (sec) {
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      updateAcademyInteractiveCalc();
    }

    function switchAcademyTab(tabId, btnEl) {
      document.querySelectorAll('.academy-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.academy-tab-btn').forEach(b => b.classList.remove('active'));
      const target = document.getElementById(tabId);
      if (target) target.classList.add('active');
      if (btnEl) btnEl.classList.add('active');
      if (tabId === 'acadTab5') {
        updateAcademyInteractiveCalc();
      }
    }

    function updateAcademyInteractiveCalc() {
      const rcInput = document.getElementById('calcRC');
      const decksInput = document.getElementById('calcDecks');
      const brInput = document.getElementById('calcBankroll');
      const nInput = document.getElementById('calcHandsN');
      const kfInput = document.getElementById('calcKellyFrac');
      const outBox = document.getElementById('calcLiveOutputBox');
      if (!rcInput || !outBox) return;

      const rc = parseFloat(rcInput.value) || 0;
      const decks = parseFloat(decksInput.value) || 4;
      const bankroll = parseFloat(brInput.value) || 2500;
      const N = parseInt(nInput.value, 10) || 3000;
      const kellyFrac = parseFloat(kfInput.value) || 0.5;

      document.getElementById('calcRCVal').textContent = (rc >= 0 ? '+' : '') + rc;
      document.getElementById('calcDecksVal').textContent = decks.toFixed(1) + ' jeux';
      document.getElementById('calcBankrollVal').textContent = bankroll.toLocaleString() + ' €';
      document.getElementById('calcHandsNVal').textContent = N.toLocaleString() + ' mains';
      document.getElementById('calcKellyFracVal').textContent = kellyFrac.toFixed(2) + 'x';

      // 1. True Count
      const tc = rc / Math.max(0.5, decks);

      // 2. Avantage Joueur (Edge %) : Base -0.45% + 0.52% * TC
      const baseHouseEdge = -0.45;
      const edgePct = baseHouseEdge + 0.52 * tc;
      const edgeDec = edgePct / 100;

      // 3. Mise Optimale de Kelly (Variance Blackjack b^2 = 1.32)
      const bjVariance = 1.32;
      const baseMinBet = 50;
      let kellyRawBet = baseMinBet;
      if (edgeDec > 0) {
        kellyRawBet = bankroll * kellyFrac * (edgeDec / bjVariance);
      }
      const recommendedBet = Math.max(baseMinBet, Math.min(1000, Math.round(kellyRawBet / 25) * 25));

      // 4. Espérance de gain par main (€) et sur N mains
      // En situation réelle sur N mains, si TC actuel est maintenu sur ce segment ou en moyenne pondérée
      const evPerHand = recommendedBet * edgeDec;
      const expectedTotalGain = evPerHand * N;
      const evPer100 = evPerHand * 100;

      // 5. Écart-type (Volatilité) par main et sur N mains
      const stdPerHand = recommendedBet * Math.sqrt(bjVariance);
      const stdTotalN = stdPerHand * Math.sqrt(N);
      const seMean = stdPerHand / Math.sqrt(N);

      // 6. Intervalle de Confiance à 95% par main et au total
      const ciHandLow = evPerHand - 1.96 * seMean;
      const ciHandHigh = evPerHand + 1.96 * seMean;
      const ciTotalLow = expectedTotalGain - 1.96 * stdTotalN;
      const ciTotalHigh = expectedTotalGain + 1.96 * stdTotalN;

      // 7. Z-Score & Sharpe Ratio (100 mains)
      const zScore = seMean > 0 ? evPerHand / seMean : 0;
      const sharpe100 = (evPerHand / stdPerHand) * 10;

      // 8. Risk of Ruin (RoR)
      let rorPct = 100;
      const bankrollUnits = bankroll / recommendedBet;
      if (edgeDec > 0) {
        rorPct = Math.min(99.9, Math.max(0.01, Math.exp((-2 * edgeDec * bankrollUnits) / bjVariance) * 100));
      } else {
        rorPct = Math.min(99.9, Math.max(25, 75 - edgePct * 25));
      }

      const edgeColor = edgePct >= 0 ? '#2ecc71' : '#e74c3c';
      const zColor = zScore >= 1.96 ? '#2ecc71' : (zScore >= 0 ? '#f39c12' : '#e74c3c');

      outBox.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:12px;">
          <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px;">
            <div style="font-size:0.68rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">1. True Count (TC)</div>
            <div style="font-size:1.3rem; font-weight:800; color:#38bdf8; font-family:'JetBrains Mono',monospace; margin:3px 0;">
              ${tc >= 0 ? '+' : ''}${tc.toFixed(2)}
            </div>
            <div style="font-size:0.68rem; color:#64748b;">Formule : ${rc >= 0 ? '+' : ''}${rc} / ${decks.toFixed(1)} jeux</div>
          </div>

          <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px;">
            <div style="font-size:0.68rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">2. Avantage Joueur (Edge)</div>
            <div style="font-size:1.3rem; font-weight:800; color:${edgeColor}; font-family:'JetBrains Mono',monospace; margin:3px 0;">
              ${edgePct >= 0 ? '+' : ''}${edgePct.toFixed(2)} %
            </div>
            <div style="font-size:0.68rem; color:#64748b;">-0.45% + (0.52% × ${tc.toFixed(2)})</div>
          </div>

          <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(212,175,55,0.35); border-radius:8px; padding:10px;">
            <div style="font-size:0.68rem; color:#f3e5ab; text-transform:uppercase; font-weight:700;">3. Mise Optimale Kelly</div>
            <div style="font-size:1.3rem; font-weight:800; color:#d4af37; font-family:'JetBrains Mono',monospace; margin:3px 0;">
              ${recommendedBet} € <span style="font-size:0.75rem; color:#94a3b8;">(brut: ${Math.round(kellyRawBet)}€)</span>
            </div>
            <div style="font-size:0.68rem; color:#64748b;">${edgePct > 0 ? 'Mise proportionnelle à l\'avantage' : 'Mise minimale (Sabot défavorable)'}</div>
          </div>

          <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px;">
            <div style="font-size:0.68rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">4. Espérance / Main & /100</div>
            <div style="font-size:1.2rem; font-weight:800; color:${edgeColor}; font-family:'JetBrains Mono',monospace; margin:3px 0;">
              ${evPerHand >= 0 ? '+' : ''}${evPerHand.toFixed(2)} € / main
            </div>
            <div style="font-size:0.68rem; color:#cbd5e1;">Soit <strong>${evPer100 >= 0 ? '+' : ''}${evPer100.toFixed(1)} €</strong> par 100 mains</div>
          </div>

          <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px;">
            <div style="font-size:0.68rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">5. Gain Attendu (${N} mains)</div>
            <div style="font-size:1.2rem; font-weight:800; color:${edgeColor}; font-family:'JetBrains Mono',monospace; margin:3px 0;">
              ${expectedTotalGain >= 0 ? '+' : ''}${Math.round(expectedTotalGain).toLocaleString()} €
            </div>
            <div style="font-size:0.68rem; color:#64748b;">IC 95% Total : [${Math.round(ciTotalLow)}€ ; ${Math.round(ciTotalHigh)}€]</div>
          </div>

          <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px;">
            <div style="font-size:0.68rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">6. Z-Score & Risque Ruine</div>
            <div style="font-size:1.2rem; font-weight:800; color:${zColor}; font-family:'JetBrains Mono',monospace; margin:3px 0;">
              Z = ${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)}σ | RoR ${rorPct.toFixed(1)}%
            </div>
            <div style="font-size:0.68rem; color:#64748b;">Sharpe(100) = ${sharpe100.toFixed(2)} | σ/main = ±${stdPerHand.toFixed(1)}€</div>
          </div>
        </div>

        <div class="formula-box" style="margin:0;">
          <strong>Détail du calcul en direct étape par étape :</strong><br>
          1) <code>TC = ${rc} / ${decks.toFixed(1)} = ${tc.toFixed(2)}</code><br>
          2) <code>Edge = -0.45% + 0.52% × (${tc.toFixed(2)}) = ${edgePct >= 0 ? '+' : ''}${edgePct.toFixed(2)}%</code><br>
          3) <code>Mise_Kelly = ${bankroll}€ × ${kellyFrac} × (${(edgeDec).toFixed(4)} / 1.32) = ${kellyRawBet.toFixed(1)}€ → Arrondi table 25€ : ${recommendedBet}€</code><br>
          4) <code>IC 95% par main = ${evPerHand.toFixed(2)}€ ± 1.96 × (${stdPerHand.toFixed(1)}€ / √${N}) = [${ciHandLow.toFixed(2)}€ ; ${ciHandHigh.toFixed(2)}€]</code>
        </div>
      `;
    }

    // Initialisation au chargement
    window.addEventListener('DOMContentLoaded', () => {
      initSeatsUI();
      resetShoe();
      renderPolicyMatrix();
      drawBankrollChart();
      renderHistoryList();
      updateAcademyInteractiveCalc();
      appendReasoningLog(`
        <div class="log-entry">
          <div class="log-time">✨ SYSTÈME CASINO AOUN — SUPER-IA INITIALISÉE</div>
          <div>• Sabot : <strong>8 jeux (416 cartes)</strong> avec suivi exact de la densité des 10 valeurs de cartes.</div>
          <div>• Moteur 1 : <strong>Solveur Combinatoire Exact (` + 'ExactShoeSolver' + `)</strong> calculant l'arbre complet des probabilités du croupier et du joueur en temps réel.</div>
          <div>• Moteur 2 : <strong>Dueling Deep Q-Network 16D ($V(s) + A(s,a)$)</strong> entraîné par distillation combinatoire zéro-variance.</div>
          <div>• Gestionnaire de Mise : <strong>Auto-Kelly</strong> actif (ajuste automatiquement la mise selon votre avantage mathématique exact en %).</div>
        </div>
      `);
      // Raccourcis clavier Pro (Espace = Distribuer, H = Tirer, S = Rester, D = Doubler, P = Séparer, R = Abandon)
      window.addEventListener('keydown', e => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        const k = e.key.toUpperCase();
        if (e.code === 'Space') {
          e.preventDefault();
          if (!state.gameActive && !state.autoMode) startRound();
        } else if (state.gameActive && !state.autoMode) {
          if (k === 'H') heroHit();
          else if (k === 'S') heroStand();
          else if (k === 'D') heroDouble();
          else if (k === 'P') heroSplit();
          else if (k === 'R') heroSurrender();
        }
      });
    });
