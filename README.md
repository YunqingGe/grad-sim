# 读研模拟器

## 怎么打开

用浏览器直接打开 `index.html` 即可。

## 文件结构

| 路径 | 内容 |
|---|---|
| `index.html` | 页面骨架，只有一个空的 `#app`，其余都由脚本画出来 |
| `css/style.css` | 全部样式（配色、地图、弹窗、图鉴） |
| `js/game.js` | 游戏主程序，文件里有分段标题，顺序是：数据 → 规则 → 操作 → 界面 |
| `images/` | 全部配图，按前缀分类：`event_` 事件、`ach_` 成就、`ending_` 结局、`map_` 四季地图背景、`welcome_hero.png` 欢迎页 |
| `icons/`、`favicon.ico`、`manifest.webmanifest` | 图标：浏览器标签页图标、苹果设备「添加到主屏幕」图标、安卓安装信息 |
| `fonts/` | 标题字体 ZCOOL KuaiLe（SIL OFL 授权，授权文件在 `fonts/OFL.txt`） |
| `docs/` | 设计文档：玩法设计、事件库、素材清单、小红书发布 |
| `functions/api/[[route]].js` | 排行榜接口（Cloudflare Pages Functions），只在 Cloudflare 上运行 |
| `migrations/0001_rank.sql` | 排行榜数据库的建表语句 |

## 常见修改去哪里改

- **改文案、加事件**：`js/game.js` 里的 `EVENTS`（随机事件）、`DAILY`（日常）、`ENDINGS`（结局）。
- **加图**：把图放进 `images/`，再在 `js/game.js` 的「图片素材」一段里写上对应的路径。
- **改配色、尺寸**：`css/style.css`。
- **字体缺字**：字体文件是按页面现有汉字裁剪过的。新增了汉字后，标题里的新字会退回系统字体，需要重新裁剪字体。

## 注意

- 游戏存档在玩家浏览器的 localStorage 里。
- 这个文件夹是网页版，不能直接上传小红书小工具。小红书的上传包是 zip，规范禁止内联脚本和 `onclick` 这类行内事件，存储要用容器的 Storage API，所以要先转换一遍（转换清单见 `docs/小红书发布.md`）。
- 设计文档都在 `docs/`：玩法规则和数值见 `玩法设计.md`，全部随机事件见 `事件库.md`，配图进度见 `素材清单.md`，小红书打包和审核记录见 `小红书发布.md`。改了代码记得同步这几份。

## 排行榜

- 按毕业论文盲审分数排名，分高分榜和低分榜，各显示前 20 名。每个浏览器只留自己的最高分和最低分各一条，分数相同时先打出来的排前面。
- 走到盲审的局在结局时自动提交（名字、头像、导师、结局、盲审分数）；没联网就先存在本地，下次打开时补交。玩家可以在「存档」里退出排行榜，退出时会删掉已上榜的成绩。
- 数据存在 Cloudflare D1 数据库，接口在 `functions/api/`。只有部署在 Cloudflare Pages 上的网址有排行榜；GitHub Pages 和直接打开 `index.html` 时会提示没有排行榜。
- 游戏放在别的网址也想用排行榜的话，把 `js/game.js` 里的 `RANK_API` 改成 Cloudflare 上的网址。
- 小红书版不能联网，打包时去掉排行榜那一段和入口按钮。

### 第一次部署（Cloudflare 后台）

1. **建数据库**：Storage & Databases → D1 → Create，名字填 `grad-sim-rank`。建好后进 Console，把 `migrations/0001_rank.sql` 整段粘进去运行。
2. **建网站**：Workers & Pages → Create → Pages → Import an existing Git repository，选这个仓库。Framework preset 选 None，Build command 留空，Build output directory 留空。
3. **绑定数据库**：网站项目的 Settings → Bindings → Add → D1 database，Variable name 填 `DB`，选 `grad-sim-rank`，保存。
4. **重新部署一次**（Deployments → 最新那次 → Retry deployment），绑定才会生效。之后每次 `git push` 都会自动部署。
