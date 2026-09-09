const chapters = [...document.querySelectorAll(".guide-section")];
const chapterLinks = [...document.querySelectorAll(".guide-toc nav a")];

function showChapter() {
  let anchor = "";
  try { anchor = decodeURIComponent(location.hash.slice(1)); } catch (_) {}
  const target = document.getElementById(anchor);
  const section = target?.closest(".guide-section");
  const position = Math.max(0, chapters.indexOf(section));
  chapters.forEach((chapter, index) => { chapter.hidden = index !== position; });
  chapterLinks.forEach((link, index) => {
    link.classList.toggle("is-current", index === position);
    if (index === position) link.setAttribute("aria-current", "step");
    else link.removeAttribute("aria-current");
  });
  document.getElementById("chapter-counter").textContent = String(position + 1).padStart(2, "0") + " / " + String(chapters.length).padStart(2, "0");
  const progress = document.getElementById("chapter-progress");
  progress.setAttribute("aria-valuemax", String(chapters.length));
  progress.setAttribute("aria-valuenow", String(position + 1));
  progress.style.setProperty("--progress", ((position + 1) / chapters.length * 100) + "%");
  const previous = document.getElementById("chapter-prev");
  previous.hidden = position === 0;
  if (position > 0) {
    previous.href = "#" + chapters[position - 1].id;
    document.getElementById("chapter-prev-label").textContent = chapterLinks[position - 1].textContent.trim().slice(2).trim();
  }
  const next = document.getElementById("chapter-next");
  next.href = position < chapters.length - 1 ? "#" + chapters[position + 1].id : "./";
  next.querySelector("small").textContent = position < chapters.length - 1 ? "下一节" : "开始实践";
  document.getElementById("chapter-next-label").textContent = position < chapters.length - 1 ? chapterLinks[position + 1].textContent.trim().slice(2).trim() : "去编译工作台";
  document.getElementById("guide-reader").classList.add("is-paged");
  document.getElementById("chapter-toolbar").hidden = false;
  document.getElementById("chapter-navigation").hidden = false;
}

function navigateToAnchor() {
  showChapter();
  let anchor = "";
  try { anchor = decodeURIComponent(location.hash.slice(1)); } catch (_) {}
  const target = document.getElementById(anchor);
  const nested = target?.closest(".guide-section") && !target.classList.contains("guide-section");
  const focusTarget = nested ? target : document.querySelector(".guide-section:not([hidden]) h2");
  (nested ? target : document.getElementById("guide-reader")).scrollIntoView({ behavior: "auto", block: "start" });
  focusTarget.setAttribute("tabindex", "-1");
  focusTarget.focus({ preventScroll: true });
}

showChapter();
if (location.hash) navigateToAnchor();
window.addEventListener("hashchange", navigateToAnchor);

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const code = document.getElementById(button.dataset.copy);
    const status = document.getElementById("copy-status");
    const originalLabel = button.textContent;
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = "已复制";
      status.textContent = "配置已复制。粘贴到对应文件前，请确认工程名字和路径。";
    } catch (_) {
      button.textContent = "请手动复制";
      status.textContent = "浏览器暂不允许复制。请选中上方代码文字，手动复制。";
    } finally {
      setTimeout(() => { button.textContent = originalLabel; button.disabled = false; }, 2500);
    }
  });
});
