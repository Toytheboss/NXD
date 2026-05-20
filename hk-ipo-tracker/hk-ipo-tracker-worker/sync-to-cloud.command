#!/bin/bash
set -e
cd "$(dirname "$0")"
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy

NS=0997663fce9c48e3af47b59c941a4be6
BACKUP_DIR="kv-backups"
mkdir -p "$BACKUP_DIR"

echo "=== 0/3 备份云端 KV（覆盖前）==="
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/snapshot-remote-$STAMP.json"
if npx wrangler@4 kv key get snapshot \
  --namespace-id="$NS" \
  --remote 2>/dev/null > "$BACKUP_FILE"; then
  echo "已备份到 $BACKUP_FILE"
else
  echo "（云端尚无 snapshot 或读取失败，跳过备份）"
fi

echo ""
echo "=== 1/3 上传数据到云端 KV ==="
npx wrangler@4 kv key put snapshot \
  --namespace-id="$NS" \
  --path=public/snapshot.json \
  --remote

echo ""
echo "=== 2/3 部署网站 ==="
npx wrangler@4 deploy

echo ""
echo "✅ 完成！请刷新 https://hk-ipo-tracker.hk-ipo-tracker.workers.dev/"
read -r -p "按回车键关闭窗口…"
