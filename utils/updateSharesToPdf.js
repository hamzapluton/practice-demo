import fs from 'fs/promises';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import formatDate from '#utils/formatDate';
import SharePrice from '#models/sharePriceModel';
//TODO::Remove This
import User from '#models/userModel';
import KYC from '#models/kycModel';
import expressAsyncHandler from 'express-async-handler';
import { TESTPATH } from '#constants/user';


// export default async function updateSharesToPdf(data, kyc, user) {
//   const pdfPath = `./contractUpload/contract.pdf`; // Provide the path to your existing PDF
//   const jtcImagePath = './upload/logo.png'; // Provide the path to the signature image

//   let sharePrice = await SharePrice.findOne({active:true,isDeleted:false});
//   if(!sharePrice)
//  {
//    sharePrice = await new SharePrice({sharePrice:20 , targetAchieved:0 , nextTargetAchieved:3000000}).save();
//  }

  // let signatureImageBytes, signatureImage, signatureImagePath;

//   if (kyc?.signature) {
//     const parts = kyc?.signature.split("/");
//     signatureImagePath = "./" + parts.slice(3).join("/");
//   }


//   try {
//     // Load the existing PDF
//     const existingPdfBytes = await fs.readFile(pdfPath);
//     const pdfDoc = await PDFDocument.load(existingPdfBytes);

//     // Load the JTC image
//     const jtcImageBytes = await fs.readFile(jtcImagePath);
//     if (kyc?.signature) {
//       // Load the Signature image
//       signatureImageBytes = await fs.readFile(signatureImagePath);
//       // Embed the Signature image
//       signatureImage = await pdfDoc.embedPng(signatureImageBytes);

//     }


//     // Load the Font
//     const customFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

//     // Embed the logo image
//     const jtcImage = await pdfDoc.embedPng(jtcImageBytes);

//     const textSize = 12


//     // Get the page of the PDF
//     const page1 = pdfDoc.getPages()[0];
//     const page2 = pdfDoc.getPages()[1];
//     const page3 = pdfDoc.getPages()[2];

//     const page4 = pdfDoc.getPages()[3];
//     const page5 = pdfDoc.getPages()[4];
//     const lastPage = pdfDoc.getPages()[pdfDoc.getPages().length - 1];


//     console.log(data, "data")


//     //All Shares

//     const amountInvested = data?.amountInvested?.toString()
//     const allShares = (data?.amountInvested / sharePrice?.sharePrice).toString()

//     //Owner Shares And Amount
//     const ownerAmount = ((30 / 100) * amountInvested).toString();
//     const ownerShares = (ownerAmount / sharePrice?.sharePrice).toString();


//     //Investor Shares And Amount

//     const investedAmount70 = data?.amount?.toString()
//     const investedShares70 = data?.shares.toString()



//     if (investedShares70) {
//       page3.drawText(investedShares70, {
//         x: 280, // X position
//         y: 575, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })

//       page3.drawText(investedShares70, {
//         x: 270, // X position
//         y: 354, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })


//     }


//     if (ownerShares) {
//       page3.drawText(ownerShares, {
//         x: 380, // X position
//         y: 575, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })
//       page3.drawText(ownerShares, {
//         x: 80, // X position
//         y: 327, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })
//     }


//     if (amountInvested) {
//       page3.drawText(amountInvested, {
//         x: 470, // X position
//         y: 575, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })


//       page3.drawText(amountInvested, {
//         x: 230, // X position
//         y: 498, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })


//       page3.drawText(amountInvested, {
//         x: 168, // X position
//         y: 367, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })

//     }

//     if (allShares) {

//       page3.drawText(allShares, {
//         x: 330, // X position
//         y: 380, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })
//     }


//     if (investedAmount70) {
//       page3.drawText(investedAmount70, {
//         x: 218, // X position
//         y: 340, // Y position

//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })
//     }


//     if (ownerAmount) {

//       page3.drawText(ownerAmount, {
//         x: 493, // X position
//         y: 327, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })
//     }




//     // KYC FIELD 
//     const name = kyc?.name

//     if (name) {
//       // Draw the string of text on the page
//       page1.drawText(name, {
//         x: 325, // X position
//         y: 723, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })

//       page4.drawText(name, {
//         x: 110, // X position
//         y: 400, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })

//       lastPage.drawText(name, {
//         x: 270, // X position
//         y: 400, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })
//     }


//     const address = kyc?.address
//     if (address) {
//       page2.drawText(address, {
//         x: 140, // X position
//         y: 607, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })

//     }



//     const rfc = kyc?.rfcNo

//     if (rfc) {
//       page2.drawText(rfc, {
//         x: 368, // X position
//         y: 582, // Y position
//         size: textSize,
//         font: customFont,
//         color: rgb(225 / 255, 31 / 255, 28 / 255),
//       })

//     }


//     const date = new Date()

//     page5.drawText(formatDate(date), {
//       x: 100, // X position
//       y: 735, // Y position
//       size: textSize,
//       font: customFont,
//       color: rgb(225 / 255, 31 / 255, 28 / 255),
//     })

//     // Draw the JTC image on the page
//     lastPage.drawImage(jtcImage, {
//       x: 280, // X position
//       y: 670, // Y position
//       width: 60, // Width
//       height: 30, // Height
//     });


//     if (kyc?.signature) {

//       // Draw the signature image on the page
//       lastPage.drawImage(signatureImage, {
//         x: 280, // X position
//         y: 430, // Y position
//         width: 80, // Width
//         height: 50, // Height
//       });
//     }


//     // Serialize the PDF document
//     const modifiedPdfBytes = await pdfDoc.save();

//     const path = `./contractUpload/${user?.email}-${Date.now()}.pdf`
//     // Write the modified PDF back to a file
//     await fs.writeFile(path, modifiedPdfBytes);

//     console.log('Shares Details added to PDF successfully.');
//     return path
//   } catch (error) {
//     console.error('Error adding signature to PDF:', error);
//     return false
//   }
// };





//TODO:: export default
/////////////////////////////////////////// UPDATED FUNCTION WORK DONE BY MOHSIN /////////////////////////////////////////
export default async function updateSharesToPdf(data, kyc,user) {
  // const pdfPath = `./newContractUpload/contract1.pdf`; // Provide the path to your existing PDF
    const pdfPath = `./newContractUpload/NewTile.pdf`; // Provide the path to your existing PDF
  const jtcImagePath = './upload/logo.png'; // Provide the path to the signature image

  let signatureImageBytes, signatureImage, signatureImagePath;

  if (kyc?.signature) {
    const parts = kyc?.signature.split("/");
    signatureImagePath = "./" + parts.slice(3).join("/");
  }

  try {
    // Load the existing PDF
    const existingPdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    if (kyc?.signature) {
      // Load the Signature image
      signatureImageBytes = await fs.readFile(signatureImagePath);
      // Embed the Signature image
      signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    }

    // Embed logo image
    const logoImageBytes = await fs.readFile(jtcImagePath);
    const logoImage = await pdfDoc.embedPng(logoImageBytes);

    // Embed fonts
    const customFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const textSize = 16;
    const normalTextSize = 12;
    const nameTextSize = 20;

    // Get the pages
    const page1 = pdfDoc.getPages()[0];
    const page2 = pdfDoc.getPages()[1];
    const page6 = pdfDoc.getPages()[5];

    const lastPage = pdfDoc.getPages()[pdfDoc.getPages().length - 1];

    // Set full name of the investor
    const fullName = user?.name;
    console.log("kashanfullname",fullName);

    // page1.drawText(fullName, {
    //   x: 40, // X position
    //   y: 500, // Y position (adjust based on placement)
    //   size: nameTextSize,
    //   font: customFont,
    //   color: rgb(1, 0, 0),
    // });
    // page2.drawText(fullName, {
    //   x: 450, // Move 20 units to the right
    //   y: 1065, // Move 20 units down
    //   size: 10,
    //   font: customFont,
    //   color: rgb(0, 0, 0),
    // });
    

    // page1.drawText(fullName, {
    //   x: 40, // X position
    //   y: 400, // Y position (adjust based on placement)
    //   size: nameTextSize,
    //   font: customFont,
    //   color: rgb(1, 0, 0),
    // });

    // Set date fields (Day, Month, Year)
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear().toString();


      const totalShares = data?.shares?.toString() || "0" ;
    const investedAmount = data?.amountInvested?.toString() || "0" ;
    const totalTransactions = data?.totalTransactions?.toString() || "0" ;
    const seventyPercent = data?.seventyPercent?.toString() || "0" ;
    const thirtyPercent = data?.thirtyPercent?.toString() || "0" ;

    console.log(day, month, year, "daymonthyear");


    page1.drawText(day.toString(), {
  x: 320,
  y: 515,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

page1.drawText(month.toString(), {
  x: 370, // moved right for spacing
  y: 515,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

//last -page maping
//Founder name
page6.drawText("Antonio José Tavares Leite", {
  x: 110, // moved right for spacing
  y: 690,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});
//investor-name
page6.drawText(fullName, {
  x: 320, // moved right for spacing
  y: 690,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});


   page6.drawText(day.toString(), {
  x: 120,
  y: 657,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});
page6.drawText(month.toString(), {
  x: 170, // moved right for spacing
  y: 657,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

   page6.drawText(day.toString(), {
  x: 320,
  y: 657,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});
page6.drawText(month.toString(), {
  x: 370, // moved right for spacing
  y: 657,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

page6.drawText(day.toString(), {
  x: 230,
  y: 550,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

page6.drawText("-", {
  x: 245, // between day and month
  y: 550,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

page6.drawText(month.toString(), {
  x: 250,
  y: 550,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

page6.drawText("-", {
  x: 275, // between month and year
  y: 550,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

page6.drawText(year.toString(), {
  x: 280,
  y: 550,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});


page6.drawText(investedAmount, {
  x: 230,
  y: 537,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});


const spacing = 10; // reduced spacing for minimal gap
const startX = 320; // moved a bit to the right
const yPos = 510;

page6.drawText(day.toString(), {
  x: startX,
  y: yPos,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

page6.drawText("-", {
  x: startX + 13,
  y: yPos,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

page6.drawText(month.toString(), {
  x: startX + spacing * 2,
  y: yPos,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

page6.drawText("-", {
x: startX + spacing * 3 + 13, 
  y: yPos,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

page6.drawText(year.toString(), {
  x: startX + spacing * 4 + 9,
    y: yPos,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});

page6.drawText(totalShares, {
  x: 330,
  y: 523,
  size: normalTextSize,
  font: customFont,
  color: rgb(0, 0, 0),
});
// page1.drawText(year.toString(), {
//   x: 140, // moved further right
//   y: 500,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(1, 0, 0),
// });


    console.log(day, month, year, "daymonthyear pagee 2");

    // lastPage.drawText(day.toString(), {
    //   x: 253,
    //   y: 200, // adjust positions accordingly
    //   size: normalTextSize,
    //   font: customFont,
    //   color: rgb(1, 0, 0),
    // });

    // lastPage.drawText(month.toString(), {
    //   x: 300,
    //   y: 200, // adjust positions accordingly
    //   size: normalTextSize,
    //   font: customFont,
    //   color: rgb(1, 0, 0),
    // });

    // lastPage.drawText(year.toString(), {
    //   x: 377,
    //   y: 200, // adjust positions accordingly
    //   size: normalTextSize,
    //   font: customFont,
    //   color: rgb(1, 0, 0),
    // });

    ////////////////////////////////////  Card Data total Users ///////////////////////////////////////

    // Set number of shares, amount invested, etc.
  

    
    //     const investedAmount70 = data?.amount?.toString()
//     const investedShares70 = data?.shares.toString()

    // page1.drawText(totalTransactions, {
    //   x: 100, // X position
    //   y: 255, // Y position (adjust based on placement)
    //   size: textSize,
    //   font: customFont,
    //   color: rgb(1, 0, 0),
    // });


    // page1.drawText(seventyPercent, {
    //   x: 275, // X position
    //   y: 255, // Y position (adjust based on placement)
    //   size: textSize,
    //   font: customFont,
    //   color: rgb(1, 0, 0),
    // });

    // page1.drawText(thirtyPercent, {
    //   x: 420, // X position
    //   y: 255, // Y position (adjust based on placement)
    //   size: textSize,
    //   font: customFont,
    //   color: rgb(1, 0, 0),
    // });

    // // index 4 
    // page1.drawText(totalShares, {
    //   x: 520, // Adjust based on the PDF template
    //   y: 255,
    //   size: textSize,
    //   font: customFont,
    //   color: rgb(1, 0, 0),
    // });

    // // index 5
    // page1.drawText(investedAmount, {
    //   x: 670, // Adjust based on the PDF template
    //   y: 255,
    //   size: textSize,
    //   font: customFont,
    //   color: rgb(1, 0, 0),
    // });




    if (kyc?.signature) {
      console.log("Signature image path:", signatureImagePath);
      try {
        signatureImageBytes = await fs.readFile(signatureImagePath);
        signatureImage = await pdfDoc.embedPng(signatureImageBytes);

        lastPage.drawImage(signatureImage, {
          x: 400,
          y: 120,
          width: 80,
          height: 50,
        });
      } catch (error) {
        console.error("Error loading signature image:", error);
      }
    }


    // Replace with KYC Image
    // lastPage.drawImage(logoImage, {
    //   x: 377,
    //   y: 200,
    //   width: 90,
    //   height: 50,
    // });

    


    // Serialize the PDF document
    const modifiedPdfBytes = await pdfDoc.save();

    const path = `./newContractUpload/${user?.email}-${Date.now()}_new.pdf`
    // Write the modified PDF back to a file
    await fs.writeFile(path, modifiedPdfBytes);

    console.log('Shares Details added to PDF successfully.');
    return path
  } catch (error) {
    console.error('Error adding signature to PDF:', error);
    return false
  }
};
// export default async function updateSharesToPdfForCron(data, kyc,user,transactionDate) {
//     const pdfPath = `./newContractUpload/NewTile.pdf`; // Provide the path to your existing PDF
//   const jtcImagePath = './upload/logo.png'; // Provide the path to the signature image

//   let signatureImageBytes, signatureImage, signatureImagePath;

//   if (kyc?.signature) {
//     const parts = kyc?.signature.split("/");
//     signatureImagePath = "./" + parts.slice(3).join("/");
//   }

//   try {
//     // Load the existing PDF
//     const existingPdfBytes = await fs.readFile(pdfPath);
//     const pdfDoc = await PDFDocument.load(existingPdfBytes);

//     if (kyc?.signature) {
//       // Load the Signature image
//       signatureImageBytes = await fs.readFile(signatureImagePath);
//       // Embed the Signature image
//       signatureImage = await pdfDoc.embedPng(signatureImageBytes);
//     }

//     // Embed logo image
//     const logoImageBytes = await fs.readFile(jtcImagePath);
//     const logoImage = await pdfDoc.embedPng(logoImageBytes);

//     // Embed fonts
//     const customFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
//     const textSize = 16;
//     const normalTextSize = 12;
//     const nameTextSize = 20;

//     // Get the pages
//     const page1 = pdfDoc.getPages()[0];
//     const page2 = pdfDoc.getPages()[1];
//     const page6 = pdfDoc.getPages()[5];

//     const lastPage = pdfDoc.getPages()[pdfDoc.getPages().length - 1];

//     // Set full name of the investor
//     const fullName = user?.name;
//     console.log("kashanfullname",fullName);

//     // page1.drawText(fullName, {
//     //   x: 40, // X position
//     //   y: 500, // Y position (adjust based on placement)
//     //   size: nameTextSize,
//     //   font: customFont,
//     //   color: rgb(1, 0, 0),
//     // });
//     // page2.drawText(fullName, {
//     //   x: 450, // Move 20 units to the right
//     //   y: 1065, // Move 20 units down
//     //   size: 10,
//     //   font: customFont,
//     //   color: rgb(0, 0, 0),
//     // });
    

//     // page1.drawText(fullName, {
//     //   x: 40, // X position
//     //   y: 400, // Y position (adjust based on placement)
//     //   size: nameTextSize,
//     //   font: customFont,
//     //   color: rgb(1, 0, 0),
//     // });

//     // Set date fields (Day, Month, Year)
//     // const today = new Date();
//     // const day = String(today.getDate()).padStart(2, '0');
//     // const month = today.toLocaleString('default', { month: 'long' });
//     // const year = today.getFullYear().toString();
    
// const txnDate = new Date(transactionDate);
// console.log('kashaan',txnDate);
// const day = String(txnDate.getDate()).padStart(2, '0');
// const month = txnDate.toLocaleString('default', { month: 'short' });
// const year = txnDate.getFullYear().toString();


//       const totalShares = data?.shares?.toString() || "0" ;
//     const investedAmount = data?.amountInvested?.toString() || "0" ;
//     const totalTransactions = data?.totalTransactions?.toString() || "0" ;
//     const seventyPercent = data?.seventyPercent?.toString() || "0" ;
//     const thirtyPercent = data?.thirtyPercent?.toString() || "0" ;

//     console.log(day, month, year, "daymonthyear");


//     page1.drawText(day.toString(), {
//   x: 320,
//   y: 515,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

// page1.drawText(month.toString(), {
//   x: 370, // moved right for spacing
//   y: 515,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

// //last -page maping
// //Founder name
// page6.drawText("Antonio José Tavares Leite", {
//   x: 110, // moved right for spacing
//   y: 690,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });
// //investor-name
// page6.drawText(fullName, {
//   x: 320, // moved right for spacing
//   y: 690,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });


//    page6.drawText(day.toString(), {
//   x: 120,
//   y: 657,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });
// page6.drawText(month.toString(), {
//   x: 170, // moved right for spacing
//   y: 657,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

//    page6.drawText(day.toString(), {
//   x: 320,
//   y: 657,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });
// page6.drawText(month.toString(), {
//   x: 370, // moved right for spacing
//   y: 657,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

// page6.drawText(day.toString(), {
//   x: 230,
//   y: 550,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

// page6.drawText("-", {
//   x: 245, // between day and month
//   y: 550,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

// page6.drawText(month.toString(), {
//   x: 250,
//   y: 550,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

// page6.drawText("-", {
//   x: 275, // between month and year
//   y: 550,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

// page6.drawText(year.toString(), {
//   x: 280,
//   y: 550,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });


// page6.drawText(investedAmount, {
//   x: 230,
//   y: 537,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });


// const spacing = 10; // reduced spacing for minimal gap
// const startX = 320; // moved a bit to the right
// const yPos = 510;

// page6.drawText(day.toString(), {
//   x: startX,
//   y: yPos,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

// page6.drawText("-", {
//   x: startX + 13,
//   y: yPos,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

// page6.drawText(month.toString(), {
//   x: startX + spacing * 2,
//   y: yPos,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

// page6.drawText("-", {
// x: startX + spacing * 3 + 13, 
//   y: yPos,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

// page6.drawText(year.toString(), {
//   x: startX + spacing * 4 + 9,
//     y: yPos,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });

// page6.drawText(totalShares, {
//   x: 330,
//   y: 523,
//   size: normalTextSize,
//   font: customFont,
//   color: rgb(0, 0, 0),
// });
// // page1.drawText(year.toString(), {
// //   x: 140, // moved further right
// //   y: 500,
// //   size: normalTextSize,
// //   font: customFont,
// //   color: rgb(1, 0, 0),
// // });


//     console.log(day, month, year, "daymonthyear pagee 2");

//     // lastPage.drawText(day.toString(), {
//     //   x: 253,
//     //   y: 200, // adjust positions accordingly
//     //   size: normalTextSize,
//     //   font: customFont,
//     //   color: rgb(1, 0, 0),
//     // });

//     // lastPage.drawText(month.toString(), {
//     //   x: 300,
//     //   y: 200, // adjust positions accordingly
//     //   size: normalTextSize,
//     //   font: customFont,
//     //   color: rgb(1, 0, 0),
//     // });

//     // lastPage.drawText(year.toString(), {
//     //   x: 377,
//     //   y: 200, // adjust positions accordingly
//     //   size: normalTextSize,
//     //   font: customFont,
//     //   color: rgb(1, 0, 0),
//     // });

//     ////////////////////////////////////  Card Data total Users ///////////////////////////////////////

//     // Set number of shares, amount invested, etc.
  

    
//     //     const investedAmount70 = data?.amount?.toString()
// //     const investedShares70 = data?.shares.toString()

//     // page1.drawText(totalTransactions, {
//     //   x: 100, // X position
//     //   y: 255, // Y position (adjust based on placement)
//     //   size: textSize,
//     //   font: customFont,
//     //   color: rgb(1, 0, 0),
//     // });


//     // page1.drawText(seventyPercent, {
//     //   x: 275, // X position
//     //   y: 255, // Y position (adjust based on placement)
//     //   size: textSize,
//     //   font: customFont,
//     //   color: rgb(1, 0, 0),
//     // });

//     // page1.drawText(thirtyPercent, {
//     //   x: 420, // X position
//     //   y: 255, // Y position (adjust based on placement)
//     //   size: textSize,
//     //   font: customFont,
//     //   color: rgb(1, 0, 0),
//     // });

//     // // index 4 
//     // page1.drawText(totalShares, {
//     //   x: 520, // Adjust based on the PDF template
//     //   y: 255,
//     //   size: textSize,
//     //   font: customFont,
//     //   color: rgb(1, 0, 0),
//     // });

//     // // index 5
//     // page1.drawText(investedAmount, {
//     //   x: 670, // Adjust based on the PDF template
//     //   y: 255,
//     //   size: textSize,
//     //   font: customFont,
//     //   color: rgb(1, 0, 0),
//     // });




//     if (kyc?.signature) {
//       console.log("Signature image path:", signatureImagePath);
//       try {
//         signatureImageBytes = await fs.readFile(signatureImagePath);
//         signatureImage = await pdfDoc.embedPng(signatureImageBytes);

//         lastPage.drawImage(signatureImage, {
//           x: 400,
//           y: 120,
//           width: 80,
//           height: 50,
//         });
//       } catch (error) {
//         console.error("Error loading signature image:", error);
//       }
//     }


//     // Replace with KYC Image
//     // lastPage.drawImage(logoImage, {
//     //   x: 377,
//     //   y: 200,
//     //   width: 90,
//     //   height: 50,
//     // });

    


//     // Serialize the PDF document
//     const modifiedPdfBytes = await pdfDoc.save();

//     // const path = `./newContractUpload/${user?.email}-${Date.now()}_new.pdf`
//     const path = `./newContractUpload/${user?.email}-${Date.now()}_new.pdf`
//     // Write the modified PDF back to a file
//     await fs.writeFile(path, modifiedPdfBytes);

//     console.log('Shares Details added to PDF successfully.');
//     return path
//   } catch (error) {
//     console.error('Error adding signature to PDF:', error);
//     return false
//   }
// };


