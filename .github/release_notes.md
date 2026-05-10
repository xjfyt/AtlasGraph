## v0.1.5
Important
继上个版本以来持续优化更新，提供了更加稳定的图数据库连接和可视化体验，建议所有用户升级。
关于版本的说明：AtlasGraph 采用类似架构发布体系，针对不同图数据库底层引擎推出了独立的扩展版本组合。

### 🐞 修复问题
- 修复了图表数据节点加载时的大规模渲染性能异常
- 修复了在 macOS 环境中窗口状态导致的界面卡死情况
- 修复了部分情况下导出画布数据时文件损坏的回归问题
- 修复了部分组件在多数据库环境下的兼容性

### ✨ 新增功能
- 新增全屏支持，提供更沉浸的可视化图谱分析体验
- 新增画布右键菜单功能，增强了节点与边交互的易用性
- 核心依赖更新，引入了针对 neo4j/kuzu/lbug 的特性优化

### 🚀 优化改进
- 优化了节点展开和关联搜索的算法执行效率
- 提升了对不同平台的响应能力，尤其是高分屏适配
- 改进并统一了图谱的着色逻辑和样式渲染

### Windows (不再支持 Win7)
#### 正常安装包 (推荐)
- **64位**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_0.1.5_x64-setup.exe) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-kuzu_0.1.5_x64-setup.exe) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-lbug_0.1.5_x64-setup.exe) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_kuzu_0.1.5_x64-setup.exe) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_lbug_0.1.5_x64-setup.exe)
- **ARM64 (仅支持 neo4j)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_0.1.5_arm64_en-US.msi)

#### 纯净免安装单体运行版 (Standalone)
- **64位**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-standalone-neo4j-windows-x86_64.exe) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-standalone-kuzu-windows-x86_64.exe) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-standalone-lbug-windows-x86_64.exe) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-standalone-neo4j_kuzu-windows-x86_64.exe) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-standalone-neo4j_lbug-windows-x86_64.exe)
- **ARM64 (仅支持 neo4j)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-standalone-neo4j-windows-arm64.exe)

### macOS
*(说明：下载并安装后，应用程序名称为纯净的 AtlasGraph，不再带有后缀以保持整洁)*
- **Apple M芯片 (arm64)**:
  [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_0.1.5_aarch64.dmg) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-kuzu_0.1.5_aarch64.dmg) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-lbug_0.1.5_aarch64.dmg) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_kuzu_0.1.5_aarch64.dmg) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_lbug_0.1.5_aarch64.dmg)

### Linux
#### DEB包 (Debian系)
- **64位 (amd64)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_0.1.5_amd64.deb) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-kuzu_0.1.5_amd64.deb) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-lbug_0.1.5_amd64.deb) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_kuzu_0.1.5_amd64.deb) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_lbug_0.1.5_amd64.deb)
- **ARM64 (arm64)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_0.1.5_arm64.deb) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-kuzu_0.1.5_arm64.deb) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-lbug_0.1.5_arm64.deb) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_kuzu_0.1.5_arm64.deb) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_lbug_0.1.5_arm64.deb)

#### RPM包 (Redhat系)
- **64位 (x86_64)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j-0.1.5-1.x86_64.rpm) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-kuzu-0.1.5-1.x86_64.rpm) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-lbug-0.1.5-1.x86_64.rpm) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_kuzu-0.1.5-1.x86_64.rpm) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_lbug-0.1.5-1.x86_64.rpm)
- **ARM64 (aarch64)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j-0.1.5-1.aarch64.rpm) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-kuzu-0.1.5-1.aarch64.rpm) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-lbug-0.1.5-1.aarch64.rpm) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_kuzu-0.1.5-1.aarch64.rpm) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_lbug-0.1.5-1.aarch64.rpm)

#### AppImage
- **64位 (amd64)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_0.1.5_amd64.AppImage) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-kuzu_0.1.5_amd64.AppImage) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-lbug_0.1.5_amd64.AppImage) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_kuzu_0.1.5_amd64.AppImage) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_lbug_0.1.5_amd64.AppImage)
- **ARM64 (aarch64)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_0.1.5_aarch64.AppImage) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-kuzu_0.1.5_aarch64.AppImage) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-lbug_0.1.5_aarch64.AppImage) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_kuzu_0.1.5_aarch64.AppImage) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.5/AtlasGraph-neo4j_lbug_0.1.5_aarch64.AppImage)

---
> 如果您在使用中遇到任何问题，欢迎到 [Issues](https://github.com/xjfyt/AtlasGraph/issues) 反馈！
