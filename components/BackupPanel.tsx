"use client";

import { useRef, useState, type ReactNode } from "react";

import { exportStudy, importStudy, mergeImportedStudy, parseStudy } from "@/lib/study-store";
import { decodeProgress, encodeProgress } from "@/lib/transfer";

/** Everything lives in this browser, so these are the ways to carry progress to another device. */
export function BackupPanel({ heading = true }: { heading?: boolean }): ReactNode {
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const download = (): void => {
    const blob = new Blob([exportStudy()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `davidson-blessons-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

  const makeCode = async (): Promise<void> => {
    const text = await encodeProgress(exportStudy());
    setCode(text);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text });
        setMessage("Code shared. Paste it into Davidson Blessons on the other device.");
        return;
      }
      await navigator.clipboard.writeText(text);
      setMessage("Code copied. Paste it into Davidson Blessons on the other device.");
    } catch {
      setMessage("Select the code below and copy it.");
    }
  };

  const addCode = async (): Promise<void> => {
    const json = await decodeProgress(pasted);
    const imported = json ? parseStudy(json) : null;
    if (!imported) {
      setMessage("That isn't a valid progress code.");
      return;
    }
    mergeImportedStudy(imported);
    setPasted("");
    setMessage("Progress added to this device. Nothing here was replaced.");
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: heading ? 0 : 14 }}>
      {heading && <h2 className="ws-heading">Back up your progress</h2>}
      <span className="ws-muted">
        Move your progress to another device with a text code or a backup file. A code adds to what is already on the
        device; it never replaces it.
      </span>
      <div className="ws-pills ws-pills--start">
        <button type="button" className="ws-pill" onClick={() => void makeCode()}>
          Share progress code
        </button>
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
      {code && (
        <textarea
          readOnly
          aria-label="Your progress code"
          value={code}
          rows={3}
          onFocus={(event) => event.currentTarget.select()}
          style={{ width: "100%", font: "inherit", padding: 10 }}
        />
      )}
      <label className="ws-muted" htmlFor="progress-code">
        Got a code from another device? Paste it here.
      </label>
      <textarea
        id="progress-code"
        value={pasted}
        onChange={(event) => setPasted(event.target.value)}
        rows={3}
        placeholder="DB1:…"
        style={{ width: "100%", font: "inherit", padding: 10 }}
      />
      <div className="ws-pills ws-pills--start">
        <button type="button" className="ws-pill" disabled={pasted.trim().length === 0} onClick={() => void addCode()}>
          Add to this device
        </button>
      </div>
      {message && (
        <span className="ws-muted" role="status">
          {message}
        </span>
      )}
    </section>
  );
}
