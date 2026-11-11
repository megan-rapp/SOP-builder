export type ImportedSopContent = {
  title: string;
  description: string;
  prerequisites: string[];
  steps: string[];
};

const prerequisiteHeading = /^(?:prerequisites?|before you begin|one[- ]time setup|initial setup|setup requirements?)\s*:?\s*$/i;
const procedureHeading = /^(?:procedure|procedure steps|steps|workflow|process|instructions|work instructions)\s*:?\s*$/i;
const descriptionHeading = /^(?:purpose|objective|scope|description)\s*:?\s*$/i;
const listPrefix = /^\s*(?:(?:\d{1,3}|[a-z])[.)]|[-*•▪])\s+/i;

export async function extractSopText(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "txt") return file.text();

  if (extension === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.default.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }

  if (extension === "pdf") {
    const [pdfjs, worker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
    try {
      const document = await loadingTask.promise;
      if (document.numPages > 100) {
        throw new Error("This PDF has more than 100 pages. Split it into smaller files and import the relevant SOP.");
      }

      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const lines = new Map<number, string[]>();
        for (const item of content.items) {
          if (!("str" in item) || !item.str.trim()) continue;
          const y = Math.round(item.transform[5]);
          const line = lines.get(y) || [];
          line.push(item.str.trim());
          lines.set(y, line);
        }
        pages.push([...lines.entries()]
          .sort(([left], [right]) => right - left)
          .map(([, words]) => words.join(" "))
          .join("\n"));
      }
      return pages.join("\n\n");
    } finally {
      await loadingTask.destroy();
    }
  }

  throw new Error("Choose a PDF, DOCX, or TXT SOP file.");
}

export function parseSopText(text: string, fileName: string): ImportedSopContent {
  const lines = text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\f/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line && !/^(?:page\s+)?\d+(?:\s+of\s+\d+)?$/i.test(line));
  if (!lines.length) throw new Error("No readable text was found in this file.");

  const fallbackTitle = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  let title = fallbackTitle || "Imported SOP";
  let description = "";
  const prerequisites: string[] = [];
  const steps: string[] = [];
  let section: "intro" | "description" | "prerequisites" | "steps" = "intro";
  let lastWasListItem = false;
  let foundTitle = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/^(?:standard operating procedure|sop)\s*[:\-–]?\s*/i, "").trim();
    if (!line) continue;

    if (prerequisiteHeading.test(line)) {
      section = "prerequisites";
      lastWasListItem = false;
      continue;
    }
    if (procedureHeading.test(line)) {
      section = "steps";
      lastWasListItem = false;
      continue;
    }
    if (descriptionHeading.test(line)) {
      section = "description";
      lastWasListItem = false;
      continue;
    }

    if (!foundTitle) {
      if (/^(?:standard operating procedure|sop)$/i.test(rawLine)) continue;
      title = line.replace(/^(?:title|sop title)\s*:\s*/i, "") || title;
      foundTitle = true;
      continue;
    }
    if (section === "description") {
      description = [description, line.replace(/^purpose\s*:\s*/i, "")].filter(Boolean).join(" ");
      continue;
    }

    const listItem = line.match(listPrefix);
    if (section === "prerequisites") {
      if (listItem) {
        prerequisites.push(line.replace(listPrefix, "").trim());
        lastWasListItem = true;
      } else if (lastWasListItem && prerequisites.length) {
        prerequisites[prerequisites.length - 1] += ` ${line}`;
      } else {
        prerequisites.push(line);
        lastWasListItem = false;
      }
      continue;
    }

    section = "steps";
    if (listItem) {
      steps.push(line.replace(listPrefix, "").trim());
      lastWasListItem = true;
    } else if (lastWasListItem && steps.length) {
      steps[steps.length - 1] += ` ${line}`;
    } else {
      steps.push(line);
      lastWasListItem = false;
    }
  }

  const cleanTitle = title.replace(/^(?:title|sop title)\s*:\s*/i, "").trim();
  return {
    title: cleanTitle || fallbackTitle || "Imported SOP",
    description,
    prerequisites: prerequisites.filter(Boolean),
    steps: steps.filter(Boolean),
  };
}
