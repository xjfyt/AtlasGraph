import fs from 'fs';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// 读取 package.json 配置
const pkg = JSON.parse(fs.readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
const features = (pkg.atlasConfig && pkg.atlasConfig.features) ? pkg.atlasConfig.features : [];

const command = process.argv[2];
if (!command) {
  console.error('Please specify a tauri command, e.g., "dev" or "build"');
  process.exit(1);
}

// kuzu 与 lbug 不能共存：lbug 派生自 kuzu，二者静态链接的 CRoaring/Parquet 等 C/C++ 依赖
// 会在链接阶段符号冲突（ld: symbol(s) not found）。在真正调起 cargo 之前先拦截，给出清晰提示。
if (features.includes('kuzu') && features.includes('lbug')) {
  console.error('\n\x1b[31m[Atlas Config] 配置冲突：features 同时包含 "kuzu" 和 "lbug"。\x1b[0m');
  console.error('原因：lbug 是 kuzu 的 fork，二者静态链接了同名 C/C++ 依赖（CRoaring、Parquet 等），');
  console.error('      链接阶段会出现 symbol(s) not found for architecture 错误。');
  console.error('请在 package.json 的 atlasConfig.features 中只保留其一（推荐 neo4j + lbug，或 neo4j + kuzu）。\n');
  process.exit(1);
}

const tauriArgs = [command];
// 如果配置了 features，则添加到打包/运行参数中
if (features.length > 0) {
  tauriArgs.push('--features', features.join(','));
}

// 传递其余参数（例如用户可能仍然想手动传入的其他参数）
const extraArgs = process.argv.slice(3);
tauriArgs.push(...extraArgs);

// 此时统一将 cargo 参数追加到最后
if (features.length > 0) {
  if (!tauriArgs.includes('--')) {
    tauriArgs.push('--');
  }
  tauriArgs.push('--no-default-features');
}

console.log(`\n======================================================`);
console.log(`🔌 \x1b[36m[Atlas Config]\x1b[0m 数据库按需编译配置已生效`);
console.log(`🔌 当前启用的数据库特性 (Features): \x1b[33m${features.length ? features.join(', ') : '默认 (Cargo.toml)'}\x1b[0m`);
console.log(`🔧 可在 package.json 的 "atlasConfig.features" 字段中修改`);
console.log(`======================================================\n`);

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(cmd, ['tauri', ...tauriArgs], {
  stdio: 'inherit',
  cwd: rootDir,
  shell: true
});

child.on('error', (err) => {
  console.error(`启动 Tauri 失败: ${err.message}`);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
