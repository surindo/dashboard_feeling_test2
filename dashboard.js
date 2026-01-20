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
    .eq("tgl", date)
    .order("created_at", { ascending: true });

  if (error || !data) return;

  const zenixAll = data.filter(r => r.type === "Zenix");
  const m6All = data.filter(r => r.type === "M6");

  // ambil 3 DATA TERAKHIR
  tableZenix(zenixAll.slice(-3), zenixAll.length, animate);
  tableM6(m6All.slice(-3), m6All.length, animate);

  charts(data);
}

/* ================= TABLES ================= */
function tableZenix(rows, totalRows, animate) {
  const tb = document.getElementById("zenix-body");
  const countEl = document.getElementById("zenix-count");

  tb.innerHTML = "";
  countEl.textContent = `(${totalRows} Rows Data)`;

  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="tdname">${r.name}</td>
      <td>${r.dunlop_stability ?? "-"}</td>
      <td>${r.komp_stability ?? "-"}</td>
    `;

    // animasi hanya data PALING BARU (baris terakhir)
    if (animate && i === rows.length - 1) {
      tr.style.animation = "nyundul .5s";
    }

    tb.appendChild(tr);
  });
}

function tableM6(rows, totalRows, animate) {
  const tb = document.getElementById("m6-body");
  const countEl = document.getElementById("m6-count");

  tb.innerHTML = "";
  countEl.textContent = `(${totalRows} Rows Data)`;

  rows.forEach((r, i) => {
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

  // Hitung dynamic min-max untuk Stability
  const stabVals = [dS, kS].filter(v => typeof v === "number");
  const stabMin = stabVals.length > 0 ? Math.min(...stabVals) - 0.03   : 0.5;
  const stabMax = stabVals.length > 0 ? Math.max(...stabVals) + 0.03   : 1.5;

  // Hitung dynamic min-max untuk Comfort
  const comfVals = [dC, kC].filter(v => typeof v === "number");
  const comfMin = comfVals.length > 0 ? Math.min(...comfVals) - 0.03   : 0.25;
  const comfMax = comfVals.length > 0 ? Math.max(...comfVals) + 0.03   : 1;

  // Hitung dynamic min-max untuk Noise
  const noiseVals = [dN, kN].filter(v => typeof v === "number");
  const noiseMin = noiseVals.length > 0 ? Math.min(...noiseVals) - 5 : 40;
  const noiseMax = noiseVals.length > 0 ? Math.max(...noiseVals) + 5 : 80;

  bar("chart-stability", dS, kS, stabMin, stabMax, "m/s²");
  bar("chart-comfort", dC, kC, comfMin, comfMax, "m/s²");
  bar("chart-noise", dN, kN, noiseMin, noiseMax, "dB");

  radar(
    normalizeHighBetter(dS, stabMin, stabMax),
    normalizeHighBetter(kS, stabMin, stabMax),
    normalizeLowBetter(dC, comfMin, comfMax),
    normalizeLowBetter(kC, comfMin, comfMax),
    normalizeLowBetter(dN, noiseMin, noiseMax),
    normalizeLowBetter(kN, noiseMin, noiseMax)
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
      size: "100%"  
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

        distance: -50,        

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
  draggable: { handle: ".card" },
  disableDrag: true,
  disableResize: true
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

