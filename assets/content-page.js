// Policy pages (/privacy, /terms) read their text from the same Firestore
// documents the app reads — content/privacy and content/buying-selling —
// which are edited in luqtah-admin-panel (إدارة المحتوى). The static text
// already in <main> is the fallback: it's only replaced once the document
// loads successfully, so the page never goes blank offline or on an error.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  projectId: "luqtt-alamirat-be643",
  appId: "1:511827118684:web:d933079cff90a127d87499",
  apiKey: "AIzaSyD14i-DqWSD8weFICNau3eMzc_zFXDspng",
  authDomain: "luqtt-alamirat-be643.firebaseapp.com",
  storageBucket: "luqtt-alamirat-be643.firebasestorage.app",
  messagingSenderId: "511827118684",
};

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Same inline syntax as the app: **bold** and [label](https://url) (new
// window). Plain mentions of the support email and the delete-account page
// become links too.
function inline(text) {
  return esc(text)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/(^|[^">@\w])(support@luqtah\.online)/g, '$1<a href="mailto:$2">$2</a>')
    .replace(/(^|[^">\/\w])luqtah\.online\/delete-account/g, '$1<a href="/delete-account">luqtah.online/delete-account</a>');
}

function renderBlock(b) {
  switch (b.type) {
    case "paragraph": return b.bold ? `<p><b>${inline(b.text)}</b></p>` : `<p>${inline(b.text)}</p>`;
    case "bulletList": {
      const sub = (b.items || []).length && b.items.every((i) => String(i).trim().startsWith("◦"));
      return `<ul${sub ? ' class="sub"' : ""}>${b.items.map((i) => `<li>${inline(sub ? String(i).replace(/^\s*◦\s*/, "") : i)}</li>`).join("")}</ul>`;
    }
    case "numberedList": return `<ol>${b.items.map((i) => `<li>${inline(i)}</li>`).join("")}</ol>`;
    case "callout":
    case "quote": return `<p class="note">${inline(b.text)}</p>`;
    case "chips": return `<ul>${b.items.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`;
    case "twoColumn": return `<p><b>${inline(b.left?.heading)}</b> ${inline(b.left?.text)}</p><p><b>${inline(b.right?.heading)}</b> ${inline(b.right?.text)}</p>`;
    case "table": return `<div class="table-wrap"><table><thead><tr>${b.headers.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r) => `<tr>${(r.cells || []).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    default: return "";
  }
}

async function load() {
  const main = document.querySelector("main[data-content-id]");
  if (!main) return;
  try {
    const db = getFirestore(initializeApp(firebaseConfig));
    const snap = await getDoc(doc(db, "content", main.dataset.contentId));
    if (!snap.exists()) return;
    const page = snap.data();
    if (!Array.isArray(page.blocks) || page.blocks.length === 0) return;
    // One card (<section>) per heading, like the static layout.
    const sections = [];
    for (const b of page.blocks) {
      if (b.type === "heading") sections.push({ h: b.text, body: [] });
      else { if (!sections.length) sections.push({ h: "", body: [] }); sections[sections.length - 1].body.push(b); }
    }
    const updated = page.lastUpdated || "[تاريخ النشر]";
    main.innerHTML =
      `<h1>${esc(page.title || document.title)}</h1>` +
      `<p class="muted">${main.dataset.subtitlePrefix || ""}آخر تحديث: ${esc(updated)}</p>` +
      sections.map((s) => `<section>${s.h ? `<h2>${inline(s.h)}</h2>` : ""}${s.body.map(renderBlock).join("")}</section>`).join("");
    main.dataset.source = "firestore";
  } catch (err) {
    console.error("[policy page] Could not load from Firestore, keeping the built-in text:", err);
  }
}

load();
