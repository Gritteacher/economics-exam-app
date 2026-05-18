const GAS_URL = "https://script.google.com/macros/s/AKfycbybRWXkgPJ5YcE3QRKplpWcVQAZR7T1S_XLKEdZQow_sZkgroEh03EN042w-1krMKqQ3g/exec";

let adminPassword = "";
let allResponses = [];
let allLogs = [];

const adminLoginPage = document.getElementById("adminLoginPage");
const dashboardPage = document.getElementById("dashboardPage");

const adminPasswordInput = document.getElementById("adminPasswordInput");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminMessage = document.getElementById("adminMessage");

const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");

const totalStudents = document.getElementById("totalStudents");
const avgScore = document.getElementById("avgScore");
const highestScore = document.getElementById("highestScore");
const lowestScore = document.getElementById("lowestScore");
const totalWarnings = document.getElementById("totalWarnings");

const classroomTableBody = document.getElementById("classroomTableBody");
const responseTableBody = document.getElementById("responseTableBody");
const logTableBody = document.getElementById("logTableBody");

const searchInput = document.getElementById("searchInput");
const roomFilter = document.getElementById("roomFilter");

adminLoginBtn.addEventListener("click", loginAdmin);
refreshBtn.addEventListener("click", loadDashboard);
exportBtn.addEventListener("click", exportCSV);

searchInput.addEventListener("input", renderResponseTable);
roomFilter.addEventListener("change", renderResponseTable);

async function loginAdmin() {
  const password = adminPasswordInput.value.trim();

  if (!password) {
    adminMessage.textContent = "กรุณากรอกรหัสผ่าน";
    return;
  }

  adminPassword = password;
  adminMessage.textContent = "กำลังเข้าสู่ระบบ...";
  adminLoginBtn.disabled = true;

  const success = await loadDashboard();

  if (success) {
    adminLoginPage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");
  } else {
    adminLoginBtn.disabled = false;
  }
}

async function loadDashboard() {
  try {
    const url = `${GAS_URL}?action=getDashboard&password=${encodeURIComponent(adminPassword)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) {
      adminMessage.textContent = data.message || "ไม่สามารถเข้าสู่ระบบได้";
      return false;
    }

    allResponses = data.responses || [];
    allLogs = data.logs || [];

    renderSummary(data.summary);
    renderClassroomTable(data.summary.byClassroom || []);
    renderResponseTable();
    renderLogTable();

    return true;
  } catch (error) {
    adminMessage.textContent = "ไม่สามารถติดต่อ Server ได้";
    return false;
  }
}

function renderSummary(summary) {
  totalStudents.textContent = summary.totalStudents || 0;
  avgScore.textContent = summary.avgScore || "0.00";
  highestScore.textContent = summary.highestScore || 0;
  lowestScore.textContent = summary.lowestScore || 0;
  totalWarnings.textContent = summary.totalWarnings || 0;
}

function renderClassroomTable(classrooms) {
  classroomTableBody.innerHTML = "";

  if (classrooms.length === 0) {
    classroomTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-text">ยังไม่มีข้อมูล</td>
      </tr>
    `;
    return;
  }

  classrooms
    .sort((a, b) => a.classroom.localeCompare(b.classroom, "th"))
    .forEach(room => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${room.classroom}</td>
        <td>${room.count}</td>
        <td>${Number(room.avgScore).toFixed(2)}</td>
        <td>${room.totalWarnings}</td>
      `;

      classroomTableBody.appendChild(tr);
    });
}

function renderResponseTable() {
  const keyword = searchInput.value.trim().toLowerCase();
  const selectedRoom = roomFilter.value;

  let filtered = [...allResponses];

  if (selectedRoom) {
    filtered = filtered.filter(r => r.classroom === selectedRoom);
  }

  if (keyword) {
    filtered = filtered.filter(r => {
      const text = `${r.fullName} ${r.studentNo} ${r.classroom}`.toLowerCase();
      return text.includes(keyword);
    });
  }

  responseTableBody.innerHTML = "";

  if (filtered.length === 0) {
    responseTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-text">ไม่พบข้อมูล</td>
      </tr>
    `;
    return;
  }

  filtered.forEach(r => {
    const tr = document.createElement("tr");

    const warningClass = Number(r.warnings) >= 3 ? "danger-text" : "";

    tr.innerHTML = `
      <td>${r.timestamp}</td>
      <td>${r.fullName}</td>
      <td>${r.studentNo}</td>
      <td>${r.classroom}</td>
      <td><strong>${r.score}</strong></td>
      <td>${r.total}</td>
      <td class="${warningClass}">${r.warnings}</td>
      <td>${formatTime(r.timeUsed)}</td>
    `;

    responseTableBody.appendChild(tr);
  });
}

function renderLogTable() {
  logTableBody.innerHTML = "";

  if (allLogs.length === 0) {
    logTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-text">ยังไม่มีบันทึกพฤติกรรม</td>
      </tr>
    `;
    return;
  }

  allLogs.slice().reverse().forEach(log => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${log.timestamp}</td>
      <td>${log.fullName}</td>
      <td>${log.studentNo}</td>
      <td>${log.classroom}</td>
      <td>${log.type}</td>
      <td>${log.message}</td>
    `;

    logTableBody.appendChild(tr);
  });
}

function exportCSV() {
  if (allResponses.length === 0) {
    alert("ยังไม่มีข้อมูลสำหรับส่งออก");
    return;
  }

  const headers = [
    "เวลาส่ง",
    "ชื่อ - สกุล",
    "เลขที่",
    "ห้อง",
    "คะแนน",
    "คะแนนเต็ม",
    "จำนวนคำเตือน",
    "เวลาที่ใช้"
  ];

  const rows = allResponses.map(r => [
    r.timestamp,
    r.fullName,
    r.studentNo,
    r.classroom,
    r.score,
    r.total,
    r.warnings,
    formatTime(r.timeUsed)
  ]);

  const csvContent = [
    headers,
    ...rows
  ].map(row => row.map(escapeCSV).join(",")).join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "exam-results.csv";
  a.click();

  URL.revokeObjectURL(url);
}

function escapeCSV(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatTime(seconds) {
  const s = Number(seconds || 0);
  const minutes = Math.floor(s / 60);
  const remain = s % 60;

  return `${minutes} นาที ${remain} วินาที`;
}