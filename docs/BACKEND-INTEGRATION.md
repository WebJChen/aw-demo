# AusWine 后端接入与规模化改造说明



> 版本：2026-07-27 · 适用项目：`auswine-demo` + `auswine-backend`

## 进度（2026-07 更新）

| 模块 | 状态 |
|------|------|
| 前端 API 层（`auswineApi.js`） | ✅ |
| gh-pages **云 API**（`AW_API_BASE_URL`） | ✅ |
| `catalogRepository` 双模式 | ✅ |
| `ItemGrid` / `WineryPreviewView` API 分页 + loading | ✅ |
| 搜索定位自动预加载分页 | ✅ |
| 跨域 JWT（`localStorage` + `token` 头） | ✅ |
| Auth / Cart / Order API | ✅ |
| `auswine-backend` Docker + Render | ✅ |



---



## 1. 目标



- 开发环境（`npm run dev`）：**无条件**走 `/api/aw/*`
- gh-pages（2026-07 起）：`VITE_USE_API=true` + GitHub 变量 `AW_API_BASE_URL`（须含 `/api`），**走云 API**
- `VITE_USE_LOCAL_JSON_FALLBACK=false`：不再依赖静态 fallback 读业务数据
- 全国数据量：按州加载、搜索分片、API 分页



## 2. 环境变量



### 前端（auswine-demo）



| 变量 | 开发联调 | gh-pages | 说明 |
|------|----------|----------|------|
| `VITE_USE_API` | DEV 强制 true | `true`（Actions 注入） | 请求云 / 本地 API |
| `VITE_API_BASE_URL` | `/api` | `AW_API_BASE_URL` 完整 URL | 必须 `https://.../api` |
| `VITE_USE_LOCAL_JSON_FALLBACK` | `false` | `false` | 已关闭 JSON 兜底 |
| `VITE_APP_BASE` | `/aw-demo/` | `/aw-demo/` | gh-pages 子路径 |



### 后端（auswine-backend）



| 变量 | 说明 |

|------|------|

| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | MySQL |

| `AW_JWT_SECRET` | JWT 密钥（生产必改） |

| `AW_IMPORT_ITEM_JSON_PATH` | 指向 `item.json` |

| `AW_IMPORT_WINE_JSON_PATH` | 指向 `wine.json` |

| `AW_CORS_ALLOWED_ORIGINS` | 前端 origin，如 `https://webjchen.github.io` |

## 3. gh-pages 云部署清单

1. Render 部署 `auswine-backend`，健康检查 `/api/common/ping`
2. GitHub 仓库 Variables：`AW_API_BASE_URL=https://<host>.onrender.com/api`
3. 后端 `AW_CORS_ALLOWED_ORIGINS` 包含 `https://webjchen.github.io`
4. 推 `main`，Actions 构建并发布 `gh-pages`

数据维护见 [../DATA-MAINTENANCE.md](../DATA-MAINTENANCE.md)。

## 4. 前端分层



```

Views → catalogRepository / cartService / orderService → auswineApi → backend

                      ↘ dataRepository（JSON fallback / split 分区）

```



## 5. API 契约



统一响应：`{ code: 1, msg, data }`；未登录：`code: 401`



### Catalog（公开）



```

GET /api/common/ping

GET /api/aw/nav

GET /api/aw/wines?state=&subNav=&q=&priceMin=&priceMax=&sort=&pageNum=&pageSize=

GET /api/aw/wines/{id}

GET /api/aw/wineries?state=&subNav=&pageNum=&pageSize=

GET /api/aw/wineries/{id}

GET /api/aw/wineries/{id}/wines?pageNum=&pageSize=

GET /api/aw/search?q=&type=wine|winery|item|all&pageNum=&pageSize=

```



### Auth



```

POST /api/auth/login       { username, password }

POST /api/auth/register    { username, password, displayName?, email? }

GET  /api/auth/session     （需 Cookie `aw_auth_token` 或 Header `token`）

POST /api/auth/logout

```



### Cart / Order（需登录）



```

GET  /api/aw/cart

PUT  /api/aw/cart          { items: [{ cartId, title, price, quantity, ... }] }

POST /api/aw/orders        { contactName, phone, email, address, payMethod, items[] }

GET  /api/aw/orders?pageNum=&pageSize=

GET  /api/aw/orders/{orderNo}

```



## 6. 数据流水线



```bash

cd auswine-demo

npm run data:sync

```



| 脚本 | 产出 |

|------|------|

| `split-data.mjs` | `split/nav.json`、按州 JSON；**>100KB 大州**另产出 `split/wine/{state}/{subNav}.json` + `shard-manifest.json` |

| `build-catalog-index.mjs` | `search-manifest.json`（v2）；大州搜索按 `search/{state}/{subNav}-wine.json` 分片 |

| `sync-fallback.mjs` | `fallback/` 下 nav + tasmania + 对应 search 分片 |



## 7. 规模化策略



### ItemGrid



- **JSON 模式**：默认加载当前州；全国筛选 lazy load 其余州

- **API 模式**：`fetchWineCatalogPage` 服务端分页，滚动加载下一页



### 搜索



- **JSON 模式**：按 `search-manifest.json` 加载各州分片

- **API 模式**：`/api/aw/search` 分页



### 购物车 / 订单



- **JSON 模式**：`localStorage` + `sessionStorage` mock

- **API 模式**：登录后购物车 PUT 同步；结算 POST 订单；订单列表/详情走 API



## 8. 本地开发



```bash

# 终端 1：后端

cd auswine-backend && mvn spring-boot:run



# 终端 2：前端（.env.development 中 VITE_USE_API=true）

cd auswine-demo && npm run dev

```



> 当前策略：`npm run dev` 强制 API 模式。**gh-pages 同样走云 API**（2026-07 起）。
> 登录后的头部展示优先使用 `displayName`，再回退到 `username`。


## 9. 常见联调问题


### gh-pages 显示「接口不存在」

通常是 `AW_API_BASE_URL` 少了 `/api` 后缀，请求到了 `https://host/aw/nav` 而非 `https://host/api/aw/nav`。前端 `normalizeApiBaseUrl()` 与 Actions workflow 会自动补 `/api`，变量仍建议写全。

### 重启后数据库手改 title 被覆盖

后端导入器现在只插入新增 catalog item，已有酒庄/酒款不再被 JSON 覆盖。
如果某个标题已经在之前重启时被覆盖掉，需要在数据库里重新改一次；之后重启不会再被覆盖。


### 八州酒庄列表「首府：」为空

原因通常是旧导入逻辑用 `wine.json` 中的空 `capital` 覆盖了 `item.json` 的首府。
后端已改为：新导入值为空时不覆盖已有首府。
前端也会用 nav 元信息补齐首府展示，避免页面出现空冒号。


### 酒庄页显示「暂无符合筛选的酒庄」

原因通常是酒庄页误拿到了 wine 子导航（如红酒、白葡萄酒），再用这些子导航去查 `/api/aw/wineries`，结果为空。
现在前端会请求 item 子导航；如果正在运行的后端还没升级，前端会用本地 nav 元信息补齐「葡萄酒酒庄 / 洋酒酒庄 / 其它酒类酒庄」，但酒庄列表数据本身仍然走 API。


### 登录后结算仍提示未登录

现在头部“用户注册/登录”已改为真实登录入口，不再走模拟登录。
如果结算时后端仍返回 401，前端会自动拉起登录弹窗，让用户重新登录后再提交订单。


### 登录后顶部还显示数字 ID

后端 `login/session` 已补 `displayName`，前端会优先展示它；如果没有显示名，再退回用户名。
这样注册后的账号展示更接近正式站点，不会直接显示数据库主键。


### 后端代码改完但页面还是旧结果

确认后端进程是否已重启。仅 `mvn compile` 不会替换正在运行的 Spring Boot 进程。
后端重启后再刷新前端页面，才能使用新的 `/api/aw/nav?catalogType=item` 行为。



## 10. 后端结构



```

com.auswine/

├── auth/                  # JWT + Cookie 登录

├── controller/

│   ├── AwCatalogController.java

│   └── AwCartController.java   # cart + order

├── service/

├── mapper/

├── entity/

├── importer/AusWineDataImportRunner.java

├── config/WebMvcConfig.java

└── startup/DatabaseMigrationRunner.java

```



表：`aw_region`、`aw_sub_nav`、`aw_catalog_item`（**酒庄+酒款统一表**，`item_type=winery|wine`）、`sys_user`、`aw_cart_item`、`aw_order`、`aw_order_item`

详细说明见 [auswine-backend/docs/DATABASE-SCHEMA.md](../../../auswine-backend/docs/DATABASE-SCHEMA.md)。



Import 源：`item.json`（winery）+ `wine.json`（wine），启动时 upsert。

