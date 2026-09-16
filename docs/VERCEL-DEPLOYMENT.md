# Brclio Academy：Vercel 详细部署教程

适用于当前项目的 Next.js 16.3.4 版本。目标网址：`https://academy.brclio.com`。本教程使用 GitHub 私有仓库保存加密数据、Gmail SMTP 发送验证码。官方资料核对日期：2026-09-16。

## 1. 先找到部署配置文件

已经为本次部署生成项目根目录的 **`.env.vercel.production`**，共 16 个变量，已填入提供的 Gmail 应用专用密码、GitHub Token、正式域名，并生成新的 32 字节数据加密密钥。

本机路径：`/Users/huangjiabao/GitHub/Brclio-Academy/.env.vercel.production`。

这个文件只保存在本机，权限为 `600`，已被现有 `.gitignore` 排除。它不属于公开教程，也不应上传到代码仓库、数据仓库或 `public/`。备份到自己的密码管理器；尤其保留 `DATA_ENCRYPTION_KEY`，后续部署继续使用同一把密钥。

Mac 的文件选择窗口若看不到点号开头的文件，按 **Command + Shift + .** 显示隐藏文件；也可按 **Command + Shift + G**，粘贴上面的完整路径。

| 本次已经核验 | 结果与范围 |
| --- | --- |
| 私有数据仓库 | GitHub API 返回 200，确认 `private=true` |
| 数据分支 | `main` 分支存在，API 返回 200 |
| 数据文件 | `academy.enc.json` 返回 404，目前尚未创建 |
| Gmail SMTP | TLS 连接与账号认证通过；未发送测试邮件 |
| 本地配置 | 16 个变量、32 字节密钥、文件权限及 Git 忽略规则已核验 |
| 应用检查 | Node.js 24.21.0 下构建通过、17 项测试通过、客户端资源检查通过 |

以上为 2026-09-16 的检查快照。尚未执行 Vercel 部署、域名绑定、管理员创建、GitHub 写入或真实收件验收。

## 2. 分清两个仓库

| 仓库 | 用途 | 在哪里使用 |
| --- | --- | --- |
| [Brclio/Brclio-Academy](https://github.com/Brclio/Brclio-Academy) | 网站代码，有 `package.json`、`src/` 等 | Vercel 导入这个仓库 |
| [Brclio/academy-private-data](https://github.com/Brclio/academy-private-data) | 加密保存用户、课程、VIP、学习记录等 | 只通过 `GH_DATA_*` 环境变量连接 |

数据仓库必须保持 **Private**。请勿把数据仓库作为 Vercel 项目导入，也不要手动创建空的 `academy.enc.json`。首次管理员初始化或其他实际写入操作会创建有效的加密文件；仅打开首页不代表数据已保存。

检查 fine-grained PAT 的配置：GitHub 头像 → Settings → Developer settings → Personal access tokens → Fine-grained tokens。

1. Resource owner 为 `Brclio`，Repository access 只选择 `academy-private-data`。
2. Repository permissions 中 **Contents = Read and write**；Metadata 通常自动提供只读权限。
3. 如果组织要求批准，等待组织管理员批准该令牌。确认有效期未过、仓库没有阻止程序直接写入 `main` 的规则。
4. 数据仓库已有 `main` 分支，本次不需要再次初始化。新建其他数据仓库时，可勾选 README 完成首次提交。

只读 API 成功不等于令牌写权限已验收；后面的管理员初始化会验证真实写入。[GitHub PAT 官方说明](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)、[Contents API 权限说明](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)。

## 3. 创建 Vercel 项目

1. 登录 [Vercel](https://vercel.com)，在控制台选择 **Add New → Project**。
2. 连接 GitHub，找到 **Brclio/Brclio-Academy**，点击 **Import**。如果没有显示，检查 Vercel GitHub App 是否获准读取这个代码仓库。
3. 项目名称可填 `brclio-academy`；名称被占用时可以换一个，不影响后续绑定 `academy.brclio.com`。
4. 按下表核对构建设置，并在点击 Deploy 前先完成下一节的环境变量导入。

如果 Vercel 提示组织私有仓库受套餐限制，注意区分：Hobby 不支持从 GitHub 组织的私有**代码仓库**部署。需使用支持该仓库的 Vercel 套餐，或使用符合账户权限的代码托管方式；不要为解决导入问题将私有**数据仓库**公开。数据仓库只由服务端通过 API 访问，不是 Vercel 的 Git 部署来源。[Vercel Git 部署说明](https://vercel.com/docs/git)。

| 设置 | 应填内容 |
| --- | --- |
| Framework Preset | `Next.js` |
| Root Directory | 项目根目录 `./`，不是 `src` 或 `docs` |
| Production Branch | `main` |
| Install Command | 自动识别，或填写 `npm ci` |
| Build Command | `npm run build` |
| Output Directory | 保持 Next.js 默认，不手填 `out`、`public` 或 `.next/standalone` |
| Node.js Version | `24.x`；若导入页没有此项，在项目 Settings → Build and Deployment 中检查 |

本项目需要服务端处理登录、邮件和 VIP 权限，不能选择静态导出。`next.config.ts` 会根据 Vercel 自动提供的 `VERCEL` 变量选择构建输出：Vercel 使用 Next.js 默认输出，本地与 Docker 使用 `standalone`。Next.js 16.3 的适配器与强制 `standalone` 存在兼容问题，不能在 Vercel 上同时启用。Vercel 不需要额外运行 `npm start`，也不需要新建含密钥的 `vercel.json`。[Next.js 问题记录](https://github.com/vercel/next.js/issues/96646)。

`package.json` 与锁文件已将 `engines.node` 固定为 `24.x`，避免平台新增 Node 主版本后自动升级。部署时仍应在日志确认实际使用版本。[Vercel Node.js 版本说明](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)。

## 4. 导入 env：一次加入 16 个变量

在新建项目页展开 **Environment Variables**，使用界面提供的 **Import .env** / 导入功能，选择 `.env.vercel.production`。不同版本界面可能提供粘贴 `.env` 文本的入口；没有文件按钮时，用本地编辑器打开该文件，把全部 `KEY=VALUE` 内容粘贴到环境变量批量输入框。

已有项目则进入项目的 **Environment Variables** 页面（部分界面位于 Settings 下），添加或批量导入。

1. 环境选择 **Production**。如果新建项目页没有范围选项，项目创建后立刻在环境变量页面检查，并去掉 Preview / Development 的生产凭据。
2. 检查生成的是下表中的 **16 行独立变量**，不是将整段文本保存成一个变量。
3. 保存后再部署。若项目已经构建过，修改变量后必须 **Redeploy**，旧部署不会自动更新配置。[Vercel 环境变量说明](https://vercel.com/docs/environment-variables/managing-environment-variables)。

下面仅为说明，真实值以本机配置文件为准。表中的“已填入”不是要粘贴的值。

| 变量 | 本次配置 | 说明 |
| --- | --- | --- |
| `APP_URL` | `https://academy.brclio.com` | 正式访问地址，不带页面路径 |
| `DATA_DRIVER` | `github` | Vercel 必须使用此模式 |
| `DATA_ENCRYPTION_KEY` | 已生成并填入 | Base64 编码的 32 字节密钥，写入数据后不要随意更换 |
| `GH_DATA_TOKEN` | 已填入提供的令牌 | 仅服务端使用 |
| `GH_DATA_OWNER` | `Brclio` | 数据仓库所属组织 |
| `GH_DATA_REPO` | `academy-private-data` | 仓库名，不填完整 URL |
| `GH_DATA_BRANCH` | `main` | 已确认存在 |
| `GH_DATA_PATH` | `academy.enc.json` | 仓库内文件路径 |
| `MAIL_TRANSPORT` | `smtp` | 启用真实邮件通道 |
| `MAIL_FROM` | `Brclio Academy <huangwantangbaby@gmail.com>` | 与发信账户一致 |
| `SMTP_HOST` | `smtp.gmail.com` | Gmail SMTP |
| `SMTP_PORT` | `465` | 隐式 TLS |
| `SMTP_SECURE` | `true` | 与 465 配套 |
| `SMTP_USER` | `huangwantangbaby@gmail.com` | 完整 Gmail 地址 |
| `SMTP_PASS` | 已填入提供的应用专用密码 | 已去掉显示用的分组空格 |
| `TRUST_PROXY` | `0` | 本项目会单独识别 Vercel 的代理头 |

本项目不读取 `DATABASE_URL`、`NEXTAUTH_SECRET` 或 `SESSION_SECRET`，不需要添加。当前方案也不用填写 `SQLITE_PATH`、`DEV_MAIL_FILE`、`RESEND_API_KEY`。不要把任何凭据改成 `NEXT_PUBLIC_*`；不要导入 `ADMIN_PASSWORD`，它只在一次性的本地初始化命令中使用。

Gmail 这里使用的是 **应用专用密码**，不是网站管理员密码，也不是普通 Google 登录密码。Google 应用专用密码要求开启两步验证；修改 Google 主密码后，旧应用专用密码可能失效。[Google 官方说明](https://support.google.com/accounts/answer/185833)。

## 5. 部署并绑定 academy.brclio.com

1. 点击 **Deploy**，等待 Deployment 状态变为 **Ready**。出错时先看 Build Logs。
2. 打开项目 **Settings → Domains**（或项目侧栏 Domains），添加 `academy.brclio.com`，关联 Production。
3. 在管理 `brclio.com` DNS 的平台按 Vercel 页面显示的要求添加记录。子域名通常使用 CNAME，主机记录为 `academy`；**记录目标必须复制当前 Vercel 页面给出的值**，不要猜测或照抄旧教程的地址。
4. 如提示 TXT 验证，按当前页面补充。只配置所需的 `academy` 记录，不需要为了这个子域名更换整个域名的 Nameserver 或改动邮件记录。
5. 等待 Vercel 显示 **Valid Configuration**、HTTPS 证书可用，再打开 `https://academy.brclio.com`。
6. 确认 Production 环境中的 `APP_URL` 仍是 `https://academy.brclio.com`。只添加域名而未改环境变量时通常不需要为此重新构建；如果修改了 `APP_URL` 或其他变量，则必须重新部署。

[Vercel 自定义域名官方教程](https://vercel.com/docs/domains/set-up-custom-domain)。本教程没有代为创建 DNS 记录或绑定域名。

### 为什么 vercel.app 首页能打开，登录却可能失败？

本项目对写入请求检查 `Origin`，只接受 `APP_URL` 对应的网址。文件已经设置正式域名，所以从临时 `*.vercel.app` 地址提交注册、登录或后台操作，会出现“请求来源校验失败”。

优先等正式域名可用后，从正式域名测试。如果确实要先测试 Vercel 分配的网址，把 Production 的 `APP_URL` 临时改成**实际完整的 `https://…vercel.app` 地址**，保存并 Redeploy；切回正式域名时再改回、再 Redeploy。本项目没有自动接受所有 Preview 域名的逻辑。

## 6. 创建第一个网站管理员

env 配置不会自动创建管理员。网站管理员密码需要另外设置，至少 10 位；不要使用 Gmail 应用专用密码作为网站登录密码。

在自己的电脑打开终端，进入网站代码目录，确保已安装 Node.js 24 和依赖：

```bash
cd /Users/huangjiabao/GitHub/Brclio-Academy
npm ci
```

如果在其他电脑操作，先获取代码，并将私密 `.env.vercel.production` 安全复制到代码根目录，再使用该电脑的实际路径。

以下命令明确读取部署文件，不覆盖现有 `.env.local`。它会真实写入 GitHub 数据仓库，建立管理员和初始示例数据。`bash -c` 让 Mac 默认 zsh 也能使用同样的隐藏输入方式；密码只存在这个子进程内：

```bash
bash -c '
set -e
read -r -s -p "设置网站管理员密码（至少 10 位，输入不显示）：" ADMIN_PASSWORD
printf "\n"
export ADMIN_PASSWORD
node --env-file=.env.vercel.production --import tsx scripts/admin.ts --email huangwantangbaby@gmail.com --name Brclio
'
```

看到“管理员已创建”后，在数据仓库刷新，应该出现 `academy.enc.json`。这是加密数据，不需要手动编辑。打开 `https://academy.brclio.com/login`，用该邮箱和**刚设置的网站密码**登录，再进入 `/admin`。

如果同一个邮箱已经注册并验证，运行提升命令，保留原来的网站密码：

```bash
node --env-file=.env.vercel.production --import tsx scripts/admin.ts --email huangwantangbaby@gmail.com --promote
```

未验证的现有账号要先完成邮箱验证。重复执行创建命令不会覆盖旧账号或重设密码。

管理员可进入后台，但课程学习仍需要有效 VIP；在“成员”中找到自己，设置未来的 VIP 截止时间。本步骤不需要把管理员密码存到 Vercel。

## 7. 完成线上验收

从 `https://academy.brclio.com` 执行以下步骤。Vercel 显示 Ready 仅说明部署完成，还需要验证这些实际功能。

- [ ] 以一个可收信的普通邮箱发起注册，收到真实验证码并完成验证。验证码 10 分钟内有效，重新发送至少间隔 60 秒。
- [ ] 退出、重新登录，检查会话正常。
- [ ] 使用“忘记密码”完成重置，确认旧密码失效、新密码可登录。
- [ ] 管理员进入 `/admin`，为学员设置未来的 VIP 截止时间。
- [ ] 学员打开课程、播放视频、保存笔记或学习记录；刷新或重新登录后数据仍在。
- [ ] 管理员撤销测试账号 VIP 后，学员新的受保护请求被拒绝。
- [ ] 数据仓库出现加密文件的提交，Vercel Runtime Logs 没有 GitHub 写入、SMTP 或来源校验错误。

YouTube 视频自身的可见性与嵌入权限仍由 YouTube 决定，网站 VIP 不能替代 YouTube 私享授权。

## 8. 常见问题

| 现象 | 检查与处理 |
| --- | --- |
| 构建末尾报 `ENOENT .next/next-server.js.nft.json` | 更新代码，确认 `next.config.ts` 使用 `output: process.env.VERCEL ? undefined : 'standalone'`，再部署包含此修复的新提交；只重试旧提交不会应用本地修复。无需修改 env 或手工补空文件 |
| GitHub 401 / Bad credentials | Token 失效、被撤销或复制不完整；替换 `GH_DATA_TOKEN`，再 Redeploy |
| GitHub 403 / 无法写入 | 检查 Contents 读写权限、组织批准、分支规则和 API 限流；只读检查成功不代表可写 |
| GitHub 404 / 数据仓库读取失败 | 核对 owner、repo、令牌能访问的仓库、真实分支；分支不存在也可能表现为 404 |
| 首页正常，但登录报“请求来源校验失败” | 浏览器域名必须与 `APP_URL` 一致；改变量后 Redeploy，并从正式域名访问 |
| 报“服务地址未配置” | Production 是否缺少 `APP_URL`，格式是否为完整 HTTPS URL，最新部署是否使用新变量 |
| 报 Vercel 不支持 SQLite | `DATA_DRIVER` 应为 `github`；检查是否误导入开发配置，保存后 Redeploy |
| SMTP 535 / Invalid login | 核对应用专用密码、分组空格、两步验证和密码是否撤销；不要填 Google 主密码 |
| SMTP 超时或验证码未到达 | 查看 Runtime Logs，确认 host/465/true；检查垃圾箱、发信限制；本机认证成功不能替代 Vercel 实际收件验证 |
| SMTP 使用 587 | 必须同时改 `SMTP_PORT=587`、`SMTP_SECURE=false`，本项目会要求 STARTTLS |
| 解密失败 / 无法认证数据 | 检查是否换了 `DATA_ENCRYPTION_KEY` 或指向另一库；恢复原密钥，不要删除正式数据重建 |
| 账号已存在 | 已验证账号用 `--promote`；忘记密码从网站重置 |
| 管理员能进后台却不能学习 | 还要为这个账号设置有效 VIP |
| Preview 部署无法操作 | 当前生产配置仅用于 Production；Preview 需要独立配置和稳定的预览 origin |

## 9. 后续更新、预览和备份

日常代码更新：推送代码仓库的生产分支，检查 Vercel 新部署。环境变量变更：保存后 Redeploy。更新代码不会自动覆盖已有课程数据。

Preview 不要与 Production 共用同一个可写数据文件。需要测试时使用独立私有仓库，或已创建的独立分支/文件；设置与该预览站点一致的 `APP_URL`，保留对应密钥并使用测试邮件配置。当前没有为 Preview 填入生产凭据。

在网站代码根目录导出一份本地加密备份，文件名每次使用新的日期，已有文件不会被覆盖：

```bash
node --env-file=.env.vercel.production --import tsx scripts/data.ts export --file .data/academy-backup-2026-09-16.enc.json
```

同时单独备份 `DATA_ENCRYPTION_KEY`。没有这把密钥，仅有加密文件无法恢复数据。令牌和 SMTP 密码更新不需要改变数据密钥。

GitHub 存储适合小规模、低频写入；当前实现每次变更提交整个文件，并在加密文件超过 950,000 字节时拒绝写入。频繁学习记录、较多并发或接近容量阈值时，按[通用部署与迁移文档](DEPLOYMENT.md)迁移到持久化服务器 SQLite。

另有[网页版教程](vercel-deployment.html)，包含目录、可复制命令和验收勾选。教程不包含真实密码、Token 或加密密钥。
