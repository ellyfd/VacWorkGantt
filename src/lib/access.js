// 集中管理「開發處」相關的存取規則，方便日後調整辨識方式。
//
// 設計說明：
// - 開發處頁面沿用 Layout，但只看 DPC 的排休，且不顯示甘特圖。
// - 「誰是開發處使用者」用「綁定員工所屬部門名稱是否含關鍵字」判斷，
//   完全在前端達成、不需要改 Base44 entity schema。
// - 若部門名稱與下列設定不符，請改這裡即可（單一設定點）。

// 開發處頁面要鎖定顯示的部門名稱（需與 Department.name 完全相符）
export const DPC_DEPARTMENT_NAMES = ['DPC'];

// 用來辨識「開發處使用者」的部門名稱關鍵字
export const DEV_DIVISION_DEPT_KEYWORD = '開發處';

/**
 * 綁定員工是否屬於「開發處」。
 * @param {{ department_ids?: string[] }|null|undefined} boundEmployee
 * @param {Array<{ id: string, name: string }>} departments
 */
export function isDevDivisionUser(boundEmployee, departments) {
  if (!boundEmployee?.department_ids?.length || !departments?.length) return false;
  const devDeptIds = new Set(
    departments
      .filter(d => typeof d.name === 'string' && d.name.includes(DEV_DIVISION_DEPT_KEYWORD))
      .map(d => d.id)
  );
  if (devDeptIds.size === 0) return false;
  return boundEmployee.department_ids.some(id => devDeptIds.has(id));
}
