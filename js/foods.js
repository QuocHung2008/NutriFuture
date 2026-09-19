/**
 * NutriFuture — NF_Foods: khớp tên món với CSDL nội bộ (ẩn).
 *
 * Quy tắc "khớp đúng" (bằng nhau hoàn toàn sau chuẩn hóa):
 *   Unicode NFD → bỏ dấu (đ→d) → chữ thường → mọi ký tự ngoài a-z/0-9 thành 1 khoảng trắng.
 *   ⇒ "Cơm  trắng", "CƠM TRẮNG", "com trang" đều khớp "Cơm trắng";
 *   ⇒ "Trà sữa trân châu size M" khớp "Trà sữa trân châu (size M)".
 * KHÔNG khớp một phần / gần đúng: "Phở bò tái" ≠ "Phở bò" → đi theo luồng AI.
 *
 * Cố ý KHÔNG công khai danh sách món (không có all()/suggest()) để CSDL không lộ ra giao diện.
 */
const NF_Foods = (() => {
  'use strict';

  function normalize(s) {
    return String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  const _index = new Map();

  function _build() {
    const data = (typeof NF_FOODS_DATA !== 'undefined') ? NF_FOODS_DATA : [];
    data.forEach((item) => {
      const id = normalize(item.name).replace(/ /g, '-');
      const record = Object.freeze({ ...item, id, tags: Object.freeze((item.tags || []).slice()) });
      [item.name, ...(item.aliases || [])].forEach((label) => {
        const key = normalize(label);
        if (!key) return;
        if (_index.has(key) && _index.get(key).id !== id) {
          console.warn('[NF_Foods] Trùng khóa tên, bỏ qua:', label);
          return;
        }
        _index.set(key, record);
      });
    });
  }
  _build();

  /** Trả về bản ghi CSDL nếu tên khớp đúng, ngược lại null. */
  function find(query) {
    const key = normalize(query);
    return key ? (_index.get(key) || null) : null;
  }

  return { normalize, find };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { NF_Foods };
