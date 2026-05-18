const GAS_URL = "https://script.google.com/macros/s/AKfycbybRWXkgPJ5YcE3QRKplpWcVQAZR7T1S_XLKEdZQow_sZkgroEh03EN042w-1krMKqQ3g/exec";

let student = {
  fullName: "",
  studentNo: "",
  classroom: ""
};

let questions = [];
let answers = {};
let warningCount = 0;
let examStarted = false;
let examSubmitted = false;
let totalTime = 40 * 60;
let timeLeft = totalTime;
let timerInterval = null;
let startTime = null;

let loginPage;
let instructionPage;
let examPage;
let resultPage;

let fullNameInput;
let studentNoInput;
let classroomInput;

let loginBtn;
let loginMessage;
let startBtn;

let studentNameText;
let studentNoText;
let studentClassText;
let studentInfo;

let timerText;
let examForm;
let warningBox;
let submitBtn;
let resultText;

document.addEventListener("DOMContentLoaded", () => {
  loginPage = document.getElementById("loginPage");
  instructionPage = document.getElementById("instructionPage");
  examPage = document.getElementById("examPage");
  resultPage = document.getElementById("resultPage");

  fullNameInput = document.getElementById("fullNameInput");
  studentNoInput = document.getElementById("studentNoInput");
  classroomInput = document.getElementById("classroomInput");

  loginBtn = document.getElementById("loginBtn");
  loginMessage = document.getElementById("loginMessage");
  startBtn = document.getElementById("startBtn");

  studentNameText = document.getElementById("studentName");
  studentNoText = document.getElementById("studentNo");
  studentClassText = document.getElementById("studentClass");
  studentInfo = document.getElementById("studentInfo");

  timerText = document.getElementById("timerText");
  examForm = document.getElementById("examForm");
  warningBox = document.getElementById("warningBox");
  submitBtn = document.getElementById("submitBtn");
  resultText = document.getElementById("resultText");

  loginBtn.addEventListener("click", prepareStudent);
  startBtn.addEventListener("click", startExam);
  submitBtn.addEventListener("click", () => submitExam(false));
});

function prepareStudent() {
  const fullName = fullNameInput.value.trim();
  const number = studentNoInput.value.trim();
  const classroom = classroomInput.value.trim();

  loginMessage.textContent = "";

  if (!fullName) {
    loginMessage.textContent = "กรุณากรอกชื่อ - สกุล";
    fullNameInput.focus();
    return;
  }

  if (!number) {
    loginMessage.textContent = "กรุณากรอกเลขที่";
    studentNoInput.focus();
    return;
  }

  if (!classroom) {
    loginMessage.textContent = "กรุณาเลือกห้องเรียน";
    classroomInput.focus();
    return;
  }

  student = {
    fullName: fullName,
    studentNo: number,
    classroom: classroom
  };

  studentNameText.textContent = student.fullName;
  studentNoText.textContent = student.studentNo;
  studentClassText.textContent = student.classroom;

  loginPage.classList.add("hidden");
  instructionPage.classList.remove("hidden");
}

async function startExam() {
  try {
    await requestFullScreen();

    const url = `${GAS_URL}?action=getExam`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) {
      alert(data.message || "ไม่สามารถโหลดข้อสอบได้");
      return;
    }

    totalTime = data.totalTime || 40 * 60;
    timeLeft = totalTime;

    questions = shuffleArray(data.questions).map(q => ({
      ...q,
      choices: shuffleChoices(q.choices)
    }));

    instructionPage.classList.add("hidden");
    examPage.classList.remove("hidden");

    studentInfo.textContent = `${student.fullName} | เลขที่ ${student.studentNo} | ${student.classroom}`;

    renderQuestions();
    startTimer();

    startTime = Date.now();
    examStarted = true;

    logWarning("START", "เริ่มทำข้อสอบ");
  } catch (error) {
    alert("กรุณาอนุญาต Fullscreen ก่อนเริ่มสอบ");
  }
}

function renderQuestions() {
  examForm.innerHTML = "";

  questions.forEach((q, index) => {
    const card = document.createElement("div");
    card.className = "question-card";

    const title = document.createElement("div");
    title.className = "question-title";
    title.textContent = `${index + 1}. ${q.question}`;

    card.appendChild(title);

    q.choices.forEach(choice => {
      const label = document.createElement("label");
      label.className = "choice";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `q_${q.id}`;
      input.value = choice.key;

      input.addEventListener("change", () => {
        answers[q.id] = choice.key;
      });

      label.appendChild(input);
      label.appendChild(document.createTextNode(`${choice.key}. ${choice.text}`));

      card.appendChild(label);
    });

    examForm.appendChild(card);
  });
}

function startTimer() {
  updateTimerText();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerText();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitExam(true);
    }
  }, 1000);
}

function updateTimerText() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  timerText.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function submitExam(autoSubmit) {
  if (examSubmitted) return;

  const confirmSubmit = autoSubmit
    ? true
    : confirm("ยืนยันการส่งคำตอบหรือไม่? หลังส่งแล้วจะไม่สามารถแก้ไขได้");

  if (!confirmSubmit) return;

  examSubmitted = true;
  submitBtn.disabled = true;
  clearInterval(timerInterval);

  const timeUsed = Math.floor((Date.now() - startTime) / 1000);

  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "submitExam",
        fullName: student.fullName,
        studentNo: student.studentNo,
        classroom: student.classroom,
        answers: answers,
        warnings: warningCount,
        timeUsed: timeUsed
      })
    });

    const data = await res.json();

    examPage.classList.add("hidden");
    resultPage.classList.remove("hidden");

    if (data.success) {
      resultText.textContent = `คะแนนของคุณคือ ${data.score} / ${data.total}`;
    } else {
      resultText.textContent = data.message || "เกิดข้อผิดพลาดในการส่งคำตอบ";
    }

    exitFullScreen();
  } catch (error) {
    examSubmitted = false;
    submitBtn.disabled = false;
    alert("ส่งคำตอบไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง");
  }
}

function showWarning(message) {
  warningCount++;

  warningBox.textContent = `คำเตือนครั้งที่ ${warningCount}: ${message}`;
  warningBox.classList.remove("hidden");

  logWarning("WARNING", message);

  if (warningCount >= 3 && !examSubmitted) {
    alert("ระบบพบพฤติกรรมเสี่ยงทุจริตครบ 3 ครั้ง ระบบจะส่งคำตอบอัตโนมัติ");
    submitExam(true);
  }
}

async function logWarning(type, message) {
  try {
    await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "logWarning",
        fullName: student.fullName,
        studentNo: student.studentNo,
        classroom: student.classroom,
        type: type,
        message: message
      })
    });
  } catch (error) {
    console.warn("Log failed");
  }
}

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function shuffleChoices(choicesObj) {
  const items = Object.keys(choicesObj).map(key => ({
    key: key,
    text: choicesObj[key]
  }));

  return shuffleArray(items);
}

async function requestFullScreen() {
  const el = document.documentElement;

  if (el.requestFullscreen) {
    await el.requestFullscreen();
  } else if (el.webkitRequestFullscreen) {
    await el.webkitRequestFullscreen();
  }
}

function exitFullScreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

document.addEventListener("visibilitychange", () => {
  if (examStarted && !examSubmitted && document.hidden) {
    showWarning("ตรวจพบการเปลี่ยนแท็บหรือออกจากหน้าข้อสอบ");
  }
});

window.addEventListener("blur", () => {
  if (examStarted && !examSubmitted) {
    showWarning("ตรวจพบการออกจากหน้าต่างข้อสอบ");
  }
});

document.addEventListener("fullscreenchange", () => {
  if (examStarted && !examSubmitted && !document.fullscreenElement) {
    showWarning("ตรวจพบการออกจากโหมด Fullscreen");
  }
});

document.addEventListener("contextmenu", e => {
  if (examStarted) {
    e.preventDefault();
    showWarning("ตรวจพบการคลิกขวา");
  }
});

document.addEventListener("copy", e => {
  if (examStarted) {
    e.preventDefault();
    showWarning("ตรวจพบการคัดลอกข้อความ");
  }
});

document.addEventListener("cut", e => {
  if (examStarted) {
    e.preventDefault();
    showWarning("ตรวจพบการตัดข้อความ");
  }
});

document.addEventListener("paste", e => {
  if (examStarted) {
    e.preventDefault();
    showWarning("ตรวจพบการวางข้อความ");
  }
});

document.addEventListener("keydown", e => {
  if (!examStarted) return;

  const key = e.key.toLowerCase();

  if (
    key === "f12" ||
    (e.ctrlKey && key === "u") ||
    (e.ctrlKey && key === "s") ||
    (e.ctrlKey && key === "p") ||
    (e.ctrlKey && key === "c") ||
    (e.ctrlKey && e.shiftKey && key === "i")
  ) {
    e.preventDefault();
    showWarning("ตรวจพบการใช้คีย์ลัดที่ไม่อนุญาต");
  }
});

window.addEventListener("beforeunload", e => {
  if (examStarted && !examSubmitted) {
    e.preventDefault();
    e.returnValue = "";
  }
});
