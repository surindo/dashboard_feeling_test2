import { createClient } from "https://esm.sh/@supabase/supabase-js";

/* ================= SUPABASE ================= */
const supabase = createClient(
  "https://eysofbxczoaesihxpelb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5c29mYnhjem9hZXNpaHhwZWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjM4MjIsImV4cCI6MjA3ODYzOTgyMn0.X4Nec16yXjcrQtpUzAlkwJDgQKHKz8lqU4WF7kjp2KU"
);

/* ================= DEFAULT FILTER ================= */
const dateInput = document.getElementById("dateFilter");
const sesiInput = document.getElementById("sesiFilter");
const btnLoad = document.getElementById("btnLoad");

dateInput.value = new Date().toISOString().slice(0, 10);

let currentParams = getParams();

/* ================= LOAD BUTTON ================= */
btnLoad.onclick = () => {
  currentParams = getParams();
  loadData(false);
};

/* ================= REALTIME ================= */
supabase
  .channel("responses-realtime")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "responses" },
    () => loadData(true)
  )
  .subscribe();

/* ================= HELPERS ================= */
const avg = arr => {
  const valid = arr.filter(v => typeof v === "number" && !isNaN(v));
  return valid.length
    ? +(valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2)
    : null;
};

const normalizeHighBetter = (v, min, max) =>
  v == null ? null : +(((v - min) / (max - min)) * 100).toFixed(1);

const normalizeLowBetter = (v, min, max) =>
  v == null ? null : +(100 - ((v - min) / (max - min)) * 100).toFixed(1);

function getParams() {
  return {
    date: dateInput.value,
    sesi: sesiInput.value
  };
}

/* ================= LOAD DATA ================= */
async function loadData(animate) {
  const { date, sesi } = currentParams;

  if (!date || !sesi) return;

  const { data, error } = await supabase
    .from("responses")
    .select("*")
    .eq("sesi", sesi)
    .eq("tgl", date);

  if (error || !data) return;

  tableZenix(data.filter(r => r.type === "Zenix").slice(0, 3), animate);
  tableM6(data.filter(r => r.type === "M6").slice(0, 3), animate);
  charts(data);
}

/* ================= TABLES ================= */
function tableZenix(rows, animate) {
  const tb = document.getElementById("zenix-body");
  tb.innerHTML = "";

  rows
    .slice()
    .reverse()
    .forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="tdname">${r.name}</td>
        <td>${r.dunlop_stability ?? "-"}</td>
        <td>${r.komp_stability ?? "-"}</td>
      `;
      if (animate && i === rows.length - 1) {
        tr.style.animation = "nyundul .5s";
      }
      tb.appendChild(tr);
    });
}

function tableM6(rows, animate) {
  const tb = document.getElementById("m6-body");
  tb.innerHTML = "";

  rows
    .slice()
    .reverse()
    .forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="tdname">${r.name}</td>
        <td>${r.dunlop_comfort ?? "-"}</td>
        <td>${r.komp_comfort ?? "-"}</td>
        <td>${r.dunlop_noise ?? "-"}</td>
        <td>${r.komp_noise ?? "-"}</td>
      `;
      if (animate && i === rows.length - 1) {
        tr.style.animation = "nyundul .5s";
      }
      tb.appendChild(tr);
    });
}

/* ================= CHARTS ================= */
function charts(rows) {
  const dS = avg(rows.map(r => r.dunlop_stability));
  const kS = avg(rows.map(r => r.komp_stability));
  const dC = avg(rows.map(r => r.dunlop_comfort));
  const kC = avg(rows.map(r => r.komp_comfort));
  const dN = avg(rows.map(r => r.dunlop_noise));
  const kN = avg(rows.map(r => r.komp_noise));

  const stabVals = rows
    .flatMap(r => [r.dunlop_stability, r.komp_stability])
    .filter(v => typeof v === "number");

  const stabMin = stabVals.length ? Math.floor(Math.min(...stabVals)) : 0;
  const stabMax = stabVals.length ? Math.ceil(Math.max(...stabVals) + 1) : 1;

  bar("chart-stability", dS, kS, stabMin, stabMax, "m/s²");
  bar("chart-comfort", dC, kC, 0, 4, "m/s²");
  bar("chart-noise", dN, kN, 50, 100, "dB");

  radar(
    normalizeHighBetter(dS, stabMin, stabMax),
    normalizeHighBetter(kS, stabMin, stabMax),
    normalizeLowBetter(dC, 0, 4),
    normalizeLowBetter(kC, 0, 4),
    normalizeLowBetter(dN, 50, 100),
    normalizeLowBetter(kN, 50, 100)
  );

  setTimeout(() => {
    Highcharts.charts.forEach(c => c && c.reflow());
  }, 50);
}

/* ================= BAR ================= */
function bar(id, d, k, min, max, unit) {
  Highcharts.chart(id, {
    chart: { type: "column" },
    title: { text: "" },
    credits: { enabled: false },
    xAxis: { categories: [""] },
    yAxis: { min, max, title: { text: unit } },
    plotOptions: {
      column: {
        dataLabels: {
          enabled: true,
          formatter() {
            return this.y == null ? "" : this.y;
          }
        }
      }
    },
    series: [
      { name: "Dunlop", data: [d], color: "#e6b800" },
      { name: "Kompetitor", data: [k], color: "#d40000" }
    ]
  });
}

/* ================= RADAR ================= */
function radar(dS, kS, dC, kC, dN, kN) {
  const chart = Highcharts.chart("chart-radar", {
    chart: {
      polar: true,
      type: "area",
      spacing: [0, 0, 0, 0],
      animation: false
    },

    title: { text: "" },
    credits: { enabled: false },

    pane: {
      size: "90%"   // 🔥 radar tetap besar
    },

    xAxis: {
      categories: ["Stability", "Comfort", "Noise"],
      tickmarkPlacement: "on",
      lineWidth: 0,

      labels: {
        enabled: true,
        reserveSpace: true,
        allowOverlap: true,
        crop: false,
        overflow: "allow",

        distance: -25,          // 🔥 NEGATIF → label masuk lingkaran

        style: {
          fontSize: "13px",
          fontWeight: "600",
          textAlign: "center"
        }
      }
    },

    yAxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      gridLineInterpolation: "circle",
      labels: { enabled: false }
    },

    plotOptions: {
      series: { animation: false },
      area: {
        fillOpacity: 0.25,
        marker: { enabled: true, radius: 3 }
      }
    },

    legend: {
      align: "center",
      verticalAlign: "bottom"
    },

    series: [
      {
        name: "Dunlop",
        data: [dS ?? 0, dC ?? 0, dN ?? 0],
        color: "#e6b800"
      },
      {
        name: "Kompetitor",
        data: [kS ?? 0, kC ?? 0, kN ?? 0],
        color: "#d40000"
      }
    ]
  });

  /* pastikan reflow setelah grid / zoom */
  setTimeout(() => {
    chart.reflow();
    chart.redraw();
  }, 100);
}




/* ================= GRIDSTACK ================= */
const grid = GridStack.init({
  column: 12,
  float: true,
  resizable: { handles: "se" },
  draggable: { handle: ".card" }
});

grid.on("resizestop dragstop", () => {
  setTimeout(() => {
    Highcharts.charts.forEach(c => c && c.reflow());
  }, 100);
});

/* ================= ZOOM & FULLSCREEN ================= */
let zoomLevel = 1;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.3;

const wrap = document.querySelector(".wrap");

function applyZoom() {
  wrap.style.transform = `scale(${zoomLevel})`;
  wrap.style.transformOrigin = "top center";
  grid.cellHeight(120 * zoomLevel);

  setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 150);
}

document.getElementById("zoom-in").onclick = () => {
  if (zoomLevel < MAX_ZOOM) {
    zoomLevel += ZOOM_STEP;
    applyZoom();
  }
};

document.getElementById("zoom-out").onclick = () => {
  if (zoomLevel > MIN_ZOOM) {
    zoomLevel -= ZOOM_STEP;
    applyZoom();
  }
};

document.getElementById("fullscreen").onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

/* ================= INIT ================= */
loadData(false);
