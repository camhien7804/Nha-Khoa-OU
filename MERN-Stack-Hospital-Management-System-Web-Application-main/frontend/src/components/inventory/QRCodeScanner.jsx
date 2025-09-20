// src/components/inventory/QRCodeScanner.jsx
import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QRCodeScanner({ onDetected }) {
  const qrRef = useRef(null);
  const scannerRef = useRef(null);
  const lastScanRef = useRef({ text: "", time: 0 });

  useEffect(() => {
    let isMounted = true;

    async function startScanner() {
      if (!qrRef.current) return;

      const scanner = new Html5Qrcode(qrRef.current.id);
      scannerRef.current = scanner;
      scannerRef.current.isScanning = false;

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const cameraId = devices[0].id;
          await scanner.start(
            cameraId,
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              if (!isMounted) return;

              const now = Date.now();
              if (
                decodedText !== lastScanRef.current.text ||
                now - lastScanRef.current.time > 2000
              ) {
                lastScanRef.current = { text: decodedText, time: now };
                // ✅ Chỉ gọi callback, không toast ở đây
                onDetected?.(decodedText);
              }
            },
            () => {}
          );
          scannerRef.current.isScanning = true;
        } else {
          console.error("Không tìm thấy camera");
        }
      } catch (err) {
        console.error("Không mở được camera:", err);
      }
    }

    const timer = setTimeout(startScanner, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onDetected]);

  return (
    <div
      id="qr-reader"
      ref={qrRef}
      style={{
        margin: "0 auto",
        border: "2px solid #0E8040",
        borderRadius: 12,
        width: 400,
        height: 300,
      }}
    />
  );
}
