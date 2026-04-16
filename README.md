# 咪鼠图谱可视化 (MiMouse Graph Visualization)

基于 [Tauri v2](https://tauri.app/)（Rust 后端）+ React（前端）构建的跨平台图数据库可视化桌面应用。
支持连接 **Neo4j** 和 **Kuzu** 图数据库，使用 [AntV G6](https://g6.antv.antgroup.com/) 作为图谱渲染引擎。

---

## 🎯 核心功能

- **双引擎支持**：一键切换 Neo4j（远程）或 Kuzu（本地嵌入式）数据库
- **连接测试**：切换引擎后可先点击"测试连接"验证数据库可达性
- **Cypher 查询**：内置查询编辑器，支持 `Ctrl + Enter` 快速执行
- **力导向图谱**：基于 AntV G6 的 `d3-force` 布局，节点自动散开、居中显示
- **节点/边详情**：点击任意节点或关系，左下角弹出属性详情面板（仿 Neo4j 官方风格）
- **可收起侧边栏**：侧边栏支持折叠收起、拖拽调整宽度
- **结果概览**：右上角自动显示返回的节点/关系数量统计
- **图谱 / 表格双视图**：在图谱渲染和 JSON 原始数据之间切换
- **轻量独立**：编译后为单个可执行文件，无需 Python 环境

---

## 🛠 环境要求

| 工具 | 最低版本 | 安装方式 |
|------|---------|---------|
| Node.js | v18+ | [nodejs.org](https://nodejs.org/) |
| Rust & Cargo | latest stable | [rustup.rs](https://rustup.rs/) |
| Visual Studio Build Tools | 2019+ | [VS Installer](https://visualstudio.microsoft.com/downloads/) (勾选 "C++ 桌面开发") |

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

首次编译 Rust 依赖约需 2~5 分钟，后续启动秒开。

### 3. 使用方法

1. 应用启动后，左侧边栏选择数据库引擎（**Kuzu 本地** / **Neo4j 远程**）
2. 填写连接参数，点击 **"测试连接"** 按钮验证连通性
3. 在 **Cypher 查询编辑器** 中输入查询语句，例如：
   ```cypher
   MATCH (a:Entity)-[r]->(b:Entity) RETURN a, r, b LIMIT 100
   ```
4. 点击蓝色 ▶ 按钮或按 `Ctrl + Enter` 执行查询
5. 结果以力导向图谱形式展示在主面板中央
6. **点击任意节点或关系**，左下角弹出属性详情面板，可查看所有字段
7. 侧边栏可通过顶部按钮 **收起/展开**，或拖拽右边缘调整宽度
8. 底部 Tab 栏可切换 **图谱** 和 **表格 (JSON)** 视图

> ⚠ 当前版本使用 Mock 数据进行演示。切换 Kuzu/Neo4j 会返回不同的演示数据集。

---

## 📦 打包发布

### Windows

```bash
npm run tauri build
```

生成物位于：
- **可执行文件**：`src-tauri/target/release/咪鼠图谱可视化.exe`
- **安装包**：`src-tauri/target/release/bundle/` 目录下的 `.msi` 安装程序

### macOS / Linux

同样运行 `npm run tauri build`，自动生成对应平台安装包。

---

## 🔌 后端对接指南

数据库调用逻辑位于 `src-tauri/src/database.rs`。

- **Neo4j**：已引入 `neo4rs` 依赖，在 `execute_neo4j` 中对接 Bolt 协议
- **Kuzu**：需本地安装 CMake + Ninja，恢复 `Cargo.toml` 中的 `kuzu = "0.3"` 依赖

---

## 📁 项目结构

```
graph-visualization/
├── src/                       # 前端 (React + TypeScript)
│   ├── App.tsx                # 主界面 (侧边栏、查询器、详情面板)
│   ├── App.css                # 全局样式 (纯 CSS)
│   └── components/
│       └── GraphCanvas.tsx    # AntV G6 图谱渲染 + 点击事件
├── src-tauri/                 # Rust 后端
│   ├── src/
│   │   ├── main.rs            # 入口
│   │   ├── lib.rs             # Tauri 命令 (execute_cypher, test_connection)
│   │   └── database.rs        # 数据库抽象层
│   └── Cargo.toml
├── index.html
├── vite.config.ts
└── README.md
```
