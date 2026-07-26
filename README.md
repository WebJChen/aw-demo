# AusWine Demo

澳洲葡萄酒 / 酒庄目录演示站前端。支持本地联调、GitHub Pages 云部署（连接 Render + Aiven MySQL）。

## 线上地址

| 环境 | URL |
| --- | --- |
| gh-pages 演示 | https://webjchen.github.io/aw-demo/ |
| 发布分支 | 推 `main` → Actions 构建 → 发布到 `gh-pages` |

## 快速开始

```bash
npm install
npm run dev          # 自动 data:sync + 启动（DEV 强制走 /api）
npm run build
npm run lint
```

本地需启动 `auswine-backend`（`:8080`），Vite 代理 `/api`。

## 环境变量

| 变量 | 本地 | gh-pages 构建 | 说明 |
| --- | --- | --- | --- |
| `VITE_USE_API` | 开发环境强制 `true` | `true` | 走云 / 本地 API |
| `VITE_USE_LOCAL_JSON_FALLBACK` | `false` | `false` | 已关闭静态兜底 |
| `VITE_API_BASE_URL` | `/api` | GitHub 变量 `AW_API_BASE_URL` | **必须含 `/api` 后缀** |
| `VITE_APP_BASE` | `/aw-demo/` | `/aw-demo/` | gh-pages 子路径 |

GitHub Variables 示例：`AW_API_BASE_URL=https://awb.onrender.com/api`

## 登录与购物车

- gh-pages 跨域：JWT 存 `localStorage`，请求头 `token` + 后端 `X-Auth-Token` 续期。
- 登录后购物车、订单走 `/api/aw/cart`、`/api/aw/orders`。

## 数据维护

**源文件**：

- `src/data/item.json` — 酒庄（按州）
- `src/data/wine.json` — 酒款（按州）

改完后：

```bash
npm run data:sync
```

详见 **[DATA-MAINTENANCE.md](./DATA-MAINTENANCE.md)**。后端联调见 **[docs/BACKEND-INTEGRATION.md](./docs/BACKEND-INTEGRATION.md)**。

## 部署

推 `main` → [`.github/workflows/gh-pages.yml`](.github/workflows/gh-pages.yml)：`data:sync` → 校验 `AW_API_BASE_URL` → `build` → 发布。

## 近期功能要点（2026-07）

- gh-pages 连接 Render 云 API；自动规范化 API base 的 `/api` 后缀
- 列表 / 搜索加载动画；搜索「打开并定位」自动分页预加载
- 去掉搜索跳转的人为延迟
