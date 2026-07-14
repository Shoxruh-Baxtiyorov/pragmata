#!/usr/bin/env bash
# Управляемая деградация сэмплов: ночь / расфокус / шум / старая камера.
# Одинаковый исходник → честное сравнение просадки детекции по условиям.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=data/samples/people.mp4
OUT=data/samples/degraded
mkdir -p "$OUT"

[ -s "$SRC" ] || { echo "нет $SRC — сперва ./scripts/dev_stand.sh"; exit 1; }

run() { # name, filters, extra encode args...
  local name="$1"; shift
  local vf="$1"; shift
  [ -s "$OUT/$name.mp4" ] && { echo "skip $name (есть)"; return; }
  ffmpeg -hide_banner -loglevel error -y -i "$SRC" -vf "$vf" -an "$@" "$OUT/$name.mp4"
  echo "OK $name"
}

# ночь: темно, выцвело, сенсорный шум
run night "eq=brightness=-0.27:saturation=0.5:gamma=0.75,noise=alls=12:allf=t" \
  -c:v libx264 -preset veryfast -crf 23

# расфокус (грязный купол/сбитый объектив)
run blur "gblur=sigma=2.5" -c:v libx264 -preset veryfast -crf 23

# сильный сенсорный шум (дешёвая матрица, сумерки)
run noise "noise=alls=25:allf=t+u" -c:v libx264 -preset veryfast -crf 23

# «старая камера»: 352p, 8 fps, задушенный битрейт
run oldcam "scale=352:-2,fps=8,scale=768:-2" -c:v libx264 -preset veryfast -crf 38

ls -la "$OUT"
