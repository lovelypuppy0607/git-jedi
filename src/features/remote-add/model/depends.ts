import { createCommand, addCommand } from "features/commands";
import mousetrap from "mousetrap";
import { sample } from "effector";
import { $runCommandOptions } from "features/state-git";
import { combine, forward } from "effector";

import { changeVisible, addRemoteUrl } from "./events";
import { $remoteUrl } from "./stores";
import { remote } from "./effects";

addCommand(createCommand("remote:add", () => changeVisible.show()));

mousetrap.bind("esc", () => changeVisible.hide());

sample({
  source: combine([$runCommandOptions, $remoteUrl]),
  clock: addRemoteUrl,
  fn: ([options, url]) => ({ ...options, name: "origin", url }),
  target: remote,
});

forward({
  from: remote.done,
  to: changeVisible.hide,
});
