export function validateBuildOutput(html: string): void {
  const issues: string[] = [];

  if (!html.includes("<html")) {
    issues.push("missing html document root");
  }
  if (!html.includes("<body")) {
    issues.push("missing body element");
  }
  if (!html.includes("</body>")) {
    issues.push("missing closing body tag");
  }
  if (!html.includes("</html>")) {
    issues.push("missing closing html tag");
  }
  if (html.trim().length === 0) {
    issues.push("empty build output");
  }

  if (issues.length > 0) {
    throw new Error(issues.join("; "));
  }
}
