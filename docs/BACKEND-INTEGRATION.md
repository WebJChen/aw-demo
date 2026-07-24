# AusWine 后端接入与规模化改造说明



> 版本：2026-07 · 适用项目：`auswine-demo` + `auswine-backend`



## 进度（2026-07 更新）



| 模块 | 状态 |

|------|------|

| 前端 API 层（`auswineApi.js`） | ✅ |

| `catalogRepository` 双模式 | ✅ |

| `ItemGrid` API 分页 | ✅ |

| 搜索 index 按州分片 | ✅ |

| 去除全量 `item.json`/`wine.json` 运行时依赖 | ✅ |

| gh-pages fallback（tasmania + search 分片） | ✅ |

| `auswine-backend` 基础脚手架 | ✅ |

| MySQL 表 + JSON Import | ✅ |

| Catalog API（nav / wines / wineries / search / 详情） | ✅ |

| Auth API（login / register / session / logout） | ✅ |

| Cart API（GET/PUT `/api/aw/cart`） | ✅ |

| Order API（POST/GET `/api/aw/orders`） | ✅ |

| 前端 cart / order / 登录对接 | ✅ |

| `WineryPreviewView` API 分页 | ✅ |

| `WineryDetailView` / 经典酒款 API | ✅ |

| `CategoryDetailPanel` 酒庄 API | ✅ |



---



## 1. 目标



- 开发环境（`npm run dev`）：**无条件**走 `/api/aw/*`，不读 split/fallback 业务数据

- gh-pages：`VITE_USE_LOCAL_JSON_FALLBACK=true` → fallback 快照，不走 API

- 正式生产：`VITE_USE_API=true` 且非 fallback

- 全国数据量：按州加载、搜索分片、API 分页



## 2. 环境变量



### 前端（auswine-demo）



| 变量 | 开发联调 (`npm run dev`) | gh-pages | 正式生产 |

|------|----------|----------|----------|

| `VITE_USE_API` | 忽略（DEV 强制 API） | `false` | `true` |

| `VITE_API_BASE_URL` | `/api` | `/api` | `/api` |

| `VITE_USE_LOCAL_JSON_FALLBACK` | `false` | `true` | `false` |



### 后端（auswine-backend）



| 变量 | 说明 |

|------|------|

| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | MySQL |

| `AW_JWT_SECRET` | JWT 密钥（生产必改） |

| `AW_IMPORT_ITEM_JSON_PATH` | 指向 `item.json` |

| `AW_IMPORT_WINE_JSON_PATH` | 指向 `wine.json` |

| `AW_CORS_ALLOWED_ORIGINS` | 前端 origin |



## 3. 前端分层



```

Views → catalogRepository / cartService / orderService → auswineApi → backend

                      ↘ dataRepository（JSON fallback / split 分区）

```



## 4. API 契约



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



## 5. 数据流水线



```bash

cd auswine-demo

npm run data:sync

```



| 脚本 | 产出 |

|------|------|

| `split-data.mjs` | `split/nav.json`、按州 JSON；**>100KB 大州**另产出 `split/wine/{state}/{subNav}.json` + `shard-manifest.json` |

| `build-catalog-index.mjs` | `search-manifest.json`（v2）；大州搜索按 `search/{state}/{subNav}-wine.json` 分片 |

| `sync-fallback.mjs` | `fallback/` 下 nav + tasmania + 对应 search 分片 |



## 6. 规模化策略



### ItemGrid



- **JSON 模式**：默认加载当前州；全国筛选 lazy load 其余州

- **API 模式**：`fetchWineCatalogPage` 服务端分页，滚动加载下一页



### 搜索



- **JSON 模式**：按 `search-manifest.json` 加载各州分片

- **API 模式**：`/api/aw/search` 分页



### 购物车 / 订单



- **JSON 模式**：`localStorage` + `sessionStorage` mock

- **API 模式**：登录后购物车 PUT 同步；结算 POST 订单；订单列表/详情走 API



## 7. 本地开发



```bash

# 终端 1：后端

cd auswine-backend && mvn spring-boot:run



# 终端 2：前端（.env.development 中 VITE_USE_API=true）

cd auswine-demo && npm run dev

```



仅前端 JSON 模式：`.env.development` 设 `VITE_USE_API=false`。



## 8. 后端结构



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

