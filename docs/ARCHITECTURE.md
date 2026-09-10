# 架构与运行边界

## 应用结构

应用使用 Next.js App Router 与 Node.js 服务端。浏览器请求统一 API，API 负责认证、授权、数据验证和序列化，再调用存储适配器。浏览器不持有 GitHub 令牌、邮件凭证或数据库密钥。

```text
浏览器页面
  ├─ 公开目录、文章、专栏
  ├─ 注册、登录、找回密码
  ├─ VIP 学习页、进度、笔记
  └─ 管理后台
          ↓ 同源 API
认证 / 权限 / 输入验证
          ↓ Store.read / Store.mutate
  ├─ SQLite：单机持久化，事务更新
  └─ GitHub：私有仓库，AES-256-GCM，SHA 冲突重试

邮件：服务端 → SMTP 或 Resend
视频：VIP 校验后取得视频 ID → YouTube iframe
```

核心文件为 `src/lib/api.ts`、`auth.ts`、`security.ts`、`validation.ts`、`store.ts`、`mail.ts`、`seed.ts`、`types.ts`。管理 CLI 在 `scripts/`，部署配置在项目根目录。

## 认证与邮箱验证

- 六位随机验证码按用途区分注册与找回密码，有效期 10 分钟，同一邮箱与用途发送间隔至少 60 秒，最多 5 次错误尝试。
- 验证码采用独立随机盐和 scrypt 哈希；注册成功后创建已验证用户并消费验证码。密码也用独立随机盐和 scrypt 保存。
- 会话令牌为随机值，仅 Cookie 持有原始值，数据库保存 SHA-256 哈希。Cookie 为 HttpOnly、SameSite=Lax，生产环境附带 Secure。
- 会话固定有效期 30 天；每个账号保留最近最多 10 个会话。找回密码成功后清除该账号旧会话。
- 发送、注册、登录、重置采用邮箱维度与客户端维度的持久化限流。代理 IP 只有在 Vercel 或明确启用可信代理模式时才读取。
- 状态变更接口要求请求 `Origin` 与 `APP_URL` 的 origin 相同。生产环境必须设置 `APP_URL`。

开发 console 邮件仅用于本地验证。配置 `DEV_MAIL_FILE` 时只允许写入项目 `.data/`；生产模式拒绝 console。真实邮件服务返回成功说明接受了发送请求，收件箱最终送达仍需实测。

## 权限与数据投影

公共课程目录只输出课程介绍、章节标题和课时的 `id/title/kind/duration`，不输出课时正文、视频 ID 或资源。文章目录不含正文；VIP 文章全文与课程课时都在服务端检查当前到期时间。管理员接口独立检查角色，不把普通用户传来的身份或 VIP 状态当作事实。

VIP 不是前端开关。数据库存储 `vipExpiresAt`，只有 `vipExpiresAt > 当前服务端时间` 才有效。每次课时读取、进度写入和笔记写入都会重新判断。用户只能访问自己的进度、收藏与笔记。课程和文章下架后，新请求无法继续取得对应正文。

已交付到浏览器的内容无法通过到期时间收回。YouTube Unlisted 视频允许拥有链接的人观看和继续分享，Private 视频需要 YouTube 侧指定账号授权；网站 VIP 与 YouTube 权限是不同系统。使用 Unlisted 的方案不具备 DRM 或防录屏能力。[YouTube 官方说明](https://support.google.com/youtube/answer/157177?hl=zh-Hans)

## 内容模型

- Course 包含多个有序 Chapter，每个 Chapter 包含多个有序 Lesson。
- Lesson 为视频或图文，可以有多段 YouTube 视频和资源链接。
- Progress 按用户、课程与课时保存，包含片段索引、秒数、完成状态和更新时间。
- Note 保存用户在该课时的个人笔记；Bookmark 是用户与课程的关系。
- Column 组织文章，Article 支持独立或专栏归属、公开或 VIP 正文、顺序与发布状态。
- Audit 保存管理员操作记录，常规后台写入保留最近 2000 条。

ID 是持久化关联键，标题和数组顺序可变。API 使用 Zod 校验输入，限制内容大小，拒绝重复章节与课时 ID、非法 URL 和视频 ID。文章和课文通过 Markdown 渲染，不执行正文里的 HTML 脚本。

## SQLite 适配器

使用 Node 内置 `node:sqlite` 的 DatabaseSync。当前是单行 JSON 文档模型：`academy_state` 保存完整业务状态，启用 WAL 与 busy timeout，每次 mutation 使用 `BEGIN IMMEDIATE`、校验、更新、提交。同步 mutation 回调不能发邮件或进行网络操作。

这种实现让两个数据驱动共用同一个业务模型，适合初始版本和单机部署。它不是把每个实体拆成独立 SQL 表的查询系统；数据规模增长后，应该迁移为按实体建表、索引与局部更新。文件本身不加密，主机权限、卷备份和磁盘保护由部署环境负责；CLI 导出文件单独加密。

本地 SQLite 必须使用持久化磁盘。Vercel Functions 无法为不同函数实例提供共享持久化本地文件，本项目因此主动拒绝 Vercel + SQLite。[Vercel 官方说明](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)

## GitHub 适配器

每次 snapshot 验证数据仓库为私有，再通过 Contents API 读取文件。业务文档使用 AES-256-GCM 加密：随机 12 字节 IV、认证标签、密文和固定格式标识，认证附加数据绑定 `brclio-academy-v1`。密钥为环境变量中的 Base64 编码 32 字节值。

写入携带最新文件 SHA；409/422 冲突时重新获取状态并重放同步纯函数，最多尝试 7 次。更新不能盲写旧副本。邮件发送在事务回调之外执行，避免重试重复发送。[GitHub Contents API](https://docs.github.com/en/rest/repos/contents)

当前实现要求 Contents 响应内含 Base64 文件内容，并在加密文件超过 950,000 字节时拒绝写入，留出 API 1 MB 内嵌内容边界前的余量。每次会话、限流、进度或笔记写入都会产生一次仓库提交；高频提交会带来延迟、限流与历史增长。应将该驱动用于小规模低频场景，不承诺无上限并发或用户数量。

正式扩容前应迁移到服务器 SQLite，或开发 Postgres 等适配器。不要在达到写入上限后才开始准备迁移；定期检查加密文件大小、错误率和请求延迟。

## 加密备份与恢复

`data:export` 从当前适配器读取一致的业务快照，用同一 AES-256-GCM 格式写入新文件，并拒绝覆盖已有目标。`data:import --replace` 校验解密结果后替换目标数据，清除会话和验证码，要求用户重新登录。

Git 历史会保存旧密文；删除一个当前字段不会清除历史副本。保留数据仓库、密钥与备份的访问边界，按自己的数据保留要求管理历史。备份密钥与备份文件分开保存。详细迁移步骤见 [部署教程](DEPLOYMENT.md)。

## 需要外部服务实际验收的项目

自动测试可以验证验证码流程、权限拒绝、数据隔离、持久化、加密和冲突处理。以下结果须在最终配置下完成：真实 SMTP/Resend 收信、提供的每段 YouTube 视频可播放及允许嵌入、GitHub 令牌权限与远端写入、正式 HTTPS 域名、备份恢复与代理配置。

本版本没有自动支付、逐课程售卖、文件上传存储、DRM、作业批改、评论审核或后台任务队列。需要这些能力时应接入相应服务并补充完整流程，不以占位按钮展示为已完成能力。
