# 设计来源

本项目按 Brclio Design System 的 App 场景模板改造。原始起点保存在 [brclio-app-template.html](brclio-app-template.html)，保留原始模板中的作者及许可证信息，便于核对布局来源。

- 设计系统：[Brclio / brclio-design-system](https://github.com/Brclio/brclio-design-system)
- 作者与品牌：Brclio（黄家宝），程序员 / 编程教育者 / 作者 / 独立开发者
- 署名：© 2026 Brclio
- 模板、设计系统与所附品牌资源协议：CC BY-NC-SA 4.0，署名、非商业性使用、相同方式共享
- 本地品牌资源：`public/brand/avatar.png`、`public/brand/character.png`

课程平台将模板的品牌变量、暖白纸面、蓝色重点、柔和辅助色与 App 导航结构适配为真实的目录、学习页、文章页与管理表单。品牌资源沿用固定来源，没有替换作者身份或添加未经提供的账号、成绩与背书。

原始设计规范位于本次开发环境的 `brclio-design-system` Skill。部署后的运行不依赖该 Skill 的本机路径，所需资源已随仓库交付。

## 最终界面核对

- 从保留的 App 模板变量、固定导航、标签、输入框与卡片结构改造；使用暖底与品牌蓝、黄、红点缀。
- 使用本地 Noto Serif SC / Noto Sans SC / Fraunces 字体，标题与正文区分；头像和 IP 角色复制自品牌源素材。
- 首页使用非对称精选区、课程集合与纵向文章列表；学习页为正文加目录；后台为内容列表加结构化编辑表单。
- 引用、列表、代码、表格、表单均有专门样式；外部 Markdown HTML 不执行。
- 1440px 桌面、390px 手机截图已核对；900px / 700px / 480px 断点重排内容；手机抽屉可键盘关闭，尊重 reduced motion。
- App 场景保持即时渲染，不加入教程式滚动显现；加载指示只在等待数据期间显示。

可查看 [桌面首页](../previews/home-desktop.png)、[手机首页](../previews/home-mobile.png)、[手机课堂](../previews/lesson-mobile.png)。
