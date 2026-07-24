# auswine demo

这是 AusWine 的前端 Demo，当前以静态内容和本地数据为主，暂未接入后端和数据库。

## 运行与检查

- `npm run dev`：启动开发服务
- `npm run build`：构建生产版本
- `npm run lint`：检查前端代码规范

## 当前约定

- 统一使用 `sass-embedded` 处理样式。
- 运行时代码尽量保持无 `console.*` 输出，减少生产环境噪音。
- 前端代码已接入 ESLint，后续修改更容易保持风格一致。
