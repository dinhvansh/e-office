import { approvals } from "./approvals";
import { archive } from "./archive";
import { common } from "./common";
import { documents } from "./documents";
import { navigation } from "./navigation";
import { signRequests } from "./signRequests";
import { workflow } from "./workflow";
import { profile } from "./profile";
import { organization } from "./organization";

export const viMessages = {
  ...common,
  ...navigation,
  ...workflow,
  ...documents,
  ...signRequests,
  ...archive,
  ...approvals,
  ...profile,
  ...organization,
} as const;
