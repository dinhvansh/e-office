import { app } from "./app";
import { env } from "./config/env";

const port = Number(env.PORT);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`License server listening on port ${port}`);
});
