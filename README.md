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

## 常见修改去哪里改

- **改文案、加事件**：`js/game.js` 里的 `EVENTS`（随机事件）、`DAILY`（日常）、`ENDINGS`（结局）。
- **加图**：把图放进 `images/`，再在 `js/game.js` 的「图片素材」一段里写上对应的路径。
- **改配色、尺寸**：`css/style.css`。
- **字体缺字**：字体文件是按页面现有汉字裁剪过的。新增了汉字后，标题里的新字会退回系统字体，需要重新裁剪字体。

## 注意

- 游戏存档在玩家浏览器的 localStorage 里。
- 小红书小工具要求单个文件，需要把 CSS、脚本和图片合并成一个 HTML 再提交，不能直接用这个文件夹。
