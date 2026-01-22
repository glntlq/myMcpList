# MCP 工具面板 - Next.js 版本

这是基于 Next.js 框架实现的 MCP 工具面板，提供了与原 `simple-mcp-example` 项目相同的功能。

## 功能

这个项目包含四个简单的工具：

1. **hello** - 问候工具，向指定的人打招呼
2. **get_current_time** - 获取当前时间
3. **clean_trash** - 清理电脑上的垃圾桶（macOS）
4. **list_directory** - 查看指定文件夹下的项目和文件列表

## 安装

```bash
cd simple-mcp-example-nextjs
npm install
```

## 运行

### 开发模式

```bash
npm run dev
```

然后打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 生产模式

```bash
npm run build
npm start
```

## 项目结构

```
simple-mcp-example-nextjs/
├── app/
│   ├── api/
│   │   ├── tools/
│   │   │   └── route.ts      # 工具调用 API
│   │   └── results/
│   │       └── route.ts       # 历史结果 API
│   ├── page.tsx               # 主页面组件
│   ├── layout.tsx             # 布局组件
│   └── globals.css            # 全局样式
├── results/                   # 结果保存目录（自动创建）
├── package.json
└── README.md
```

## API 接口

### GET /api/tools

获取可用工具列表

### POST /api/tools

调用指定工具

请求体：
```json
{
  "toolName": "hello",
  "args": {
    "name": "张三"
  }
}
```

### GET /api/results

获取历史结果列表

## 技术栈

- **Next.js 16** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架（通过 PostCSS）

## 与原项目的区别

1. **框架**：使用 Next.js 替代 Express + 原生 HTML/JS
2. **API 路由**：使用 Next.js App Router 的 API Routes
3. **前端**：使用 React 组件替代原生 JavaScript
4. **样式**：使用 CSS Modules + Tailwind CSS
5. **类型安全**：完整的 TypeScript 支持

## 注意事项

- `results` 文件夹会在首次调用工具时自动创建
- `clean_trash` 工具仅在 macOS 系统上可用
- `list_directory` 工具需要提供有效的文件夹路径

## 开发

项目使用 Next.js 16 的 App Router 架构，所有页面和 API 路由都在 `app` 目录下。

- 页面组件：`app/page.tsx`
- API 路由：`app/api/*/route.ts`
- 样式：`app/globals.css`
