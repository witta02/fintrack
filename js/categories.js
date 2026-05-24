export const categoryColors = {
  'Food': '#FF8F00',
  'Transport': '#58A6FF',
  'Shopping': '#BC8CFF',
  'Salary': '#3FB950',
  'Bills': '#F85149',
  'Entertainment': '#FF7B72',
  'Health': '#DA3633',
  'Other': '#8B949E',
  'Education': '#79C0FF',
  'Investment': '#56D364',
  'Gift': '#D2A8FF',
  'Travel': '#FFA657',
};

export const expenseCategories = [
  { name: 'Food', icon: 'lucide-utensils', emoji: '🍔', label: 'อาหาร' },
  { name: 'Transport', icon: 'lucide-car', emoji: '🚗', label: 'เดินทาง' },
  { name: 'Shopping', icon: 'lucide-shopping-bag', emoji: '🛍️', label: 'ช้อปปิ้ง' },
  { name: 'Bills', icon: 'lucide-receipt', emoji: '🧾', label: 'ค่าใช้จ่าย' },
  { name: 'Entertainment', icon: 'lucide-film', emoji: '🎬', label: 'บันเทิง' },
  { name: 'Health', icon: 'lucide-heart', emoji: '🏥', label: 'สุขภาพ' },
  { name: 'Education', icon: 'lucide-graduation-cap', emoji: '🎓', label: 'การศึกษา' },
  { name: 'Travel', icon: 'lucide-plane', emoji: '✈️', label: 'ท่องเที่ยว' },
  { name: 'Other', icon: 'lucide-grid', emoji: '📦', label: 'อื่นๆ' },
];

export const incomeCategories = [
  { name: 'Salary', icon: 'lucide-wallet', emoji: '💰', label: 'เงินเดือน' },
  { name: 'Investment', icon: 'lucide-trending-up', emoji: '📈', label: 'ลงทุน' },
  { name: 'Gift', icon: 'lucide-gift', emoji: '🎁', label: 'ของขวัญ' },
  { name: 'Other', icon: 'lucide-grid', emoji: '➕', label: 'อื่นๆ' },
];

export function getCategoryInfo(name) {
  const all = [...expenseCategories, ...incomeCategories];
  const cat = all.find(c => c.name === name);
  return {
    name: name,
    label: cat ? cat.label : 'อื่นๆ',
    icon: cat ? cat.icon : 'lucide-grid',
    emoji: cat ? cat.emoji : '📦',
    color: categoryColors[name] || '#FFB800'
  };
}
