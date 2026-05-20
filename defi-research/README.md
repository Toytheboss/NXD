# DeFi Research（Saturn / Tempo）

本目录汇总 Saturn Strategies 与 Tempo 稳定币相关的调研报告、部署工程与原始资料。

## 目录

| 路径 | 说明 |
|------|------|
| `saturn-research-worker/` | Saturn 调研报告 Cloudflare Worker |
| `tempo-research-worker/` | Tempo 调研报告 Cloudflare Worker |
| `source-html/` | 本机原始 HTML（含 v2 草稿） |
| `docs/` | PDF / PPTX 与 Tempo 图片素材 |
| `archive/tempo-report-github/` | GitHub Pages 历史备份 |
| `notes/` | Cursor 对话恢复记录（Tempo 分析） |

## 线上地址

| 站点 | URL |
|------|-----|
| Saturn 调研报告 | https://saturn-strategies-research.hk-ipo-tracker.workers.dev |
| Tempo 调研报告 | https://tempo-research-report.hk-ipo-tracker.workers.dev |

## 部署

```bash
cd saturn-research-worker   # 或 tempo-research-worker
npx wrangler@4 deploy
```

更新页面：先改 `source-html/*.html` 或对应 worker 的 `public/index.html`，再 deploy。

## 相关项目

港股打新统计见同级目录 `../hk-ipo-tracker/`。
