const items = [
 {title:"Community",description:"En plats för att upptäcka och dela intressen.",category:"community",symbol:"◎"},
 {title:"Verktyg",description:"Smarta verktyg samlade på ett ställe.",category:"tools",symbol:"⌘"},
 {title:"Guider",description:"Enkla guider som hjälper dig komma igång.",category:"guides",symbol:"✦"}
];
const search = document.querySelector("#search");
const category = document.querySelector("#category");
const results = document.querySelector("#results");
const empty = document.querySelector("#empty");

function ideaLink(title) {
  const issueTitle = encodeURIComponent("Jag vill använda: " + title);
  const issueBody = encodeURIComponent("Beskriv vad du vill kunna göra med " + title + " på FreeForAllNow.");
  return "https://github.com/Millepille112/freeforallnow/issues/new?title=" + issueTitle + "&body=" + issueBody;
}

function render() {
  const q = search.value.trim().toLowerCase();
  const filtered = items.filter(x =>
    (category.value === "all" || x.category === category.value) &&
    (x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q))
  );

  results.innerHTML = filtered.map(x => `
    <article class="card">
      <div class="symbol">${x.symbol}</div>
      <h3>${x.title}</h3>
      <p>${x.description}</p>
      <span class="category">${x.category}</span>
      <a class="card-action" href="${ideaLink(x.title)}" target="_blank" rel="noopener noreferrer">Klicka här – föreslå eller önska funktionen ↗</a>
    </article>
  `).join("");
  empty.hidden = filtered.length !== 0;
}

search.addEventListener("input", render);
category.addEventListener("change", render);
document.querySelector("#searchBtn").addEventListener("click", render);
document.querySelector("#year").textContent = new Date().getFullYear();
render();
