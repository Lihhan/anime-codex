const button = document.getElementById("reveal");
button.addEventListener("click", () => window.edgeTab.expand());
window.edgeTab.onUpdate(({ edge, label }) => {
  document.body.dataset.edge = edge;
  button.textContent =
    label +
    " " +
    ({ left: "▸", right: "◂", top: "▾", bottom: "▴" }[edge] || "");
  button.setAttribute("aria-label", label);
  button.title = "Ctrl/⌘ + Alt/⌥ + A";
});
