const STORAGE_KEY = "listflow-items";

const form = document.getElementById("item-form");
const itemInput = document.getElementById("item-input");
const dueDateInput = document.getElementById("due-date-input");
const listSelect = document.getElementById("list-select");
const newListForm = document.getElementById("new-list-form");
const newListInput = document.getElementById("new-list-input");
const listItems = document.getElementById("list-items");
const emptyState = document.getElementById("empty-state");
const statusText = document.getElementById("status-text");
const connectionBadge = document.getElementById("connection-badge");
const activeListTitle = document.getElementById("active-list-title");

let state = loadState();

function createDefaultState() {
  return {
    activeListId: "default",
    lists: [
      {
        id: "default",
        name: "My List",
        items: []
      }
    ]
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return createDefaultState();
    }

    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return {
        activeListId: "default",
        lists: [
          {
            id: "default",
            name: "My List",
            items: parsed
          }
        ]
      };
    }

    if (!Array.isArray(parsed.lists) || parsed.lists.length === 0) {
      return createDefaultState();
    }

    return {
      activeListId: parsed.activeListId || parsed.lists[0].id,
      lists: parsed.lists
    };
  } catch (error) {
    console.error("Unable to load saved state", error);
    return createDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateSummary() {
  const currentList = getActiveList();
  const completed = currentList.items.filter((item) => item.completed).length;
  const total = currentList.items.length;
  const noun = total === 1 ? "item" : "items";
  statusText.textContent = `${total} ${noun}, ${completed} completed`;
}

function updateConnectionBadge() {
  connectionBadge.textContent = navigator.onLine ? "Saved locally" : "Offline mode";
}

function getActiveList() {
  let activeList = state.lists.find((list) => list.id === state.activeListId);

  if (!activeList) {
    activeList = state.lists[0];
    state.activeListId = activeList.id;
  }

  return activeList;
}

function populateListOptions() {
  listSelect.innerHTML = "";

  state.lists.forEach((list) => {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.name;
    option.selected = list.id === state.activeListId;
    listSelect.append(option);
  });
}

function moveItem(index, direction) {
  const currentList = getActiveList();
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= currentList.items.length) {
    return;
  }

  [currentList.items[index], currentList.items[targetIndex]] = [
    currentList.items[targetIndex],
    currentList.items[index]
  ];
  saveState();
  renderItems();
}

function deleteItem(index) {
  const currentList = getActiveList();
  currentList.items.splice(index, 1);
  saveState();
  renderItems();
}

function formatDueDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function createItemElement(item, index) {
  const listItem = document.createElement("li");
  listItem.className = `list-item${item.completed ? " is-complete" : ""}`;

  const toggle = document.createElement("input");
  toggle.className = "item-toggle";
  toggle.type = "checkbox";
  toggle.checked = item.completed;
  toggle.setAttribute("aria-label", `Mark ${item.text} complete`);
  toggle.addEventListener("change", () => {
    getActiveList().items[index].completed = toggle.checked;
    saveState();
    renderItems();
  });

  const content = document.createElement("div");

  const text = document.createElement("p");
  text.className = "item-text";
  text.textContent = item.text;
  content.append(text);

  if (item.dueDate) {
    const meta = document.createElement("p");
    meta.className = "item-meta";
    meta.textContent = `Due ${formatDueDate(item.dueDate)}`;
    content.append(meta);
  }

  const controls = document.createElement("div");
  controls.className = "item-controls";

  const upButton = document.createElement("button");
  upButton.className = "icon-button";
  upButton.type = "button";
  upButton.textContent = "Up";
  upButton.setAttribute("aria-label", `Move ${item.text} up`);
  upButton.disabled = index === 0;
  upButton.addEventListener("click", () => moveItem(index, -1));

  const downButton = document.createElement("button");
  downButton.className = "icon-button";
  downButton.type = "button";
  downButton.textContent = "Down";
  downButton.setAttribute("aria-label", `Move ${item.text} down`);
  downButton.disabled = index === getActiveList().items.length - 1;
  downButton.addEventListener("click", () => moveItem(index, 1));

  const deleteButton = document.createElement("button");
  deleteButton.className = "ghost-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${item.text}`);
  deleteButton.addEventListener("click", () => deleteItem(index));

  controls.append(upButton, downButton, deleteButton);
  listItem.append(toggle, content, controls);
  return listItem;
}

function renderItems() {
  const currentList = getActiveList();
  listItems.innerHTML = "";

  currentList.items.forEach((item, index) => {
    listItems.append(createItemElement(item, index));
  });

  populateListOptions();
  activeListTitle.textContent = currentList.name;
  emptyState.hidden = currentList.items.length > 0;
  updateSummary();
  updateConnectionBadge();
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = itemInput.value.trim();
  if (!text) {
    return;
  }

  getActiveList().items.unshift({
    id: typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
    text,
    completed: false,
    dueDate: dueDateInput.value || ""
  });

  saveState();
  renderItems();
  form.reset();
  itemInput.focus();
});

newListForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = newListInput.value.trim();
  if (!name) {
    return;
  }

  const newList = {
    id: typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${state.lists.length}`,
    name,
    items: []
  };

  state.lists.unshift(newList);
  state.activeListId = newList.id;
  saveState();
  renderItems();
  newListForm.reset();
  newListInput.focus();
});

listSelect?.addEventListener("change", () => {
  state.activeListId = listSelect.value;
  saveState();
  renderItems();
});

window.addEventListener("online", updateConnectionBadge);
window.addEventListener("offline", updateConnectionBadge);
renderItems();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (error) {
      console.error("Service worker registration failed", error);
    }
  });
}
