// src/components/RuntimeTextCollector.jsx
// Bộ thu thập text hiển thị trên DOM để phục vụ biên dịch.
// ✅ Mới: Tự quét khi đổi route + Gộp & Tải tất cả trong 1 file.

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

// Khóa lưu trữ dữ liệu gộp trong localStorage
const ACC_KEY = "i18n_collect_accum_v1";

// ===== Utils =====
function download(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function normalize(s) {
  // Chuẩn hoá: loại khoảng trắng thừa, xuống dòng, tab
  return s.replace(/\s+/g, " ").trim();
}

function shouldKeep(text) {
  if (!text) return false;
  if (text.length < 2) return false;                 // bỏ text 1 ký tự
  if (/^[\W_]+$/.test(text)) return false;           // toàn ký tự đặc biệt
  if (/^(https?:\/\/|mailto:|tel:)/i.test(text)) return false;
  return true;
}

function collectFrom(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;

      // Bỏ qua vùng không muốn quét
      if (p.closest("[data-i18n='ignore']")) return NodeFilter.FILTER_REJECT;

      // Bỏ thẻ không dành cho text hiển thị
      const tag = p.tagName?.toLowerCase();
      if (["script", "style", "noscript", "svg", "path"].includes(tag))
        return NodeFilter.FILTER_REJECT;

      // Bỏ input/textarea/select/option
      if (["input", "textarea", "select", "option"].includes(tag))
        return NodeFilter.FILTER_REJECT;

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const texts = [];
  while (walker.nextNode()) {
    const raw = walker.currentNode.nodeValue;
    const t = normalize(raw || "");
    if (shouldKeep(t)) texts.push(t);
  }
  return texts;
}

function rowsFromTexts(texts) {
  const map = new Map();
  for (const s of texts) map.set(s, (map.get(s) || 0) + 1);
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([vi, count]) => ({ vi, count, en: "" }));
}

function loadAccum() {
  try {
    const raw = localStorage.getItem(ACC_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // đảm bảo [{vi, count, en?}]
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccum(rows) {
  localStorage.setItem(ACC_KEY, JSON.stringify(rows));
}

function mergeIntoAccum(currentRows) {
  const acc = loadAccum(); // [{vi, count, en}]
  const map = new Map(acc.map((r) => [r.vi, { ...r }]));
  for (const r of currentRows) {
    if (!map.has(r.vi)) map.set(r.vi, { vi: r.vi, count: 0, en: "" });
    map.get(r.vi).count += r.count;
  }
  const merged = [...map.values()].sort((a, b) => b.count - a.count);
  saveAccum(merged);
  return merged;
}

function csvFromRows(rows) {
  const header = "vi,count,en";
  const body = rows
    .map((r) =>
      [
        `"${(r.vi || "").replace(/"/g, '""')}"`,
        r.count ?? 0,
        `"${(r.en || "").replace(/"/g, '""')}"`,
      ].join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

// ===== Component =====
export default function RuntimeTextCollector({
  targetSelector = "main", // chỉ quét vùng nội dung
  auto = true,             // tự quét khi mount
  autoOnRoute = true,      // ✅ tự quét khi đổi route
  delayMs = 300,           // chờ DOM ổn định trước khi quét
}) {
  const [stats, setStats] = useState({ totalNodes: 0, unique: 0 });
  const [accStats, setAccStats] = useState({ unique: 0, totalCount: 0 });
  const lastDataRef = useRef([]); // rows hiện tại
  const timerRef = useRef(null);
  const location = useLocation();

  // Quét một lần (current)
  const run = () => {
    const target = document.querySelector(targetSelector) || document.body;
    const texts = collectFrom(target);
    const rows = rowsFromTexts(texts);
    lastDataRef.current = rows;
    setStats({ totalNodes: texts.length, unique: rows.length });
    return rows;
  };

  // Cập nhật thống kê dữ liệu gộp
  const refreshAccumStats = () => {
    const acc = loadAccum();
    const totalCount = acc.reduce((s, r) => s + (r.count || 0), 0);
    setAccStats({ unique: acc.length, totalCount });
  };

  // Xuất & tải (current)
  const exportJSON = () => {
    const rows = lastDataRef.current.length ? lastDataRef.current : run();
    download(
      `vi_phrases_current_${Date.now()}.json`,
      JSON.stringify(rows, null, 2),
      "application/json;charset=utf-8"
    );
  };
  const exportCSV = () => {
    const rows = lastDataRef.current.length ? lastDataRef.current : run();
    download(
      `vi_phrases_current_${Date.now()}.csv`,
      csvFromRows(rows),
      "text/csv;charset=utf-8"
    );
  };

  // Gộp & tải (ALL)
  const mergeCurrentIntoAll = () => {
    const rows = lastDataRef.current.length ? lastDataRef.current : run();
    const merged = mergeIntoAccum(rows);
    const totalCount = merged.reduce((s, r) => s + (r.count || 0), 0);
    setAccStats({ unique: merged.length, totalCount });
  };
  const exportAllJSON = () => {
    const all = loadAccum();
    download(
      `vi_phrases_ALL_${Date.now()}.json`,
      JSON.stringify(all, null, 2),
      "application/json;charset=utf-8"
    );
  };
  const exportAllCSV = () => {
    const all = loadAccum();
    download(
      `vi_phrases_ALL_${Date.now()}.csv`,
      csvFromRows(all),
      "text/csv;charset=utf-8"
    );
  };
  const clearAll = () => {
    saveAccum([]);
    setAccStats({ unique: 0, totalCount: 0 });
  };

  // Tự quét khi mount
  useEffect(() => {
    refreshAccumStats();
    if (!auto) return;
    // chờ DOM settle
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      run();
    }, delayMs);
    // cleanup
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Tự quét khi đổi route
  useEffect(() => {
    if (!autoOnRoute) return;
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      run();
    }, delayMs);
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, autoOnRoute, delayMs]);

  return (
    <div
      className="fixed bottom-4 right-4 z-[2000] bg-white/95 backdrop-blur
                 border rounded-xl shadow-lg p-3 flex flex-col gap-2 w-[260px]"
    >
      <div className="text-xs text-gray-600 leading-5">
        <b>Collector</b> • Route:{" "}
        <span className="font-mono">
          {location.pathname}{location.search}
        </span>
        <br />
        <b>Current</b> — Nodes: {stats.totalNodes} • Unique: {stats.unique}
        <br />
        <b>ALL</b> — Unique: {accStats.unique} • Total: {accStats.totalCount}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={run}
          className="px-3 py-1 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
          title="Quét lại vùng nội dung (current)"
        >
          Quét
        </button>
        <button
          onClick={mergeCurrentIntoAll}
          className="px-3 py-1 rounded bg-emerald-700 text-white text-sm hover:bg-emerald-800"
          title="Gộp current vào ALL"
        >
          Gộp vào ALL
        </button>

        <button
          onClick={exportJSON}
          className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          title="Xuất JSON (current)"
        >
          JSON
        </button>
        <button
          onClick={exportCSV}
          className="px-3 py-1 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700"
          title="Xuất CSV (current)"
        >
          CSV
        </button>

        <button
          onClick={exportAllJSON}
          className="px-3 py-1 rounded bg-sky-600 text-white text-sm hover:bg-sky-700"
          title="Xuất JSON (ALL)"
        >
          ALL JSON
        </button>
        <button
          onClick={exportAllCSV}
          className="px-3 py-1 rounded bg-violet-600 text-white text-sm hover:bg-violet-700"
          title="Xuất CSV (ALL)"
        >
          ALL CSV
        </button>

        <button
          onClick={clearAll}
          className="col-span-2 px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700"
          title="Xoá dữ liệu đã gộp (ALL)"
        >
          Xoá ALL
        </button>
      </div>

      <div className="text-[11px] text-gray-500 mt-1">
        Thêm <code>data-i18n="ignore"</code> lên vùng không muốn thu thập.
      </div>
    </div>
  );
}
