# 部署教程

本项目需要可信的 Node.js 服务端来发送邮件、验证会话、判断 VIP 并读取私有数据。代码可以存放在 GitHub；应用部署到 Vercel 或服务器。不要把应用作为静态导出上传到 GitHub Pages。

## 1. 选择存储方式

| 项目 | Vercel + 私有 GitHub | 单台服务器 + SQLite |
| --- | --- | --- |
| `DATA_DRIVER` | `github` | `sqlite` |
| 数据位置 | 独立私有仓库中的加密文件 | 持久化磁盘中的 SQLite 文件 |
| 适合 | 小规模、低写入频率的站点 | 单机长期运行、频繁学习记录 |
| 数据保护 | 应用侧 AES-256-GCM 加密，密钥放环境变量 | SQLite 文件本身未加密，使用主机权限与磁盘保护；导出备份加密 |
| 扩容约束 | 每次状态更新提交整个文件，存在限流与冲突成本 | 不要让不同机器分别使用互不共享的本地文件 |

Vercel Functions 的本地文件系统不提供共享持久化存储，因此不能用本地 SQLite 保存正式用户数据；本实现检测到 Vercel 环境时会拒绝 SQLite。[Vercel 官方说明](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)

GitHub 模式会将用户、密码哈希、会话哈希、验证码哈希、课程、权限、文章、进度与笔记放入一个加密数据文件。不要把令牌或解密密钥写进代码仓库，也不要加 `NEXT_PUBLIC_` 前缀。

## 2. 准备真实邮件

正式环境选择以下一种方式。`.env.local` 中的值由 Next.js 和运维脚本读取；Vercel 则在项目环境变量页面逐项设置。

### SMTP

```dotenv
MAIL_TRANSPORT=smtp
MAIL_FROM=Brclio Academy <noreply@your-domain.com>
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

587 使用 STARTTLS，本实现要求升级为 TLS。提供商要求 465 时改成 `SMTP_PORT=465` 和 `SMTP_SECURE=true`。按照提供商要求验证发信域名、配置 SPF/DKIM。密码使用提供商的 SMTP 凭证；不要假定它与邮箱网页登录密码相同。

### Resend

```dotenv
MAIL_TRANSPORT=resend
MAIL_FROM=Brclio Academy <noreply@your-domain.com>
RESEND_API_KEY=your-resend-api-key
```

先在邮件服务验证发信域名，再配置生产凭证与发件人。可参考 [Resend 发信 API](https://resend.com/docs/api-reference/emails/send-email)。开发用的 `MAIL_TRANSPORT=console` 不会发送邮件，生产环境会拒绝这种配置。

验证码有效期 10 分钟，同一邮箱和用途发送间隔至少 60 秒，单个验证码最多尝试 5 次。用户应始终使用最近一次收到的验证码。

## 3. Vercel + 私有 GitHub 数据仓库

### 3.1 创建独立数据仓库

1. 在 GitHub 新建私有仓库，例如 `academy-private-data`，初始化 README，确保 `main` 分支存在。
2. 为该仓库创建 fine-grained personal access token，只选择这个数据仓库，授予 Contents 读写权限。数据仓库与应用代码仓库分开，避免学习进度提交反复触发应用部署。
3. 生成 32 字节密钥，并存进密码管理器；此命令的输出就是环境变量值：

```bash
openssl rand -base64 32
```

GitHub Contents 更新文件时要求提供当前文件 SHA；本适配器会重新读取并重试冲突，且每次读取都验证仓库仍为私有。[GitHub 官方接口说明](https://docs.github.com/en/rest/repos/contents)

### 3.2 配置环境变量

在本地 `.env.local` 中先配置下列变量，用它初始化远端管理员；之后将相同值填入 Vercel 的 Production 环境。

```dotenv
DATA_DRIVER=github
GH_DATA_OWNER=your-github-owner
GH_DATA_REPO=academy-private-data
GH_DATA_BRANCH=main
GH_DATA_PATH=academy.enc.json
GH_DATA_TOKEN=your-fine-grained-token
DATA_ENCRYPTION_KEY=your-generated-base64-key
APP_URL=https://academy.your-domain.com
MAIL_TRANSPORT=resend
MAIL_FROM=Brclio Academy <noreply@your-domain.com>
RESEND_API_KEY=your-resend-api-key
```

密钥必须长期保留。直接换成另一把密钥会导致已有文件无法解密。需要换密钥时，先用旧密钥导出、在隔离环境恢复并重新导出，再切换；保留可回退副本。

### 3.3 初始化管理员与示例数据

在安装好依赖的代码目录执行：

```bash
read -s ADMIN_PASSWORD
export ADMIN_PASSWORD
npm run admin -- --email owner@example.com --name Brclio
unset ADMIN_PASSWORD
```

此时 `DATA_DRIVER=github` 会把初始数据和管理员写入私有仓库。首次写入才创建 `academy.enc.json`；已有数据不会被默认示例覆盖。不要自行创建空的加密文件或把普通 JSON 改扩展名冒充加密文件。

如果该邮箱已经注册，使用 `--promote` 提升已验证账号，保留原密码：

```bash
npm run admin -- --email owner@example.com --promote
```

### 3.4 导入 Vercel 项目

1. 将应用代码提交到自己的 GitHub 代码仓库，在 Vercel 导入该仓库。
2. Framework Preset 选择 Next.js，Node.js 选择 24.x，使用仓库的锁文件安装依赖；Build Command 使用 `npm run build`。Vercel 当前支持 24.x，具体版本可在 [Node.js 版本设置](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) 核对。
3. 配置上面的生产环境变量并部署。配置 `APP_URL` 为最终访问的 HTTPS 域名，包含协议、不带路径。
4. 绑定域名后重新检查 `APP_URL`。变更环境变量后重新部署使其生效。

请求来源必须与 `APP_URL` 的 origin 一致，否则写入请求返回来源校验失败。临时 `*.vercel.app` 地址和正式域名不同；选定一个用于登录、注册和后台的规范地址。预览部署使用独立数据仓库或独立分支，并设置对应预览地址，避免测试写入生产数据。

### 3.5 线上验收

用普通邮箱真实接收验证码并注册；登录管理员后台找到该账号，设置一个未来的 VIP 截止时间。切回学员账号打开课程、播放视频、保存笔记，再退出重进检查学习记录。随后撤销 VIP，确认新请求无法取得课文、视频 ID 与学习资源。记录真实邮件送达与播放器情况，不以部署构建成功代替这些验收。

## 4. 服务器 + SQLite：Docker

服务器准备 Docker Engine 与 Compose，持久化磁盘、域名和 HTTPS 反向代理。项目 Dockerfile 使用 Node 24，并保留管理与备份脚本。

```bash
git clone https://github.com/Brclio/Brclio-Academy.git
cd Brclio-Academy
cp .env.example .env.local
```

编辑 `.env.local`：

```dotenv
APP_URL=https://academy.your-domain.com
DATA_DRIVER=sqlite
SQLITE_PATH=/app/.data/academy.sqlite
MAIL_TRANSPORT=smtp
MAIL_FROM=Brclio Academy <noreply@your-domain.com>
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
DATA_ENCRYPTION_KEY=your-generated-base64-key
TRUST_PROXY=1
```

SQLite 运行本身不需要加密密钥；为了能导出加密备份，建议这里同时配置并妥善保存。设置 `TRUST_PROXY=1` 的前提是只允许可信反向代理访问应用，且代理覆盖客户端传来的 `X-Forwarded-For`。随附 Compose 仅将端口绑定到 `127.0.0.1:3000`。

```bash
docker compose up -d --build
docker compose logs --tail=100 academy
read -s ADMIN_PASSWORD
export ADMIN_PASSWORD
docker compose exec -e ADMIN_PASSWORD academy npm run admin -- --email owner@example.com --name Brclio
unset ADMIN_PASSWORD
```

数据保存在 named volume `academy-data` 内。更新镜像和普通 `docker compose down` 会保留该卷；不要在需要保留数据时执行 `docker compose down -v`。

升级时先导出备份，再更新代码并重新构建：

```bash
docker compose exec academy npm run data:export -- --file .data/backup-before-upgrade.enc.json
docker compose cp academy:/app/.data/backup-before-upgrade.enc.json ./backup-before-upgrade.enc.json
git pull
docker compose up -d --build
```

导出命令拒绝覆盖已存在的目标文件，每次使用新的文件名。备份文件不要提交到应用仓库。

## 5. 不使用 Docker：systemd + SQLite

以专用用户运行单个 Node 24 进程。下面假设代码在 `/srv/brclio-academy`，数据在 `/var/lib/brclio-academy`，环境文件在 `/etc/brclio-academy.env`。按服务器实际 Node 安装路径调整 `ExecStart`。

先创建服务使用的系统组和用户（以下适用于 Debian / Ubuntu，已存在时跳过）：

```bash
getent group academy >/dev/null || sudo groupadd --system academy
id -u academy >/dev/null 2>&1 || sudo useradd --system --gid academy --home-dir /srv/brclio-academy --no-create-home --shell /usr/sbin/nologin academy
```

在代码目录安装与构建，并为 standalone 服务补齐静态文件：

```bash
npm ci
npm run build
mkdir -p .next/standalone/public .next/standalone/.next/static
cp -R public/. .next/standalone/public/
cp -R .next/static/. .next/standalone/.next/static/
```

环境文件至少包含正式 `APP_URL`、邮件配置、`DATA_DRIVER=sqlite`、`SQLITE_PATH=/var/lib/brclio-academy/academy.sqlite`。环境文件权限设为 `0600`，数据目录仅授予应用用户读写权限。不要把生产凭证留进 shell 历史或 Git。

创建 `/etc/systemd/system/brclio-academy.service`：

```ini
[Unit]
Description=Brclio Academy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=academy
Group=academy
WorkingDirectory=/srv/brclio-academy
EnvironmentFile=/etc/brclio-academy.env
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3000
ExecStart=/usr/bin/node /srv/brclio-academy/.next/standalone/server.js
Restart=on-failure
RestartSec=5
StateDirectory=brclio-academy
StateDirectoryMode=0700
UMask=0077
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

专用用户需要能读取代码和依赖。启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now brclio-academy
sudo systemctl status brclio-academy
```

管理员与备份命令须使用与服务相同的环境变量和数据路径；CLI 自动读取工作目录 `.env.local`，不会自动读取 systemd 的 `/etc/brclio-academy.env`。下面用临时 systemd 服务加载同一环境文件，无需向应用用户开放该文件的读取权限。

先在网站用自己的邮箱完成注册验证，再运行以下命令提升该账号（替换邮箱和实际 Node 路径）：

```bash
sudo systemd-run --wait --pipe --collect \
  --property=User=academy --property=Group=academy \
  --property=WorkingDirectory=/srv/brclio-academy \
  --property=EnvironmentFile=/etc/brclio-academy.env \
  /usr/bin/node --import tsx scripts/admin.ts --email owner@example.com --promote
```

导出加密备份时沿用相同的运行环境，并选择一个未存在的文件名；环境文件中需要设置 `DATA_ENCRYPTION_KEY`：

```bash
sudo systemd-run --wait --pipe --collect \
  --property=User=academy --property=Group=academy \
  --property=WorkingDirectory=/srv/brclio-academy \
  --property=EnvironmentFile=/etc/brclio-academy.env \
  /usr/bin/node --import tsx scripts/data.ts export --file /var/lib/brclio-academy/backup-before-upgrade.enc.json
```

## 6. Nginx 与 HTTPS

先把域名解析到服务器，准备有效 TLS 证书。下面的路径是占位值，替换为实际证书路径后通过 `nginx -t` 再加载：

```nginx
server {
    listen 80;
    server_name academy.your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name academy.your-domain.com;
    ssl_certificate /etc/letsencrypt/live/academy.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/academy.your-domain.com/privkey.pem;
    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Overwrite, not append, if Nginx is the direct public-facing proxy.
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 90s;
    }
}
```

生产会话 Cookie 带 `Secure`，通过 HTTPS 使用。直接访问服务器 HTTP 端口不是完整的生产登录验收。如果前面另有 CDN 或负载均衡，按自己的受信任代理链配置真实 IP，不要盲目信任任意来源请求头。

## 7. 备份、恢复与迁移

使用同一套 CLI 对两种存储做可移植加密备份。`DATA_ENCRYPTION_KEY` 在导入导出时必需，即使当前驱动是 SQLite。

```bash
npm run data:export -- --file .data/backup-2026-09-10.enc.json
```

导出包含完整用户与业务数据，以 AES-256-GCM 加密。将备份文件与密钥分别妥善保存。恢复会替换当前数据库，先为目标库做备份、停止公开写入，再执行：

```bash
npm run data:import -- --file .data/backup-2026-09-10.enc.json --replace
```

导入会清除旧会话与验证码，用户需要重新登录。恢复后检查课程、用户、VIP 截止时间、笔记和进度。

从 GitHub 迁移到 SQLite：先在 GitHub 配置下导出；停止旧部署写入；在新服务器设置 SQLite 路径与同一备份密钥；导入并完成验收；最后切换域名。迁移窗口内不要让两个后端各自接收用户写入。

SQLite 使用 WAL。优先使用上述导出脚本获取一致的业务快照；不要在服务运行中只复制主 `.sqlite` 文件并忽略可能存在的 WAL 数据。若直接做文件备份，应停止服务后同时保存完整数据库状态。

## 8. 常见问题

| 现象 | 检查方向 |
| --- | --- |
| 来源校验失败 | `APP_URL` 协议和域名是否与浏览器地址完全一致；改环境后是否重新部署 |
| 验证码没有真实邮件 | 正式环境不能用 console；检查发信域名、SMTP/Resend 凭证与邮件服务日志 |
| GitHub 404 | 数据仓库是否存在、令牌是否授权、分支是否初始化；确认不是拼写错误 |
| 无法验证私有仓库 | 仓库必须为 private，令牌能读仓库元数据并写 Contents |
| 无法解密 | 是否使用原始 `DATA_ENCRYPTION_KEY`；不要直接换密钥后覆盖数据 |
| Vercel 拒绝 SQLite | 改为 GitHub 数据驱动，或迁移到持久化服务器 |
| 频繁写入冲突、数据接近限制 | 暂停增加写入负载，导出并迁移到 SQLite；GitHub 模式不是通用高并发数据库 |
| 视频无法播放 | 逐个检查是否允许嵌入、是否为 Unlisted、地区/年龄/账号限制及实际网络可达性 |
| 管理员不能学习 | 管理员角色与 VIP 独立；在后台为自己设置未来的 VIP 截止时间 |

## 部署记录

本教程提供可执行配置和验收步骤，没有替代你创建邮件账户、写入远端数据、绑定域名或完成线上播放。每次上线保留实际部署地址、版本、执行时间、真实邮件验收结果与未解决的问题。
