import type { ReactNode } from "react";

export function Footer(): ReactNode {
  return (
    <footer className="footer">
      <span>
        Selah — pause and reflect. <a href="/welcome">About Selah</a>
      </span>
      <span>
        Scripture via{" "}
        <a href="https://scripture.api.bible" target="_blank" rel="noreferrer">
          API.Bible
        </a>
        . Your notes stay in this browser.
      </span>
    </footer>
  );
}
