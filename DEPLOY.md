# 部署与保存说明（直接部署，不经 Lovable）

## 这次改了什么

1. **「立即保存」= 全局发布**：点击后会把当前所有页面写入服务器（Supabase Storage，Cloudflare KV 作回退），
   之后**任何访客**打开网站都能看到最新内容。自动保存仍然只存本地草稿；只有点
   「立即保存」才会发布上线。
2. **全球配图一定显示**：页面加载时直接从服务器 `/api/state` 读取完整状态（含所有
   全球分布图 / 配图），不再因为本地缓存陈旧而丢图。
3. **每页唯一网址**：新建 / 复制 / 重命名 / 自动命名都会保证页面名不重复，因此不会
   出现两个页面共用同一网址。
4. **直达网址显示对应页**：打开 `/梭梭` 这样的网址会直接停在该页，不再默认跳回第一页。

## 一次性配置（启用直接部署 + 全局保存）

在 GitHub 仓库 `arainjazz/plantsposter` → **Settings → Secrets and variables → Actions**
添加以下 secrets：

| 名称                    | 说明                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API Token，权限需含 **Workers Scripts: Edit** 和 **Workers R2 Storage: Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID                                                                       |
| `GEMINI_API_KEY`        | （可选）AI 生图用                                                                        |
| `LOVABLE_API_KEY`       | （可选）走 Lovable AI Gateway 用                                                         |
| `EDIT_KEY`              | （可选）设置后，「立即保存」需输入此密钥才能发布，防止陌生人改内容                       |
| `MCP_API_TOKEN`         | （推荐）远程 MCP 的 Bearer Token；未设置时暂时回退使用 `EDIT_KEY`                        |

配置好后，每次 `git push` 到 `main`，GitHub Actions 会自动：

1. 构建
2. 确保 Cloudflare KV 回退命名空间存在
3. 把 KV 绑定注入构建产物，并向 Worker 同步 Supabase/MCP secrets
4. `wrangler deploy` 直接部署到 Cloudflare

部署后的 MCP 地址为 `https://<网站域名>/mcp`。生产环境必须使用
`Authorization: Bearer <MCP_API_TOKEN>`；如果尚未单独配置 `MCP_API_TOKEN`，服务会使用
`EDIT_KEY` 作为兼容后备。MCP 的页面与区块写入会直接发布线上状态，同时先写入 Supabase
版本快照。

## 彻底停用 Lovable 发布

当前只要推代码，Lovable 也会自动部署一次（它没有 R2，全局保存会失效）。要完全走
GitHub Actions，请在 **Lovable 项目设置里断开 GitHub 同步 / 关闭自动部署**。断开后，
仅由本仓库的 Actions 负责部署。

## 工作原理

- `GET /api/state` → 先读 Supabase；不可用时回退到 KV，再回退到静态种子文件
  `public/banrihua-editor-20plants.json`。
- `POST /api/state` → 写入 Supabase 并镜像 KV（即「立即保存」）。未配置全局存储时返回明确提示，网站其余
  功能不受影响。
