// URL query 狀態同步 helper。
// Base44 會在 URL 上攜帶 app_id / server_url / functions_version 等參數
//（見 app-params.js），所以更新我們自己的參數時必須「合併」而非整包
// 取代 — react-router 的 setSearchParams(obj) 是取代語意，直接用會把
// Base44 的參數洗掉。
/**
 * 以 patch 合併現有 search params：值為 null/undefined 的 key 會被移除，
 * 其餘 key 覆寫，沒提到的（含 Base44 參數）原樣保留。
 * @param {URLSearchParams} prev
 * @param {Record<string, string | number | null | undefined>} patch
 * @returns {URLSearchParams}
 */
export function mergeSearchParams(prev, patch) {
  const next = new URLSearchParams(prev);
  Object.entries(patch).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  });
  return next;
}
