export default async function handler(req, res) {
  const lead = req.body;

  console.log("HIGH INTENT LEAD:", lead);

  // Later:
  // send to Zoho
  // send to Slack
  // send email

  res.json({ status: "saved" });
}
