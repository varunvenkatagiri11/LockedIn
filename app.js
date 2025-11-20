const STORAGE_KEY = "lockedInCalendarData_v1";

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const state = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
  entries: loadEntries(),
};

const ui = {
  monthLabel: document.getElementById("monthLabel"),
  yearLabel: document.getElementById("yearLabel"),
  weekdayRow: document.getElementById("weekdayRow"),
  calendarGrid: document.getElementById("calendarGrid"),
  detailDate: document.getElementById("detailDate"),
  detailForm: document.getElementById("detailForm"),
  clearDay: document.getElementById("clearDay"),
};

init();

function init() {
  renderWeekdays();
  bindControls();
  renderCalendar();
  disableForm(true);
}

function renderWeekdays() {
  ui.weekdayRow.innerHTML = weekdayNames
    .map((name) => `<div>${name}</div>`)
    .join("");
}

function bindControls() {
  document
    .getElementById("prevMonth")
    .addEventListener("click", () => shiftMonth(-1));
  document
    .getElementById("nextMonth")
    .addEventListener("click", () => shiftMonth(1));
  ui.detailForm.addEventListener("input", handleFormInput);
  ui.clearDay.addEventListener("click", handleClearDay);
}

function shiftMonth(delta) {
  let newMonth = state.currentMonth + delta;
  let newYear = state.currentYear;

  if (newMonth < 0) {
    newMonth = 11;
    newYear -= 1;
  } else if (newMonth > 11) {
    newMonth = 0;
    newYear += 1;
  }

  state.currentMonth = newMonth;
  state.currentYear = newYear;
  state.selectedDate = null;
  disableForm(true);
  renderCalendar();
}

function renderCalendar() {
  ui.monthLabel.textContent = monthNames[state.currentMonth];
  ui.yearLabel.textContent = state.currentYear.toString();

  const firstDayOfMonth = new Date(
    state.currentYear,
    state.currentMonth,
    1
  ).getDay();
  const daysInMonth = new Date(
    state.currentYear,
    state.currentMonth + 1,
    0
  ).getDate();

  const prevMonthDays = new Date(
    state.currentYear,
    state.currentMonth,
    0
  ).getDate();

  const cells = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i -= 1) {
    const dayNumber = prevMonthDays - i;
    cells.push(
      createDayCell(
        new Date(
          state.currentYear,
          state.currentMonth - 1,
          dayNumber
        ),
        true
      )
    );
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(
      createDayCell(
        new Date(state.currentYear, state.currentMonth, day),
        false
      )
    );
  }

  const totalCells = Math.ceil(cells.length / 7) * 7;
  for (let day = 1; cells.length < totalCells; day += 1) {
    cells.push(
      createDayCell(
        new Date(state.currentYear, state.currentMonth + 1, day),
        true
      )
    );
  }

  ui.calendarGrid.innerHTML = "";
  cells.forEach((cell) => ui.calendarGrid.appendChild(cell));
}

function createDayCell(date, inactive) {
  const iso = toISO(date);
  const entry = state.entries[iso];
  const cell = document.createElement("button");
  cell.className = `day-cell${inactive ? " inactive" : ""}`;
  cell.type = "button";
  cell.dataset.date = iso;

  if (state.selectedDate === iso) {
    cell.classList.add("selected");
  }

  const number = document.createElement("div");
  number.className = "day-number";
  number.textContent = date.getDate();
  cell.appendChild(number);

  if (entry) {
    const preview = document.createElement("div");
    preview.className = "notes-preview";
    const firstLine =
      entry.school || entry.career || entry.personal || "";
    preview.textContent =
      firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
    cell.appendChild(preview);

    const chips = document.createElement("div");
    chips.className = "stat-chips";
    if (entry.screenTime) {
      chips.appendChild(createChip(`${entry.screenTime}h`));
    }
    if (entry.pickups) {
      chips.appendChild(createChip(`${entry.pickups} pickups`));
    }
    if (chips.children.length) {
      cell.appendChild(chips);
    }
  }

  if (!inactive) {
    cell.addEventListener("click", () => selectDate(iso));
  } else {
    cell.disabled = true;
  }

  return cell;
}

function createChip(text) {
  const chip = document.createElement("span");
  chip.className = "stat-chip";
  chip.textContent = text;
  return chip;
}

function selectDate(iso) {
  state.selectedDate = iso;
  renderCalendar();
  populateForm(state.entries[iso] || {});
  ui.detailDate.textContent = formatReadableDate(iso);
  disableForm(false);
  ui.clearDay.disabled = !state.entries[iso];
}

function populateForm(entry) {
  ui.detailForm.school.value = entry.school || "";
  ui.detailForm.career.value = entry.career || "";
  ui.detailForm.personal.value = entry.personal || "";
  ui.detailForm.screenTime.value = entry.screenTime ?? "";
  ui.detailForm.pickups.value = entry.pickups ?? "";
}

function handleFormInput() {
  if (!state.selectedDate) return;
  const entry = {
    school: ui.detailForm.school.value.trim(),
    career: ui.detailForm.career.value.trim(),
    personal: ui.detailForm.personal.value.trim(),
    screenTime: normalizeNumber(ui.detailForm.screenTime.value),
    pickups: normalizeNumber(ui.detailForm.pickups.value, true),
  };

  if (isEntryEmpty(entry)) {
    delete state.entries[state.selectedDate];
  } else {
    state.entries[state.selectedDate] = entry;
  }

  persistEntries();
  ui.clearDay.disabled = !state.entries[state.selectedDate];
  renderCalendar();
}

function handleClearDay() {
  if (!state.selectedDate) return;
  delete state.entries[state.selectedDate];
  persistEntries();
  populateForm({});
  ui.clearDay.disabled = true;
  renderCalendar();
}

function disableForm(disabled) {
  [...ui.detailForm.elements].forEach((el) => {
    if (el.name) {
      el.disabled = disabled;
    }
  });
  ui.clearDay.disabled = disabled;
  ui.detailDate.textContent = disabled
    ? "Select a day"
    : ui.detailDate.textContent;
}

function formatReadableDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${monthNames[month - 1]} ${day}, ${year}`;
}

function toISO(date) {
  return date.toISOString().split("T")[0];
}

function isEntryEmpty(entry) {
  return (
    !entry.school &&
    !entry.career &&
    !entry.personal &&
    entry.screenTime === null &&
    entry.pickups === null
  );
}

function normalizeNumber(value, round = false) {
  if (value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) return null;
  return round ? Math.round(num) : Number(num.toFixed(1));
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Failed to load entries", error);
    return {};
  }
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

