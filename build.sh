#!/bin/bash

# ビルドディレクトリを作成
mkdir -p dist

# 既存のdistディレクトリをクリア
rm -rf dist/*

# 必要なファイルをコピー
cp -r lib dist/
cp -r icons dist/
cp popup.html dist/

# srcディレクトリからJSファイルをコピー
cp src/background.js dist/
cp src/content.js dist/
cp src/manifest.json dist/

# 必要なディレクトリを作成
mkdir -p dist/api-clients
mkdir -p dist/utils
mkdir -p dist/settings
mkdir -p dist/translation
mkdir -p dist/context-menu
mkdir -p dist/ui

# 各モジュールをコピー
cp src/api-clients/*.js dist/api-clients/
cp src/utils/*.js dist/utils/
cp src/settings/*.js dist/settings/
cp src/translation/*.js dist/translation/
cp src/context-menu/*.js dist/context-menu/
cp src/ui/*.js dist/ui/

echo "ビルド完了！"
echo "拡張機能は dist ディレクトリにあります。"