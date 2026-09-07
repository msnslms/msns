async function downloadFile(fileUrl, fileName) {
  // Download ආරම්භ වූ බව UI එකට දැනුම් දීම
  updateUI("Downloading... 0%");

  const response = await fetch(fileUrl);
  const reader = response.body.getReader();
  const contentLength = +response.headers.get('Content-Length');

  let receivedBytes = 0;
  let chunks = []; 

  while(true) {
    const {done, value} = await reader.read();
    if (done) break;

    chunks.push(value);
    receivedBytes += value.length;

    // Progress ප්‍රතිශතය ගණනය කර UI එක update කිරීම
    if (contentLength) {
      let percent = Math.round((receivedBytes / contentLength) * 100);
      updateUI(`Downloading... ${percent}%`);
    }
  }

  // File එක Blob එකක් ලෙස ලබාගෙන save කිරීම
  const blob = new Blob(chunks);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();

  // Download වී අවසන් වූ බව පෙන්වීම
  updateUI("Download Complete! ✅");
}
// Notification සඳහා අවසර ලබා ගැනීම
if (Notification.permission === "granted") {
  showNotification();
} else if (Notification.permission !== "denied") {
  Notification.requestPermission().then(permission => {
    if (permission === "granted") showNotification();
  });
}

function showNotification() {
  new Notification("Download Finished", {
    body: "ඔබ ඉල්ලූ file එක සාර්ථකව download කර අවසන්.",
    icon: "/app-icon-192.png"
  });
}
// Service Worker එක ඇතුළත භාවිතයට
navigator.serviceWorker.ready.then(async (swReg) => {
  const bgFetch = await swReg.backgroundFetch.fetch('file-download', ['/files/data.zip'], {
    title: 'Downloading File...',
    icons: [{ sizes: '192x192', src: '/app-icon-192.png', type: 'image/png' }],
    downloadTotal: 100 * 1024 * 1024 // Byte ප්‍රමාණය (e.g., 100MB)
  });
});
