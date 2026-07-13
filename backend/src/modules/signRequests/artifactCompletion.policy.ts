export function getArtifactCompletionStatus(generated: boolean): "completed" | "artifact_failed" {
  return generated ? "completed" : "artifact_failed";
}
