# HK IPO Tracker（港股打新统计）

本目录汇总港股 IPO 打新统计相关的代码、部署工程与分析文档。

## 目录

| 路径 | 说明 |
|------|------|
| `hk-ipo-tracker-worker/` | Cloudflare Workers 主项目（密码 + KV 在线编辑） |
| `hk-ipo-tracker.html` | 单文件静态版（本机打开用） |
| `docs/` | 2026 港股 IPO 数据分析与报告 |
| `archive/` | 历史 GitHub Pages / 分享用备份 |
| `notes/` | Cursor 对话恢复记录 |

## 线上地址

https://hk-ipo-tracker.hk-ipo-tracker.workers.dev

## 部署

```bash
cd hk-ipo-tracker-worker
# 或双击 sync-to-cloud.command
./sync-to-cloud.command
```

详见 `hk-ipo-tracker-worker/DEPLOY.txt`。

## 相关项目

Saturn / Tempo DeFi 调研见同级目录 `../defi-research/`。
