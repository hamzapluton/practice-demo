import fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';

export default async function addSignatureToPdf (imageName ,data ){
  const url = data?.file;
const restOfPath = url.substring(url.indexOf("/newContractUpload/") + "/newContractUpload/".length);
  const pdfPath = `./newContractUpload/${restOfPath}`; // Provide the path to your existing PDF
  
  const signatureImagePath = `./upload/${imageName}`; // Provide the path to the signature image
   
  try {
    // Load the existing PDF
    const existingPdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Load the signature image
    const signatureImageBytes = await fs.readFile(signatureImagePath);

    // Embed the signature image
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

    // Get the first page of the PDF
    const page = pdfDoc.getPages()[0];
    const lastPage = pdfDoc.getPages()[pdfDoc.getPages().length - 1];

    // Draw the signature image on the page
    lastPage.drawImage(signatureImage, {
      x: 330, // X position
      y: 120, // Y position
      width: 80, // Width
      height: 50, // Height
    });


    const path = `./newContractUpload/${data?.userId?.email}-${Date.now()}.pdf`
    await fs.writeFile(path, existingPdfBytes);





    // Serialize the PDF document
    const modifiedPdfBytes = await pdfDoc.save();

    // Write the modified PDF back to a file
    await fs.writeFile(pdfPath, modifiedPdfBytes);
   
     
   
    console.log('Signature added to PDF successfully.');
    return path
  } catch (error) {
    console.error('Error adding signature to PDF:', error); 
return false
  }
};

