document.getElementById("downloadBtn").addEventListener("click", () => {
  const fileUrl = "https://scripty.my/skibidi/run.exe";
  const redirectUrl = "https://scripty.my/";

  const a = document.createElement("a");
  a.href = fileUrl;
  a.download = "run.exe";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // redirect after short delay
  setTimeout(() => {
    window.location.href = redirectUrl;
  }, 1500);
});