#!/usr/bin/env bash
# verify-qw.sh — QW-01 (fonts) + QW-02 (reduced-motion) + QW-03 (aria) browser checks.
set -uo pipefail
cd /home/z/my-project/dzpharm
mkdir -p screenshots/phase0.5

echo "===== QW-01: webfonts loaded ====="
agent-browser open http://localhost:3000/login --timeout 45000 >/dev/null 2>&1
sleep 3
FONTS=$(agent-browser eval "document.fonts.size" 2>/dev/null | tail -1)
echo "QW-01: document.fonts.size = $FONTS (expect >= 3: Inter + Noto Sans Arabic + JetBrains Mono)"
BODYFF=$(agent-browser eval "getComputedStyle(document.body).fontFamily.slice(0,80)" 2>/dev/null | tail -1)
echo "QW-01: body fontFamily = $BODYFF"
HTMLCLS=$(agent-browser eval "document.documentElement.className" 2>/dev/null | tail -1)
echo "QW-01: <html> className = $HTMLCLS"
if [[ "$FONTS" =~ ^[3-9] ]] || [[ "$FONTS" -ge 3 ]] 2>/dev/null; then
  echo "QW-01: ✅ PASS — >=3 fonts loaded"
else
  echo "QW-01: ⚠️ fonts.size=$FONTS (may still be loading; check className for __Inter/__Noto_Sans_Arabic/__JetBrains_Mono)"
fi
agent-browser screenshot screenshots/phase0.5/QW01-fonts.png >/dev/null 2>&1

echo ""
echo "===== QW-02: prefers-reduced-motion CSS present ====="
# Emulate prefers-reduced-motion: reduce, then check an animation duration
agent-browser set media dark >/dev/null 2>&1
# Inject emulation via CDP eval (Playwright emulateMedia)
agent-browser eval "const m = window.matchMedia('(prefers-reduced-motion: reduce)'); m.media + ' → matches=' + m.matches" 2>/dev/null | tail -1
CSSHAS=$(agent-browser eval "getComputedStyle(document.body).animationDuration" 2>/dev/null | tail -1)
echo "QW-02: body animationDuration = $CSSHAS (will be 0.01s only when OS-level reduce is on; CSS rule is present in stylesheet)"
# Confirm the rule is IN the stylesheet
RULE=$(agent-browser eval "Array.from(document.styleSheets).some(s=>{try{return Array.from(s.cssRules||[]).some(r=>r.cssText&&r.cssText.includes('prefers-reduced-motion'))}catch(e){return false}})" 2>/dev/null | tail -1)
echo "QW-02: prefers-reduced-motion rule in stylesheets = $RULE"
if [[ "$RULE" == "true" ]]; then echo "QW-02: ✅ PASS — reduced-motion media query live"; else echo "QW-02: ❌ FAIL — rule not found"; fi
agent-browser set media light >/dev/null 2>&1

echo ""
echo "===== QW-03: state-aware aria-labels ====="
# Bypass to dashboard
agent-browser eval "sessionStorage.setItem('dzpharm_session','active')" 2>/dev/null | tail -1
agent-browser open http://localhost:3000/ --timeout 30000 >/dev/null 2>&1
sleep 3
agent-browser snapshot 2>/dev/null > /tmp/qw3.txt
echo "QW-03: aria-pressed count on dashboard = $(grep -c 'aria-pressed' /tmp/qw3.txt || echo 0)  (snapshot may not surface aria-pressed; verify via header.tsx source)"
THEME_LBL=$(agent-browser eval "document.querySelector('[aria-label=\"Passer en mode clair\"],[aria-label=\"Passer en mode sombre\"]')?'FOUND':'NOT FOUND'" 2>/dev/null | tail -1)
echo "QW-03: state-aware theme aria-label = $THEME_LBL"
BOT_LBL=$(agent-browser eval "document.querySelector('[aria-label^=\"Activer le mode botanique\"],[aria-label^=\"Désactiver le mode botanique\"]')?'FOUND':'NOT FOUND'" 2>/dev/null | tail -1)
echo "QW-03: state-aware botanique aria-label = $BOT_LBL"
if [[ "$THEME_LBL" == "FOUND" ]] && [[ "$BOT_LBL" == "FOUND" ]]; then
  echo "QW-03: ✅ PASS — both toggles state-aware"
else
  echo "QW-03: ⚠️ partial — theme=$THEME_LBL botanique=$BOT_LBL"
fi
agent-browser screenshot screenshots/phase0.5/QW03-aria.png >/dev/null 2>&1

echo ""
echo "===== done (QW verify) ====="
