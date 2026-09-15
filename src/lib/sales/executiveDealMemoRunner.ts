import { hasProviderKey } from "../ai/settings";
import { generateExecutiveDealMemoDraft } from "../ai/executiveDealMemo";
import { useStore } from "../store";
import { updateExecutiveDealMemo } from "../history/history";
import {
  generateExecutiveDealMemo,
  type ExecutiveDealMemo,
  type ExecutiveDealMemoInput,
  type ExecutiveDealMemoOptions,
} from "./executiveDealMemo";

const runs = new Map<string, Promise<ExecutiveDealMemo | null>>();

export interface ExecutiveDealMemoRunnerOptions
  extends Pick<ExecutiveDealMemoOptions, "now"> {
  generateDraft?: ExecutiveDealMemoOptions["generateDraft"];
  persist?: (historyId: string, memo: ExecutiveDealMemo) => Promise<void>;
}

/**
 * Generate and persist one memo for a saved recording. The promise map is the
 * idempotency guard for duplicate recording-saved events and for UI retries
 * racing an already-running generation.
 */
export function runExecutiveDealMemo(
  historyId: string,
  input: ExecutiveDealMemoInput,
  options: ExecutiveDealMemoRunnerOptions = {},
): Promise<ExecutiveDealMemo | null> {
  const existing = runs.get(historyId);
  if (existing) return existing;

  const promise = (async () => {
    const state = useStore.getState();
    if (state.loadedHistoryId === historyId) {
      state.setExecutiveDealMemoError(null);
      state.setExecutiveDealMemoStatus("running");
    }

    try {
      if (!options.generateDraft && !hasProviderKey(state.settings, "deep")) {
        throw new Error("A deep-lane provider is required to generate the executive deal memo");
      }

      const memo = await generateExecutiveDealMemo(input, {
        now: options.now,
        generateDraft:
          options.generateDraft ??
          ((memoInput) => generateExecutiveDealMemoDraft({ settings: state.settings, input: memoInput })),
      });
      await (options.persist ?? updateExecutiveDealMemo)(historyId, memo);

      const current = useStore.getState();
      if (current.loadedHistoryId === historyId) {
        current.setExecutiveDealMemo(memo);
        current.setExecutiveDealMemoStatus("done");
      }
      return memo;
    } catch (error) {
      const current = useStore.getState();
      if (current.loadedHistoryId === historyId) {
        current.setExecutiveDealMemoError(error instanceof Error ? error.message : String(error));
        current.setExecutiveDealMemoStatus("error");
      }
      throw error;
    }
  })();

  runs.set(historyId, promise);
  void promise.then(
    () => runs.delete(historyId),
    () => runs.delete(historyId),
  );
  return promise;
}

export function clearExecutiveDealMemoRunsForTests(): void {
  runs.clear();
}
