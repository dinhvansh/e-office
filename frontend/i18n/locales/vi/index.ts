import { approvals } from "./approvals";
import { archive } from "./archive";
import { common } from "./common";
import { documents } from "./documents";
import { navigation } from "./navigation";
import { signRequests } from "./signRequests";
import { workflow } from "./workflow";

export const viMessages = {
  ...common,
  ...navigation,
  ...workflow,
  ...documents,
  ...signRequests,
  ...archive,
  ...approvals,
} as const;
