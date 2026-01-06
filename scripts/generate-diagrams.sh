#!/bin/bash

# Script para gerar diagramas Mermaid em alta qualidade
# Uso: ./scripts/generate-diagrams.sh [qualidade]
# Qualidade: low (padrão), medium, high, ultra

set -e

QUALITY="${1:-high}"
INPUT_FILE="docs/system-architecture.md"
OUTPUT_DIR="docs"

# Configurações por qualidade
case $QUALITY in
  low)
    WIDTH=1200
    HEIGHT=900
    SCALE=1
    ;;
  medium)
    WIDTH=2000
    HEIGHT=1500
    SCALE=1.5
    ;;
  high)
    WIDTH=3000
    HEIGHT=2000
    SCALE=2
    ;;
  ultra)
    WIDTH=4000
    HEIGHT=3000
    SCALE=3
    ;;
  *)
    echo "Qualidade inválida: $QUALITY"
    echo "Use: low, medium, high, ultra"
    exit 1
    ;;
esac

echo "🎨 Gerando diagramas Mermaid em qualidade: $QUALITY"
echo "   Resolução: ${WIDTH}x${HEIGHT}"
echo "   Escala: ${SCALE}x"
echo ""

# Gerar todos os diagramas do arquivo
npx mmdc \
  -i "$INPUT_FILE" \
  -o "$OUTPUT_DIR/system-architecture-${QUALITY}.png" \
  -w $WIDTH \
  -H $HEIGHT \
  -s $SCALE \
  -b transparent

echo ""
echo "✅ Diagramas gerados com sucesso!"
echo "   Arquivo: $OUTPUT_DIR/system-architecture-${QUALITY}.png"
echo ""
echo "📊 Tamanho do arquivo:"
ls -lh "$OUTPUT_DIR/system-architecture-${QUALITY}"*.png 2>/dev/null | awk '{print "   " $5 " - " $9}'

