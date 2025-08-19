// import rp from 'request-promise';
// import Notification from "#models/notificationModel";
// import { sendNotificationEmail } from '#utils/email';
// import { sockets } from '../server.js';
// import { messaging } from '../cryptoHandlers/firebaseAdmin.js';

// export const firebaseNotification = async (notification, users, type, target, from, to) => {
//   const send = async (token,not_token_mobile, notification, type, target, email, userId) => {
//     //  await Notification.deleteMany({})
//     console.log(token)
//     console.log(notification)
//     try {
//       if (token || not_token_mobile) {
//         // const options
//         //  = {
//         //   method: 'POST',
//         //   uri: 'https://fcm.googleapis.com/fcm/send',
//         //   headers: {
//         //     Authorization: 'key=AAAAp7-ivbI:APA91bHiZ43UlES3GRuMTu4te-RGqss5ymkVG3DI4wy9nD69ID1lh9NE4RifQe0uBTQcVP5qQPN4s1QANosMK9lyYfl5Sd9ItUR6C0wT4ep8gMNnN3fLvVPV0P6gFAXHlGAwgLQj1wyM',
//         //     'Content-Type': 'application/json',
//         //   },
//         //   body: {
//         //     notification,
//         //     to: token,
//         //   },
//         //   json: true,
//         // };

//         const messagePayloadWeb = {
//           token: token,
//           notification,
//         };
      
        
//         const messagePayloadMobile = {
//           token: not_token_mobile,
//           notification,
//         };

//         const notificationCreated = notification.image ? await new Notification({ token, notification, target, type, userId, image: notification.image, from, to }) :
//         await new Notification({ token, notification, target, type, userId, from, to })
//         await notificationCreated.save();
       
        
// if(not_token_mobile){
//   const response = await messaging.send(messagePayloadMobile);
//   // const response = await rp(options);
//   console.log('Notification sent Mobile:', response);

// }
// if(token)
// {
//   const response = await messaging.send(messagePayloadWeb);
//   // const response = await rp(options);
//   console.log('Notification sent Web:', response);

// }
  

//         const notifications = await Notification.find({ userId: notificationCreated?.userId }).sort({ createdAt: -1 })
//         const unSeenNotifications = await Notification.find({ userId: notificationCreated?.userId, isSeen: false }).countDocuments()

//         sockets.sendNotificationSucess({ notifications, unSeenNotifications, userId: notificationCreated?.userId });
//         await sendNotificationEmail(email, notification)
       
//       }
//       else {
//         const notificationCreated = notification.image ? await new Notification({ notification, target, type, userId, image: notification.image, from, to }) :
//         await new Notification({ notification, target, type, userId, from, to })
//         await notificationCreated.save();
//         await sendNotificationEmail(email, notification)
//         const notifications = await Notification.find({ userId: notificationCreated?.userId }).sort({ createdAt: -1 })
//         const unSeenNotifications = await Notification.find({ userId: notificationCreated?.userId, isSeen: false }).countDocuments()
//         sockets.sendNotificationSucess({ notifications, unSeenNotifications, userId: notificationCreated?.userId });
//       }
//     } catch (error) {
//       console.log('Notification faled', error);
//     }
//   };

//   // Send notifications to all devices identified by FCM tokens in the tokens array
//   if (users?.length > 0) {
//     await Promise.all(users.map((item) => send(item?.not_token,item?.not_token_mobile, notification, type, target, item?.email, item?._id)));
//   }
// };


import rp from 'request-promise';
import Notification from '#models/notificationModel';
import { sendNotificationEmail } from '#utils/email';
import { sockets } from '../server.js';
import { messaging } from '../cryptoHandlers/firebaseAdmin.js';

export const firebaseNotification = async (notification, users, type, target, from, to) => {
  const sendNotification = async (token, not_token_mobile, notification, type, target, email, userId) => {
    const saveNotification = async () => {
      try {
        const notificationCreated = notification.image
          ? await new Notification({ token, notification, target, type, userId, image: notification.image, from, to })
          : await new Notification({ token, notification, target, type, userId, from, to });
        await notificationCreated.save();
        return notificationCreated;
      } catch (error) {
        console.log('Failed to save notification:', error);
        return null;
      }
    };

    const sendFirebaseNotification = async (token, not_token_mobile) => {
      try {
        if (not_token_mobile) {
          const messagePayloadMobile = { token: not_token_mobile, notification };
          await messaging.send(messagePayloadMobile);
          console.log('Notification sent Mobile');
        }

        if (token) {
          const messagePayloadWeb = { token, notification };
          await messaging.send(messagePayloadWeb);
          console.log('Notification sent Web');
        }
      } catch (error) {
        console.log('Failed to send Firebase notification:', error);
      }
    };

    const sendEmailNotification = async (email, notification) => {
      try {
        await sendNotificationEmail(email, notification);
        console.log('Email notification sent');
      } catch (error) {
        console.log('Failed to send email notification:', error);
      }
    };

    const notificationCreated = await saveNotification();
    if (notificationCreated) {
      await sendFirebaseNotification(token, not_token_mobile);
      // await sendEmailNotification(email, notification);

      const notifications = await Notification.find({ userId: notificationCreated.userId }).sort({ createdAt: -1 });
      const unSeenNotifications = await Notification.find({ userId: notificationCreated.userId, isSeen: false }).countDocuments();
      sockets.sendNotificationSucess({ notifications, unSeenNotifications, userId: notificationCreated.userId });
    }
  };

  if (users?.length > 0) {
    await Promise.allSettled(users.map((item) =>
      sendNotification(item?.not_token, item?.not_token_mobile, notification, type, target, item?.email, item?._id)
    ));
  }
};
