# Geo Art 🎨

位置情報とビジュアルデータを融合させたWebアプリケーションです。

## 機能

- 📍 **Geolocation API**: ユーザーの現在地を自動取得
- 🗺️ **Leaflet**: インタラクティブな地図表示
- 🏘️ **OpenStreetMap Nominatim**: 座標から住所へのジオコーディング
- 🏪 **Overpass API**: 周辺施設の検索と表示
- 🌤️ **Open-Meteo API**: リアルタイム天気データ取得

## 使い方

1. アプリを開く
2. 位置情報の許可を与える
3. 現在地周辺の情報が自動的に表示されます
4. 🔄 ボタンで情報を更新
5. 📋 ボタンで情報パネルの表示/非表示を切り替え

## 技術スタック

- **HTML5 / CSS3 / JavaScript**
- **Leaflet**: マップ描画
- **OpenStreetMap**: 地図タイル
- **Nominatim API**: ジオコーディング（無料・APIキー不要）
- **Overpass API**: POI検索（無料・APIキー不要）
- **Open-Meteo API**: 天気データ（無料・APIキー不要）

## APIについて

すべてのAPIは**完全無料**で使用できます。APIキーも不要です。

| API | 用途 | 料金 | APIキー |
|-----|------|------|----------|
| Nominatim | ジオコーディング | 無料 | 不要 |
| Overpass | POI検索 | 無料 | 不要 |
| Open-Meteo | 天気データ | 無料 | 不要 |

## ローカル開発

```bash
# HTTPサーバーを起動
python -m http.server 8000
# またはNode.jsの場合
npx http-server
```

ブラウザで `http://localhost:8000` にアクセスしてください。

## GitHub Pages でのデプロイ

このリポジトリはGitHub Pagesで自動的にホストされます。

## ライセンス

MIT License

## 今後の拡張予定

- [ ] p5.js を使ったジェネラティブアート化
- [ ] D3.js による高度なデータ可視化
- [ ] Three.js による3D表現
- [ ] ダークモード対応
- [ ] 多言語対応
- [ ] データのローカル保存（IndexedDB）
- [ ] 複数地点の比較機能
