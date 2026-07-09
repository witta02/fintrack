import { getLanguage } from "./i18n.js";

export const categoryColors = {
  Food: "#FF8F00",
  Transport: "#58A6FF",
  Shopping: "#BC8CFF",
  Salary: "#3FB950",
  Bills: "#F85149",
  Entertainment: "#FF7B72",
  Health: "#DA3633",
  Other: "#8B949E",
  Education: "#79C0FF",
  Investment: "#56D364",
  Gift: "#D2A8FF",
  Travel: "#FFA657",
};

export const expenseCategories = [
  { name: "Food", icon: "lucide-utensils", emoji: "🍔", label: "อาหาร" },
  { name: "Transport", icon: "lucide-car", emoji: "🚗", label: "เดินทาง" },
  {
    name: "Shopping",
    icon: "lucide-shopping-bag",
    emoji: "🛍️",
    label: "ช้อปปิ้ง",
  },
  { name: "Bills", icon: "lucide-receipt", emoji: "🧾", label: "ค่าใช้จ่าย" },
  { name: "Entertainment", icon: "lucide-film", emoji: "🎬", label: "บันเทิง" },
  { name: "Health", icon: "lucide-heart", emoji: "🏥", label: "สุขภาพ" },
  {
    name: "Education",
    icon: "lucide-graduation-cap",
    emoji: "🎓",
    label: "การศึกษา",
  },
  { name: "Travel", icon: "lucide-plane", emoji: "✈️", label: "ท่องเที่ยว" },
  { name: "Other", icon: "lucide-grid", emoji: "📦", label: "อื่นๆ" },
];

export const incomeCategories = [
  { name: "Salary", icon: "lucide-wallet", emoji: "💰", label: "เงินเดือน" },
  {
    name: "Investment",
    icon: "lucide-trending-up",
    emoji: "📈",
    label: "ลงทุน",
  },
  { name: "Gift", icon: "lucide-gift", emoji: "🎁", label: "ของขวัญ" },
  { name: "Other", icon: "lucide-grid", emoji: "➕", label: "อื่นๆ" },
];

export function getCategoryInfo(name) {
  const all = [...expenseCategories, ...incomeCategories];
  const cat = all.find((c) => c.name === name);
  const englishLabels = {
    Food: "Food",
    Transport: "Transport",
    Shopping: "Shopping",
    Salary: "Salary",
    Bills: "Bills",
    Entertainment: "Entertainment",
    Health: "Health",
    Education: "Education",
    Investment: "Investment",
    Gift: "Gift",
    Travel: "Travel",
    Other: "Other",
  };
  const isEnglish = getLanguage() === "en";
  return {
    name: name,
    label: isEnglish
      ? englishLabels[name] || "Other"
      : cat
        ? cat.label
        : "อื่นๆ",
    icon: cat ? cat.icon : "lucide-grid",
    emoji: cat ? cat.emoji : "📦",
    svg: getCategorySvg(name),
    color: categoryColors[name] || "#FFB800",
  };
}

export function getCategorySvg(name) {
  const svgs = {
    Food: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v8c0 1.1.9 2 2 2h3Z"/><path d="M19 17v5"/></svg>`,
    Transport: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
    Shopping: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    Bills: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>`,
    Entertainment: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`,
    Health: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
    Education: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>`,
    Travel: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.2-1.9.9l-.5 1.5 8.2 3.5-3.5 3.5-3.9-1.2-1 1 2.8 2.8L8.3 22l1-1-1.2-3.9 3.5-3.5 3.5 8.2 1.5-.5c.7-.3 1.1-1.1.9-1.9Z"/></svg>`,
    Other: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    Salary: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14a2 2 0 0 1 2 2v3"/><path d="M21 12H7a2 2 0 0 0 0 4h14Z"/></svg>`,
    Investment: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
    Gift: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M12 5a3 3 0 1 0-3 3h6a3 3 0 1 0-3-3Z"/><path d="M12 2v20"/><path d="M19 12H5"/></svg>`,
  };
  return svgs[name] || svgs.Other;
}
