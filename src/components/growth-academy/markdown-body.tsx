export function MarkdownBody({ html }: { html: string }) {
  return (
    <div
      className="academy-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
