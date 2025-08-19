// import Twilio from "twilio";
// import dotenv from "dotenv";
// dotenv.config();

// const client = new Twilio(
//   process.env.ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

// export const sendWelcomeMessage = async (phone, name) => {
//   try {
//     const message = await client.messages.create({
//       body: `Welcome to our platform ${name}!`,
//       to: `whatsapp:${phone}`,
//       from: `whatsapp:+${process.env.TWILIO_NUMBER}`,
//     });

//     if (message) {
//       console.log("Message sent");
//     }
//   } catch (error) {
//     console.error("Error sending message:", error.message);
//   }
// };
