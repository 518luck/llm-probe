# 🧪 LLM API Tester

一个轻量级的 LLM API 测试工具，支持多站点管理、批量测试、客户端模拟等功能。

## ✨ 功能特性

- 🔌 **多站点管理** - 同时管理多个 API 中转站
- 📊 **批量测试** - 一键测试所有模型的可用性
- 🎭 **客户端模拟** - 模拟千问、Claude Code、Cursor 等客户端
- 📋 **模型缓存** - 自动保存已获取的模型列表
- 🌙 **深色主题** - 默认深色主题，保护眼睛
- 🔒 **安全设计** - 不缓存 API Key，防止泄露

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问 http://localhost:3001
```

### Docker 部署

```bash
# 构建镜像
docker compose build

# 启动服务
docker compose up -d

# 访问 http://localhost:3001
```

## 📁 项目结构

```
llm-probe/
├── app/
│   ├── client.ts          # 客户端入口
│   ├── server.ts          # 服务端入口
│   ├── global.d.ts        # 类型定义
│   ├── data/
│   │   └── api-cache.json # 缓存文件（URL + 模型列表）
│   ├── islands/
│   │   └── app.tsx        # 主要交互组件
│   └── routes/
│       ├── _renderer.tsx  # HTML 渲染器
│       ├── index.tsx      # 主页面
│       └── api/
│           ├── cache.ts   # 缓存 API
│           └── proxy.ts   # 代理 API
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🛠️ 技术栈

- **前端**: HonoX + TypeScript
- **后端**: Hono (轻量级 Web 框架)
- **构建**: Vite
- **部署**: Docker

## 📖 使用说明

### 1. 配置 API

1. 输入 API URL（如 `http://117.72.199.61:4000/v1`）
2. 输入 API Key
3. 点击"获取模型列表"

### 2. 测试模型

- **单个测试**: 选择模型，点击"发送请求"
- **批量测试**: 点击"批量测试"，自动测试所有模型

### 3. 模拟客户端

点击"模拟客户端"按钮，自动添加对应的 User-Agent：
- 千问 Code
- Claude Code
- Codex CLI
- Cursor
- Windsurf
- Cline
- Aider
- Continue

### 4. 站点管理

点击"站点管理"标签，查看所有已保存的站点和模型列表。

## 🔧 开发命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm lint         # 代码检查
pnpm format       # 代码格式化
pnpm validate     # TypeScript + Biome 检查
```

## 📦 依赖

| 依赖 | 说明 |
|------|------|
| hono | 轻量级 Web 框架 |
| honox | Hono 全栈框架 |
| vite | 构建工具 |
| typescript | 类型系统 |
| @biomejs/biome | 代码检查和格式化 |

## 🔒 安全说明

- ✅ 不缓存 API Key
- ✅ 每次访问需要手动输入 Key
- ✅ 只缓存 URL 和模型列表
- ✅ 建议在内网或使用反向代理部署

## 📝 更新日志

### v2.0.0
- 迁移至 HonoX 全栈框架
- 支持 TypeScript/TSX
- 支持热重载开发
- 添加批量测试功能
- 添加客户端模拟功能
- 添加站点管理功能
- 移除 API Key 缓存

### v1.0.0
- 初始版本
- 基础 API 测试功能
- 深色主题支持

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题，请提交 Issue。
