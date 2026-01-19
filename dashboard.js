import { createClient } from "https://esm.sh/@supabase/supabase-js";

/* ================= SUPABASE ================= */
const supabase = createClient(
  "https://eysofbxczoaesihxpelb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5c29mYnhjem9hZXNpaHhwZWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjM4MjIsImV4cCI6MjA3ODYzOTgyMn0.X4Nec16yXjcrQtpUzAlkwJDgQKHKz8lqU4WF7kjp2KU"
);

/* ================= ELEMENT ================= */
const dateInput = document.getElementById("dateFilter");
const sesiInput = document.getElementById("sesiFilter");
const btnLoad = document.getElementById("btnLoad");
const titleEl = document.getElementById("chart-title");

dateInput.value = new Date().toISOString().slice(0, 10);

/* ================= STATE ================= */
let allRows = [];
let chartIndex = 0;
let timer = null;

const chartList = [
  { key: "stability", title: "Stability (Higher Is Better)", min: 0, max: 4, unit: "m/s²" },
  { key: "comfort", title: "Comfort (Lower Is Better)", min: 0, max: 4, unit: "m/s²" },
  { key: "noise", title: "Noise (Lower Is Better)", min: 40, max: 100, unit: "dB" }
];

/* ================= HELPERS ================= */
const avg = arr => {
  const v = arr.filter(x => typeof x === "number");
  return v.length ? +(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2) : null;
};

/* ================= LOAD DATA ================= */
async function loadData() {
  const { data } = await supabase
    .from("responses")
    .select("*")
    .eq("tgl", dateInput.value)
    .eq("sesi", sesiInput.value)
    .order("created_at");

  if (!data) return;

  allRows = data;

  const zenix = data.filter(r => r.type === "Zenix");
  const m6 = data.filter(r => r.type === "M6");

  fillTable("zenix-body", "zenix-count", zenix.slice(-3), zenix.length, "stability");
  fillTable("m6c-body", "m6c-count", m6.slice(-3), m6.length, "comfort");
  fillTable("m6n-body", "m6n-count", m6.slice(-3), m6.length, "noise");

  chartIndex = 0;
  renderChart();
  startRotation();
}

btnLoad.onclick = loadData;

/* ================= REALTIME ================= */
supabase
  .channel("responses-realtime")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "responses" },
    loadData
  )
  .subscribe();

/* ================= TABLE ================= */
function fillTable(bodyId, countId, rows, total, key) {
  const tb = document.getElementById(bodyId);
  document.getElementById(countId).textContent = `(${total} Rows Data)`;
  tb.innerHTML = "";

  rows.forEach(r => {
    tb.innerHTML += `
      <tr>
        <td class="tdname">${r.name}</td>
        <td>${r[`dunlop_${key}`] ?? "-"}</td>
        <td>${r[`komp_${key}`] ?? "-"}</td>
      </tr>`;
  });
}

/* ================= CHART ================= */
function renderChart() {
  const cfg = chartList[chartIndex];
  titleEl.textContent = cfg.title;

  document.querySelectorAll(".session-table").forEach(el => {
    el.classList.toggle("active", el.dataset.session === cfg.key);
  });

  Highcharts.chart("main-chart", {
    chart: { type: "column" },
    title: { text: "" },
    credits: { enabled: false },
    xAxis: { categories: [""] },
    yAxis: { min: cfg.min, max: cfg.max, title: { text: cfg.unit } },
    plotOptions: {
      column: { dataLabels: { enabled: true } }
    },
    series: [
      {
        name: "Dunlop",
        data: [avg(allRows.map(r => r[`dunlop_${cfg.key}`]))],
        color: "#e6b800"
      },
      {
        name: "Kompetitor",
        data: [avg(allRows.map(r => r[`komp_${cfg.key}`]))],
        color: "#d40000"
      }
    ]
  });
}

/* ================= ROTATE ================= */
function startRotation() {
  clearInterval(timer);
  timer = setInterval(() => {
    chartIndex = (chartIndex + 1) % chartList.length;
    renderChart();
  }, 3000);
}

/* ================= FULLSCREEN ================= */
document.getElementById("fullscreen").onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

/* ================= INIT ================= */
loadData();
