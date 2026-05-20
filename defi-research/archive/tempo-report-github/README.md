# Tempo 项目调研（在线版）

本仓库用于 **GitHub Pages**：朋友只需打开网页链接即可阅读完整排版报告，**无需下载 `.html` 文件**，浏览器里就是正常网站。

## 在线地址（启用 Pages 后）

`https://<你的 GitHub 用户名>.github.io/<仓库名>/`

例如仓库名为 `tempo-research-report` 时：

`https://你的用户名.github.io/tempo-research-report/`

---

## 第一次发布到 GitHub

### 1. 在 GitHub 新建空仓库

网页上 New repository → 任意仓库名（建议 `tempo-research-report`）→ **不要**勾选 “Add a README”。

### 2. 在本机推代码（在 `tempo-report-github` 目录执行）

```bash
cd /Users/roy/Downloads/tempo-report-github
git init
git add .
git commit -m "Add Tempo research report for GitHub Pages"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

把 `<你的用户名>`、`<仓库名>` 换成你的实际值。

### 3. 打开 GitHub Pages

仓库 **Settings → Pages**：

- **Build and deployment → Source**：选 **Deploy from a branch**
- **Branch**：`main`，文件夹 **`/ (root)`**
- 保存后等待 1～2 分钟，用上面的 `https://用户名.github.io/仓库名/` 访问

> 已包含 `.nojekyll`，避免 Jekyll 处理静态文件出问题。

---

## 更新报告内容

在本地改好 `index.html` 或替换背景图、字标后：

```bash
cd /Users/roy/Downloads/tempo-report-github
git add .
git commit -m "Update report"
git push
```

---

## 仓库里有什么

| 文件 | 说明 |
|------|------|
| `index.html` | 站点首页（GitHub Pages 默认入口，地址里不出现 `.html`） |
| `tempo-report-bg.png` | 背景图 |
| `tempo-wordmark.png` | Tempo 字标 |

发给朋友：**只发 Pages 的 https 链接即可**。
