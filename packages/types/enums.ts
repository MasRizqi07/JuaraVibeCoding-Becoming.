/**
 * Shared Type Enums for Becoming introspection platform
 */
export enum SessionStatus {
  IN_PROGRESS = "in_progress",
  COMPLETE = "complete"
}

export enum AnalysisStep {
  IDLE = "idle",
  SCANNING = "scanning",
  PROJECTING = "projecting",
  GENERATING = "generating",
  COMPLETE = "complete"
}

export enum FutureType {
  STAGNATION = "stagnation",
  EVOLUTION = "evolution"
}
