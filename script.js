import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD14O8OlXzID8KBO4YswuTL6JsiiGt7rxk",
  authDomain: "helpy-d2b85.firebaseapp.com",
  projectId: "helpy-d2b85",
  storageBucket: "helpy-d2b85.firebasestorage.app",
  messagingSenderId: "327239030213",
  appId: "1:327239030213:web:96add7018c697eadf8e7ac"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN_PIN = "5555";
const PEOPLE = ["Milo", "Alice"];

let helpys = [];
let completions = [];
let currentTab = "current";
let adminUnlocked = false;

const els = {
  cardsGrid: document.getElementById("cardsGrid"),
  userStats: document.getElementById("userStats"),
  adminBtn: document.getElementById("adminBtn"),
  adminView: document.getElementById("adminView"),
  closeAdminBtn: document.getElementById("closeAdminBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  addBtn: document.getElementById("addBtn"),
  adminList: document.getElementById("adminList"),
  modal: document.getElementById("modal"),
  modalContent: document.getElementById("modalContent"),
  closeModal: document.getElementById("closeModal"),
  statTotalCount: document.getElementById("statTotalCount"),
  statTotalValue: document.getElementById("statTotalValue"),
  statDoneCount: document.getElementById("statDoneCount"),
  statDoneValue: document.getElementById("statDoneValue"),
  statPaidCount: document.getElementById("statPaidCount"),
  statPaidValue: document.getElementById("statPaidValue")
};

function money(value) {
  return `${Number(value || 0)} kr`;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openModal(html) {
  els.modalContent.innerHTML = html;
  els.modal.classList.remove("hidden");
}

function closeModal() {
  els.modal.classList.add("hidden");
  els.modalContent.innerHTML = "";
}

function activeHelpys() {
  const completedIds = new Set(completions.map(c => c.helpyId));
  return helpys.filter(h => !completedIds.has(h.id));
}

function pendingCompletions() {
  return completions.filter(c => !c.paid);
}

function paidCompletions() {
  return completions.filter(c => c.paid);
}

function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => {
      img.src = e.target.result;
    };

    reader.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 900;

      let width = img.width;
      let height = img.height;

      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };

    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImage(h) {
  return h.imageData || h.imageUrl || "";
}

function renderAll() {
  renderUserStats();
  renderCards();
  renderAdminStats();
  renderAdminList();
}

function renderUserStats() {
  els.userStats.innerHTML = PEOPLE.map(person => {
    const all = completions.filter(c => c.person === person);
    const pending = all.filter(c => !c.paid);
    const paid = all.filter(c => c.paid);

    const pendingSum = pending.reduce((sum, c) => sum + Number(c.reward || 0), 0);
    const paidSum = paid.reduce((sum, c) => sum + Number(c.reward || 0), 0);

    return `
      <div class="person-stat">
        <h3>${person}</h3>
        <p><strong>Kommande utbetalning:</strong> ${money(pendingSum)}</p>
        <p><strong>Antal utförda:</strong> ${all.length}</p>
        <p><strong>Redan utbetalt:</strong> ${money(paidSum)}</p>
      </div>
    `;
  }).join("");
}

function renderCards() {
  const cards = activeHelpys();

  if (!cards.length) {
    els.cardsGrid.innerHTML = `<p class="empty">Inga aktuella Helpys just nu.</p>`;
    return;
  }

  els.cardsGrid.innerHTML = cards.map(h => `
    <article class="helpy-card" data-open-helpy="${h.id}">
      <img src="${getImage(h)}" alt="">
      <div class="card-info">
        <div class="card-price">${money(h.reward)}</div>
        <div class="card-title">${escapeHtml(h.title)}</div>
      </div>
    </article>
  `).join("");
}

function renderAdminStats() {
  const active = activeHelpys();
  const done = pendingCompletions();
  const paid = paidCompletions();

  els.statTotalCount.textContent = active.length;
  els.statTotalValue.textContent = `tot. ${money(active.reduce((s, h) => s + Number(h.reward || 0), 0))}`;

  els.statDoneCount.textContent = done.length;
  els.statDoneValue.textContent = `tot. ${money(done.reduce((s, c) => s + Number(c.reward || 0), 0))}`;

  els.statPaidCount.textContent = paid.length;
  els.statPaidValue.textContent = `tot. ${money(paid.reduce((s, c) => s + Number(c.reward || 0), 0))}`;
}

function renderAdminList() {
  if (!adminUnlocked) return;

  if (currentTab === "current") {
    const items = activeHelpys();

    if (!items.length) {
      els.adminList.innerHTML = `<p class="empty">Inget att visa under Aktuella.</p>`;
      return;
    }

    els.adminList.innerHTML = items.map(h => `
      <div class="admin-item">
        <img src="${getImage(h)}" alt="">
        <div>
          <h3>${money(h.reward)} · ${escapeHtml(h.title)}</h3>
          <p><strong>Status:</strong> Aktuell</p>
        </div>
        <div class="admin-actions">
          <button class="action-btn" data-edit="${h.id}">Ändra</button>
          <button class="action-btn red" data-delete-helpy="${h.id}">Ta bort</button>
        </div>
      </div>
    `).join("");
  }

  if (currentTab === "payout") {
    const items = pendingCompletions();

    if (!items.length) {
      els.adminList.innerHTML = `<p class="empty">Inget att betala ut.</p>`;
      return;
    }

    els.adminList.innerHTML = items.map(c => `
      <div class="admin-item">
        <img src="${c.imageData || c.imageUrl || ""}" alt="">
        <div>
          <h3>${money(c.reward)} · ${escapeHtml(c.title)}</h3>
          <p><strong>Utförd av:</strong> ${escapeHtml(c.person)}</p>
          ${c.comment ? `<p><strong>Kommentar:</strong> ${escapeHtml(c.comment)}</p>` : ""}
        </div>
        <div class="admin-actions">
          <button class="action-btn green" data-paid="${c.id}">Klar</button>
          <button class="action-btn red" data-delete-completion="${c.id}">Ta bort</button>
        </div>
      </div>
    `).join("");
  }

  if (currentTab === "history") {
    const paid = paidCompletions();

    const summary = PEOPLE.map(person => {
      const list = paid.filter(c => c.person === person);
      const sum = list.reduce((acc, c) => acc + Number(c.reward || 0), 0);

      return `
        <div>
          <h3>${person}</h3>
          <p>Antal: ${list.length}</p>
          <p>Totalt: ${money(sum)}</p>
        </div>
      `;
    }).join("");

    const listHtml = paid.length ? paid.map(c => `
      <div class="admin-item">
        <img src="${c.imageData || c.imageUrl || ""}" alt="">
        <div>
          <h3>${money(c.reward)} · ${escapeHtml(c.title)}</h3>
          <p><strong>Utförd av:</strong> ${escapeHtml(c.person)}</p>
          <p><strong>Status:</strong> Utbetald</p>
          ${c.comment ? `<p><strong>Kommentar:</strong> ${escapeHtml(c.comment)}</p>` : ""}
        </div>
        <div class="admin-actions">
          <button class="action-btn red" data-delete-completion="${c.id}">Ta bort</button>
        </div>
      </div>
    `).join("") : `<p class="empty">Ingen historik ännu.</p>`;

    els.adminList.innerHTML = `
      <div class="history-summary">${summary}</div>
      ${listHtml}
    `;
  }
}

function openHelpyCard(id) {
  const h = helpys.find(x => x.id === id);
  if (!h) return;

  openModal(`
    <form class="form" id="completeForm">
      <h2>${escapeHtml(h.title)}</h2>
      <img class="preview-img" src="${getImage(h)}" alt="">
      <p><strong>${money(h.reward)}</strong></p>

      <label>Vem är du?</label>
      <select name="person" required>
        <option value="">Välj namn</option>
        ${PEOPLE.map(p => `<option value="${p}">${p}</option>`).join("")}
      </select>

      <label>Kommentar frivilligt</label>
      <textarea name="comment" placeholder="Skriv något om du vill"></textarea>

      <button class="submit-btn" type="submit">Skicka</button>
    </form>
  `);

  document.getElementById("completeForm").addEventListener("submit", async e => {
    e.preventDefault();

    const form = e.target;
    const person = form.person.value;
    const comment = form.comment.value.trim();

    try {
      await addDoc(collection(db, "completions"), {
        helpyId: h.id,
        title: h.title,
        reward: Number(h.reward || 0),
        imageData: getImage(h),
        person,
        comment,
        paid: false,
        completedAt: serverTimestamp()
      });

      closeModal();
    } catch (err) {
      alert("Kunde inte skicka. Kolla Firestore-reglerna.");
      console.error(err);
    }
  });
}

function openAdminLogin() {
  openModal(`
    <form class="form" id="adminPinForm">
      <h2>Admin</h2>
      <label>PIN</label>
      <input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" required autofocus>
      <button class="submit-btn" type="submit">Öppna admin</button>
    </form>
  `);

  document.getElementById("adminPinForm").addEventListener("submit", e => {
    e.preventDefault();

    if (e.target.pin.value.trim() !== ADMIN_PIN) {
      alert("Fel PIN");
      return;
    }

    adminUnlocked = true;
    closeModal();
    showAdmin();
  });
}

function showAdmin() {
  adminUnlocked = true;
  els.adminView.classList.remove("hidden");
  renderAll();
}

function hideAdmin() {
  els.adminView.classList.add("hidden");
}

function openAddForm() {
  openModal(`
    <form class="form" id="helpyForm">
      <h2>Ny Helpy</h2>

      <label>Bild</label>
      <input name="image" type="file" accept="image/*" required>

      <label>Text</label>
      <input name="title" type="text" placeholder="Töm diskmaskinen" required>

      <label>Värde</label>
      <input name="reward" type="number" inputmode="numeric" placeholder="20" required>

      <button class="submit-btn" type="submit">Spara</button>
    </form>
  `);

  document.getElementById("helpyForm").addEventListener("submit", async e => {
    e.preventDefault();

    const form = e.target;
    const file = form.image.files[0];
    const title = form.title.value.trim();
    const reward = Number(form.reward.value);

    if (!file || !title || !reward) {
      alert("Fyll i bild, text och värde.");
      return;
    }

    const btn = form.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Sparar...";

    try {
      const imageData = await imageToBase64(file);

      await addDoc(collection(db, "helpys"), {
        title,
        reward,
        imageData,
        createdAt: serverTimestamp()
      });

      closeModal();
    } catch (err) {
      alert("Kunde inte spara. Kolla Firestore-reglerna.");
      console.error(err);
      btn.disabled = false;
      btn.textContent = "Spara";
    }
  });
}

function openEditForm(id) {
  const h = helpys.find(x => x.id === id);
  if (!h) return;

  openModal(`
    <form class="form" id="editForm">
      <h2>Ändra Helpy</h2>

      <img class="preview-img" src="${getImage(h)}" alt="">

      <label>Ny bild frivilligt</label>
      <input name="image" type="file" accept="image/*">

      <label>Text</label>
      <input name="title" type="text" value="${escapeHtml(h.title)}" required>

      <label>Värde</label>
      <input name="reward" type="number" inputmode="numeric" value="${Number(h.reward || 0)}" required>

      <button class="submit-btn" type="submit">Spara ändring</button>
    </form>
  `);

  document.getElementById("editForm").addEventListener("submit", async e => {
    e.preventDefault();

    const form = e.target;
    const update = {
      title: form.title.value.trim(),
      reward: Number(form.reward.value)
    };

    const file = form.image.files[0];

    try {
      if (file) {
        update.imageData = await imageToBase64(file);
      }

      await updateDoc(doc(db, "helpys", id), update);
      closeModal();
    } catch (err) {
      alert("Kunde inte spara ändringen.");
      console.error(err);
    }
  });
}

async function deleteHelpy(id) {
  if (!confirm("Ta bort denna Helpy helt?")) return;

  try {
    const related = completions.filter(c => c.helpyId === id);
    for (const c of related) {
      await deleteDoc(doc(db, "completions", c.id));
    }

    await deleteDoc(doc(db, "helpys", id));
  } catch (err) {
    alert("Kunde inte ta bort.");
    console.error(err);
  }
}

async function deleteCompletion(id) {
  if (!confirm("Ta bort denna registrering?")) return;

  try {
    await deleteDoc(doc(db, "completions", id));
  } catch (err) {
    alert("Kunde inte ta bort.");
    console.error(err);
  }
}

async function markPaid(id) {
  try {
    await updateDoc(doc(db, "completions", id), {
      paid: true,
      paidAt: serverTimestamp()
    });
  } catch (err) {
    alert("Kunde inte markera som Klar.");
    console.error(err);
  }
}

document.addEventListener("click", e => {
  const card = e.target.closest("[data-open-helpy]");
  if (card) openHelpyCard(card.dataset.openHelpy);

  const edit = e.target.closest("[data-edit]");
  if (edit) openEditForm(edit.dataset.edit);

  const delHelpy = e.target.closest("[data-delete-helpy]");
  if (delHelpy) deleteHelpy(delHelpy.dataset.deleteHelpy);

  const delCompletion = e.target.closest("[data-delete-completion]");
  if (delCompletion) deleteCompletion(delCompletion.dataset.deleteCompletion);

  const paid = e.target.closest("[data-paid]");
  if (paid) markPaid(paid.dataset.paid);
});

els.adminBtn.addEventListener("click", () => {
  if (adminUnlocked) {
    showAdmin();
  } else {
    openAdminLogin();
  }
});

els.closeAdminBtn.addEventListener("click", hideAdmin);

els.logoutBtn.addEventListener("click", () => {
  adminUnlocked = false;
  hideAdmin();
});

els.addBtn.addEventListener("click", openAddForm);
els.closeModal.addEventListener("click", closeModal);

els.modal.addEventListener("click", e => {
  if (e.target === els.modal) closeModal();
});

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentTab = btn.dataset.tab;
    renderAdminList();
  });
});

onSnapshot(query(collection(db, "helpys"), orderBy("createdAt", "desc")), snap => {
  helpys = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderAll();
}, err => {
  console.error(err);
  alert("Kan inte läsa Helpys. Kolla Firestore-reglerna.");
});

onSnapshot(query(collection(db, "completions"), orderBy("completedAt", "desc")), snap => {
  completions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderAll();
}, err => {
  console.error(err);
  alert("Kan inte läsa utförda Helpys. Kolla Firestore-reglerna.");
});
