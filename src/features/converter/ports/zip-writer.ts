interface ZipOutput {
  write(chunk: Uint8Array): void;
  end(): void;
  fail(error: Error): void;
}

interface ZipFileWriter {
  write(chunk: Uint8Array): void;
  close(): void;
}

interface ZipWriter {
  addFile(path: string): ZipFileWriter;
  finish(): void;
}

type CreateZipWriter = (output: ZipOutput) => ZipWriter;

export type { CreateZipWriter, ZipFileWriter, ZipOutput, ZipWriter };
