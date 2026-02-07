import nodemailer from "nodemailer";

export default async function handler(req, res) {
  try {
    const {
      name,
      email,
      company,
      phone,
      role,
      timeline,
      quantity,
      notes
    } = req.body || {};

    // Basic validation
    if (!name || !email || !company || !phone || !role || !timeline || !quantity) {
      return res.status(400).json({ error: "Missing required lead fields" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const emailText = `
New Sunhub GPT Lead

Name: ${name}
Email: ${email}
Company: ${company}
Phone: ${phone}
Role: ${role}
Timeline: ${timeline}
Quantity: ${quantity}
Notes: ${notes || "None"}

Source: Sunhub GPT
    `;

    await transporter.sendMail({
      from: `"Sunhub GPT" <${process.env.SMTP_USER}>`,
      to: process.env.LEADS_TO_EMAIL,
      subject: "New Lead from Sunhub GPT",
      text: emailText
    });

    return res.status(200).json({ status: "saved" });

  } catch (err) {
    console.error("Lead email failed:", err);
    return res.status(500).json({ error: "Failed to save lead" });
  }
}
