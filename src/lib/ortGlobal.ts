// src/lib/ortGlobal.ts
// Carga onnxruntime-web UMD desde /public/ort.min.js
// y devuelve el objeto global window.ort cuando esté listo.

export async function loadOrtGlobal(): Promise<any> {
  // Si ya está cargado, reutilizamos
  if ((window as any).ort) {
    return (window as any).ort;
  }

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/ort.min.js"; // viene de public/ort.min.js
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });

  return (window as any).ort;
}
