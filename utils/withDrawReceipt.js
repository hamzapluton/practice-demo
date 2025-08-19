import fs from 'fs/promises';
import { PDFDocument, rgb, StandardFonts, drawText } from 'pdf-lib';
import formatDate from '#utils/formatDate';

export default async function withDrawReceipt(data, user) {
  const jtcImagePath = './upload/logo.png'; // Provide the path to the signature image

  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Load the JTC image
    const jtcImageBytes = await fs.readFile(jtcImagePath);
    const jtcImage = await pdfDoc.embedPng(jtcImageBytes);

    // Add a new page to the PDF document
    const page1 = pdfDoc.addPage([612, 792]); // Standard US Letter size (8.5x11 inches)

    const customFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const textSize = 12;

    // Set font size and color for regular data
    const regularSize = 12;
    const regularColor =  rgb(0.5, 0.5, 0.5); // Gray color

    // Set font size and color for titles
    const titleSize = 16; // Increased font size for titles
    const titleColor = rgb(0, 0, 0); // Black color for titles

    // Sender Information
    const senderInfo = [
      'Antonio Leite',
      'Calle Francisco Zarco 524 Ote,',
      'Colonia Centro Gomes Palacio Durango',
      'CODIGO POSTAL 35000',
      '+52(871) 1161608',
      'inversion@javatimescaffe.com',
    ];

    // Receiver Information
    const receiverInfo = [
      `${user?.name}`,
      `${user?.email}`,
    ];

    // Draw the JTC image and company name centered at the top
    const imageWidth = 60;
    const imageHeight = 30;
    const centerX = 306; // Center of the page
    const topY = 792 - 50; // 50 units from the top
    page1.drawImage(jtcImage, {
      x: centerX - imageWidth / 2,
      y: topY - imageHeight,
      width: imageWidth,
      height: imageHeight,
    });
    // page1.drawText('JAVA Time Caffe', {
    //   x: centerX - customFont.widthOfTextAtSize('JAVA Time Caffe', 16) / 2,
    //   y: topY - imageHeight + 15, // Adjust the Y position for text alignment
    //   size: 16,
    //   font: customFont,
    //   color: titleColor, // Use title color for the company name
    // });

    // Withdrawal receipt title at the top center
    page1.drawText('Withdrawal Receipt', {
      x: centerX - customFont.widthOfTextAtSize('Withdrawal Receipt', titleSize) / 2,
      y: topY - imageHeight - 30, // Adjust the Y position for text alignment
      size: titleSize, // Use title size for the title
      font: customFont,
      color: titleColor, // Use title color for the title
    });

    // Withdrawal receipt date at the top right side
    page1.drawText(`${formatDate(new Date())}`, {
      x: 170, // Adjust the X position for alignment to the right
      y: topY - imageHeight - 50, // Adjust the Y position for text alignment
      size: textSize,
      font: customFont,
      color: regularColor, // Use title color for the date
    });

    // Calculate the Y position for sender and receiver info
    const infoY = 625;
    const lineHeight = 15;



    page1.drawText("Sender information", {
      x: 85, // Adjust the x-coordinate to position text inside the sender box
      y: infoY - 5 - 0 * lineHeight, // Adjust the y-coordinate to position text inside the sender box
      size: 16, // Use regular size for sender info
      font: customFont,
      color: rgb(0, 0, 0), // Use regular color for sender info
    });

    page1.drawText("Receiver information", {
      x: 370, // Adjust the x-coordinate to position text inside the sender box
      y: infoY - 5 - 0 * lineHeight, // Adjust the y-coordinate to position text inside the sender box
      size: 16, // Use regular size for sender info
      font: customFont,
      color: rgb(0, 0, 0), // Use regular color for sender info
    });


    // Draw sender information inside the sender box
    for (let i = 0; i < senderInfo.length; i++) {
      page1.drawText(senderInfo[i], {
        x: 85, // Adjust the x-coordinate to position text inside the sender box
        y: infoY -23 - i * lineHeight, // Adjust the y-coordinate to position text inside the sender box
        size: regularSize, // Use regular size for sender info
        font: customFont,
        color: regularColor, // Use regular color for sender info
      });
    }

    // Draw receiver information inside the receiver box
    for (let i = 0; i < receiverInfo.length; i++) {
      page1.drawText(receiverInfo[i], {
        x: 370, // Adjust the x-coordinate to position text inside the receiver box
        y: infoY -23 - i * lineHeight, // Adjust the y-coordinate to position text inside the receiver box
        size: regularSize, // Use regular size for receiver info
        font: customFont,
        color: regularColor, // Use regular color for receiver info
      });
    }

    // Create a table for withdrawal details
    const table = [
      ['Withdrawal Amount', `$${data?.amount.toFixed(2)}`],
      ['Tax Amount (30%)', `$${(data?.amount * 0.3).toFixed(2)}`],
      ['Net Withdrawal Amount (70%)', `$${(data?.amount * 0.7).toFixed(2)}`],
    ];

    // Set font size and color for table data
    const tableSize = 12;
    const tableColor = regularColor; // Use regular color for table data

    drawTable(page1, table, {
      x: 100,
      y: 400,
      cellPadding: 10,
      textColor: tableColor, // Use regular color for table text
      font: customFont,
      fontSize: tableSize, // Use regular size for table text
      bgColor: rgb(1, 0, 0), // Red background color
    });

    // page1.drawImage(jtcImage, {
    //   x: 190,
    //   y: 50, // Adjust the Y position for text alignment at the bottom
    //   width: imageWidth,
    //   height: imageHeight,
    // });
    page1.drawText('Java Times Caffe', {
      x: centerX - customFont.widthOfTextAtSize('Java Times Caffe', titleSize) / 2,
      y: 50, // Adjust the Y position for text alignment at the bottom
      size: titleSize,
      font: customFont,
      color: rgb(1,0,0),
    });
    // Serialize the PDF document
    const modifiedPdfBytes = await pdfDoc.save();

    // Generate a unique filename for the receipt
    const path = `./upload/${user?.email}-receipt-${Date.now()}.pdf`;

    // Write the modified PDF to a file
    await fs.writeFile(path, modifiedPdfBytes);

    console.log('Receipt created successfully.', path);
    return path;
  } catch (error) {
    console.error('Error while creating receipt:', error);
    return false;
  }
}

function drawTable(page, data, { x, y, cellPadding, textColor, font, fontSize, bgColor }) {
  const tableWidth = 400;
  const rowHeight = 20;

  page.setFont(font);
  page.setFontSize(fontSize);

  // Draw column headers with a red background
  page.drawRectangle({
    x: x,
    y: y,
    width: tableWidth,
    height: rowHeight,
    borderColor: rgb(0, 0, 0), // Black border color
    color: rgb(1, 0, 0), // Red background color
  });

  const table = [
    ['Description', `Amount`],
  ];

  for (let j = 0; j < table[0].length; j++) {
    const cell = table[0][j];
    page.drawText(cell, {
      x: x + j * (tableWidth / table[0].length) + cellPadding,
      y: y + cellPadding,
      size: fontSize,
      color: rgb(1, 1, 1), // White text color
    });
  }

  // Draw table outline
  page.drawRectangle({
    x: x,
    y: y,
    width: tableWidth,
    height: rowHeight,
    borderColor: rgb(0, 0, 0), // Black border color
  });

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      // Draw cell with a white background


      page.drawRectangle({
        x: x + j * (tableWidth / data[0].length),
        y: y - (i + 1) * rowHeight,
        width: tableWidth / data[0].length,
        height: rowHeight,
        borderColor: rgb(0, 0, 0), // Black border color
        color: rgb(1, 1, 1), // White background color
      });




      page.drawText(cell, {
        x: x + j * (tableWidth / data[0].length) + cellPadding,
        y: y - (i + 1) * rowHeight + cellPadding,
        size: fontSize,
        color: textColor,
      });

      // Draw table outline
      page.drawRectangle({
        x: x + j * (tableWidth / data[0].length),
        y: y - (i + 1) * rowHeight,
        width: tableWidth / data[0].length,
        height: rowHeight,
        borderColor: rgb(0, 0, 0), // Black border color
      });
    }
  }
}
