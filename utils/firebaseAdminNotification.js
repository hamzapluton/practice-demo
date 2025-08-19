// import rp from 'request-promise';
// import Notification from "#models/notificationModel";
// import { sendNotificationEmail } from '#utils/email';
// import { sockets } from '../server.js';
// import ownerModel from "#models/ownerModel";
// import { messaging } from '../cryptoHandlers/firebaseAdmin.js';

// export const firebaseAdminNotification = async (notification, type, target, from, to) => {
//   const send = async (token, notification, type, target, email, adminId) => {
//       //  await Notification.deleteMany({})

//       if (token) {
//         // const options = {
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

//         const messagePayload = {
//           token: token,
//           notification,
//         };

//         const notificationCreated = notification.image ? await new Notification({ token, notification, target, type, adminId, image: notification.image, from, to }) :
//           await new Notification({ token, notification, target, type, adminId, from, to })
//         await notificationCreated.save();

//         // await sendNotificationEmail(email, notification)
//         // const response = await rp(options);

//         const response = await messaging.send(messagePayload);
//         console.log('Notification sent:', response);
//         const notifications = await Notification.find({ adminId: notificationCreated?.adminId }).sort({ createdAt: -1 })
//         const unSeenNotifications = await Notification.find({ adminId: notificationCreated?.adminId, isSeen: false }).countDocuments()

//         sockets.sendNotificationAdminSucess({ notifications, unSeenNotifications, adminId: notificationCreated?.adminId });

//       }
//       else {
//         const notificationCreated = notification.image ? await new Notification({ notification, target, type, adminId, image: notification.image, from, to }) :
//           await new Notification({ notification, target, type, adminId, from, to })
//         await notificationCreated.save();
//         // await sendNotificationEmail(email, notification)
      
//         const notifications = await Notification.find({ adminId: notificationCreated?.adminId }).sort({ createdAt: -1 })
//         const unSeenNotifications = await Notification.find({ adminId: notificationCreated?.adminId, isSeen: false }).countDocuments()
//         sockets.sendNotificationAdminSucess({ notifications, unSeenNotifications, adminId: notificationCreated?.adminId });

//       }
//   };
// const admin = await ownerModel.findOne({type:'owner'})
//   if (admin) {
//     await send(admin?.not_token, notification, type, target, admin?.email, admin?._id);
//   }
// };


import rp from 'request-promise';
import Notification from "#models/notificationModel";
import { sendNotificationEmail } from '#utils/email';
import { sockets } from '../server.js';
import ownerModel from "#models/ownerModel";
import { messaging } from '../cryptoHandlers/firebaseAdmin.js';

export const firebaseAdminNotification = async (notification, type, target, from, to) => {
  const send = async (token, notification, type, target, email, adminId) => {

    const saveNotification = async () => {
      try {
        const notificationCreated = notification.image
          ? await new Notification({ token, notification, target, type, adminId, image: notification.image, from, to })
          : await new Notification({ token, notification, target, type, adminId, from, to });
        await notificationCreated.save();
        return notificationCreated;
      } catch (error) {
        console.log('Failed to save notification:', error);
        return null;
      }
    };

    const sendFirebaseNotification = async () => {
      try {
        if (token) {
          const messagePayload = {
            token: token,
            notification,
          };
          const response = await messaging.send(messagePayload);
          console.log('Notification sent:', response);
        }
      } catch (error) {
        console.log('Failed to send Firebase notification:', error);
      }
    };

    const sendEmailNotification = async () => {
      try {
        await sendNotificationEmail(email, notification);
        console.log('Email notification sent');
      } catch (error) {
        console.log('Failed to send email notification:', error);
      }
    };

    const notificationCreated = await saveNotification();

    if (notificationCreated) {
      await sendFirebaseNotification();
      // await sendEmailNotification(); 
      // Fetch the updated notifications and unseen count
      const notifications = await Notification.find({ adminId: notificationCreated.adminId }).sort({ createdAt: -1 });
      const unSeenNotifications = await Notification.find({ adminId: notificationCreated.adminId, isSeen: false }).countDocuments();

      // Send through sockets
      sockets.sendNotificationAdminSucess({
        notifications,
        unSeenNotifications,
        adminId: notificationCreated.adminId,
      });
    }
  };

  // Find the admin user (owner)
  const admin = await ownerModel.findOne({ type: 'owner' });
  if (admin) {
    await send(admin?.not_token, notification, type, target, admin?.email, admin?._id);
  }
};
