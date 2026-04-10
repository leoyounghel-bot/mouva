# Mouva Backend 启动指南

## 快速开始

### 1. 安装依赖

```bash
cd playground/server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填写配置：

```bash
cp .env.example .env
```

必填配置:
- `DATABASE_URL`: PostgreSQL 连接字符串 (端口 5802)
- `R2_ACCOUNT_ID`: Cloudflare 账户 ID
- `R2_ACCESS_KEY_ID`: R2 Access Key
- `R2_SECRET_ACCESS_KEY`: R2 Secret Key
- `JWT_SECRET`: 用于签名 JWT 的密钥（随机字符串）

### 3. 初始化数据库

确保 PostgreSQL 正在运行（端口 5802），然后执行:

```bash
npm run db:init
```

或手动执行 SQL:

```bash
psql $DATABASE_URL -f models/schema.sql
```

### 4. 启动后端服务

开发模式:
```bash
npm run dev
```

生产模式:
```bash
npm run build
npm start
```

后端将在 http://localhost:5800 运行

### 5. 启动前端

在另一个终端:
```bash
cd playground
npm run dev -- --port 5801
```

前端将在 http://localhost:5801 运行，API 请求自动代理到后端。

## API 端点

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户

### 会话 (需认证)
- `GET /api/sessions` - 获取所有会话
- `GET /api/sessions/:id` - 获取单个会话
- `POST /api/sessions` - 创建会话
- `PUT /api/sessions/:id` - 更新会话
- `DELETE /api/sessions/:id` - 删除会话

## 用户隔离

所有会话查询都通过 `user_id` 进行隔离:

```sql
SELECT * FROM sessions WHERE user_id = $1 ORDER BY updated_at DESC
```

这确保用户只能访问自己的历史记录。
