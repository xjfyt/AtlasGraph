# AtlasGraph - Knowledge Graph Visualization Tool

[English](README_EN.md) | [中文](README.md)

---

## 1. Project Introduction

A high-performance, cross-platform knowledge graph management, visualization, and editing desktop application built with [Tauri v2](https://tauri.app/) (Rust backend) and React TypeScript (frontend). The project deeply integrates the official, powerful `@neo4j-nvl` rendering engine, granting truly comprehensive visual interaction and editing management capabilities for graph data.

AtlasGraph aims to provide a unified view and editing access platform for multiple graph databases. Unlike tools targeting a single specific system (like Neo4j Browser), AtlasGraph easily bridges remote distributed graph databases and local embedded high-performance graph databases simultaneously through an underlying decoupled driver mechanism.

<br>

### 1.1 Currently Supported Databases

The current version natively supports the following three major graph driving engines at the underlying dependency layer and frontend rendering layer:

- **[Neo4j](https://github.com/neo4j/neo4j)**: A standard network online graph database based on the remote Bolt protocol.
- **[Ladybug](https://github.com/ladybugdb/ladybugdb)**: A high-performance local embedded native relational graph database.
- **[Kuzu](https://github.com/kuzudb/kuzu)**: A local embedded analytical ultra-fast relational graph database.

<br>

### 1.2 Visualization & Editing Features

- **Native Force-Directed High-Fidelity Rendering**: Fully adopts the industrial-grade `@neo4j-nvl` component library, providing a force-directed graph gravity layout architecture with node collision calculation capabilities.
- **Dynamic Read/Write Real-time Feedback**: Supports direct operation and editing of nodes and mesh relationship lines on the visualization view, with real-time feedback to the underlying database.

---

## 2. Core Features

### 2.1 Production-Grade Editing Loop (CRUD)

- **Multi-functional Right-click Context Menu**: Right-click on a blank area of the canvas to quickly create floating nodes; right-click on existing entity objects to drag connections, hide, unbind, and execute a one-click underlying persistent Detach Delete.
- **Interactive Drag-and-Drop Connections**: After selecting and activating the center of a node, you can right-click and drag in the right floating panel to quickly draw operation lines to surrounding nodes, intuitively building a brand new data model.

<br>

### 2.2 Dynamic Graph Properties Inspector Panel

Natively supports an intuitive two-way sliding property panel system on the right side:

#### (1) Visual Hover Two-way Highlighting Mechanism
Clicking on any floating node or relationship track will trigger duplex linked highlight focusing on both the canvas and the sidebar, seamlessly presenting the parameters within the dictionary in detail on the sidebar.

#### (2) Form-driven Data Modification
Opens up direct modification functions for key-value pairs in the object property box. Supports adding/removing fields and overwriting parameter values; clicking update writes directly to the system backend database.

<br>

### 2.3 History & Schema Overview Tracking

#### (1) Execution History Traceability
Built-in persistent local cache for Cypher command history list, allowing one-click review and backfilling of complex historical statements to prevent the loss of important inputs.

#### (2) Adaptive Wildcard Schema Scanning
The frontend system adaptively fetches and integrates the global `Labels`, `RelTypes` (relationship type networks), and `Properties` (key-value field tables) from the current target database layer, forming a holistic Schema analysis panel.

---

## 3. Project Structure

After deep decoupling and refactoring, a highly maintainable code architecture has been formed:

```text
AtlasGraph/
├── src/                       # Frontend Layer (React + TypeScript)
│   ├── App.tsx                # App root component along with state and routing system branches
│   ├── components/            # UI components collection
│   │   ├── engines/           # Dedicated connection forms and type libraries for supported DB engines
│   │   │   ├── types.ts       # Collection of all property interfaces for connection interfaces
│   │   │   ├── Neo4jForm.tsx  # Neo4j panel
│   │   │   ├── LbugForm.tsx   # Ladybug panel
│   │   │   └── KuzuForm.tsx   # Kuzu panel
│   │   ├── ConnectView.tsx    # Connection center and dynamic panel entry dashboard
│   │   ├── GraphCanvas.tsx    # Encapsulated @neo4j-nvl module rendering canvas
│   │   ├── DetailPanel.tsx    # Graph property CRUD side control console
│   │   └── ContextMenu.tsx    # Custom polymorphic multi-select floating interactive menu grid control system
├── src-tauri/                 # Tauri security system and Rust native glue communication hub
│   ├── src/
│   │   ├── database/          # Decoupled and modularized data parsing engine driver cluster
│   │   │   ├── mod.rs         # Universal gateway communication proxy entry and API layer
│   │   │   ├── neo4j.rs       # Neo4j secure communication underlying driver and message processor
│   │   │   ├── lbug.rs        # Ladybug operation mounting secure communication implementation
│   │   │   └── kuzu.rs        # Kuzu specific protocol connection and control channel processing mechanism
│   │   ├── main.rs            # Global underlying startup and project initialization defense center
│   │   └── lib.rs             # Tauri Commands interaction interface registration, interception, and validation
│   └── Cargo.toml             # Dependency library control and macro compilation feature toggle config file
```

---

## 4. Environment Requirements & Configuration

To ensure the underlying C++ graph database dependencies and the Tauri frontend/backend compile and start correctly, the configuration must meet the following baseline requirements.

> 💡 **The primary version combination we tested in the current project is**:
> - **Node.js**: v18.20.0
> - **Rust**: 1.77.2
> - **CMake**: 3.29.0

<br>

### 4.1 Cross-System General Environment Preparation

#### (1) Node.js Control Components
The version must cross the **`v18.0.0`** baseline (newer and compatible stable versions are recommended). [Download here](https://nodejs.org/).

#### (2) Rust & Cargo
Based on the underlying borrow safety chain detection constraints within Tauri V2, please ensure the version installed on your device is not lower than **`1.70.0`**.
- One-click installation command:
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

#### (3) CMake & Ninja
When enabling or involving the compilation of embedded local core graph databases such as `lbug` and `kuzu`, they will be needed as fundamental support. The version used should not be less than **`3.20.0`**.

<br>

### 4.2 macOS System Configuration Guide
For macOS computer terminals equipped with native Apple Silicon (M-series cores) or Intel architecture processors:

#### (1) OS Build Parameter Limits & Baselines
In order to utilize compatibility conversions of native numeric address manipulation algorithm libraries (such as `std::to_chars` parsing operations) from the latest underlying C++17 features, the target environment requirement is a minimum of **macOS 13.3 (Ventura)**.

#### (2) Command Line Tools System Component Security Supplement
It is mandatory to be based on the Xcode auxiliary command-line system to acquire and coordinate underlying Clang compilation support:
  ```bash
  xcode-select --install
  brew install cmake ninja
  ```

<br>

### 4.3 Windows System Configuration Guide
Based on the desktop Windows operating environment (Windows 10/11 strongly recommended):

#### (1) Web View Rendering Underlying Security Framework
For Windows 10 systems, the [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) must be installed (Windows 11 systems have it pre-installed by default).

#### (2) C++ Desktop Native Heavy Reload Compilation Underlying Components
You must install the integrated auxiliary compilation management tool **Visual Studio Build Tools 2019+ (and MSVC must be at a level no less than 19.20+)**.
- Deployment operation and configuration specific installation instructions: Go to the official channel to obtain and download [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/). In the installation interface, be sure to check **"Desktop development with C++"**, and confirm that the **Windows 10 SDK** (or higher 11 SDK group version) is included in the right-side components panel.

---

## 5. Running & Building

### 5.1 Development Mode Operation
Install frontend dependencies in the project root directory, then start the development mode for debugging:
```bash
npm install
npm run app:dev
```

> ⚠️ **Compilation Note**: Upon initial startup, the system will download and compile the underlying C++ database components. Depending on your system performance, this may take approximately 10~20 minutes and consume a large amount of CPU resources. Subsequent compilations will utilize CMakeCache to finish in a very short time. If the terminal freezes or the compilation is interrupted halfway causing a stuck state, please use the `cargo clean` command to clear the cache and try again.

<br>

### 5.2 Conditional Compilation (Multi-Engine Combination Packaging Support)
This project supports compiling graph database driver dependencies on demand, avoiding the compilation of unneeded engines, thereby balancing build speed and package size. The frontend UI will also automatically sense and hide functionality entry points that are not enabled.

We provide a very convenient and accessible external configuration method. Simply modify the `atlasConfig` field in the `package.json` under the application root directory to achieve explicit compilation, without needing to input complex long commands:

#### (1) Configuring the On-Demand Support List
Open the `package.json` file, find (or add) `atlasConfig` and its inner `features` characteristic array:
```json
  "atlasConfig": {
    "features": [
      "neo4j",
      "kuzu"
    ]
  }
```
* **Single function**: If you only want to keep a certain engine, you can change it to only contain `"neo4j"`.
* **Combinational/Full**: Supports inputting any combination list of `"neo4j"`, `"lbug"`, `"kuzu"`.

#### (2) Execute Auto-Bridging Commands
After the configuration is complete, directly use the dedicated derivative build trigger commands, and the scaffolding tool will automatically capture the configuration and implement feature builds on the underlying layers:

* **Development Test (Hot-Reload) Mode**:
  ```bash
  npm run app:dev
  ```

<br>

### 5.3 Official Production Build (Packaged Installer Release Output)
If you need to generate an independent, cross-platform standalone installer or an executable native file application system ready for distribution, please execute our preset standard release command:
```bash
npm run app:build
```

Upon successful packaging, various OS-native specific format installer resources and binary archive compression files (such as `.exe` and `.msi` commonly found on Windows systems; `.app` and disk image encapsulated `.dmg` packages under the Apple macOS ecosystem, etc.) will all be centrally output and stored in the same path:
- `src-tauri/target/release/bundle/`
