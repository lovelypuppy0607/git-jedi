import {
  combine,
  createEvent,
  createEffect,
  createStore,
  guard,
  sample,
} from "effector";
import { add, AddOptions } from "lib/api-git";

import { $status } from "./status";
import { $baseOptions } from "../config";

const baseOptions = $baseOptions.getState();

export const $stagedChanges = combine($status, (status) =>
  status.filter((status) => {
    return !!status.stagedStatus && status.stagedStatus !== "untracked";
  }),
);
const $stageParams = createStore<AddOptions>({
  ...baseOptions,
  paths: [],
});

export const stage = createEvent<string>();
export const stageAll = createEvent<void>();

export const staging = createEffect<AddOptions, string>({
  handler: (options) => add(options),
});
export const stagingAll = createEffect<AddOptions, string>({
  handler: (options) => add(options),
});

guard({
  source: $stageParams,
  filter: ({ paths }) => !!(paths && paths.length),
  target: staging,
});

sample({ source: $baseOptions, clock: stageAll, target: stagingAll });

$stageParams.on($baseOptions, (store, baseOptions) => ({
  ...store,
  ...baseOptions,
}));
$stageParams.on(stage, (store, path) => ({
  ...store,
  paths: [path],
}));
$stageParams.on(staging.finally, (store) => ({ ...store, paths: [] }));
