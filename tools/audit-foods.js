// Kiểm tra độ nhất quán của CSDL: so kcal ghi trong bảng với kcal tính từ macro (Atwater 4-4-9).
// Chạy: node tools/audit-foods.js   (lệch > 10% = cần xem lại nguồn số liệu)
const { load } = require('../tests/load');
const { NF_FOODS_DATA } = load(['js/data/foods.js'], ['NF_FOODS_DATA']);
const rows = NF_FOODS_DATA.map((f) => {
  const calc = 4 * f.protein + 4 * f.carb + 9 * f.fat;
  const dev = f.calories ? (calc - f.calories) / f.calories : 0;
  return { name: f.name, serving: f.serving, ghi: f.calories, tinh: Math.round(calc), lech: Math.round(dev * 1000) / 10 };
});
console.table(rows.filter((r) => Math.abs(r.lech) > 8 && Math.abs(r.tinh - r.ghi) > 8));
console.log('Số món:', rows.length, '| lệch > 10%:', rows.filter((r) => Math.abs(r.lech) > 10 && Math.abs(r.tinh - r.ghi) > 8).length);
