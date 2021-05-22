import sendgrid from "@sendgrid/mail";

export default async function sendBillingAccountAuthEmail(
  email: string,
  token: string
) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(
      `The SENDGRID_API_KEY env var must be set, otherwise the API won't be able to send emails.`,
      `Using debug mode which logs the email tokens instead.`
    );
    console.log(`Email: ${email} - Email Token: ${token}`);
  } else {
    sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: email,
      from: "hi@serenity.re",
      subject: "Login for your Serenity Notes Billing Account",
      text: `Copy & paste this temporariy login token:

${token}

If you didn't try to login, you can safely ignore this email.
      `,
    };

    await sendgrid.send(msg);
  }
}
