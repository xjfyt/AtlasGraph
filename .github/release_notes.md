## v0.1.7
Important
本次为修复性版本，重点解决了 Neo4j 多数据库切换的关键问题，强烈建议使用 Neo4j 多库的用户升级。
（v0.1.6 因 GitHub 不可变 Release 机制导致构建产物上传失败且 tag 名无法重用，故以 v0.1.7 重新发布，功能内容与 v0.1.6 一致。）
关于版本的说明：AtlasGraph 采用类似架构发布体系，针对不同图数据库底层引擎推出了独立的扩展版本组合。

### 🐞 修复问题
- **修复了 Neo4j 切换数据库后查询不生效的问题**：此前界面显示已切换、实际查询仍打到连接时绑定的库，导致切库后查询结果为空白
- 修复了切换数据库后 Schema 统计（节点/关系/标签数量）未跟随当前库刷新的问题
- 修复了数据库列表（SHOW DATABASES）查询的兼容性，统一在 system 库执行

### 🚀 优化改进
- 切换数据库时自动重新执行默认查询，画布即时刷新为目标库的数据
- 统一以当前选中库作为查询路由的唯一真实来源，行为更可预期

### Windows (不再支持 Win7)
#### 正常安装包 (推荐)
- **64位**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_0.1.7_x64-setup.exe) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-kuzu_0.1.7_x64-setup.exe) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-lbug_0.1.7_x64-setup.exe) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_kuzu_0.1.7_x64-setup.exe) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_lbug_0.1.7_x64-setup.exe)
- **ARM64 (仅支持 neo4j)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_0.1.7_arm64_en-US.msi)

#### 纯净免安装单体运行版 (Standalone)
- **64位**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-standalone-neo4j-windows-x86_64.exe) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-standalone-kuzu-windows-x86_64.exe) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-standalone-lbug-windows-x86_64.exe) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-standalone-neo4j_kuzu-windows-x86_64.exe) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-standalone-neo4j_lbug-windows-x86_64.exe)
- **ARM64 (仅支持 neo4j)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-standalone-neo4j-windows-arm64.exe)

### macOS
*(说明：下载并安装后，应用程序名称为纯净的 AtlasGraph，不再带有后缀以保持整洁)*
- **Apple M芯片 (arm64)**:
  [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_0.1.7_aarch64.dmg) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-kuzu_0.1.7_aarch64.dmg) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-lbug_0.1.7_aarch64.dmg) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_kuzu_0.1.7_aarch64.dmg) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_lbug_0.1.7_aarch64.dmg)

### Linux
#### DEB包 (Debian系)
- **64位 (amd64)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_0.1.7_amd64.deb) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-kuzu_0.1.7_amd64.deb) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-lbug_0.1.7_amd64.deb) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_kuzu_0.1.7_amd64.deb) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_lbug_0.1.7_amd64.deb)
- **ARM64 (arm64)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_0.1.7_arm64.deb) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-kuzu_0.1.7_arm64.deb) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-lbug_0.1.7_arm64.deb) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_kuzu_0.1.7_arm64.deb) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_lbug_0.1.7_arm64.deb)

#### RPM包 (Redhat系)
- **64位 (x86_64)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j-0.1.7-1.x86_64.rpm) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-kuzu-0.1.7-1.x86_64.rpm) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-lbug-0.1.7-1.x86_64.rpm) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_kuzu-0.1.7-1.x86_64.rpm) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_lbug-0.1.7-1.x86_64.rpm)
- **ARM64 (aarch64)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j-0.1.7-1.aarch64.rpm) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-kuzu-0.1.7-1.aarch64.rpm) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-lbug-0.1.7-1.aarch64.rpm) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_kuzu-0.1.7-1.aarch64.rpm) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_lbug-0.1.7-1.aarch64.rpm)

#### AppImage
- **64位 (amd64)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_0.1.7_amd64.AppImage) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-kuzu_0.1.7_amd64.AppImage) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-lbug_0.1.7_amd64.AppImage) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_kuzu_0.1.7_amd64.AppImage) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_lbug_0.1.7_amd64.AppImage)
- **ARM64 (aarch64)**: [neo4j](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_0.1.7_aarch64.AppImage) | [kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-kuzu_0.1.7_aarch64.AppImage) | [lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-lbug_0.1.7_aarch64.AppImage) | [neo4j_kuzu](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_kuzu_0.1.7_aarch64.AppImage) | [neo4j_lbug](https://github.com/xjfyt/AtlasGraph/releases/download/v0.1.7/AtlasGraph-neo4j_lbug_0.1.7_aarch64.AppImage)

---
> 如果您在使用中遇到任何问题，欢迎到 [Issues](https://github.com/xjfyt/AtlasGraph/issues) 反馈！
