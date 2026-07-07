# 让 Codex 连上这个应用（通过 MCP）

Codex 支持通过 **MCP（Model Context Protocol）** 连接任何符合规范的远程服务器。做法是把你现在的海报编辑器本身发布成一个 MCP 服务器，Codex 里添加一个远程 MCP 连接指向它就行——不需要额外后端，也不需要把你的 Gemini/自定义 key 交给 Codex。

## 将要做的事

1. **安装 MCP 运行时**
   - `bun add @lovable.dev/mcp-js zod`
   - 在 `bunfig.toml` 的 `minimumReleaseAgeExcludes` 加入 `@lovable.dev/mcp-js`（绕过 24h 供应链等待）。

2. **在 `src/lib/mcp/tools/` 下写工具**，每个工具一个文件，对应现有编辑操作，例如：
   - `list_pages` —— 返回当前海报所有页面 / 块 id / 文字摘要（只读）。
   - `update_text` —— 按 block id 改文字。
   - `update_style` —— 改字号/颜色/字重/对齐/行距等。
   - `replace_all` —— 全局查找替换。
   - `recolor_scheme` —— 改 ink/accent/muted 三色（不动背景，遵循现有规则）。
   - `set_image` —— 用 data URL 或 https URL 替换图片块。
   - `set_range_map` —— 严格遵循 `mem://features/global-range-map.md` 的坐标公式与固定底图生成全球分布图。
   - `generate_image` —— 走现有 `/api/gen-image` 逻辑（Lovable Gateway / Gemini / 自定义模型）。

   工具的入参用 zod 校验，`annotations` 里正确标记 `readOnlyHint` / `destructiveHint`，Codex 才能显示合适的行为提示。

3. **在 `src/lib/mcp/index.ts` 用 `defineMcp` 注册**这些工具，写清 `name` / `title` / `version` / `instructions`（告诉 Codex 这是"半日花海报编辑器"，操作前建议先 `list_pages`）。

4. **在 `vite.config.ts` 加 `mcpPlugin()`**，挂载到 `/mcp`（发布后即为 `https://plantsposter.lovable.app/mcp`）。插件会自动生成 HTTP 路由、JSON-RPC 传输、OAuth 元数据路由——**不要手写** `src/routes/mcp.ts`。

5. **共享编辑状态**：目前状态存在浏览器 localStorage（`banrihua.editor.v1`）。MCP 工具跑在服务端，无法直接读到你浏览器里的当前海报。方案二选一（下方问你）：
   - **A. 服务端存储**：启用 Lovable Cloud，把海报存到 Supabase，按用户 id 读写。Codex 通过 OAuth 登录后编辑的就是同一份文档；这也是官方推荐的多端一致方案。
   - **B. 本地桥接**：保留纯前端存储，MCP 工具通过 SSE/WebSocket 把操作推给已打开的浏览器 tab；关掉网页就不能用，但零后端。

6. **认证方式**（决定 Codex 能否代表"你"操作数据）：
   - 如果选 5A：接入 Supabase OAuth 2.1（`app-mcp-server-authoring` 里的流程），加一个 `/.lovable/oauth/consent` 页面。Codex 里"添加 MCP"会跳到你的登录页授权，之后每个工具 handler 通过 `ctx.getUserId()` 拿到用户，RLS 保证只能编辑自己的海报。
   - 如果选 5B 或你只是自己用：可以不加 auth，服务器公开——任何知道 URL 的人都能调用，仅适合个人 demo。

7. **在 Codex 里添加连接**（客户端配置示例，等实现完再给你贴具体 JSON）：

   ```jsonc
   // ~/.codex/config.json 里的 mcpServers 段
   {
     "banrihua-poster": {
       "transport": { "type": "http", "url": "https://plantsposter.lovable.app/mcp" },
     },
   }
   ```

   有 OAuth 时首次连接会弹浏览器授权；无 OAuth 直接就能用。

8. **验证**：`app_mcp_server--extract_mcp_manifest` 生成 manifest → 发布 → Codex 里 `/mcp` 命令能看到所有工具，跑一次 `list_pages` 应该返回海报块目录。

## 需要你先回答两个问题

**Q1. 用哪种状态共享？**

- A) 启用 Lovable Cloud + Supabase 存储 + OAuth，Codex 编辑的与你网页看到的是同一份（推荐，多设备也一致）。
- B) 只做本地桥接，Codex 通过实时通道操作你当前打开的网页（关网页就失效）。
- C) 无状态：Codex 每次调用都要自己传完整海报 JSON 进来（最简单，但对话里塞很多数据）。

**Q2. 是否需要认证？**

- 是（多用户 / 公开发布必选）→ 接 Supabase OAuth。
- 否（只有你自己临时用）→ 服务器公开无认证。

告诉我 Q1/Q2 的选择，我就按对应方案落地。
