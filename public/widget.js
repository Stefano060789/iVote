(function () {
  var scripts = document.getElementsByTagName("script");
  var current = scripts[scripts.length - 1];
  var pollId = current.getAttribute("data-poll-id");
  var color = current.getAttribute("data-color") || "#0d9488";
  var label = current.getAttribute("data-label") || "Give Feedback";
  var origin = current.getAttribute("data-origin") || new URL(current.src).origin;
  if (!pollId) return;

  var button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  Object.assign(button.style, {
    position: "fixed", bottom: "20px", right: "20px", zIndex: 999999,
    background: color, color: "#fff", border: "none", borderRadius: "999px",
    padding: "12px 20px", fontFamily: "system-ui, sans-serif", fontWeight: "600",
    fontSize: "14px", boxShadow: "0 4px 14px rgba(0,0,0,0.25)", cursor: "pointer"
  });

  var overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)", zIndex: 999998, display: "none"
  });

  var frameWrap = document.createElement("div");
  Object.assign(frameWrap.style, {
    position: "fixed", bottom: "0", right: "0", width: "100%", maxWidth: "420px", height: "90%",
    maxHeight: "640px", background: "#0f172a", zIndex: 999999, display: "none",
    borderTopLeftRadius: "16px", boxShadow: "0 -4px 24px rgba(0,0,0,0.35)", overflow: "hidden"
  });

  var closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "\u2715";
  Object.assign(closeButton.style, {
    position: "absolute", top: "8px", right: "8px", zIndex: 1000000, background: "transparent",
    color: "#fff", border: "none", fontSize: "18px", cursor: "pointer"
  });

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/vote/" + encodeURIComponent(pollId);
  Object.assign(iframe.style, { width: "100%", height: "100%", border: "none" });

  frameWrap.appendChild(closeButton);
  frameWrap.appendChild(iframe);

  function toggle(open) {
    overlay.style.display = open ? "block" : "none";
    frameWrap.style.display = open ? "block" : "none";
  }

  button.addEventListener("click", function () { toggle(true); });
  closeButton.addEventListener("click", function () { toggle(false); });
  overlay.addEventListener("click", function () { toggle(false); });

  document.body.appendChild(overlay);
  document.body.appendChild(frameWrap);
  document.body.appendChild(button);
})();
