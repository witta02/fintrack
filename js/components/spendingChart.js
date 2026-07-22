import Chart from "chart.js/auto";
import { t } from "../i18n.js";

let chartInstance = null;

export function renderSpendingChart(
  canvasElement,
  dailyExpenses,
  dailyIncome,
  daysInMonth,
  symbol,
) {
  // Destroy existing chart if any
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (!canvasElement) return;

  const labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
  const expenseData = Array.from(
    { length: daysInMonth },
    (_, i) => dailyExpenses[i + 1] || 0,
  );
  const incomeData = Array.from(
    { length: daysInMonth },
    (_, i) => dailyIncome[i + 1] || 0,
  );

  // Check if there is data
  const hasData =
    expenseData.some((v) => v > 0) || incomeData.some((v) => v > 0);

  if (!hasData) {
    const ctx = canvasElement.getContext("2d");
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    // Draw "No Data" text
    ctx.fillStyle = "#8B949E";
    ctx.font = '14px "Inter", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      t("noDataThisMonth"),
      canvasElement.width / 2,
      canvasElement.height / 2,
    );
    return;
  }

  // Get theme colors from CSS variables
  const computedStyle = getComputedStyle(document.documentElement);
  const gridColor =
    computedStyle.getPropertyValue("--border").trim() || "#30363D";
  const textColor =
    computedStyle.getPropertyValue("--text-secondary").trim() || "#8B949E";

  const expenseColor =
    computedStyle.getPropertyValue("--expense").trim() || "#f87171";
  const incomeColor =
    computedStyle.getPropertyValue("--income").trim() || "#4ade80";

  chartInstance = new Chart(canvasElement, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: t("expense"),
          data: expenseData,
          backgroundColor: expenseColor,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.7,
          categoryPercentage: 0.8,
        },
        {
          label: t("income"),
          data: incomeData,
          backgroundColor: incomeColor,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.7,
          categoryPercentage: 0.8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.9)",
          backdropFilter: "blur(8px)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          boxPadding: 4,
          callbacks: {
            title: (items) => {
              return t("dayLabel", { day: items[0].label });
            },
            label: (item) => {
              return ` ${item.dataset.label}: ${symbol}${item.raw.toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: textColor,
            font: {
              family: '"Inter", sans-serif',
              size: 10,
              weight: "500",
            },
            maxRotation: 0,
            callback: function (val, index) {
              const day = index + 1;
              return day === 1 || day % 5 === 0 ? day : "";
            },
          },
        },
        y: {
          grid: {
            color: gridColor,
            drawTicks: false,
            borderDash: [5, 5],
          },
          ticks: {
            color: textColor,
            font: {
              family: '"Inter", sans-serif',
              size: 10,
            },
            padding: 8,
            callback: function (value) {
              if (value >= 1000) {
                return `${(value / 1000).toFixed(0)}k`;
              }
              return value;
            },
          },
        },
      },
    },
  });
}

let pieChartInstance = null;

export function renderCategoryPieChart(canvasElement, categoryData, symbol) {
  if (pieChartInstance) {
    pieChartInstance.destroy();
    pieChartInstance = null;
  }

  if (!canvasElement) return;

  const categories = Object.keys(categoryData);
  const dataValues = Object.values(categoryData);
  const total = dataValues.reduce((a, b) => a + b, 0);

  if (total === 0) {
    const ctx = canvasElement.getContext("2d");
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.fillStyle = "#8B949E";
    ctx.font = '14px "Inter", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      t("noSpendingData"),
      canvasElement.width / 2,
      canvasElement.height / 2,
    );
    return;
  }

  const colors = [
    "#FFC107",
    "#4ade80",
    "#f87171",
    "#60a5fa",
    "#a78bfa",
    "#fb923c",
    "#2dd4bf",
    "#f472b6",
    "#94a3b8",
    "#fbbf24",
  ];

  pieChartInstance = new Chart(canvasElement, {
    type: "doughnut",
    data: {
      labels: categories,
      datasets: [
        {
          data: dataValues,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.9)",
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label: (item) => {
              const val = item.raw;
              const percent = ((val / total) * 100).toFixed(1);
              return ` ${item.label}: ${symbol}${val.toLocaleString()} (${percent}%)`;
            },
          },
        },
      },
    },
  });

  return { categories, dataValues, colors, total };
}
