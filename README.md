# Career Curveball™ - 职业反直觉生成器

一个基于AI的职业认知颠覆工具，帮助用户发现职业的反直觉事实和隐藏真相。

## 🚀 功能特点

- **智能生成**：基于Deepseek AI生成5个职业反直觉事实卡片
- **多维度洞察**：涵盖冷知识、隐藏技能、常见误区、发展路径、知名人物等
- **现代UI**：使用React + TypeScript + Tailwind CSS构建的响应式界面
- **实时交互**：输入职业名称即可获得即时反馈
- **错误处理**：完善的API错误处理和用户提示

## 🛠️ 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式框架**：Tailwind CSS
- **AI服务**：Deepseek API
- **开发工具**：ESLint + PostCSS

## 📦 安装和运行

### 1. 克隆项目
```bash
git clone <your-repo-url>
cd "Curve Ball"
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
复制 `.env.example` 到 `.env` 并配置API密钥：
```bash
cp .env.example .env
```

应用支持两种AI模型，可在界面中切换：

#### 🌋 火山引擎配置（推荐）
```env
# 必填：API Key
VITE_VOLCENGINE_API_KEY=your-volcengine-api-key-here

# 二选一（推荐使用Endpoint ID）
VITE_VOLCENGINE_ENDPOINT_ID=your-endpoint-id-here
# 或者使用Model ID
VITE_VOLCENGINE_MODEL=your-model-id-here
```

#### 🤖 Deepseek配置
```env
# 必填：API Key
VITE_OPENAI_API_KEY=your-deepseek-api-key-here

# 可选：Base URL（默认为官方地址）
VITE_OPENAI_BASE_URL=https://api.deepseek.com/v1
```

**获取API密钥：**
- 火山引擎：访问 [方舟控制台](https://console.volcengine.com/ark)
- Deepseek：访问 [Deepseek平台](https://platform.deepseek.com/)

### 4. 启动开发服务器
```bash
npm run dev
```

访问 `http://localhost:5173` 开始使用！

## 🎯 使用方法

1. 在输入框中输入任意职业名称（如：程序员、医生、设计师）
2. 点击"生成反直觉事实"按钮或按回车键
3. 等待AI生成5张职业事实卡片
4. 浏览卡片内容，发现职业的隐藏真相

## 🔧 项目结构

```
src/
├── App.tsx          # 主应用组件
├── Curveball.tsx    # 核心功能组件
├── main.tsx         # 应用入口
├── index.css        # 全局样式
└── vite-env.d.ts    # TypeScript类型声明
```

## 🌟 特色功能

### 智能JSON解析
- 自动提取AI返回内容中的JSON数据
- 容错处理，即使AI返回包含额外文本也能正确解析
- 详细的错误日志，便于调试和问题定位

### 优化的提示词
- 针对中国现实情况定制的提示词
- 明确的JSON格式要求，确保返回数据的一致性
- 多样化的卡片类型：冷知识、隐藏技能、误区、路径、名人

### 用户体验
- 响应式设计，支持各种设备
- 加载状态提示
- 友好的错误信息
- 键盘快捷键支持（回车生成）

## 🔑 API配置

本项目使用Deepseek API，需要：

1. 访问 [Deepseek官网](https://api.deepseek.com/) 申请API密钥
2. 将密钥配置到 `.env` 文件中
3. 确保账户有足够的API调用额度

## 🚀 部署

### 构建生产版本
```bash
npm run build
```

### 预览构建结果
```bash
npm run preview
```

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📄 许可证

MIT License

## 🙏 致谢

- [Deepseek AI](https://deepseek.com/) - 提供强大的AI能力
- [React](https://reactjs.org/) - 前端框架
- [Vite](https://vitejs.dev/) - 快速的构建工具
- [Tailwind CSS](https://tailwindcss.com/) - 实用的CSS框架