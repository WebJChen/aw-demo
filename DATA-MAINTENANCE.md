# AusWine 内容数据维护指南（无后台管理系统）

适用：`item.json`、`wine.json`、split / fallback、以及 **Aiven 云数据库**。

---

## 0. 谁才是「唯一真相」？（上线后必看）

**云上演示运行时，只有数据库是数据源。**  
gh-pages 已 `VITE_USE_API=true`，Catalog / 搜索 **全部走 API → MySQL**。

| 角色 | JSON | 数据库 |
| --- | --- | --- |
| 线上展示 | ❌ 不参与 | ✅ **唯一来源** |
| 编辑草稿 / Git 备份 | ✅ | 可直接 SQL 改库 |

### AusWine 导入与 TTO 不同（相对安全）

`aw_catalog_item` 的 upsert 对 **已存在的 item_key** 是 `ON DUPLICATE KEY UPDATE id = id`——  
**不会用 JSON 覆盖已有酒款/酒庄的 title、详情**；只会 **插入 JSON 里多出来的新 key**。

仍注意：

- `AW_IMPORT_CLEAR_BEFORE_IMPORT=true` 会 **清表重导**，生产禁用；
- 仅在 Render 需要 **补全新条目** 时临时开 import，改已有条目应 **直接改库**。

---

## 1. 黄金规则

1. **只改源文件**：`item.json`（酒庄）、`wine.json`（酒款）。
2. **改完必同步**：`npm run data:sync`。
3. **不要手改** `split/`、`fallback/`、`search/` 分片（脚本生成）。
4. **稳定标识**：酒庄 / 酒款保留 `item_key` 或业务 id，后端 import 靠 upsert，避免重复插入。
5. **云环境**：**以库为准**；JSON 改完 commit 即可，**不必**每次重启后端 import；仅新增条目时可手动 import。

## 2. 同步命令

```bash
npm run data:sync
```

| 步骤 | 脚本 | 产出 |
| --- | --- | --- |
| `data:split` | `split-data.mjs` | `split/item/{state}.json`、`split/wine/...`、`nav.json` |
| `build:catalog-index` | `build-catalog-index.mjs` | 搜索 manifest + 分片 |
| `sync:fallback` | `sync-fallback.mjs` | `fallback/` 快照 |

## 3. 无后台时的批量改法

### 方案 A：按州 / 子导航编辑 JSON

结构：`[{ navName, path, subNavList: [{ subNavPath, items: [...] }] }]`

适合单次改一个州下的若干酒庄或酒款，配合 IDE 折叠 + 搜索 `item_key`。

### 方案 B：patch 脚本（推荐批量）

与 TTO 相同思路：准备 `patches.json`：

```json
[
  {
    "catalog": "item",
    "statePath": "tasmania",
    "itemKey": "winery__tasmania__wineries__xxx",
    "title": "示例酒庄",
    "desc": "简介..."
  }
]
```

用 Node 脚本遍历 `item.json` / `wine.json` 按 `itemKey` 合并字段，再 `npm run data:sync`。

### 方案 C：Excel → CSV → patches

字段列建议：`catalog, statePath, subNavPath, itemKey, title, enTitle, desc, sort_order`

### 方案 D：直接改云库（临时）

Aiven 上改 `aw_catalog_item` 适合紧急修正；**长期仍应回写 JSON**，否则下次 import 行为与源码不一致。后端已对「新值为空不覆盖」做了保护，但 JSON 仍是权威源。

## 4. 新增测试数据（云连通性）

示例 SQL（塔斯马尼亚酒庄，`sort_order` 较小便于列表靠前）：

```sql
-- 见 auswine-backend 或自行 INSERT aw_catalog_item
-- item_key: winery__tasmania__wineries__aiven-render-test
```

前端 API 模式下，搜索「aiven」比滚到底找 `sort_order=9999` 更高效。

## 5. 同步到云数据库（仅补新数据时）

生产 Render：**`AW_IMPORT_ENABLED=false`**（或等效关闭自动 import）。

- **改已有酒庄/酒款**：直接 UPDATE `aw_catalog_item`（以库为准）
- **仅新增测试/批量新条目**：改 JSON → 临时开 import → 新 `item_key` 会插入，旧的 **不会被 JSON 覆盖**

```powershell
$env:AW_IMPORT_ITEM_JSON_PATH = "V:/WebForZanChen/AusWine/auswine-demo/src/data/item.json"
$env:AW_IMPORT_WINE_JSON_PATH = "V:/WebForZanChen/AusWine/auswine-demo/src/data/wine.json"
# 确认 AW_IMPORT_CLEAR_BEFORE_IMPORT=false 后再启动
```

## 6. 图片

```bash
npm run images:thumb
```

路径惯例：`src/assets/img/...`，JSON 内用相对 catalog 的路径。

## 7. 相关文档

- [docs/BACKEND-INTEGRATION.md](./docs/BACKEND-INTEGRATION.md) — API、联调排错
- [../auswine-backend/README.md](../../auswine-backend/README.md) — 后端与环境变量
