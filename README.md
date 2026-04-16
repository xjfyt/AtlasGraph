# 咪鼠图谱可视化 (MiMouse Graph Visualization)

基于 [Tauri v2](https://tauri.app/)（Rust 后端）+ React（前端）构建的高性能跨平台知识图谱管理与可视化桌面应用。
作为一款生产级的图谱应用，本作深度整合了官方强大的 [@neo4j-nvl](https://www.npmjs.com/package/@neo4j-nvl/base) 渲染引擎，支持对图数据的真正全面编辑与管理。

---

## 🎯 核心功能

- **双引擎全真连接**：支持高速直连 **Neo4j**（远程协议）或 **Kuzu**（本地嵌入式引擎，支持本地文件选取）。
- **生产级编辑闭环 (CRUD)**：
  - **右键上下文菜单**：在画布空白处右键快速创建新节点；对节点/边右键进行连线、隐藏、解绑，以及执行基于 Cypher 的底层**持久化删除**（Detach Delete）。
  - **交互式牵拉连线**：选中节点后可通过右键选项快速牵拉至周边节点，建立并命名全新的关系（Relationship）。
- **动态属性检查器 (Detail Panel)**：模仿 Neo4j Browser 的右侧详情面板。
  - 单击节点/关系即可获取高亮状态（通过 `@neo4j-nvl` 官方 Interactions 实现轮廓高亮）。
  - 支持对任意属性值的动态增删改（悬浮点击直接进入编辑模式，支持保存至底层数据库）。
- **组件化架构**：应用高度解耦，功能拆分为 `Sidebar`, `ConnectView`, `Header`, `ContextMenu`, `DetailPanel` 等专门化组件，极易维护。
- **历史与 Schema 追踪**：内置本地化存储的 Cypher 历史记录，以及自适应获取数据库内 `Labels`、`RelTypes`、`Properties` 的数据模式概览（Schema Overview）。

---

## 🛠 环境要求

| 工具 | 最低版本 | 安装方式 |
|------|---------|---------|
| Node.js | v18+ | [nodejs.org](https://nodejs.org/) |
| Rust & Cargo | latest stable | [rustup.rs](https://rustup.rs/) |
| Visual Studio Build Tools | 2019+ | [VS Installer](https://visualstudio.microsoft.com/downloads/) (勾选 "C++ 桌面开发") |
| CMake + Ninja | | 用于本地编译编译 Kuzu 依赖库 |

> **验证安装**：在终端执行 `node -v`、`npm -v`、`rustc --version`，确认均有版本输出。

---

## 🚀 快速上手

### 1. 安装依赖

```bash
cd graph-visualization
npm install
```

### 2. 开发模式运行

```bash
npm run tauri dev
```

> **注意：** 当首次编译包含 `kuzu` 的 Rust 后端依赖时可能较长，后续启动将会达到秒开速度。遇到 `Ctrl+C` 中断等情况请先检查任务环境是否结束，使用 `clear` 清理后重试。

### 3. 主干使用流

1. 启动应用后，左侧边栏即是**工作引擎面板**，选择您对应的图数据库：
   - 如果使用 **Kuzu**：点击右侧📁按钮直接选取本地数据库文件夹或 `.kuzu` 数据库文件。
   - 如果使用 **Neo4j**：填入对应的 `bolt://` URI 及账号密码。
2. 点击 **连接**。
3. 界面右侧或下方的主键盘区是 **Cypher 查询编辑器**：
   ```cypher
   MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 100
   ```
4. 执行查询后结果将以力导向图可视化。
5. **点选交互**：点击节点高亮并展开属性；画布空白处右键创造实体；图谱内实体右键触发增删连线逻辑。

---

## 📦 打包发布

```bash
npm run tauri build
```

生成物位于：
- **可执行文件**：`src-tauri/target/release/咪鼠图谱可视化.exe`
- **安装包**：`src-tauri/target/release/bundle/` 目录下

---

## 📁 核心项目结构

```
graph-visualization/
├── src/                       # 前端层 (React + TypeScript)
│   ├── App.tsx                # 应用级状态流与路由分发（解耦后清爽的主干）
│   ├── App.css                # 全局样式系统 
│   ├── components/            # UI功能切片
│   │   ├── ConnectView.tsx    # 连接与 Schema 获取引擎面板
│   │   ├── Sidebar.tsx        # 含路由及导航的左侧可收起容器
│   │   ├── GraphCanvas.tsx    # 封装 @neo4j-nvl 高性能原点图谱渲染
│   │   ├── DetailPanel.tsx    # 属性增删查改检测仪（节点/边面板）
│   │   ├── ContextMenu.tsx    # 定制化的多态右键系统
│   │   ├── Header.tsx         # 应用顶栏
│   │   ├── HistoryView.tsx    # Cypher 执行历史记录流
│   │   ├── ThemeView.tsx      # 全局深色/浅色/系统主题管理
│   │   └── icons.tsx          # 模块化纯净 SVG 高性能图标栈
├── src-tauri/                 # Rust 后端桥接引擎层
│   ├── src/
│   │   ├── main.rs            
│   │   ├── lib.rs             # Tauri APIs 注册与生命周期管理
│   │   └── database.rs        # 多协议池切换 (neo4j vs kuzu 路由)
│   └── Cargo.toml
└── README.md
```
