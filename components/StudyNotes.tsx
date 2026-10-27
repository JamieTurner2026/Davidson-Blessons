import { Fragment, type ReactNode } from "react";

// Minimal markdown-lite for NotebookLM answers: headings, bullets, **bold**, paragraphs.
// Works line by line because NotebookLM often puts a heading straight above its bullets.

function withBold(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
  );
}

export function StudyNotes({ text }: { text: string }): ReactNode {
  const out: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = (): void => {
    if (paragraph.length === 0) return;
    out.push(
      <p key={out.length}>
        {paragraph.map((line, index) => (
          <Fragment key={index}>
            {index > 0 && <br />}
            {withBold(line)}
          </Fragment>
        ))}
      </p>,
    );
    paragraph = [];
  };
  const flushList = (): void => {
    if (list.length === 0) return;
    out.push(
      <ul key={out.length}>
        {list.map((item, index) => (
          <li key={index}>{withBold(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^#{1,4}\s+(.*)/);
    const bullet = line.match(/^[*-]\s+(.*)/);
    if (!line || /^[-*_]{3,}$/.test(line)) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      out.push(<h3 key={out.length}>{withBold(heading[1])}</h3>);
    } else if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return <div className="study-notes">{out}</div>;
}
