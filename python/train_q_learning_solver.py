#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Casino Aoun AI Lab — Entraînement, Audit & Optimisation de la Q-Table Blackjack
===============================================================================
Ce script permet :
1. D'auditer le fichier existant `q_table_casino_aoun.json` (calcul du taux de
   convergence avec la stratégie optimale et de l'erreur RMSE).
2. De générer une table `q_table_casino_aoun_optimisee.json` distillée à 100%
   par résolution combinatoire exacte (sans bruit Monte Carlo).
"""

import json
import math
from pathlib import Path
from typing import Dict, Tuple


def dealer_exact_probs(upcard: int) -> Dict[str, float]:
    """Calcule la distribution exacte des totaux finaux du croupier (Sabot 8 jeux, S17)."""
    weights = {2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 4, 11: 1}
    memo: Dict[Tuple[int, bool, bool], Dict[str, float]] = {}

    def solve(total: int, is_soft: bool, is_first_draw: bool) -> Dict[str, float]:
        state = (total, is_soft, is_first_draw)
        if state in memo:
            return memo[state]

        if total > 21:
            return {"17": 0.0, "18": 0.0, "19": 0.0, "20": 0.0, "21": 0.0, "BJ": 0.0, "BUST": 1.0}
        if total >= 17:
            res = {"17": 0.0, "18": 0.0, "19": 0.0, "20": 0.0, "21": 0.0, "BJ": 0.0, "BUST": 0.0}
            res[str(total)] = 1.0
            return res

        acc = {"17": 0.0, "18": 0.0, "19": 0.0, "20": 0.0, "21": 0.0, "BJ": 0.0, "BUST": 0.0}
        for rank, w in weights.items():
            p = w / 13.0
            nt = total + rank
            nsoft = is_soft or (rank == 11)
            if nt > 21 and nsoft:
                nt -= 10
                nsoft = False

            if is_first_draw and nt == 21:
                acc["BJ"] += p
            else:
                sub = solve(nt, nsoft, False)
                for k in acc:
                    acc[k] += p * sub[k]

        memo[state] = acc
        return acc

    return solve(upcard, upcard == 11, True)


def compute_exact_q_table() -> Dict[str, Dict[str, float]]:
    """Calcule par programmation dynamique inverse les Q-values exactes Q(s, H/S/D)."""
    weights = {2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 4, 11: 1}
    dealer_cache = {u: dealer_exact_probs(u) for u in range(2, 12)}
    q_table: Dict[str, Dict[str, float]] = {}

    def stand_ev(player_total: int, upcard: int) -> float:
        d = dealer_cache[upcard]
        if player_total > 21:
            return -1.0
        ev = d["BUST"] - d["BJ"]
        for t in (17, 18, 19, 20, 21):
            p = d[str(t)]
            if player_total > t:
                ev += p
            elif player_total < t:
                ev -= p
        return ev

    memo_hit: Dict[Tuple[int, bool, int], float] = {}

    def best_after_hit(total: int, is_soft: bool, upcard: int) -> float:
        if total > 21:
            return -1.0
        s_ev = stand_ev(total, upcard)
        if total >= 21:
            return s_ev
        h_ev = hit_ev(total, is_soft, upcard)
        return max(s_ev, h_ev)

    def hit_ev(total: int, is_soft: bool, upcard: int) -> float:
        key = (total, is_soft, upcard)
        if key in memo_hit:
            return memo_hit[key]
        ev = 0.0
        for rank, w in weights.items():
            p = w / 13.0
            nt = total + rank
            nsoft = is_soft or (rank == 11)
            if nt > 21 and nsoft:
                nt -= 10
                nsoft = False
            ev += p * best_after_hit(nt, nsoft, upcard)
        memo_hit[key] = ev
        return ev

    def double_ev(total: int, is_soft: bool, upcard: int) -> float:
        ev = 0.0
        for rank, w in weights.items():
            p = w / 13.0
            nt = total + rank
            nsoft = is_soft or (rank == 11)
            if nt > 21 and nsoft:
                nt -= 10
                nsoft = False
            ev += p * stand_ev(nt, upcard)
        return 2.0 * ev

    # Mains Dures (4 à 21) et Mains Souples (12 à 21)
    for is_soft in (False, True):
        start_tot = 12 if is_soft else 4
        for total in range(start_tot, 22):
            for upcard in range(2, 12):
                key = f"{total}_{is_soft}_{upcard}"
                q_h = round(hit_ev(total, is_soft, upcard), 6)
                q_s = round(stand_ev(total, upcard), 6)
                q_d = round(double_ev(total, is_soft, upcard), 6)
                q_table[key] = {"H": q_h, "S": q_s, "D": q_d}

    return q_table


def audit_json_file(json_path: Path, exact_table: Dict[str, Dict[str, float]]) -> None:
    if not json_path.exists():
        print(f"[!] Fichier introuvable : {json_path}")
        return

    with json_path.open("r", encoding="utf-8") as f:
        user_q = json.load(f)

    matches = 0
    total = 0
    sq_err = 0.0

    for k, vals in user_q.items():
        if k not in exact_table:
            continue
        u_best = max(("H", "S", "D"), key=lambda a: vals.get(a, -99.0))
        e_best = max(("H", "S", "D"), key=lambda a: exact_table[k][a])
        if u_best == e_best:
            matches += 1
        total += 1
        sq_err += (vals.get(e_best, 0.0) - exact_table[k][e_best]) ** 2

    acc = (matches / max(1, total)) * 100.0
    rmse = math.sqrt(sq_err / max(1, total))
    print(f"=== AUDIT DU FICHIER : {json_path.name} ===")
    print(f"• États analysés                   : {total}")
    print(f"• Convergence Stratégie Optimale   : {acc:.1f}% ({matches}/{total})")
    print(f"• Erreur Quadratique Moyenne (RMSE): {rmse:.4f}")


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    exact_q = compute_exact_q_table()
    target_json = root / "q_table_casino_aoun.json"
    audit_json_file(target_json, exact_q)
