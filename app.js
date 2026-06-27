import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD14O8OlXzID8KBO4YswuTL6JsiiGt7rxk",
  authDomain: "helpy-d2b85.firebaseapp.com",
  projectId: "helpy-d2b85",
  storageBucket: "helpy-d2b85.firebasestorage.app",
  messagingSenderId: "327239030213",
  appId: "1:327239030213:web:96add7018c697eadf8e7ac"
};

const ADMIN_PIN = "5555";
const COLLECTION_NAME = "helpy_items";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const gallery = document.getElementById("gallery");
const adminPanel = document.getElementById("adminPanel");
const adminList = document.getElementById("adminList");

const adminGear = document.getElementById("adminGear");
const pinModal = document.getElementById("pinModal");
const closePin = document.getElementById("closePin");
const pinInput = document.getElementById("pinInput");
const pinSubmit = document.getElementById("pinSubmit");
const pinError = document.getElementById("pinError");
const logoutAdmin = document.getElementById("logoutAdmin");
const closeAdminPanel = document.getElementById("closeAdminPanel");

const openUpload = document.getElementById("openUpload");
const uploadModal = document.getElementById("uploadModal");
const closeUpload = document.getElementById("closeUpload");
const itemImage = document.getElementById("itemImage");
const itemTitle = document.getElementById("itemTitle");
const itemReward = document.getElementById("itemReward");
const uploadItem = document.getElementById("uploadItem");
const uploadStatus = document.getElementById("uploadStatus");

const editModal = document.getElementById("editModal");
const closeEdit = document.getElementById("closeEdit");
const editTitle = document.getElementById("editTitle");
const editReward = document.getElementById("editReward");
const saveEdit = document.getElementById("saveEdit");
const editStatus = document.getElementById("editStatus");

const statAvailable = document.getElementById("statAvailable");
const statAvailableValue = document.getElementById("statAvailableValue");
const statCompleted = document.getElementById("statCompleted");
const statCompletedValue = document.getElementById("statCompletedValue");
const statPaid = document.getElementById("statPaid");
const statPaidValue = document.getElementById("statPaidValue");

const historySplit = document.getElementById("historySplit");
const historyMilo = document.getElementById("historyMilo");
const historyAlice = document.getElementById("historyAlice");

const productModal = document.getElementById("productModal");
const closeProduct = document.getElementById("closeProduct");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalReward = document.getElementById("modalReward");
const doneButton = document.getElementById("doneButton");
const prevItem = document.getElementById("prevItem");
const nextItem = document.getElementById("nextItem");

const doneModal = document.getElementById("doneModal");
const closeDone = document.getElementById("closeDone");
const childComment = document.getElementById("childComment");
const sendDone = document.getElementById("sendDone");
const doneStatus = document.getElementById("doneStatus");

const statsButton = document.getElementById("statsButton");
const familyStatsModal = document.getElementById("familyStatsModal");
const closeFamilyStats = document.getElementById("closeFamilyStats");

const miloPending = document.getElementById("miloPending");
const miloDone = document.getElementById("miloDone");
const miloPaid = document.getElementById("miloPaid");
const alicePending = document.getElementById("alicePending");
const aliceDone = document.getElementById("aliceDone");
const alicePaid = document.getElementById("alicePaid");

const toast = document.getElementById("toast");

let allItems = [];
let publicItems = [];
let currentIndex = 0;
let currentAdminFilter = "completed";
let currentEditItem = null;
let selectedChild = "";
let isAdmin = localStorage.getItem("helpy_admin") === "true";
let adminVisible = isAdmin;
let scrollYBeforeLock = 0;

const animatedValues = new Map();

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2600);
}

function lockBody() {
  scrollYBeforeLock = window.scrollY || 0;
  document.body.style.top = `-${scrollYBeforeLock}px`;
  document.body.classList.add("modal-open");
}

function unlockBody() {
  document.body.classList.remove("modal-open");
  document.body.style.top = "";
  window.scrollTo(0, scrollYBeforeLock);
}

function allModals() {
  return [
    pinModal,
    uploadModal,
    editModal,
    productModal,
    doneModal,
    familyStatsModal
  ];
}

function anyModalOpen() {
  return allModals().some(modal => !modal.classList.contains("hidden"));
}

function openModal(modal) {
  modal.classList.remove("hidden");
  lockBody();
}

function closeModal(modal) {
  modal.classList.add("hidden");
  if (!anyModalOpen()) unlockBody();
}

function closeAllModals() {
  allModals().forEach(modal => modal.classList.add("hidden"));
  unlockBody();
}

function statusOf(item) {
  return item.status || "available";
}

function statusLabel(status) {
  if (status === "available") return "Aktuell";
  if (status === "completed") return "Betala ut";
  if (status === "paid") return "Historik";
  return "Aktuell";
}

function rewardNumber(reward) {
  const cleaned = String(reward || "").replace(",", ".").match(/\d+(\.\d+)?/);
  return cleaned ? Number(cleaned[0]) : 0;
}

function normalizeReward(reward) {
  const number = rewardNumber(reward);
  if (!number) return "";
  return `${Math.round(number).toLocaleString("sv-SE")} kr`;
}

function formatKr(value) {
  return `${Math.round(value).toLocaleString("sv-SE")} kr`;
}

function childStats(childName) {
  const childItems = allItems.filter(item => item.childName === childName);

  const pending = childItems
    .filter(item => statusOf(item) === "completed")
    .reduce((sum, item) => sum + rewardNumber(item.reward), 0);

  const paidItems = childItems.filter(item => statusOf(item) === "paid");

  const paid = paidItems.reduce((sum, item) => sum + rewardNumber(item.reward), 0);

  return {
    pending,
    done: childItems.filter(item => ["completed", "paid"].includes(statusOf(item))).length,
    paid,
    paidCount: paidItems.length
  };
}

function animateMoney(el, value) {
  const key = el.id;
  const from = animatedValues.has(key) ? animatedValues.get(key) : value;
  const to = Math.round(value);
  const start = performance.now();
  const duration = 300;

  function frame(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;

    el.textContent = formatKr(current);

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      animatedValues.set(key, to);
      el.textContent = formatKr(to);
    }
  }

  requestAnimationFrame(frame);
}

function updateFamilyStats() {
  const milo = childStats("Milo");
  const alice = childStats("Alice");

  animateMoney(miloPending, milo.pending);
  miloDone.textContent = milo.done;
  animateMoney(miloPaid, milo.paid);

  animateMoney(alicePending, alice.pending);
  aliceDone.textContent = alice.done;
  animateMoney(alicePaid, alice.paid);

  historyMilo.textContent = `${milo.paidCount} Helpys · ${formatKr(milo.paid)}`;
  historyAlice.textContent = `${alice.paidCount} Helpys · ${formatKr(alice.paid)}`;
}

function updateStats() {
  const available = allItems.filter(item => statusOf(item) === "available");
  const completed = allItems.filter(item => statusOf(item) === "completed");
  const paid = allItems.filter(item => statusOf(item) === "paid");

  const availableTotal = available.reduce((sum, item) => sum + rewardNumber(item.reward), 0);
  const completedTotal = completed.reduce((sum, item) => sum + rewardNumber(item.reward), 0);
  const paidTotal = paid.reduce((sum, item) => sum + rewardNumber(item.reward), 0);

  statAvailable.textContent = available.length;
  statAvailableValue.textContent = `tot. ${formatKr(availableTotal)}`;

  statCompleted.textContent = completed.length;
  statCompletedValue.textContent = `tot. ${formatKr(completedTotal)}`;

  statPaid.textContent = paid.length;
  statPaidValue.textContent = `tot. ${formatKr(paidTotal)}`;

  updateFamilyStats();
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });
}

function renderGallery() {
  gallery.innerHTML = "";

  publicItems = sortItems(
    allItems.filter(item => statusOf(item) === "available")
  );

  if (publicItems.length === 0) {
    gallery.innerHTML = "<p>Inga aktuella Helpys just nu.</p>";
    return;
  }

  publicItems.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
      <img src="${item.imageData}" alt="Helpy" />
      <div class="card-info">
        <div class="card-title">${escapeHtml(item.title || "")}</div>
        <div class="card-reward">${escapeHtml(item.reward || "")}</div>
      </div>
    `;

    card.addEventListener("click", () => openProduct(index));
    gallery.appendChild(card);
  });
}

function renderAdmin() {
  if (!isAdmin || !adminVisible) {
    adminPanel.classList.add("hidden");
    return;
  }

  adminPanel.classList.remove("hidden");
  adminList.innerHTML = "";
  updateStats();

  historySplit.classList.toggle("hidden", currentAdminFilter !== "paid");

  const items = sortItems(allItems).filter(item => statusOf(item) === currentAdminFilter);

  if (items.length === 0) {
    adminList.innerHTML = `<p>Inget att visa under ${filterName(currentAdminFilter)}.</p>`;
    return;
  }

  items.forEach(item => {
    const status = statusOf(item);
    const card = document.createElement("article");
    card.className = "admin-card";

    card.innerHTML = `
      <img src="${item.imageData}" alt="Helpy" />
      <div>
        <h4>${escapeHtml(item.reward || "")}</h4>
        <p><strong>Uppgift:</strong> ${escapeHtml(item.title || "")}</p>
        <p><strong>Status:</strong> ${statusLabel(status)}</p>
        ${
          item.childName
            ? `<p><strong>Utförd av:</strong> ${escapeHtml(item.childName)}</p>
               <p><strong>Kommentar:</strong> ${escapeHtml(item.childComment || "-")}</p>`
            : `<p>Inte utförd ännu.</p>`
        }
        <div class="admin-actions">
          ${adminButtons(status)}
        </div>
      </div>
    `;

    card.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => handleAdminAction(item, btn.dataset.action));
    });

    adminList.appendChild(card);
  });
}

function filterName(filter) {
  if (filter === "available") return "Aktuella";
  if (filter === "completed") return "Betala ut";
  if (filter === "paid") return "Historik";
  return "";
}

function adminButtons(status) {
  if (status === "available") {
    return `
      <button data-action="edit" class="primary-action secondary">Ändra</button>
      <button data-action="repeat" class="secondary">➕</button>
      <button data-action="delete" class="danger">Ta bort</button>
    `;
  }

  if (status === "completed") {
    return `
      <button data-action="paid" class="primary-action">Klar</button>
      <button data-action="repeat" class="secondary">➕</button>
      <button data-action="available" class="secondary">Lägg tillbaks</button>
      <button data-action="delete" class="danger">Ta bort</button>
    `;
  }

  if (status === "paid") {
    return `
      <button data-action="repeat" class="secondary primary-action">➕</button>
      <button data-action="available" class="secondary">Lägg tillbaks</button>
      <button data-action="delete" class="danger">Ta bort</button>
    `;
  }

  return "";
}

async function createRepeatItem(item) {
  const id = crypto.randomUUID();

  await setDoc(doc(db, COLLECTION_NAME, id), {
    imageData: item.imageData,
    title: item.title,
    reward: item.reward,
    status: "available",
    childName: "",
    childComment: "",
    createdAt: serverTimestamp(),
    completedAt: null,
    paidAt: null,
    repeatedFrom: item.id
  });
}

async function handleAdminAction(item, action) {
  const itemRef = doc(db, COLLECTION_NAME, item.id);

  try {
    if (action === "edit") {
      openEditModal(item);
      return;
    }

    if (action === "repeat") {
      await createRepeatItem(item);
      showToast("Ny Helpy skapad");
      return;
    }

    if (action === "paid") {
      await updateDoc(itemRef, {
        status: "paid",
        paidAt: serverTimestamp()
      });
      showToast("Markerad som utbetald");
    }

    if (action === "available") {
      await updateDoc(itemRef, {
        status: "available",
        childName: "",
        childComment: "",
        completedAt: null,
        paidAt: null
      });
      showToast("Tillbaka till Aktuella");
    }

    if (action === "delete") {
      const ok = confirm("Vill du ta bort denna Helpy helt?");
      if (!ok) return;

      await deleteDoc(itemRef);
      showToast("Helpy borttagen");
    }
  } catch (err) {
    console.error(err);
    showToast("Något gick fel");
  }
}

function openEditModal(item) {
  currentEditItem = item;
  editTitle.value = item.title || "";
  editReward.value = item.reward || "";
  editStatus.textContent = "";
  openModal(editModal);
}

async function saveEditItem() {
  if (!currentEditItem) return;

  const title = editTitle.value.trim();
  const reward = normalizeReward(editReward.value.trim());

  if (!title || !reward) {
    editStatus.textContent = "Fyll i uppgift och belöning.";
    return;
  }

  saveEdit.disabled = true;
  editStatus.textContent = "Sparar...";

  try {
    await updateDoc(doc(db, COLLECTION_NAME, currentEditItem.id), {
      title,
      reward,
      updatedAt: serverTimestamp()
    });

    closeAllModals();
    currentEditItem = null;
    showToast("Ändringen är sparad");
  } catch (err) {
    console.error(err);
    editStatus.textContent = "Något gick fel.";
  } finally {
    saveEdit.disabled = false;
  }
}

function openProduct(index) {
  currentIndex = index;
  const item = publicItems[currentIndex];

  modalImage.src = item.imageData;
  modalTitle.textContent = item.title || "";
  modalReward.textContent = item.reward || "";

  doneButton.disabled = false;
  openModal(productModal);
}

function moveProduct(direction) {
  if (!publicItems.length) return;

  currentIndex += direction;

  if (currentIndex < 0) currentIndex = publicItems.length - 1;
  if (currentIndex >= publicItems.length) currentIndex = 0;

  openProduct(currentIndex);
}

async function submitDone() {
  const item = publicItems[currentIndex];
  const comment = childComment.value.trim();

  if (!selectedChild) {
    doneStatus.textContent = "Välj Milo eller Alice först.";
    return;
  }

  if (!item || statusOf(item) !== "available") {
    doneStatus.textContent = "Den här Helpy finns inte längre bland aktuella.";
    return;
  }

  sendDone.disabled = true;
  doneStatus.textContent = "Skickar...";

  try {
    await updateDoc(doc(db, COLLECTION_NAME, item.id), {
      status: "completed",
      childName: selectedChild,
      childComment: comment,
      completedAt: serverTimestamp()
    });

    closeAllModals();
    showToast("Bra jobbat! Skickad för utbetalning 💚");
  } catch (err) {
    console.error(err);
    doneStatus.textContent = "Något gick fel. Testa igen.";
  } finally {
    sendDone.disabled = false;
  }
}

async function uploadNewItem() {
  const file = itemImage.files[0];
  const title = itemTitle.value.trim();
  const reward = normalizeReward(itemReward.value.trim());

  if (!file || !title || !reward) {
    uploadStatus.textContent = "Välj bild och fyll i uppgift och belöning.";
    return;
  }

  uploadItem.disabled = true;
  uploadStatus.textContent = "Komprimerar bild...";

  try {
    const imageData = await compressImageToFirestoreSize(file);

    uploadStatus.textContent = "Sparar Helpy...";

    const id = crypto.randomUUID();

    await setDoc(doc(db, COLLECTION_NAME, id), {
      imageData,
      title,
      reward,
      status: "available",
      childName: "",
      childComment: "",
      createdAt: serverTimestamp(),
      completedAt: null,
      paidAt: null
    });

    itemImage.value = "";
    itemTitle.value = "";
    itemReward.value = "";
    uploadStatus.textContent = "";

    closeAllModals();

    currentAdminFilter = "available";
    setActiveFilter("available");
    renderAdmin();
    renderGallery();
    updateStats();

    showToast("Helpy skapad");
  } catch (err) {
    console.error(err);
    uploadStatus.textContent = err.message || "Något gick fel.";
  } finally {
    uploadItem.disabled = false;
  }
}

async function compressImageToFirestoreSize(file) {
  let maxWidth = 1000;
  let quality = 0.74;

  for (let attempt = 0; attempt < 8; attempt++) {
    const dataUrl = await resizeImage(file, maxWidth, quality);

    if (dataUrl.length < 850000) {
      return dataUrl;
    }

    maxWidth = Math.round(maxWidth * 0.86);
    quality = Math.max(0.48, quality - 0.06);
  }

  throw new Error("Bilden är för stor. Testa en annan bild eller beskär den först.");
}

function resizeImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = event => {
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };

      img.onerror = reject;
      img.src = event.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function applyAdminState() {
  if (isAdmin && adminVisible) {
    adminPanel.classList.remove("hidden");
  } else {
    adminPanel.classList.add("hidden");
  }

  renderAdmin();
}

function setActiveFilter(filter) {
  document.querySelectorAll(".filter").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

adminGear.addEventListener("click", () => {
  if (isAdmin) {
    adminVisible = true;
    applyAdminState();
    showToast("Adminvy öppnad");
    return;
  }

  openModal(pinModal);
  pinInput.focus();
});

closePin.addEventListener("click", () => closeModal(pinModal));

pinSubmit.addEventListener("click", () => {
  if (pinInput.value === ADMIN_PIN) {
    isAdmin = true;
    adminVisible = true;
    localStorage.setItem("helpy_admin", "true");

    pinInput.value = "";
    pinError.textContent = "";

    closeAllModals();
    applyAdminState();
    showToast("Adminläge öppnat");
  } else {
    pinError.textContent = "Fel PIN.";
  }
});

logoutAdmin.addEventListener("click", () => {
  isAdmin = false;
  adminVisible = false;
  localStorage.removeItem("helpy_admin");
  applyAdminState();
  showToast("Utloggad");
});

closeAdminPanel.addEventListener("click", () => {
  adminVisible = false;
  applyAdminState();
  showToast("Adminvy stängd");
});

openUpload.addEventListener("click", () => {
  itemImage.value = "";
  itemTitle.value = "";
  itemReward.value = "";
  uploadStatus.textContent = "";
  openModal(uploadModal);
});

closeUpload.addEventListener("click", () => closeModal(uploadModal));
uploadItem.addEventListener("click", uploadNewItem);

closeEdit.addEventListener("click", () => closeModal(editModal));
saveEdit.addEventListener("click", saveEditItem);

closeProduct.addEventListener("click", () => closeModal(productModal));
prevItem.addEventListener("click", () => moveProduct(-1));
nextItem.addEventListener("click", () => moveProduct(1));

doneButton.addEventListener("click", () => {
  selectedChild = "";
  childComment.value = "";
  doneStatus.textContent = "";

  document.querySelectorAll(".child-option").forEach(btn => {
    btn.classList.remove("active");
  });

  openModal(doneModal);
});

document.querySelectorAll(".child-option").forEach(button => {
  button.addEventListener("click", () => {
    selectedChild = button.dataset.child;

    document.querySelectorAll(".child-option").forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");
  });
});

closeDone.addEventListener("click", () => closeModal(doneModal));
sendDone.addEventListener("click", submitDone);

statsButton.addEventListener("click", () => {
  updateFamilyStats();
  openModal(familyStatsModal);
});

closeFamilyStats.addEventListener("click", () => closeModal(familyStatsModal));

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    currentAdminFilter = button.dataset.filter;
    setActiveFilter(currentAdminFilter);
    renderAdmin();
  });
});

allModals().forEach(modal => {
  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal(modal);
  });
});

let touchStartY = 0;

familyStatsModal.addEventListener("touchstart", e => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

familyStatsModal.addEventListener("touchend", e => {
  const touchEndY = e.changedTouches[0].clientY;

  if (touchEndY - touchStartY > 90) {
    closeModal(familyStatsModal);
  }
}, { passive: true });

const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));

onSnapshot(q, snapshot => {
  allItems = snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  renderGallery();
  renderAdmin();
  updateStats();
}, error => {
  console.error(error);
  showToast("Kunde inte läsa databasen");
});

applyAdminState();
setActiveFilter(currentAdminFilter);
