ImageFlux Live Streamingを試用するためのデモサイトのソース群です。

ホストしているWebページは[こちら](https://7n8mmfno.user.webaccel.jp/)。

# 構成
## terraform
基盤。AppRun/さくらのウェブアクセラレータ/オブジェクトストレージ
## web
SPAのソース。Next.jsで構築。直下に「.env.local」ファイルを置き、NEXT_PUBLIC_API_BASE_URL=APIサーバの宛先とすることでAPI呼び出し先を変更可能。
## docker
APIサーバのDockerファイルとGo言語ソース群。Dockerイメージはcreatio313-live-streaming.sakuracr.jp/demo-site:v0で公開しているため、変更が不要な場合はそのままPull可能。

# 参考記事
https://zenn.dev/sakura_internet/articles/972f7e77b04ccb
