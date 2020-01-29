import { createStore, createEffect, forward, sample, merge } from "effector";
import { status, statusSync, StatusPath, StatusOptions } from "lib/api-git";
import { defaultRun } from "lib/default-run";

import { $baseOptions } from "../config";
import { discarding } from "./discarding";
import { staging, stagingAll } from "./staged";
import { unstaging, unstagingAll } from "./unstaged";
import { $currentBranch } from "../current-branch";

const baseOptions = $baseOptions.getState();
const defStatus = defaultRun(() => statusSync(baseOptions), []);

export const $status = createStore<StatusPath[]>(defStatus);

export const updateStatus = createEffect<StatusOptions, StatusPath[]>({
  handler: (options) => status(options),
});

sample({
  source: $baseOptions,
  clock: merge([
    $baseOptions,
    discarding.finally,
    staging.finally,
    stagingAll.finally,
    unstaging.finally,
    unstagingAll.finally,
    $currentBranch,
    // TODO After created commit
  ]),
  target: updateStatus,
});

$status.on(updateStatus.done, (_, { result }) => result);
