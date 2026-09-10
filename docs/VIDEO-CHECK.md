# 示例视频元数据核验

本报告只读检查用户提供的全部 **19 个 YouTube 视频 ID**，未修改示例课程名称与视频链接。

- 开始时间（UTC）：2026-09-10T15:52:35.626Z
- 完成时间（UTC）：2026-09-10T15:52:37.905Z
- 方法：请求官方 YouTube oEmbed 接口，每次请求使用视频 watch 链接作为参数；最多 4 路并发，单次超时 10 秒。
- 结果：HTTP 200 共 19 个；其他 HTTP 状态共 0 个；未取得 HTTP 响应共 0 个。

| 视频 ID | HTTP 状态 | 接口返回的标题 | 备注 |
| --- | --- | --- | --- |
| [u13DKz6cnbo](https://www.youtube.com/watch?v=u13DKz6cnbo) | 200 | 零基础用AI做影片 1.1 | 已取得 oEmbed 元数据 |
| [QqvgGFEr1j0](https://www.youtube.com/watch?v=QqvgGFEr1j0) | 200 | 零基础用AI做影片 1.1 | 已取得 oEmbed 元数据 |
| [hJJ-gBs-xSg](https://www.youtube.com/watch?v=hJJ-gBs-xSg) | 200 | 零基础用AI做影片 1.2 | 已取得 oEmbed 元数据 |
| [fCwJtJnDw1s](https://www.youtube.com/watch?v=fCwJtJnDw1s) | 200 | 零基础用AI做影片 1.2 | 已取得 oEmbed 元数据 |
| [0RCQsNCF2Ag](https://www.youtube.com/watch?v=0RCQsNCF2Ag) | 200 | 零基础用AI做影片 2 | 已取得 oEmbed 元数据 |
| [cRjBvVDkCNU](https://www.youtube.com/watch?v=cRjBvVDkCNU) | 200 | 零基础用AI做影片 案例1：文字+视觉 | 已取得 oEmbed 元数据 |
| [CJQdwZZJWko](https://www.youtube.com/watch?v=CJQdwZZJWko) | 200 | 零基础用AI做影片 3.2 如何用AI生成配音 | 已取得 oEmbed 元数据 |
| [PDDhRaSVh2A](https://www.youtube.com/watch?v=PDDhRaSVh2A) | 200 | 零基础用AI做影片 3.3 剪辑+配乐 | 已取得 oEmbed 元数据 |
| [7U6_pmCI3xw](https://www.youtube.com/watch?v=7U6_pmCI3xw) | 200 | 零基础用AI做影片 4.1脚本+分镜 | 已取得 oEmbed 元数据 |
| [Zu0w5HIb8tI](https://www.youtube.com/watch?v=Zu0w5HIb8tI) | 200 | 零基础用AI做影片 4.2 生成静态图片 | 已取得 oEmbed 元数据 |
| [wEJsQWCvTTc](https://www.youtube.com/watch?v=wEJsQWCvTTc) | 200 | 零基础用AI做视频 4.3 图片转视频 | 已取得 oEmbed 元数据 |
| [dg0xrWk6P5M](https://www.youtube.com/watch?v=dg0xrWk6P5M) | 200 | 零基础用AI做视频 4.4 口播&音乐 | 已取得 oEmbed 元数据 |
| [MjlCEPIPHks](https://www.youtube.com/watch?v=MjlCEPIPHks) | 200 | 零基础用AI做视频 4.5 剪辑 | 已取得 oEmbed 元数据 |
| [yofJ2wmht6o](https://www.youtube.com/watch?v=yofJ2wmht6o) | 200 | 零基础用AI做视频 4.6 总结 | 已取得 oEmbed 元数据 |
| [91pIByAevSQ](https://www.youtube.com/watch?v=91pIByAevSQ) | 200 | 零基础用AI做视频 5.1 制作逻辑&参考案例 | 已取得 oEmbed 元数据 |
| [3U7j6oRsVgY](https://www.youtube.com/watch?v=3U7j6oRsVgY) | 200 | 零基础用AI做视频 5.2 模仿生成静态图 2.0 | 已取得 oEmbed 元数据 |
| [UZaiN03ilFg](https://www.youtube.com/watch?v=UZaiN03ilFg) | 200 | 零基础用AI做视频 5.3 静态图片转为动态 | 已取得 oEmbed 元数据 |
| [wjTz6ywBGz8](https://www.youtube.com/watch?v=wjTz6ywBGz8) | 200 | 零基础用AI做视频 5.4 配乐&剪辑&音效 | 已取得 oEmbed 元数据 |
| [J-VpB3F0LI4](https://www.youtube.com/watch?v=J-VpB3F0LI4) | 200 | 零基础用AI做视频 6.0 AI影片的未来？ | 已取得 oEmbed 元数据 |

## 如何理解结果

- **HTTP 200 只证明本次能获取 oEmbed 元数据，不证明视频在学习页面能够播放**，也不证明所有地区、设备或账号都有播放权限。嵌入播放还受视频所有者设置、地区限制、年龄限制及访问网络影响。
- oEmbed 的 HTTP 401、403、404 等失败状态或网络超时，**不能单独判定视频为私享、已删除或无法播放**；本报告保留原始状态，不推断未核实的可见性。
- “不公开 / Unlisted”与“私享 / Private”不同。前者通过链接提供访问；后者通常还需要视频所有者授予观看账号权限。oEmbed 的结果不足以可靠区分这两种设置。参见 [YouTube 官方视频隐私设置说明](https://support.google.com/youtube/answer/157177?hl=zh-Hans)。
- 本报告没有视频播放验证结论。实际嵌入播放应在部署环境中逐个检查，特别留意播放器显示的具体错误。

请求地址格式：

`https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D<VIDEO_ID>&format=json`
