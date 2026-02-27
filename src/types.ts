export type LogEntry = {
  timestamp: string;
  type: "info" | "warn" | "error" | "success";
  message: string;
};

export enum ProcessStatus {
  IDLE = "IDLE",
  RUNNING = "RUNNING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}


export type PublishLogPayload = {
  type: LogEntry["type"];
  message: string;
  label?: string;
};

export type PreviewLogPayload = {
  type: "info" | "error";
  message: string;
  label?: string;
};


export type SetupState = {
  githubToken: string;
  sourceRepoUrl: string;
  workspacePath: string;
};

export type SetupLogPayload = {
  type: LogEntry["type"];
  message: string;
  label?: string;
};