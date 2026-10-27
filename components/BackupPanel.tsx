"use client";

import { useRef, useState, type ReactNode } from "react";

import { exportStudy, importStudy } from "@/lib/study-store";

/** Everything lives in this browser, so this is the one way to carry progress to another device. */
export function BackupPanel({ heading = true }: { heading?: boolean }): ReactNode {
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const download = (): void => {
    const blob = new Blob([exportStudy()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `selah-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Backup saved.");
  };

  const upload = async (file: File): Promise<void> => {
    try {
      const ok = importStudy(await file.text());
      setMessage(ok ? "Progress restored." : "That file isn't a Davidson Blessons backup.");
    } catch {
      setMessage("Couldn't read that file.");
    }
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: heading ? 0 : 14 }}>
      {heading && <h2 className="ws-heading">Back up your progress</h2>}
      <span className="ws-muted">
        A backup file holds everything in this browser. Restore it here or on another device.
      </span>
      <div className="ws-pills ws-pills--start">
        <button type="button" className="ws-pill" onClick={download}>
          Save backup
        </button>
        <button type="button" className="ws-pill" onClick={() => fileInput.current?.click()}>
          Restore from file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
      </div>
      {message && (
        <span className="ws-muted" role="status">
          {message}
        </span>
      )}
    </section>
  );
}
