#!/bin/bash
set -e
cd "$(dirname "$0")"
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy

echo "=== 1/2 上传数据到云端 KV ==="
npx wrangler@4 kv key put snapshot \
  --namespace-id=0997663fce9c48e3af47b59c941a4be6 \
  --path=public/snapshot.json \
  --remote

echo ""
echo "=== 2/2 部署网站 ==="
npx wrangler@4 deploy

echo ""
echo "✅ 完成！请刷新 https://hk-ipo-tracker.hk-ipo-tracker.workers.dev/"
read -r -p "按回车键关闭窗口…"
