import { runCommandGit, RunCommandOptions } from "lib/run-command";

export interface DiffOptions extends RunCommandOptions {
  commits?: string[];
  paths?: string[];
  cached?: boolean;
}

export const diff = (options: DiffOptions = {}) => {
  const args = createArgs(options);

  return runCommandGit("diff", args, options)
    .next(toFilesBlocks)
    .next(toDiffFiles);
};

function createArgs(options: DiffOptions = {}) {
  const { commits = [], paths = [], cached = false } = options;

  return [
    "--word-diff=porcelain",
    cached ? "--cached" : "",
    ...commits,
    "--",
    ...paths,
  ].filter(Boolean);
}

function toFilesBlocks(stdout: string): string[] {
  return stdout.split("diff --git ").filter(Boolean);
}

function toDiffFiles(filesBlocks: string[]): Map<string, FileDiff> {
  return filesBlocks.reduce((memo, fileBlock) => {
    const diffFile = toDiffFile(fileBlock);

    memo.set(diffFile.info.pathA.slice(2), diffFile);

    return memo;
  }, new Map());
}

export interface FileDiff {
  info: FileInfo;
  chunks: FileDiffChunk[];
}

export interface FileInfo {
  pathA: string;
  pathB: string;
  meta: string;
  legend: string[];
}

export interface FileDiffChunk {
  header: FileDiffHeader;
  lines: FileDiffLine[];
  linesV2: FileDiffLineV2[];
}

export interface FileDiffHeader {
  meta: {
    remove: FileDiffHeaderMeta;
    add: FileDiffHeaderMeta;
  };
  codeTitle: string;
}

export interface FileDiffHeaderMeta {
  from: number;
  length: number;
}

export interface FileDiffLine {
  chunks: string[];
  remove: boolean;
  add: boolean;
}

function toDiffFile(fileBlock: string): FileDiff {
  const [info, ...code] = fileBlock.split("\n@@");
  return { info: toFileInfo(info), chunks: code.map(toFileDiffChunk) };
}

function toFileInfo(block: string): FileInfo {
  const [paths, meta, ...legend] = block.split("\n");
  const [pathA, pathB] = paths.split(" ");

  return {
    pathA,
    pathB,
    meta,
    legend,
  };
}

function toFileDiffChunk(block: string): FileDiffChunk {
  const [header, ...lines] = block.split("\n");
  const diffHeader = toFileDiffHeader(header.trim());

  return {
    header: diffHeader,
    lines: toFileDiffLines(lines),
    linesV2: toFileDiffLinesV2(lines, diffHeader),
  };
}

function toFileDiffHeader(value: string): FileDiffHeader {
  const [meta, codeTitle] = value.split(" @@ ");
  const [remove, add] = meta.split(" ");

  return {
    meta: {
      remove: toFileDiffHeaderMeta(remove),
      add: toFileDiffHeaderMeta(add),
    },
    codeTitle,
  };
}

function toFileDiffHeaderMeta(value: string): FileDiffHeaderMeta {
  const [from, length] = value.split(",");

  return { from: parseInt(from.slice(1), 10), length: parseInt(length, 10) };
}

function toFileDiffLines(value: string[]): FileDiffLine[] {
  const lines: FileDiffLine[] = [];
  const getDefDiffLine = () => ({ chunks: [], remove: false, add: false });

  for (let index = 0; index < value.length - 1; index += 1) {
    const line = value[index];

    if (line[0] === "~") {
      if (!lines[lines.length - 1].chunks.length) {
        lines[lines.length - 1].add = true;
      }

      lines.push(getDefDiffLine());
    } else {
      if (!lines[lines.length - 1]) {
        lines.push(getDefDiffLine());
      }

      lines[lines.length - 1].chunks.push(line);

      switch (line[0]) {
        case "-":
          lines[lines.length - 1].remove = true;
          break;
        case "+":
          lines[lines.length - 1].add = true;
          break;
      }
    }
  }

  return lines;
}

export interface FileDiffLineV2 {
  chunks: string[];
  removeNumLine: number;
  addNumLine: number;
  remove: boolean;
  add: boolean;
  spase: boolean;
}

function toFileDiffLinesV2(
  lines: string[],
  diffHeader: FileDiffHeader,
): FileDiffLineV2[] {
  const nextlines: FileDiffLineV2[] = [];

  let lastSpaceIndex = 0;
  let removeNumLine = diffHeader.meta.remove.from;
  let addNumLine = diffHeader.meta.add.from;
  let lastNextLine;

  console.log(diffHeader);

  for (let index = 0; index < lines.length - 1; index += 1) {
    const line = lines[index];
    const action = line[0];

    switch (action) {
      case " ":
        if (!nextlines[nextlines.length - 1]) {
          nextlines.push({
            chunks: [],
            removeNumLine: 0,
            addNumLine: 0,
            remove: false,
            add: false,
            spase: false,
          });
        }

        nextlines[nextlines.length - 1].chunks.push(line);
        nextlines[nextlines.length - 1].spase = true;
        lastSpaceIndex = nextlines.length - 1;
        break;
      case "-":
        nextlines[nextlines.length - 1].chunks.push(line);
        nextlines[nextlines.length - 1].remove = true;
        break;
      case "+":
        lastNextLine = nextlines[nextlines.length - 1];
        const lastChunkLastNextLine =
          lastNextLine.chunks[lastNextLine.chunks.length - 1];

        if (lastChunkLastNextLine && lastChunkLastNextLine[0] === "-") {
          nextlines[lastSpaceIndex].chunks.push(line);
          nextlines[lastSpaceIndex].add = true;
        } else {
          nextlines[nextlines.length - 1].chunks.push(line);
          nextlines[nextlines.length - 1].add = true;
        }
        break;
      case "~":
        lastNextLine = nextlines[nextlines.length - 1];

        if (lastNextLine.remove || lastNextLine.spase) {
          lastNextLine.removeNumLine = removeNumLine;
          removeNumLine += 1;
        }

        if (lastNextLine.add || lastNextLine.spase) {
          lastNextLine.addNumLine = addNumLine;
          addNumLine += 1;
        }

        // If add empty line
        if (!lastNextLine.remove && !lastNextLine.add && !lastNextLine.spase) {
          lastNextLine.addNumLine = addNumLine;
          lastNextLine.chunks.push("+");
          lastNextLine.add = true;
          addNumLine += 1;
        }

        nextlines.push({
          chunks: [],
          removeNumLine,
          addNumLine,
          remove: false,
          add: false,
          spase: false,
        });
        break;
    }
  }

  return nextlines;
}
