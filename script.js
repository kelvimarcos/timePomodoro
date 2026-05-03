// ===== DOM ELEMENTS =====
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const timerProgress = document.getElementById('timerProgress');
const timerDisplay = document.getElementById('timerDisplay');
const timerRingWrapper = document.getElementById('timer-ring-wrapper');
const separator = document.querySelector('.timer-separator');
const sessionDots = document.querySelectorAll('.dot');
const sessionText = document.getElementById('sessionText');
const soundToggle = document.getElementById('soundToggle');
const alarmSound = document.getElementById('alarmSound');
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const tasksEmpty = document.getElementById('tasksEmpty');
const clearDoneBtn = document.getElementById('clearDoneBtn');
const modeTabs = document.querySelectorAll('.mode-tab');

// ===== STATE =====
const MODES = {
  focus: { label: 'Foco', minutes: 25 },
  short: { label: 'Pausa Curta', minutes: 5 },
  long: { label: 'Pausa Longa', minutes: 15 }
};

let currentMode = 'focus';
let totalSeconds = MODES.focus.minutes * 60;
let remainingSeconds = totalSeconds;
let isRunning = false;
let interval = null;
let currentSession = 1;
let maxSessions = 4;
let soundEnabled = true;
let tasks = [];

// Ring constants
const RING_CIRCUMFERENCE = 2 * Math.PI * 120; // r=120

// ===== INITIALIZE =====
function init() {
  loadTasks();
  loadSettings();
  updateDisplay();
  updateProgress();
  updateSessionDots();
  updateSoundButton();
  renderTasks();
  applyModeClass();
}

// ===== TIMER DISPLAY =====
function updateDisplay() {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  minutesEl.textContent = String(mins).padStart(2, '0');
  secondsEl.textContent = String(secs).padStart(2, '0');

  // Update page title
  document.title = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} — ${MODES[currentMode].label}`;
}

// ===== PROGRESS RING =====
function updateProgress() {
  const fraction = 1 - (remainingSeconds / totalSeconds);
  const offset = RING_CIRCUMFERENCE * (1 - fraction);
  timerProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
  timerProgress.style.strokeDashoffset = offset;
}

// ===== TIMER LOGIC =====
function startTimer() {
  if (isRunning) return;
  isRunning = true;
  startBtn.textContent = 'Pausar';
  startBtn.classList.add('running');
  separator.classList.remove('paused');
  separator.classList.add('running');

  interval = setInterval(() => {
    remainingSeconds--;

    if (remainingSeconds < 0) {
      remainingSeconds = 0;
      completeTimer();
      return;
    }

    updateDisplay();
    updateProgress();
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(interval);
  interval = null;
  startBtn.textContent = 'Continuar';
  startBtn.classList.remove('running');
  separator.classList.remove('running');
  separator.classList.add('paused');
}

function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function resetTimer() {
  isRunning = false;
  clearInterval(interval);
  interval = null;
  remainingSeconds = totalSeconds;
  startBtn.textContent = 'Iniciar';
  startBtn.classList.remove('running');
  separator.classList.remove('running', 'paused');
  updateDisplay();
  updateProgress();
}

function completeTimer() {
  isRunning = false;
  clearInterval(interval);
  interval = null;
  startBtn.textContent = 'Iniciar';
  startBtn.classList.remove('running');
  separator.classList.remove('running', 'paused');

  // Visual feedback
  timerRingWrapper.classList.add('pulse');
  timerDisplay.classList.add('flash');
  setTimeout(() => {
    timerRingWrapper.classList.remove('pulse');
    timerDisplay.classList.remove('flash');
  }, 2000);

  // Sound
  if (soundEnabled) {
    playAlarm();
  }

  // Auto-advance session
  if (currentMode === 'focus') {
    // Mark current session dot as completed
    if (currentSession <= maxSessions) {
      sessionDots[currentSession - 1].classList.add('completed');
      sessionDots[currentSession - 1].classList.remove('current');
    }

    if (currentSession >= maxSessions) {
      // After 4 focus sessions, switch to long break
      switchMode('long', false);
      currentSession = 1;
    } else {
      // Switch to short break
      switchMode('short', false);
      currentSession++;
    }
  } else {
    // After break, switch back to focus
    switchMode('focus', false);
  }

  updateSessionDots();
  updateDisplay();
  updateProgress();
}

// ===== MODE SWITCHING =====
function switchMode(mode, resetSession) {
  if (resetSession === undefined) resetSession = true;

  // Stop timer
  isRunning = false;
  clearInterval(interval);
  interval = null;

  currentMode = mode;
  totalSeconds = MODES[mode].minutes * 60;
  remainingSeconds = totalSeconds;

  // Update tab styles
  modeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  // Reset session counter when manually switching
  if (resetSession && mode === 'focus') {
    currentSession = 1;
    sessionDots.forEach(d => d.classList.remove('completed'));
  }

  startBtn.textContent = 'Iniciar';
  startBtn.classList.remove('running');
  separator.classList.remove('running', 'paused');

  applyModeClass();
  updateDisplay();
  updateProgress();
  updateSessionDots();
}

function applyModeClass() {
  document.body.classList.remove('mode-focus', 'mode-short', 'mode-long');
  document.body.classList.add('mode-' + currentMode);
}

// ===== SESSION DOTS =====
function updateSessionDots() {
  sessionDots.forEach((dot, i) => {
    dot.classList.remove('current');
    if (currentMode === 'focus' && i === currentSession - 1 && !dot.classList.contains('completed')) {
      dot.classList.add('current');
    }
  });
  sessionText.textContent = `Sessão ${currentSession} de ${maxSessions}`;
}

// ===== SOUND =====
function toggleSound() {
  soundEnabled = !soundEnabled;
  updateSoundButton();
  saveSettings();
}

function updateSoundButton() {
  soundToggle.textContent = soundEnabled ? 'Som: ON' : 'Som: OFF';
  soundToggle.classList.toggle('off', !soundEnabled);
}

function playAlarm() {
  try {
    alarmSound.currentTime = 0;
    alarmSound.play().catch(() => {});
  } catch (e) {
    // Fallback: use Web Audio API to create a beep
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.8);
    } catch (err) {
      // Silent fallback
    }
  }
}

// ===== TASKS =====
function addTask(text) {
  const task = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: text.trim(),
    done: false,
    createdAt: Date.now()
  };
  tasks.unshift(task);
  saveTasks();
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveTasks();
    renderTasks();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function clearDoneTasks() {
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = '';

  if (tasks.length === 0) {
    tasksEmpty.classList.remove('hidden');
    return;
  }

  tasksEmpty.classList.add('hidden');

  // Sort: incomplete first, then completed
  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  sorted.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');
    li.id = 'task-' + task.id;

    const checkbox = document.createElement('div');
    checkbox.className = 'task-checkbox' + (task.done ? ' checked' : '');
    checkbox.setAttribute('role', 'checkbox');
    checkbox.setAttribute('aria-checked', task.done);
    checkbox.addEventListener('click', () => toggleTask(task.id));

    const label = document.createElement('span');
    label.className = 'task-label';
    label.textContent = task.text;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-delete';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', 'Excluir tarefa');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

// ===== LOCAL STORAGE =====
function saveTasks() {
  try {
    localStorage.setItem('pomodoro_tasks', JSON.stringify(tasks));
  } catch (e) {}
}

function loadTasks() {
  try {
    const data = localStorage.getItem('pomodoro_tasks');
    if (data) {
      tasks = JSON.parse(data);
    }
  } catch (e) {
    tasks = [];
  }
}

function saveSettings() {
  try {
    localStorage.setItem('pomodoro_settings', JSON.stringify({ soundEnabled }));
  } catch (e) {}
}

function loadSettings() {
  try {
    const data = localStorage.getItem('pomodoro_settings');
    if (data) {
      const settings = JSON.parse(data);
      soundEnabled = settings.soundEnabled !== false;
    }
  } catch (e) {}
}

// ===== EVENT LISTENERS =====
startBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);
soundToggle.addEventListener('click', toggleSound);
clearDoneBtn.addEventListener('click', clearDoneTasks);

// Mode tabs
modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    switchMode(tab.dataset.mode);
  });
});

// Task form
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (text) {
    addTask(text);
    taskInput.value = '';
    taskInput.focus();
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Don't trigger shortcuts when typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      toggleTimer();
      break;
    case 'KeyR':
      resetTimer();
      break;
    case 'Digit1':
    case 'Numpad1':
      switchMode('focus');
      break;
    case 'Digit2':
    case 'Numpad2':
      switchMode('short');
      break;
    case 'Digit3':
    case 'Numpad3':
      switchMode('long');
      break;
  }
});

// ===== START =====
init();