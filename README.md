# Word Master

英単語の意味を **0.5秒以内に思い出せる** ようにするための単語帳アプリ。
仕様は [docs/spec.md](docs/spec.md) を参照。

## 開発

```sh
pnpm install
pnpm dev         # 開発サーバー
pnpm test        # ユニットテスト（出題エンジン・集計・ストレージ・データ整合性）
```

パッケージ管理は pnpm（lockfile は `pnpm-lock.yaml`）。依存のバージョンは完全固定で、
`pnpm add` で追加したパッケージも `pnpm-workspace.yaml` の `saveExact: true` により固定で記録される。

## ビルドとデプロイ（さくらのレンタルサーバー）

```sh
pnpm build
```

`dist/` の中身（`index.html`・`assets/`）をそのままFTPでアップロードするだけで動く。
相対パス（`base: './'`）＋ハッシュルーティングのため、どのディレクトリに置いてもよく、
`.htaccess` などのサーバー設定は不要。

## 単語データの更新

- 収録単語: [src/data/words.json](src/data/words.json)
- テスト用の誤答選択肢: [src/data/quiz.json](src/data/quiz.json)

形式は [docs/spec.md](docs/spec.md) §5 を参照。編集後は `pnpm test` で
整合性チェック（ID一意・参照整合・誤答選択肢の重複など）が走る。
