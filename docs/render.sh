#!/usr/bin/env bash
# Merender setiap berkas .mmd di docs/diagrams menjadi PNG.
# Jalankan dengan: npm run docs
set -euo pipefail

cd "$(dirname "$0")/diagrams"

cat > .mermaid-config.json <<'JSON'
{
  "theme": "base",
  "themeVariables": {
    "fontFamily": "Helvetica, Arial, sans-serif",
    "primaryColor": "#ffffff",
    "primaryTextColor": "#10141c",
    "primaryBorderColor": "#5a6473",
    "lineColor": "#5a6473",
    "secondaryColor": "#f2f4f7",
    "tertiaryColor": "#e9edf3"
  },
  "flowchart": { "curve": "basis", "nodeSpacing": 45, "rankSpacing": 55 },
  "er": { "layoutDirection": "TB", "entityPadding": 14 }
}
JSON

for berkas in *.mmd; do
  keluaran="${berkas%.mmd}.png"
  echo "  ${berkas} -> ${keluaran}"
  npx --no-install mmdc \
    --input "$berkas" \
    --output "$keluaran" \
    --configFile .mermaid-config.json \
    --backgroundColor white \
    --scale 2.5 \
    --quiet
done

rm -f .mermaid-config.json
echo "Selesai. PNG tersimpan di docs/diagrams/"
