const SUPABASE_URL = "https://bqpcyhifhmtfjbkkradk.supabase.co";
const SUPABASE_KEY = "sb_publishable_lQA8up065yVbUjrv4qzWtg_zudq1czJ";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const items = [
  {title:"Community",description:"En plats för att upptäcka och dela intressen.",category:"community",symbol:"◎"},
  {title:"Verktyg",description:"Smarta verktyg samlade på ett ställe.",category:"tools",symbol:"⌘"},
  {title:"Guider",description:"Enkla guider som hjälper dig komma igång.",category:"guides",symbol:"✦"}
];
const $ = (selector) => document.querySelector(selector);
const search = $("#search"), category = $("#category"), results = $("#results"), empty = $("#empty");
let currentUser = null, currentProfile = null, isAdmin = false, channel = null, pendingSignupEmail = "";

function renderItems() {
  const q = search.value.trim().toLowerCase();
  const filtered = items.filter(x => (category.value === "all" || x.category === category.value) &&
    (x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q)));
  results.replaceChildren();
  filtered.forEach(item => {
    const card = document.createElement("article"); card.className = "card";
    const symbol = document.createElement("div"); symbol.className = "symbol"; symbol.textContent = item.symbol;
    const title = document.createElement("h3"); title.textContent = item.title;
    const desc = document.createElement("p"); desc.textContent = item.description;
    const tag = document.createElement("span"); tag.className = "category"; tag.textContent = item.category;
    card.append(symbol, title, desc, tag); results.append(card);
  });
  empty.hidden = filtered.length !== 0;
}
search.addEventListener("input", renderItems);
category.addEventListener("change", renderItems);
$("#searchBtn").addEventListener("click", renderItems);
$("#year").textContent = new Date().getFullYear();
renderItems();

function setStatus(message, isError = false) {
  const el = $("#authStatus"); el.textContent = message; el.classList.toggle("error", isError);
}
function setChatStatus(message, isError = false) {
  const el = $("#chatStatus"); el.textContent = message; el.classList.toggle("error", isError);
}
function safeText(value) { return typeof value === "string" ? value : ""; }

async function refreshAuth() {
  const { data: { user } } = await db.auth.getUser();
  currentUser = user;
  currentProfile = null;
  isAdmin = false;
  if (user) {
    const { data } = await db.from("profiles").select("id, username, display_name, bio").eq("id", user.id).maybeSingle();
    currentProfile = data;
    const { data: adminFlag } = await db.rpc("is_site_admin");
    isAdmin = adminFlag === true;
  }
  $("#authForms").hidden = !!user || !!pendingSignupEmail;
  $("#verifyForm").hidden = !!user || !pendingSignupEmail;
  $("#signedIn").hidden = !user;
  $("#messageInput").disabled = !user;
  $("#sendBtn").disabled = !user;
  $("#adminNotice").hidden = !isAdmin;
  if (user && currentProfile) {
    $("#welcomeName").textContent = "Hej, " + currentProfile.display_name + "!";
    $("#displayName").value = currentProfile.display_name;
    $("#bio").value = currentProfile.bio || "";
    setChatStatus("Du är inloggad. Skriv gärna ett vänligt meddelande.");
  } else if (!user) {
    setChatStatus("Logga in för att skriva. Alla kan läsa chatten.");
  }
  await loadMessages();
}

$("#signupForm").addEventListener("submit", async (event) => {
  event.preventDefault(); setStatus("Skickar verifieringskod...");
  const username = $("#signupName").value.trim().toLowerCase();
  const email = $("#signupEmail").value.trim();
  const password = $("#signupPassword").value;
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { username, display_name: username } } });
  if (error) return setStatus(error.message, true);
  if (data.session) {
    setStatus("Kontot är skapat och du är inloggad!");
    await refreshAuth();
  } else {
    pendingSignupEmail = email;
    $("#authForms").hidden = true;
    $("#verifyForm").hidden = false;
    $("#verifyCode").focus();
    setStatus("Koden har skickats. Öppna mejlet och skriv in de sex siffrorna här.");
  }
});
$("#verifyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!pendingSignupEmail) return;
  const token = $("#verifyCode").value.trim();
  setStatus("Kontrollerar koden...");
  const { error } = await db.auth.verifyOtp({ email: pendingSignupEmail, token, type: "signup" });
  if (error) return setStatus("Koden stämmer inte eller har gått ut. Kontrollera mejlet och försök igen.", true);
  pendingSignupEmail = "";
  $("#verifyCode").value = "";
  setStatus("E-postadressen är verifierad. Du är inloggad!");
  await refreshAuth();
});
$("#resendCode").addEventListener("click", async () => {
  if (!pendingSignupEmail) return;
  setStatus("Skickar en ny kod...");
  const { error } = await db.auth.resend({ type: "signup", email: pendingSignupEmail });
  if (error) return setStatus(error.message, true);
  setStatus("En ny verifieringskod har skickats till mejlen.");
});
$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault(); setStatus("Loggar in...");
  const { error } = await db.auth.signInWithPassword({
    email: $("#loginEmail").value.trim(), password: $("#loginPassword").value
  });
  if (error) return setStatus(error.message, true);
  setStatus("Du är inloggad!"); await refreshAuth();
});
$("#logoutBtn").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) return setStatus(error.message, true);
  setStatus("Du har loggat ut."); await refreshAuth();
});
$("#profileForm").addEventListener("submit", async (event) => {
  event.preventDefault(); if (!currentUser) return;
  const { error } = await db.from("profiles").update({
    display_name: $("#displayName").value.trim(), bio: $("#bio").value.trim()
  }).eq("id", currentUser.id);
  if (error) return setStatus(error.message, true);
  setStatus("Profilen är sparad."); await refreshAuth();
});

async function loadMessages() {
  const { data, error } = await db.from("messages")
    .select("id, user_id, body, created_at, profiles(username, display_name)")
    .is("deleted_at", null).order("created_at", { ascending: true }).limit(100);
  if (error) { setChatStatus("Kunde inte läsa chatten just nu.", true); return; }
  const box = $("#messages"); box.replaceChildren();
  (data || []).forEach(addMessageNode);
}
function addMessageNode(message) {
  const box = $("#messages");
  const row = document.createElement("article"); row.className = "message";
  const meta = document.createElement("div"); meta.className = "message-meta";
  const name = document.createElement("strong");
  name.textContent = safeText(message.profiles?.display_name || message.profiles?.username || "Användare");
  const date = document.createElement("time");
  date.dateTime = message.created_at;
  date.textContent = new Date(message.created_at).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
  meta.append(name, date);
  const body = document.createElement("p"); body.textContent = safeText(message.body);
  row.append(meta, body);
  if (currentUser && (currentUser.id === message.user_id || isAdmin)) {
    const remove = document.createElement("button"); remove.className = "text-button"; remove.textContent = "Ta bort";
    remove.addEventListener("click", () => deleteMessage(message.id));
    row.append(remove);
  }
  if (isAdmin && currentUser.id !== message.user_id) {
    const ban = document.createElement("button"); ban.className = "text-button danger"; ban.textContent = "Blockera användaren";
    ban.addEventListener("click", () => banUser(message.user_id));
    row.append(ban);
  }
  box.append(row); box.scrollTop = box.scrollHeight;
}
async function deleteMessage(id) {
  if (!confirm("Ta bort meddelandet?")) return;
  const { error } = await db.from("messages").delete().eq("id", id);
  if (error) setChatStatus("Kunde inte ta bort meddelandet.", true);
  else await loadMessages();
}
async function banUser(userId) {
  if (!isAdmin || !confirm("Blockera användaren från att skriva i chatten?")) return;
  const { error } = await db.from("banned_users").insert({ user_id: userId, reason: "Blockerad av administratör" });
  if (error) setChatStatus("Kunde inte blockera kontot.", true);
  else setChatStatus("Användaren är blockerad från att skicka nya meddelanden.");
}
$("#messageForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return setChatStatus("Logga in först.", true);
  const input = $("#messageInput"), body = input.value.trim();
  if (!body) return;
  $("#sendBtn").disabled = true;
  const { error } = await db.from("messages").insert({ user_id: currentUser.id, body });
  $("#sendBtn").disabled = false;
  if (error) setChatStatus(error.code === "42501" ? "Du kan inte skicka meddelanden med det här kontot." : "Meddelandet kunde inte skickas.", true);
  else { input.value = ""; setChatStatus("Meddelandet skickades."); await loadMessages(); }
});
function subscribeChat() {
  if (channel) db.removeChannel(channel);
  channel = db.channel("public-community-chat")
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, loadMessages)
    .subscribe();
}
db.auth.onAuthStateChange(() => { setTimeout(refreshAuth, 0); });
subscribeChat();
refreshAuth();
