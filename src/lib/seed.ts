import type { Article, Course, Database, Lesson } from './types';

// Server data only. Public catalog projections intentionally omit lesson bodies and video IDs.
const updatedAt = '2026-09-10T00:00:00.000Z';
const textLesson = (id: string, title: string, content: string): Lesson => ({
  id,
  title,
  duration: '图文课',
  kind: 'article',
  content,
  videos: [],
  resources: [],
});
const videoLesson = (id: string, title: string, ids: string[], task: string): Lesson => ({
  id,
  title,
  duration: '视频课',
  kind: 'video',
  content: `## 本节学习任务\n\n${task}\n\n## 边看边做\n\n1. 先阅读本节标题，写下你最想解决的一个问题。\n2. 观看视频，在关键位置暂停，用自己的素材完成一次练习。\n3. 在学习笔记里记录实际操作、遇到的问题和下一步。\n\n## 完成标准\n\n保存一份可检查的练习成果，并用三句话解释你的制作选择。完成后勾选本节，继续下一课。\n\n*视频链接与章节名称来自提供的示例目录；本页任务是配套练习建议，不是视频逐字稿。*`,
  videos: ids.map((videoId, i) => ({ id: videoId, title: ids.length > 1 ? `视频 ${i + 1}` : '观看视频' })),
  resources: [],
});
const exampleCourse = (
  details: Pick<
    Course,
    | 'id'
    | 'title'
    | 'subtitle'
    | 'description'
    | 'category'
    | 'level'
    | 'color'
    | 'cover'
    | 'outcomes'
    | 'chapters'
  >,
): Course => ({
  ...details,
  duration: '按自己的节奏',
  featured: false,
  published: true,
  demo: true,
  updatedAt,
});

const filmmaking: Course = {
  ...exampleCourse({
    id: 'ai-filmmaking',
    title: 'AI 影片创作：从想法到成片',
    subtitle: '把脑海里的画面，变成自己的作品。',
    description:
      '从课程目标与工具认识开始，按文字型影片、动画型影片、3D 广告型影片三个项目逐步练习。包含提供的全部 19 段 YouTube 视频，按 6 个章节、17 节课整理；前两节各含两段视频。',
    category: 'AI 创作',
    level: '入门 · 项目实践',
    color: 'blue',
    cover: 'film',
    outcomes: [
      '拆解脚本、分镜与视觉素材',
      '完成文字型、动画型与 3D 广告型三个练习',
      '整理配音、配乐、音效与剪辑工作流',
      '建立能反复使用的创作复盘清单',
    ],
    chapters: [
      {
        id: 'film-intro',
        title: '课程介绍 & 目标',
        lessons: [
          videoLesson(
            'film-01',
            '1.1 能学到什么？',
            ['u13DKz6cnbo', 'QqvgGFEr1j0'],
            '建立你的学习地图：选一个熟悉的主题，列出想做的影片形式、受众和最终交付物。两段视频分别观看，笔记保留自己的问题清单。',
          ),
          videoLesson(
            'film-02',
            '1.2 为什么要学用 AI 做影片',
            ['hJJ-gBs-xSg', 'fCwJtJnDw1s'],
            '把一个真实创作需求拆成脚本、画面、声音、剪辑四部分。标记适合让 AI 协助的步骤，以及仍需由你判断和检查的部分。',
          ),
        ],
      },
      {
        id: 'film-tools',
        title: 'AI 工具介绍',
        lessons: [
          videoLesson(
            'film-03',
            'AI 工具介绍 2',
            ['0RCQsNCF2Ag'],
            '建立工具记录表：记录输入形式、输出格式、你实际试过的效果和一个限制。先用少量素材完成最短流程，再决定要使用哪些工具。',
          ),
        ],
      },
      {
        id: 'film-text',
        title: '案例 1：文字型影片',
        lessons: [
          videoLesson(
            'film-04',
            '3.1 准备文字和视觉内容',
            ['cRjBvVDkCNU'],
            '以你熟悉的主题写一段短稿，将每一句对应到画面或字幕。先检查信息顺序，再收集或制作视觉素材；只使用自己有权使用的素材。',
          ),
          videoLesson(
            'film-05',
            '3.2 如何用 AI 生成配音',
            ['CJQdwZZJWko'],
            '为同一段文字设计平静讲述与重点强调两种朗读方式。试听后记录停顿、读音和语速问题，修改文字再生成一版用于比较。',
          ),
          videoLesson(
            'film-06',
            '3.3 剪辑 & 用 AI 生成配乐',
            ['PDDhRaSVh2A'],
            '把文字、画面、配音放入同一条时间线。加入适合情绪的配乐，分别检查开头、转场和结尾；在普通音量下确认每一句话都能听清。',
          ),
        ],
      },
      {
        id: 'film-animation',
        title: '案例 2：动画型影片',
        lessons: [
          videoLesson(
            'film-07',
            '4.1 准备脚本和分镜',
            ['7U6_pmCI3xw'],
            '为一个简单故事设计起因、变化和结果。每个镜头只承担一个信息点，记录主体、动作、景别、声音与衔接方式。',
          ),
          videoLesson(
            'film-08',
            '4.2 准备静态的图片',
            ['Zu0w5HIb8tI'],
            '选定角色、场景与画面比例，先制作关键镜头的静态图。并排检查角色服装、物体数量、颜色与光线是否一致。',
          ),
          videoLesson(
            'film-09',
            '4.3 讲图片转为视频',
            ['wEJsQWCvTTc'],
            '为每张静态图写出具体运动要求：哪个主体如何移动、镜头是否移动、哪些元素需要保持。逐段检查运动是否符合镜头目的。',
          ),
          videoLesson(
            'film-10',
            '4.4 用 AI 做口播 & 音乐',
            ['dg0xrWk6P5M'],
            '将口播和音乐分别试听，再合在一起检查。为重要信息预留停顿，确认音乐没有盖住人声，并记下需要重做的时间位置。',
          ),
          videoLesson(
            'film-11',
            '4.5 剪辑',
            ['MjlCEPIPHks'],
            '按分镜排列镜头，先完成一版能看懂故事的粗剪。再检查镜头衔接、节奏与声音，移除没有推动故事的信息。',
          ),
          videoLesson(
            'film-12',
            '4.6 总结',
            ['yofJ2wmht6o'],
            '导出动画练习后从头到尾观看一次。记录最有效的三个选择和需要返工的三个问题，把稳定有效的步骤整理成自己的制作清单。',
          ),
        ],
      },
      {
        id: 'film-3d',
        title: '3D 广告型影片',
        lessons: [
          videoLesson(
            'film-13',
            '5.1 制作逻辑 & 参考案例',
            ['91pIByAevSQ'],
            '选一个你熟悉的物件作为练习主角。写清它的外形特征、要表达的一个卖点和适合的使用场景，区分参考中的结构与具体素材。',
          ),
          videoLesson(
            'film-14',
            '5.2 模仿生成静态图',
            ['3U7j6oRsVgY'],
            '从参考中提炼构图、材质、背景和光线规律，为自己的物件生成静态画面。检查主体结构，避免为了画面效果改变物件的关键特征。',
          ),
          videoLesson(
            'film-15',
            '5.3 静态图片转为动态',
            ['UZaiN03ilFg'],
            '用明确的运动描述将静态图转为动态片段。检查物件形状、标识和材质是否在运动中保持稳定；失败片段记录原因并单独重做。',
          ),
          videoLesson(
            'film-16',
            '5.4 配乐 & 剪辑 & 音效',
            ['wjTz6ywBGz8'],
            '让配乐节奏、剪辑点和关键动作相互配合。只在能帮助观众理解动作时加入音效，最终检查画面清晰度、字幕边界和音量。',
          ),
        ],
      },
      {
        id: 'film-future',
        title: 'AI 影片的未来？',
        lessons: [
          videoLesson(
            'film-17',
            'AI 影片的未来？',
            ['J-VpB3F0LI4'],
            '回顾三个练习，区分能复用的创作方法与依赖具体工具的操作。写下下一部影片的主题、交付标准和最先验证的一个问题。',
          ),
        ],
      },
    ],
  }),
  featured: true,
};

const python = exampleCourse({
  id: 'python-first-project',
  title: 'Python 入门：做一个学习记录器',
  subtitle: '从第一行代码，到一个真的用得上的小工具。',
  description:
    '可直接跟做的图文示例课程。不依赖示例视频，用变量、条件、循环、函数与 JSON 文件完成命令行学习记录器。每节课都有代码或操作任务。',
  category: '编程入门',
  level: '零基础 · 图文',
  color: 'yellow',
  cover: 'python',
  outcomes: [
    '运行并解释一个 Python 程序',
    '用列表、字典保存结构化记录',
    '将记录写入 JSON 文件',
    '设计输入验证与基本自测',
  ],
  chapters: [
    {
      id: 'py-start',
      title: '让代码第一次跑起来',
      lessons: [
        textLesson(
          'py-01',
          '1.1 变量，是给信息起个名字',
          `## 先做一件小事\n\n在已安装 Python 3 的电脑上新建 study.py，把下面的内容保存进去，然后在该文件所在目录运行 python3 study.py。Windows 也可以使用 py study.py。\n\n\`\`\`python\ntopic = "Python 变量"\nminutes = 25\nprint(f"今天学习了 {topic}，共 {minutes} 分钟。")\n\`\`\`\n\n变量 topic 保存文字，minutes 保存整数。f 字符串会把花括号内的表达式换成实际的值。先修改内容、重新运行，观察输出的变化。\n\n## 练习\n\n增加变量 goal_minutes = 40，再计算还差多少分钟。你可以使用 goal_minutes - minutes。\n\n## 自测\n\n将 minutes 改成 45 后，输出会是负数。这在语法上没有问题，但产品应该怎样表达？把问题留下，下一节处理。`,
        ),
        textLesson(
          'py-02',
          '1.2 输入和条件：让程序回应你',
          `## 接收输入\n\ninput 返回字符串；需要计算时，先转换成数字。对于可能失败的转换，要告诉用户怎样修正输入。\n\n\`\`\`python\nraw = input("今天学了多少分钟？ ")\ntry:\n    minutes = int(raw)\n    if minutes <= 0:\n        print("请输入大于 0 的整数。")\n    elif minutes >= 40:\n        print("今天的学习目标已完成。")\n    else:\n        print(f"距离目标还差 {40 - minutes} 分钟。")\nexcept ValueError:\n    print("请输入整数，例如 25。")\n\`\`\`\n\n## 练习\n\n依次输入 25、40、45、0、hello，核对每个结果。不要只试正常输入。\n\n## 完成标准\n\n程序不会因为文字输入直接显示错误堆栈；小于目标、达到目标、无效输入三种情况都有明确反馈。`,
        ),
      ],
    },
    {
      id: 'py-data',
      title: '把一次练习变成多条记录',
      lessons: [
        textLesson(
          'py-03',
          '2.1 用列表和字典整理记录',
          `## 为一条记录设计结构\n\n字典把字段名和值放在一起，列表按顺序保存多条记录。先使用少量固定数据，确认结构适合你的需求。\n\n\`\`\`python\nrecords = [\n    {"topic": "变量", "minutes": 25},\n    {"topic": "条件", "minutes": 35},\n]\ntotal = 0\nfor record in records:\n    print(record["topic"], record["minutes"])\n    total += record["minutes"]\nprint(f"累计学习 {total} 分钟")\n\`\`\`\n\n## 练习\n\n新增一条循环的学习记录。给每条记录加 date 字段，使用 2026-09-10 这样的格式。\n\n## 自测\n\n把 records 临时改成空列表，累计结果应该为 0。保留统一字段名称，避免一处写 minute、另一处写 minutes。`,
        ),
        textLesson(
          'py-04',
          '2.2 用函数分开输入与统计',
          `## 把规则写成可以重复调用的函数\n\n统计函数只负责处理数据，不负责读键盘。这样可以用固定输入检查它是否正确。\n\n\`\`\`python\ndef total_minutes(records):\n    return sum(item["minutes"] for item in records)\n\nassert total_minutes([]) == 0\nassert total_minutes([{"minutes": 20}, {"minutes": 15}]) == 35\n\`\`\`\n\n## 练习\n\n编写 records_for_date(records, date) 函数，返回 date 字段与参数相同的记录。先创建三条、两天的数据，确认筛选结果。\n\n## 完成标准\n\n统计函数不依赖全局变量。你能解释参数、返回值和调用之间的关系，并用空列表检查边界情况。`,
        ),
      ],
    },
    {
      id: 'py-project',
      title: '保存结果，交付第一个小工具',
      lessons: [
        textLesson(
          'py-05',
          '3.1 用 JSON 保存与恢复',
          `## 让程序记住上次的记录\n\nJSON 可以保存文字、数字、列表和字典。此练习使用当前目录的 study-records.json，先备份同名文件再运行。\n\n\`\`\`python\nimport json\nfrom pathlib import Path\n\npath = Path("study-records.json")\nif path.exists():\n    records = json.loads(path.read_text(encoding="utf-8"))\nelse:\n    records = []\n\nrecords.append({"date": "2026-09-10", "topic": "JSON", "minutes": 25})\npath.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")\nprint(f"已经保存 {len(records)} 条记录")\n\`\`\`\n\n## 练习\n\n连续运行两次，检查条目数变化。接着去掉固定追加那一行，改用前面章节中的键盘输入。\n\n## 下一步\n\n文件损坏时 json.loads 会失败。遇到这种情况应显示“文件无法读取，请检查或恢复备份”，不要把空列表写回并覆盖原文件。`,
        ),
        textLesson(
          'py-06',
          '3.2 完成记录器并写使用说明',
          `## 你的最终项目\n\n把输入、验证、记录保存与统计连接起来，做成有三个选项的命令行菜单：添加记录、查看统计、退出。使用 while 循环重复显示菜单，用 break 结束。\n\n## 验收清单\n\n- 新目录第一次运行时能够创建数据文件。\n- 添加两条记录，退出重启后依然存在。\n- 无效分钟数不会写入文件。\n- 空数据时统计结果为 0。\n- 读取失败时保留原文件，并显示清楚的处理提示。\n\n## 交付\n\n创建 README.md，写清运行命令、支持的输入、数据文件位置，以及一次完整操作示例。最后请朋友仅依据说明试用一次，记录他停住的位置。\n\n## 拓展任务\n\n加入按日期查询、删除前确认与导出 Markdown。每次只加一项，并重新执行上面的验收清单。`,
        ),
      ],
    },
  ],
});

const website = exampleCourse({
  id: 'build-personal-website',
  title: '做自己的第一个个人网站',
  subtitle: '把你的作品、想法和联系方式放在一起。',
  description:
    '从内容取舍到 HTML、CSS 与发布前检查的图文实践课程。以一页个人作品站为目标，先让信息和链接真正有用，再打磨视觉与小屏体验。',
  category: 'Web 开发',
  level: '入门 · 图文',
  color: 'green',
  cover: 'web',
  outcomes: [
    '建立有语义的 HTML 页面',
    '完成响应式作品布局',
    '让导航和联系方式可用',
    '执行内容、键盘与小屏检查',
  ],
  chapters: [
    {
      id: 'web-plan',
      title: '先决定你想说什么',
      lessons: [
        textLesson(
          'web-01',
          '1.1 把网站写成一张内容地图',
          `## 定义访问者的一次任务\n\n为个人站选择一个主要目的：让人理解你做什么、查看作品，或联系你。把目的写成“访问者读完后，可以……”的一句话。\n\n## 内容草图\n\n在纸上划出自我介绍、代表作品、关于我、联系四个区域。每个区域只写最必要的内容。作品至少包括问题、你的做法、结果与可查看链接。\n\n## 练习\n\n把“我热爱技术，追求卓越”改成具体描述，例如“我用 Python 整理学习数据，下面是我完成的记录工具”。没有公开链接的作品，说明当前状态。\n\n## 完成标准\n\n每个区域都回答访问者的一个问题。标题脱离图片后仍然可理解；没有虚构成绩、未发布产品或无用途按钮。`,
        ),
        textLesson(
          'web-02',
          '1.2 用语义 HTML 建立页面',
          `## 保存为 index.html\n\n先建立可阅读、可点击的结构。下面的片段可以作为正文的起点。\n\n\`\`\`html\n<header>\n  <a href="#main">跳到正文</a>\n  <nav aria-label="主要导航"><a href="#work">我的作品</a></nav>\n</header>\n<main id="main">\n  <h1>你好，我是你的名字</h1>\n  <p>在这里写一句具体的自我介绍。</p>\n  <section id="work" aria-labelledby="work-title">\n    <h2 id="work-title">我的作品</h2>\n    <article><h3>学习记录器</h3><p>记录我每天学了什么。</p></article>\n  </section>\n</main>\n\`\`\`\n\n完整文件还应包含 doctype、html lang="zh-CN"、head、字符集与页面标题。在浏览器打开文件，点击导航确认能到达作品区域。\n\n## 练习\n\n补充第二个作品和联系方式。图片使用说明画面含义的 alt；纯装饰图片使用空 alt。`,
        ),
      ],
    },
    {
      id: 'web-style',
      title: '让内容在不同屏幕上清楚呈现',
      lessons: [
        textLesson(
          'web-03',
          '2.1 从字体、间距和颜色开始',
          `## 建立少量可复用规则\n\n新建 style.css，并在 HTML 的 head 内通过 link 引入。先统一字号、行高和页面宽度。\n\n\`\`\`css\n:root { --ink: #222; --paper: #faf9f6; --accent: #2453d4; }\n* { box-sizing: border-box; }\nbody { margin: 0; color: var(--ink); background: var(--paper);\n  font-family: system-ui, sans-serif; line-height: 1.7; }\nmain, header { width: min(100% - 2rem, 64rem); margin-inline: auto; }\nsection { padding-block: 3rem; }\na { color: var(--accent); text-underline-offset: .2em; }\na:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }\n\`\`\`\n\n## 练习\n\n用统一间距区分标题、正文与区域。把长段落拆成围绕一个意思的短段落，避免整页居中排长文。\n\n## 完成标准\n\n关闭图片后仍然能理解页面。正文在普通屏幕亮度下可读，链接同时具备可识别的视觉样式和键盘焦点。`,
        ),
        textLesson(
          'web-04',
          '2.2 让作品列表适应小屏幕',
          `## 用内容决定列数\n\n为作品外层添加 works 类，为每个作品添加 work-card 类。Grid 可以根据可用宽度自动换行。\n\n\`\`\`css\n.works { display: grid; gap: 1.5rem;\n  grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); }\n.work-card { padding: 1.5rem; border: 1px solid #d4d2cc; border-radius: .75rem; }\nimg { display: block; max-width: 100%; height: auto; }\n\`\`\`\n\n同时在 head 内加入 viewport 设置：name 为 viewport，content 为 width=device-width, initial-scale=1。\n\n## 练习\n\n分别用手机宽度和桌面宽度查看。加入一条很长的标题与链接，观察是否出现横向溢出，必要时对链接设置 overflow-wrap: anywhere。\n\n## 完成标准\n\n窄屏不需要左右拖动。作品顺序符合重要程度；缩放到 200% 后仍可阅读和点击。`,
        ),
      ],
    },
    {
      id: 'web-ship',
      title: '完成一次可以交付的检查',
      lessons: [
        textLesson(
          'web-05',
          '3.1 让每一个链接都有去处',
          `## 检查交互的真实结果\n\n建立一份链接表，记录每个导航、作品入口和联系方式的目标地址。只有实际存在的目标才显示为链接；开发中的内容用普通文字说明。\n\n## 练习\n\n按 Tab 键遍历整页，用 Enter 打开每个链接。检查页面内跳转目标是否存在、外链是否正确、邮箱拼写是否准确。\n\n如果使用 mailto 链接，它会请求打开访问者的邮件客户端，不代表已经发送邮件。也可以直接显示可复制邮箱地址。不要放置没有后端接收能力的“提交成功”表单。\n\n## 完成标准\n\n没有 href="#" 的占位入口。没有仅靠鼠标悬停才能发现的重要内容。每个按钮都有明确动作，表单状态与真实请求结果一致。`,
        ),
        textLesson(
          'web-06',
          '3.2 发布前后各做一次验收',
          `## 发布前\n\n- 检查姓名、作品描述、日期与联系信息。\n- 检查所有图片路径、大小写和文件是否一并上传。\n- 用窄屏、宽屏、键盘分别走一遍访问流程。\n- 确認目录没有密码、令牌或私人资料。\n\n## 发布后\n\n在新的浏览器会话里打开线上地址，重复检查导航、图片和作品链接。把“本地正常”和“线上正常”分别记录，只有打开实际地址验收后才标记发布完成。\n\n## 交付物\n\n保留网站源文件、资源目录、一页维护说明和本次验收记录。维护说明至少写出如何修改作品、如何预览、如何重新发布。\n\n## 拓展\n\n下一次增加功能前，先收集一次真实使用反馈。优先修正访问者看不懂或点不到的部分。`,
        ),
      ],
    },
  ],
});

const workflows = exampleCourse({
  id: 'ai-workflow-foundations',
  title: '建立你的 AI 工作流',
  subtitle: '把偶尔好用的提示，变成稳定的工作方法。',
  description:
    '以整理资料与写作两个日常任务为载体的图文示例。练习定义输入、输出标准、来源核对与人工复核，交付一份可以复用的工作流模板。',
  category: '效率方法',
  level: '通识 · 图文',
  color: 'pink',
  cover: 'workflow',
  outcomes: [
    '把任务拆成有输入输出的步骤',
    '写出可检查的提示与验收标准',
    '区分来源事实、推断与待核实内容',
    '用小样本验证并迭代流程',
  ],
  chapters: [
    {
      id: 'ai-define',
      title: '先把问题说清楚',
      lessons: [
        textLesson(
          'ai-01',
          '1.1 写一份最小任务说明',
          `## 从真实任务开始\n\n选一项你每周重复做的工作，例如把三篇资料整理成一页学习笔记。记录当前输入、耗时步骤、最终交付格式和最常见的错误。不要一开始就追求全自动。\n\n## 任务说明模板\n\n- 背景：这份内容给谁看，用来做什么？\n- 输入：有哪些实际可用的资料？\n- 输出：标题、摘要、证据和行动项分别需要什么？\n- 约束：不能新增哪些信息？哪些内容要保留原意？\n- 验收：别人怎样判断它可以交付？\n\n## 练习\n\n为你的任务填写模板，再把“尽量详细”替换为具体字段与范围。例如“列出 3 个要点，每点附对应资料位置”。\n\n## 完成标准\n\n另一位同学只读任务说明就知道要交什么，并能指出目前缺少的输入。`,
        ),
        textLesson(
          'ai-02',
          '1.2 把长任务拆成可检查的步骤',
          `## 画出输入到输出的路径\n\n以资料笔记为例：收集原文 → 提取事实 → 合并重复点 → 写初稿 → 核对来源 → 人工定稿。每一步都保存输出，出现问题时可以定位到具体环节。\n\n## 练习\n\n建立五列表：步骤、输入、输出、完成标准、失败处理。对“提取事实”，输出可以是事实表；失败处理可以是保留原文片段并标记待人工核实。\n\n## 判断是否该拆分\n\n如果一个步骤同时要求找资料、下结论和改写，先分开。拆分不是为了步骤多，而是让每一阶段都有可检查的结果。\n\n## 完成标准\n\n流程中没有没有来源的事实，也没有自动通过的最后一步。你能够从一段结论反查到具体输入。`,
        ),
      ],
    },
    {
      id: 'ai-verify',
      title: '让输出有依据，也有边界',
      lessons: [
        textLesson(
          'ai-03',
          '2.1 给提示加上示例与检查规则',
          `## 一份可以复用的提示骨架\n\n将变量单独放在输入区，不把它们散落在长段落里。规则应该能根据输出判断是否满足。\n\n\`\`\`text\n任务：把下面资料整理成学习卡片。\n受众：刚接触该主题的学习者。\n规则：只使用输入资料中的事实；缺失信息写“资料未提供”。\n输出字段：核心问题、三个要点、对应来源、一个练习。\n检查：每个要点都能对应到输入中的一句话或一段内容。\n输入资料：\n[在这里放入你有权使用的原文与来源标识]\n\`\`\`\n\n## 练习\n\n给模型一篇很短的原文，再故意问一个原文没有回答的问题。检查输出是否明确说明信息不足。\n\n## 完成标准\n\n把符合要求的结果保存成示例，同时保存一个失败案例。后续修改提示时，用这两个案例回归检查。`,
        ),
        textLesson(
          'ai-04',
          '2.2 分开事实、推断和待核实内容',
          `## 给每项结论一个状态\n\n整理资料时使用三类标记：来源明确支持的事实、基于事实作出的推断、当前资料不足的待核实项。推断要写出依据，待核实项要写出缺什么。\n\n## 练习\n\n选取一份 AI 输出，逐句核对来源。对数字、日期、产品能力和引用做单独检查；找不到原始来源的内容先移到待核实列表。\n\n## 核对记录\n\n每条记录至少包括：结论、来源位置、状态、核对人或核对时间。来源发生更新时，保留当时查看的日期。\n\n## 完成标准\n\n读者能区分“资料说了什么”和“你据此认为怎样”。如果结论无法核实，就缩小表达范围或删除，不让语言流畅度替代证据。`,
        ),
      ],
    },
    {
      id: 'ai-repeat',
      title: '把好用的一次变成能复用的多次',
      lessons: [
        textLesson(
          'ai-05',
          '3.1 用小样本比较流程版本',
          `## 建立一组代表性输入\n\n选择一份短资料、一份长资料、一份信息不完整的资料。对同样的三份输入分别运行旧流程和新流程，保存输出，避免只挑最好看的一次。\n\n## 评分维度\n\n- 准确：结论能否回到来源？\n- 完整：约定字段是否齐全？\n- 可用：是否直接解决实际任务？\n- 返工：还需要你修正多少问题？\n\n每项用 0、1、2 分表示不满足、部分满足、满足，并写一句评分理由。\n\n## 练习\n\n只改一个变量，例如增加输出示例，再比较结果。记录改善了什么、退步了什么，以及是否值得增加这一段提示。\n\n## 完成标准\n\n能用实际输出解释选择某个版本的原因，而不是只说“感觉更智能”。`,
        ),
        textLesson(
          'ai-06',
          '3.2 交付你的第一份工作流手册',
          `## 把流程交给下一个使用者\n\n用一页文档写清任务适用范围、必需输入、步骤、提示模板、验收标准与失败处理。将一份真实运行样例作为附件。\n\n## 演练\n\n请另一位同学按文档操作一次。只观察他在哪一步停住，先不口头补充说明。把必须解释的内容补回文档。\n\n## 维护规则\n\n每次修改标注日期、变动原因和验证结果。保留旧版本与示例输入，避免更新提示后失去可比较的基线。涉及个人信息的资料，先确认必要字段，并在共享样例中去除身份信息。\n\n## 最终交付\n\n一份流程手册、三份样例输入与输出、一份检查记录。完成后回到学习中心，写下你下一周准备重复运行的实际任务。`,
        ),
      ],
    },
  ],
});

const article = (data: Omit<Article, 'published' | 'updatedAt'>): Article => ({
  ...data,
  published: true,
  updatedAt,
});
const articles: Article[] = [
  article({
    id: 'start-with-a-small-project',
    title: '学一个新东西，先做一个小作品',
    summary: '把“我要学会”换成一个能检查、能完成、能展示的结果。',
    category: '学习方法',
    access: 'public',
    columnId: 'learning-notes',
    order: 1,
    readMinutes: 3,
    content: `## 先定义一个完成时刻\n\n“学会 Python”很难判断什么时候算完成。“做一个能保存三条记录、重启后还能读出的程序”就有明确的结束条件。目标越具体，你越容易知道现在该补哪一块知识。\n\n## 让作品小到可以开始\n\n选一个你熟悉的场景，砍掉登录、多端同步和复杂图表。先保留一条核心路径：输入信息、处理信息、看到结果。复杂功能可以写进下一版清单。\n\n例如学习记录器，第一版只要主题和分钟数两个字段。先能添加和统计，再考虑日期查询与导出。每增加一个功能，都确认旧功能仍能工作。\n\n## 学习时维护两张清单\n\n一张是完成清单：今天已经让什么行为发生了。另一张是问题清单：错误是什么、你尝试过什么、下一步准备验证什么。后者比只抄成功代码更有助于下一次遇到问题。\n\n## 今天就可以做的练习\n\n写下一个本周能交付的小作品。限定一个使用者、一个场景和三个验收条件。把第一步缩小到现在就能运行或画出来的程度，完成它后再继续。`,
  }),
  article({
    id: 'notes-that-help-you-build',
    title: '笔记不用记全，记下次用得上的',
    summary: '记录问题、决策和可运行的小例子，让笔记真正参与下一次实践。',
    category: '学习方法',
    access: 'public',
    columnId: 'learning-notes',
    order: 2,
    readMinutes: 3,
    content: `## 从一个问题开始\n\n比起按章节复制定义，可以先写“我刚才为什么卡住”。这句话把知识与实际情境连接起来。以后搜索同一类问题时，你更容易找到这份笔记。\n\n## 一页笔记的四个部分\n\n- 问题：当时想做什么，出现了什么现象。\n- 最小例子：只留下能展示问题的代码或步骤。\n- 解释：用自己的话说明原因与解决方式。\n- 边界：这个办法在哪种情况下不适用，还有什么没验证。\n\n## 把“看懂”变成一次验证\n\n合上资料，重新写出最小例子。改变一个输入，预测结果，然后运行检查。预测错误的位置，正是需要回到资料补充理解的地方。\n\n## 每周做一次整理\n\n从本周笔记挑一条真实复用过的内容，把步骤写得更短、更清楚。没有用过的笔记不急着美化。让笔记库跟着你的问题生长，避免整理本身取代学习。\n\n## 练习\n\n找一份你以前抄写的笔记，用四部分结构重写，并补一个能亲自验证的例子。`,
  }),
  article({
    id: 'weekly-learning-review',
    title: '一份能执行的每周学习复盘',
    summary: '用成果、阻碍和下一步安排下一周，而不是只统计学习时长。',
    category: '学习方法',
    access: 'vip',
    columnId: 'learning-notes',
    order: 3,
    readMinutes: 4,
    content: `## 复盘先看成果\n\n打开本周实际保存的作品、代码或练习。为每个成果写一句“现在可以做什么”。时长可以辅助记录，但不能代替能力变化。\n\n## 将阻碍分成三类\n\n知识缺口需要补概念；操作问题需要找出错误步骤；任务过大需要缩小交付范围。先分类，再决定下一周的行动，避免用“再努力一点”回答所有问题。\n\n## 可直接复制的模板\n\n### 本周完成\n\n列出最多三个可检查的结果，每个附文件、截图或操作说明。\n\n### 本周卡点\n\n写清现象、已尝试方法、还未验证的假设。每个问题只安排一个下一步实验。\n\n### 下周计划\n\n选择一个主要成果，拆成三个可以单独完成的小步骤。给每一步写出开始条件和结束条件，为复习与返工留出空间。\n\n## 练习\n\n用你学习中心的进度和笔记填写这份模板。把“继续学习第三章”改成“完成第三章练习，并能独立解释两个关键选择”。下次复盘时，先核对这个条件是否达成。`,
  }),
  article({
    id: 'first-useful-version',
    title: '独立做产品，先跑通最重要的一条路',
    summary: '从一个人的一个任务开始，把真正有用的第一版做出来。',
    category: '独立开发',
    access: 'public',
    columnId: 'indie-journal',
    order: 1,
    readMinutes: 3,
    content: `## 写出一次使用过程\n\n设想一位具体使用者，描述他从打开页面到完成任务的每一步。课程网站的一条路径可以是注册、验证邮箱、登录、获得权限、进入课程、保存进度、下次继续。\n\n## 每一步都要有真实结果\n\n按钮存在不代表功能完成。发送验证码后需要确认邮件服务结果；保存之后需要重新打开验证数据；提示“发布成功”之后需要检查实际地址。把行为和证据一起定义。\n\n## 少做一些功能，做好这一条路\n\n第一版可以暂缓积分、排行榜或复杂推荐。但核心流程不能依赖口头解释或后台手工改代码。先让使用者独立走完，再根据反馈补充周边功能。\n\n## 练习\n\n为你想做的产品写出五到八步的关键路径。给每一步补一个失败状态：输入不完整、没有权限、网络中断、数据不存在时应该出现什么反馈。`,
  }),
  article({
    id: 'release-checklist',
    title: '把“本地能用”变成一次可靠交付',
    summary: '用部署、权限与恢复三个角度检查自己的小产品。',
    category: '独立开发',
    access: 'vip',
    columnId: 'indie-journal',
    order: 2,
    readMinutes: 4,
    content: `## 环境变化会暴露假设\n\n本地磁盘可写、服务一直运行、你拥有管理员权限，这些条件到了线上未必成立。交付前列出应用依赖的环境条件，再逐项核对目标平台。\n\n## 从普通用户开始验收\n\n使用新的会话注册普通账号。确认它只能看到允许的数据，再赋予权限，验证新增能力，最后撤销权限并重新请求。权限检查要覆盖服务端接口，不能只观察按钮是否消失。\n\n## 备份要配一次恢复\n\n导出一个备份并不自动代表可恢复。用隔离环境导入备份，检查用户数、内容数和一条完整学习记录。记下使用的配置与恢复步骤，备份中的私有信息也需要妥善保管。\n\n## 发布记录模板\n\n记录版本、部署地址、配置名称、执行过的验收、已知限制和回退方式。明确区分“已经执行”和“等待真实账号或服务验证”的项目。\n\n## 练习\n\n为一个你正在开发的小产品做一次普通用户流程检查与恢复演练，留下可供别人复查的结果。`,
  }),
  article({
    id: 'write-a-useful-readme',
    title: '让 README 成为产品的第一位向导',
    summary: '把安装、第一步、维护与已知限制写给真正要使用它的人。',
    category: '技术写作',
    access: 'public',
    columnId: 'indie-journal',
    order: 3,
    readMinutes: 3,
    content: `## 从读者最先需要的答案写起\n\n先用两句话说明它解决什么问题、适合谁。接着给出一条能跑通的最短路径：准备环境、安装、配置、启动、看到什么结果。不要让读者先理解整个代码目录。\n\n## 命令要有上下文\n\n告诉读者命令在哪个目录执行、需要什么版本、运行后会生成什么文件。环境变量给示例名与用途，真实密码或令牌留在本地配置中。\n\n## 把维护任务独立出来\n\n初次启动与日常维护是两种任务。将创建管理员、备份、升级、回退和故障排查放到对应文档，README 保留清楚的入口。\n\n## 最后请别人照着做一次\n\n用新目录或新机器执行说明，检查遗漏的文件、隐含的依赖与失效链接。每当你需要补充一句口头说明，就把它写回文档。\n\n## 练习\n\n给你的第一个小作品写一份 README，请一位没有参与开发的人尝试启动。记录最先遇到的三个问题，再修改说明。`,
  }),
];

export function createSeed(): Database {
  return structuredClone({
    version: 1,
    users: [],
    sessions: [],
    verifications: [],
    rateLimits: [],
    courses: [filmmaking, python, website, workflows],
    articles,
    columns: [
      {
        id: 'learning-notes',
        title: '学习的方法',
        description: '把好奇变成练习，把练习变成自己的能力。',
        color: 'yellow',
        published: true,
      },
      {
        id: 'indie-journal',
        title: '独立开发手记',
        description: '从一段代码到一个产品，记录那些具体的决定。',
        color: 'green',
        published: true,
      },
    ],
    progress: [],
    notes: [],
    bookmarks: [],
    audit: [],
  } satisfies Database);
}
