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
const closeAdminView = document.getElementById("closeAdminView");

const openUpload = document.getElementById("openUpload");
const uploadModal = document.getElementById("uploadModal");
const closeUpload = document.getElementById("closeUpload");
const helpyImage = document.getElementById("helpyImage");
const helpyTitle = document.getElementById("helpyTitle");
const helpyReward = document.getElementById("helpyReward");
const uploadHelpy = document.getElementById("uploadHelpy");
const uploadStatus = document.getElementById("uploadStatus");

const editModal = document.getElementById("editModal");
const closeEdit = document.getElementById("closeEdit");
const editTitle = document.getElementById("editTitle");
const editReward = document.getElementById("editReward");
const editImage = document.getElementById("editImage");
const saveEdit = document.getElementById("saveEdit");
const editStatus = document.getElementById("editStatus");

const statAvailable = document.getElementById("statAvailable");
const statAvailableValue = document.getElementById("statAvailableValue");
const statPending = document.getElementById("statPending");
const statPendingValue = document.getElementById("statPendingValue");
const statPaid = document.getElementById("statPaid");
const statPaidValue = document.getElementById("statPaidValue");

const miloPending = document.getElementById("miloPending");
const miloDone = document.getElementById("miloDone");
const miloPaid = document.getElementById("miloPaid");
const alicePending = document.getElementById("alicePending");
const aliceDone = document.getElementById("aliceDone");
const alicePaid = document.getElementById("alicePaid");

const helpyModal = document.getElementById("helpyModal");
const closeHelpy = document.getElementById("closeHelpy");
const modalImage = document.getElementById("modalImage");
const modalReward = document.getElementById("modalReward");
const modalTitle = document.getElementById("modalTitle");
const doneButton = document.getElementById("doneButton");

const doneModal = document.getElementById("doneModal");
const closeDone = document.getElementById("closeDone");
const donePerson = document.getElementById("donePerson");
const doneComment = document.getElementById("doneComment");
const sendDone = document.getElementById("sendDone");
const doneStatus = document.getElementById("doneStatus");

const toast = document.getElementById("toast");

let allItems = [];
let publicItems = [];
let currentAdminFilter = "available";
let currentEditItem = null;
let currentItem = null;
let isAdmin = localStorage.getItem("helpy_admin") === "true";

function showToast(text) {
  toast.innerHTML = text;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2600);
}

function statusOf(item) {
  return item.status || "available";
}

function statusLabel(status) {
  if (status === "available") return "Aktuell";
  if (status === "pending") return "Betala ut";
  if (status === "paid") return "Historik";
  return "Aktuell";
}

function rewardNumber(value) {
  const cleaned = String(value || "").replace(",", ".").match(/\d+(\.\d+)?/);
  return cleaned ? Number(cleaned[0]) : 0;
}

function formatKr(value) {
  return `${Math.round(Number(value || 0)).toLocaleString("sv-SE")} kr`;
}

function getRewardText(item) {
  return formatKr(rewardNumber(item.reward));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });
}

function personStats(person) {
  const personItems = allItems.filter(item => item.person === person);
  const pending = personItems.filter(item => statusOf(item) === "pending");
  const paid = personItems.filter(item => statusOf(item) === "paid");

  return {
    pendingValue: pending.reduce((sum, item) => sum + rewardNumber(item.reward), 0),
    paidValue: paid.reduce((sum, item) => sum + rewardNumber(item.reward), 0),
    doneCount: personItems.filter(item => statusOf(item) === "pending" || statusOf(item) === "paid").length
  };
}

function updateKidStats() {
  const milo = personStats("Milo");
  const alice = personStats("Alice");

  miloPending.textContent = formatKr(milo.pendingValue);
  miloDone.textContent = milo.doneCount;
  miloPaid.textContent = formatKr(milo.paidValue);

  alicePending.textContent = formatKr(alice.pendingValue);
  aliceDone.textContent = alice.doneCount;
  alicePaid.textContent = formatKr(alice.paidValue);
}

function updateAdminStats() {
  const available = allItems.filter(item => statusOf(item) === "available");
  const pending = allItems.filter(item => statusOf(item) === "pending");
  const paid = allItems.filter(item => statusOf(item) === "paid");

  statAvailable.textContent = available.length;
  statAvailableValue.textContent = `tot. ${formatKr(available.reduce((sum, item) => sum + rewardNumber(item.reward), 0))}`;

  statPending.textContent = pending.length;
  statPendingValue.textContent = `tot. ${formatKr(pending.reduce((sum, item) => sum + rewardNumber(item.reward), 0))}`;

  statPaid.textContent = paid.length;
  statPaidValue.textContent = `tot. ${formatKr(paid.reduce((sum, item) => sum + rewardNumber(item.reward), 0))}`;
}

function renderGallery() {
  gallery.innerHTML = "";

  publicItems = sortItems(allItems.filter(item => statusOf(item) === "available"));

  if (publicItems.length === 0) {
    gallery.innerHTML = "<p>Inga aktuella Helpys just nu.</p>";
    return;
  }

  publicItems.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
      <img src="${item.imageData}" alt="Helpy" />
      <div class="card-info">
        <div class="card-price">${getRewardText(item)}</div>
        <div class="card-title">${escapeHtml(item.title || "")}</div>
      </div>
    `;

    card.addEventListener("click", () => openHelpy(item));
    gallery.appendChild(card);
  });
}

function renderAdmin() {
  if (!isAdmin) {
    adminPanel.classList.add("hidden");
    return;
  }

  adminPanel.classList.remove("hidden");
  adminList.innerHTML = "";
  updateAdminStats();

  const items = sortItems(allItems).filter(item => statusOf(item) === currentAdminFilter);

  if (currentAdminFilter === "paid") {
    const summary = document.createElement("div");
    summary.className = "history-summary";
    summary.innerHTML = ["Milo", "Alice"].map(person => {
      const paid = allItems.filter(item => statusOf(item) === "paid" && item.person === person);
      const total = paid.reduce((sum, item) => sum + rewardNumber(item.reward), 0);

      return `
        <div class="stat-card">
          <div class="stat-number">${paid.length}</div>
          <div class="stat-label">${formatKr(total)}</div>
          <div class="stat-title">${person}</div>
        </div>
      `;
    }).join("");

    adminList.appendChild(summary);
  }

  if (items.length === 0) {
    adminList.innerHTML += `<p>Inget att visa under ${filterName(currentAdminFilter)}.</p>`;
    return;
  }

  items.forEach(item => {
    const status = statusOf(item);
    const card = document.createElement("article");
    card.className = "admin-card";

    card.innerHTML = `
      <img src="${item.imageData}" alt="Helpy" />
      <div>
        <h4>${getRewardText(item)} · ${escapeHtml(item.title || "")}</h4>
        <p><strong>Status:</strong> ${statusLabel(status)}</p>
        ${item.person ? `<p><strong>Utförd av:</strong> ${escapeHtml(item.person)}</p>` : ""}
        ${item.comment ? `<p><strong>Kommentar:</strong> ${escapeHtml(item.comment)}</p>` : ""}
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
  if (filter === "pending") return "Betala ut";
  if (filter === "paid") return "Historik";
  return "";
}

function adminButtons(status) {
  if (status === "available") {
    return `
      <button data-action="edit" class="secondary">Ändra</button>
      <button data-action="delete" class="danger">Ta bort</button>
    `;
  }

  if (status === "pending") {
    return `
      <button data-action="paid" class="primary-action">Klar</button>
      <button data-action="available" class="secondary">Lägg tillbaks</button>
      <button data-action="delete" class="danger">Ta bort</button>
    `;
  }

  if (status === "paid") {
    return `
      <button data-action="available" class="secondary primary-action">Lägg tillbaks</button>
      <button data-action="delete" class="danger">Ta bort</button>
    `;
  }

  return "";
}

async function handleAdminAction(item, action) {
  const itemRef = doc(db, COLLECTION_NAME, item.id);

  try {
    if (action === "edit") {
      openEditModal(item);
      return;
    }

    if (action === "paid") {
      await updateDoc(itemRef, {
        status: "paid",
        paidAt: serverTimestamp()
      });
      showToast("✅ Markerad som klar");
    }

    if (action === "available") {
      await updateDoc(itemRef, {
        status: "available",
        person: "",
        comment: "",
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
  editReward.value = rewardNumber(item.reward) || "";
  editImage.value = "";
  editStatus.textContent = "";
  editModal.classList.remove("hidden");
}

async function saveEditItem() {
  if (!currentEditItem) return;

  const title = editTitle.value.trim();
  const reward = rewardNumber(editReward.value.trim());
  const file = editImage.files[0];

  if (!title || !reward) {
    editStatus.textContent = "Fyll i text och värde.";
    return;
  }

  saveEdit.disabled = true;
  editStatus.textContent = "Sparar...";

  try {
    const update = {
      title,
      reward,
      updatedAt: serverTimestamp()
    };

    if (file) {
      editStatus.textContent = "Komprimerar bild...";
      update.imageData = await compressImageToFirestoreSize(file);
    }

    await updateDoc(doc(db, COLLECTION_NAME, currentEditItem.id), update);

    editModal.classList.add("hidden");
    currentEditItem = null;
    showToast("Ändringen är sparad");
  } catch (err) {
    console.error(err);
    editStatus.textContent = err.message || "Något gick fel.";
  } finally {
    saveEdit.disabled = false;
  }
}

function openHelpy(item) {
  currentItem = item;
  modalImage.src = item.imageData;
  modalReward.textContent = getRewardText(item);
  modalTitle.textContent = item.title || "";
  helpyModal.classList.remove("hidden");
}

async function submitDone() {
  const item = currentItem;
  const person = donePerson.value;
  const comment = doneComment.value.trim();

  if (!person) {
    doneStatus.textContent = "Välj Milo eller Alice först.";
    return;
  }

  if (!item || statusOf(item) !== "available") {
    doneStatus.textContent = "Den här Helpy är inte längre aktuell.";
    return;
  }

  sendDone.disabled = true;
  doneStatus.textContent = "Skickar...";

  try {
    await updateDoc(doc(db, COLLECTION_NAME, item.id), {
      status: "pending",
      person,
      comment,
      completedAt: serverTimestamp()
    });

    doneModal.classList.add("hidden");
    helpyModal.classList.add("hidden");
    donePerson.value = "";
    doneComment.value = "";
    doneStatus.textContent = "";
    showToast("✅ Helpy skickad<br>Väntar på utbetalning");
  } catch (err) {
    console.error(err);
    doneStatus.textContent = "Något gick fel. Testa igen.";
  } finally {
    sendDone.disabled = false;
  }
}

async function uploadNewHelpy() {
  const file = helpyImage.files[0];
  const title = helpyTitle.value.trim();
  const reward = rewardNumber(helpyReward.value.trim());

  if (!file || !title || !reward) {
    uploadStatus.textContent = "Välj bild och fyll i text och värde.";
    return;
  }

  uploadHelpy.disabled = true;
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
      person: "",
      comment: "",
      createdAt: serverTimestamp(),
      completedAt: null,
      paidAt: null,
      updatedAt: null
    });

    helpyImage.value = "";
    helpyTitle.value = "";
    helpyReward.value = "";
    uploadStatus.textContent = "";
    uploadModal.classList.add("hidden");
    currentAdminFilter = "available";
    setActiveFilter("available");
    showToast("✅ Helpy är upplagd");
  } catch (err) {
    console.error(err);
    uploadStatus.textContent = err.message || "Något gick fel.";
  } finally {
    uploadHelpy.disabled = false;
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
  if (isAdmin) {
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

adminGear.addEventListener("click", () => {
  if (isAdmin) {
    applyAdminState();
    showToast("Adminläge öppnat");
    return;
  }

  pinModal.classList.remove("hidden");
  pinInput.focus();
});

closePin.addEventListener("click", () => pinModal.classList.add("hidden"));

pinSubmit.addEventListener("click", () => {
  if (pinInput.value === ADMIN_PIN) {
    isAdmin = true;
    localStorage.setItem("helpy_admin", "true");
    pinInput.value = "";
    pinError.textContent = "";
    pinModal.classList.add("hidden");
    applyAdminState();
    showToast("Adminläge öppnat");
  } else {
    pinError.textContent = "Fel PIN.";
  }
});

pinInput.addEventListener("keydown", e => {
  if (e.key === "Enter") pinSubmit.click();
});

logoutAdmin.addEventListener("click", () => {
  isAdmin = false;
  localStorage.removeItem("helpy_admin");
  applyAdminState();
  showToast("Utloggad");
});

closeAdminView.addEventListener("click", () => {
  adminPanel.classList.add("hidden");
  showToast("Adminvy stängd");
});

openUpload.addEventListener("click", () => {
  helpyImage.value = "";
  helpyTitle.value = "";
  helpyReward.value = "";
  uploadStatus.textContent = "";
  uploadModal.classList.remove("hidden");
});

closeUpload.addEventListener("click", () => uploadModal.classList.add("hidden"));
uploadHelpy.addEventListener("click", uploadNewHelpy);

closeEdit.addEventListener("click", () => editModal.classList.add("hidden"));
saveEdit.addEventListener("click", saveEditItem);

closeHelpy.addEventListener("click", () => helpyModal.classList.add("hidden"));

doneButton.addEventListener("click", () => {
  donePerson.value = "";
  doneComment.value = "";
  doneStatus.textContent = "";
  doneModal.classList.remove("hidden");
});

closeDone.addEventListener("click", () => doneModal.classList.add("hidden"));
sendDone.addEventListener("click", submitDone);

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    currentAdminFilter = button.dataset.filter;
    setActiveFilter(currentAdminFilter);
    renderAdmin();
  });
});

pinModal.addEventListener("click", e => {
  if (e.target === pinModal) pinModal.classList.add("hidden");
});

uploadModal.addEventListener("click", e => {
  if (e.target === uploadModal) uploadModal.classList.add("hidden");
});

editModal.addEventListener("click", e => {
  if (e.target === editModal) editModal.classList.add("hidden");
});

helpyModal.addEventListener("click", e => {
  if (e.target === helpyModal) helpyModal.classList.add("hidden");
});

doneModal.addEventListener("click", e => {
  if (e.target === doneModal) doneModal.classList.add("hidden");
});

const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));

onSnapshot(q, snapshot => {
  allItems = snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  updateKidStats();
  renderGallery();
  renderAdmin();
}, error => {
  console.error(error);
  gallery.innerHTML = "<p>Kunde inte läsa databasen. Kolla Firestore-reglerna.</p>";
  showToast("Kunde inte läsa databasen");
});

applyAdminState();
setActiveFilter(currentAdminFilter);
