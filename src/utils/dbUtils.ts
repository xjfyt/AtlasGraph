// src/utils/dbUtils.ts

// 把任意 JS 值转成 Cypher 字面量，安全转义字符串中的 '\'、'\''、换行等
export function toCypherLiteral(v: any): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (Array.isArray(v)) return `[${v.map(toCypherLiteral).join(", ")}]`;
  if (typeof v === "object") {
    const entries = Object.entries(v).map(([k, val]) => `\`${k}\`: ${toCypherLiteral(val)}`);
    return `{${entries.join(", ")}}`;
  }
  // 字符串：JSON.stringify 给我们 \", \\, \n, \r, \t 等符合 Cypher 的双引号串字面量
  return JSON.stringify(String(v));
}

// 把用户输入的字符串转成最合适的 JS 值（用于属性编辑）
// 仅在文本严格表示数字/布尔/null 时转换；带前导零的数字串保留为字符串
export function parseUserValue(raw: string): any {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  // 严格数字：不包含前导 0（除 "0" 与 "0." 开头的小数）
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(trimmed) || /^-?\d+(\.\d+)?$/.test(trimmed)) {
    if (!/^-?0\d+/.test(trimmed)) {
      const n = Number(trimmed);
      if (Number.isFinite(n)) return n;
    }
  }
  return raw;
}

// 把 Ladybug 节点 id "table_id:offset" 中的 offset 抽出来；非法时返回 null
export function lbugOffset(id: string): string | null {
  const parts = String(id).split(":");
  if (parts.length < 2) return null;
  const off = parts[parts.length - 1];
  return /^\d+$/.test(off) ? off : null;
}

// 把后端抛出的 Neo4j/Ladybug 错误翻译成对用户友好的中文提示
export function friendlyDbError(err: any): string {
  const s = String(err?.toString?.() ?? err ?? "");
  // Neo4j 唯一约束冲突
  const uc = s.match(/Node\((\d+)\) already exists with label `?(\w+)`? and property `?(\w+)`? = '([^']+)'/);
  if (uc) {
    const [, otherId, lbl, propKey, propVal] = uc;
    return `数据库存在唯一约束：已有 ${lbl} 节点（ID=${otherId}）的 ${propKey} = '${propVal}'。请改用不同的值，或先在 DB 中移除该唯一约束/合并节点。`;
  }
  // Ladybug 主键缺失
  if (/expects primary key/i.test(s)) {
    return `Ladybug 该 NODE TABLE 需要主键属性，但当前 CREATE 未提供。${s}`;
  }
  if (/Could not set lock on file/i.test(s)) {
    return "Ladybug 数据库已被其他实例占用。Ladybug 的并发限制是：同一数据库同一时刻只能存在 1 个读写实例，或多个只读实例，不能在已有读写实例运行时再附加只读实例。请关闭当前占用该数据库的读写进程后重试。";
  }
  return s;
}
