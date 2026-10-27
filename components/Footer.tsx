import type { ReactNode } from "react";

export function Footer(): ReactNode {
  return (
    <footer className="footer">
      <span>
        Davidson Blessons — pause and reflect. <a href="/welcome">About Davidson Blessons</a>
      </span>
      <span>
        Scripture via{" "}
        <a href="https://scripture.api.bible" target="_blank" rel="noreferrer">
          API.Bible
        </a>
        . Your progress stays in this browser unless you sign in to sync it.
      </span>
    </footer>
  );
}
