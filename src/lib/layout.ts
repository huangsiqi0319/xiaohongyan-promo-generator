export function wrapText(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] {
  return text.split("\n").flatMap((paragraph) => {
    if (!paragraph) return [""];
    const result: string[] = [];
    let line = "";
    for (const char of Array.from(paragraph)) {
      if (line && measure(line + char) > maxWidth) {
        result.push(line);
        line = char;
      } else line += char;
    }
    result.push(line);
    return result;
  });
}

export function fitBodyFont(
  available: number,
  measureHeight: (font: number) => number,
) {
  for (let fontSize = 34; fontSize >= 28; fontSize -= 2) {
    if (measureHeight(fontSize) <= available)
      return { fontSize, overflow: false };
  }
  return { fontSize: 28, overflow: true };
}
