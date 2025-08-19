import fs from 'fs/promises';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import formatDate from '#utils/formatDate';

export default async function addSharesToPdf(data,user , kyc) {
  const pdfPath = './contractUpload/contract.pdf'; // Provide the path to your existing PDF
  const jtcImagePath = './upload/logo.png'; // Provide the path to the signature image
  console.log(data, "data")

  try {
    // Load the existing PDF
    const existingPdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Load the JTC image
    const jtcImageBytes = await fs.readFile(jtcImagePath);


    const customFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Embed the logo image
    const jtcImage = await pdfDoc.embedPng(jtcImageBytes);

    // Get the page of the PDF
    const page1 = pdfDoc.getPages()[0];
    const page2 = pdfDoc.getPages()[1];
    const page4 = pdfDoc.getPages()[3];
    const page5 = pdfDoc.getPages()[4];
    const lastPage = pdfDoc.getPages()[pdfDoc.getPages().length - 1];


    const investedAmount = data?.investedAmount?.toString()
    const textSize = 12

    // Draw the string of text on the page
    page1.drawText(investedAmount, {
      x: 325, // X position
      y: 723, // Y position
      size: textSize,
      font: customFont,
      color: rgb(225 / 255, 31 / 255, 28 / 255),
    })


    const shares = data?.shares?.toString()
    page2.drawText(shares, {
      x: 140, // X position
      y: 607, // Y position
      size: textSize,
      font: customFont,
      color: rgb(225 / 255, 31 / 255, 28 / 255),
    })

    const rfc = data?.shares?.toString()
    page2.drawText(rfc, {
      x: 368, // X position
      y: 582, // Y position
      size: textSize,
      font: customFont,
      color: rgb(225 / 255, 31 / 255, 28 / 255),
    })


    const date = new Date()

    page5.drawText(formatDate(date), {
      x: 100, // X position
      y: 735, // Y position
      size: textSize,
      font: customFont,
      color: rgb(225 / 255, 31 / 255, 28 / 255),
    })

    // Draw the JTC image on the page
    lastPage.drawImage(jtcImage, {
      x: 280, // X position
      y: 670, // Y position
      width: 60, // Width
      height: 30, // Height
    });


    // Serialize the PDF document
    const modifiedPdfBytes = await pdfDoc.save();
    
      const path = `./contractUpload/${user?.email}-${Date.now()}.pdf`
      await fs.writeFile(path, modifiedPdfBytes); 
  
    console.log('Shares Details added to PDF successfully.');
   return path
  } catch (error) {
    console.error('Error adding signature to PDF:', error);
  return false
  }
};

