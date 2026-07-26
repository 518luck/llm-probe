FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/node:20-slim

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 创建数据目录
RUN mkdir -p app/data

EXPOSE 3001

# 使用 dev 模式运行（HonoX 的 SSR 需要）
CMD ["pnpm", "dev", "--port", "3001", "--host", "0.0.0.0"]
