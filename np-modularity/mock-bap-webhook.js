// A stand-in for a real BAP's webhook, just for watching what actually
// gets delivered. Logs whatever it receives.
const express = require("express");
const app = express();
app.use(express.json());

app.post("/on_:action", (req, res) => {
  console.log(`\n=== received on_${req.params.action} ===`);
  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).json({ message: { status: "ACK" } });
});

const PORT = 4010;
app.listen(PORT, () => console.log(`mock BAP webhook listening on :${PORT}`));
