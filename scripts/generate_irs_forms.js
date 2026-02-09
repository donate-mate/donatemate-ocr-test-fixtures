/**
 * IRS Form Generator for OCR Test Fixtures
 * 
 * Generates IRS-compliant forms based on donation type and amount rules:
 * 
 * CASH DONATIONS:
 * - < $250: Bank statement or receipt
 * - ≥ $250: Written acknowledgment from charity
 * 
 * NON-CASH DONATIONS (Goods, Clothing, Household):
 * - < $500: Receipt with item description
 * - $500-$5,000: Form 8283 Section A
 * - > $5,000: Form 8283 Section B + Qualified Appraisal
 * 
 * VEHICLES:
 * - > $500: Form 1098-C from charity
 * 
 * STOCKS/SECURITIES:
 * - Publicly traded: Brokerage confirmation (no appraisal)
 * - Closely-held > $10,000: Form 8283 Section B + Appraisal
 * 
 * REAL ESTATE:
 * - > $5,000: Form 8283 Section B + Appraisal
 * 
 * CRYPTOCURRENCY:
 * - Same as property rules + exchange rate documentation
 */

const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Sample data for generating realistic forms
const DONORS = [
  { name: 'John A. Smith', address: '123 Main Street', city: 'Columbus', state: 'OH', zip: '43215', ssn: 'XXX-XX-1234' },
  { name: 'Sarah M. Johnson', address: '456 Oak Avenue', city: 'Austin', state: 'TX', zip: '78701', ssn: 'XXX-XX-5678' },
  { name: 'Michael R. Williams', address: '789 Pine Road', city: 'Denver', state: 'CO', zip: '80202', ssn: 'XXX-XX-9012' },
  { name: 'Emily K. Davis', address: '321 Elm Street', city: 'Seattle', state: 'WA', zip: '98101', ssn: 'XXX-XX-3456' },
  { name: 'Robert T. Brown', address: '654 Maple Drive', city: 'Portland', state: 'OR', zip: '97201', ssn: 'XXX-XX-7890' },
];

const ORGANIZATIONS = [
  { name: 'Goodwill Industries International', ein: '53-0196517', address: '15810 Indianola Drive', city: 'Rockville', state: 'MD', zip: '20855' },
  { name: 'The Salvation Army', ein: '13-5562351', address: '615 Slaters Lane', city: 'Alexandria', state: 'VA', zip: '22314' },
  { name: 'American Red Cross', ein: '53-0196605', address: '431 18th Street NW', city: 'Washington', state: 'DC', zip: '20006' },
  { name: 'Habitat for Humanity International', ein: '91-1914868', address: '322 W. Lamar Street', city: 'Americus', state: 'GA', zip: '31709' },
  { name: 'United Way Worldwide', ein: '13-1635294', address: '701 N. Fairfax Street', city: 'Alexandria', state: 'VA', zip: '22314' },
];

const APPRAISERS = [
  { name: 'James R. Thompson, ASA', license: 'ASA-2024-12345', address: '100 Appraisal Way, Suite 200', city: 'New York', state: 'NY', zip: '10001' },
  { name: 'Patricia L. Martinez, AAA', license: 'AAA-2024-67890', address: '200 Valuation Blvd', city: 'Chicago', state: 'IL', zip: '60601' },
];

const VEHICLE_TYPES = [
  { year: '2019', make: 'Toyota', model: 'Camry', vin: '4T1B11HK5KU123456' },
  { year: '2018', make: 'Honda', model: 'Accord', vin: '1HGCV1F34JA987654' },
  { year: '2020', make: 'Ford', model: 'F-150', vin: '1FTEW1E85LFA12345' },
  { year: '2017', make: 'Chevrolet', model: 'Silverado', vin: '3GCUKREC5HG654321' },
];

const NON_CASH_ITEMS = [
  { description: 'Antique oak dining table with 6 chairs', condition: 'Good', method: 'Comparable Sales' },
  { description: 'Oil painting - landscape scene, 36"x48"', condition: 'Excellent', method: 'Appraisal' },
  { description: 'Vintage jewelry collection (12 pieces)', condition: 'Good', method: 'Market Comparison' },
  { description: 'Grand piano - Steinway Model B', condition: 'Excellent', method: 'Dealer Quote' },
  { description: 'Computer equipment (5 laptops, 3 desktops)', condition: 'Good', method: 'Depreciated Value' },
];

// Utility functions
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (startYear = 2025, endYear = 2026) => {
  const year = randomInt(startYear, endYear);
  const month = String(randomInt(1, 12)).padStart(2, '0');
  const day = String(randomInt(1, 28)).padStart(2, '0');
  return `${month}/${day}/${year}`;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

/**
 * Generate Form 8283 - Noncash Charitable Contributions
 */
function generateForm8283(sectionType, amount, itemDescription, donorInfo, orgInfo, appraiserInfo = null) {
  const width = 850;
  const height = sectionType === 'A' ? 1100 : 1400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';

  // Header
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Form 8283', 30, 40);
  ctx.font = '10px Arial';
  ctx.fillText('(Rev. December 2023)', 30, 55);
  ctx.fillText('Department of the Treasury', 30, 70);
  ctx.fillText('Internal Revenue Service', 30, 85);

  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Noncash Charitable Contributions', width / 2, 50);
  ctx.font = '11px Arial';
  ctx.fillText('Attach to your tax return if you claimed a total deduction', width / 2, 70);
  ctx.fillText('of over $500 for all contributed property.', width / 2, 85);
  ctx.textAlign = 'left';

  // OMB Number
  ctx.font = '10px Arial';
  ctx.fillText('OMB No. 1545-0908', width - 130, 40);
  ctx.fillText('Attachment', width - 130, 55);
  ctx.fillText('Sequence No. 155', width - 130, 70);

  // Name and identifying number
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 100, width - 60, 50);
  ctx.font = '9px Arial';
  ctx.fillText("Name(s) shown on your income tax return", 35, 115);
  ctx.font = '12px Arial';
  ctx.fillText(donorInfo.name, 35, 135);
  
  // SSN box
  ctx.strokeRect(width - 200, 100, 170, 50);
  ctx.font = '9px Arial';
  ctx.fillText("Identifying number", width - 195, 115);
  ctx.font = '12px Arial';
  ctx.fillText(donorInfo.ssn, width - 195, 135);

  let yPos = 170;

  if (sectionType === 'A') {
    // Section A header
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(30, yPos, width - 60, 25);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('Section A. Donated Property of $5,000 or Less and Publicly Traded Securities', 35, yPos + 17);
    yPos += 40;

    // Part I - Information on Donated Property
    ctx.font = 'bold 10px Arial';
    ctx.fillText('Part I    Information on Donated Property', 35, yPos);
    yPos += 25;

    // Column headers
    ctx.strokeRect(30, yPos, width - 60, 25);
    ctx.font = '8px Arial';
    const cols = ['(a) Name and address of donee organization', '(b) Description of donated property', '(c) Date of contribution', '(d) Date acquired', '(e) How acquired', '(f) Donor\'s cost or basis', '(g) Fair market value', '(h) Method used'];
    const colWidths = [180, 150, 70, 70, 60, 80, 80, 80];
    let xPos = 35;
    cols.forEach((col, i) => {
      ctx.fillText(col, xPos, yPos + 17, colWidths[i] - 5);
      xPos += colWidths[i];
    });
    yPos += 25;

    // Data row
    ctx.strokeRect(30, yPos, width - 60, 60);
    xPos = 35;
    ctx.font = '10px Arial';
    
    // Org name and address
    ctx.fillText(orgInfo.name, xPos, yPos + 20, 175);
    ctx.fillText(orgInfo.address, xPos, yPos + 35, 175);
    ctx.fillText(`${orgInfo.city}, ${orgInfo.state} ${orgInfo.zip}`, xPos, yPos + 50, 175);
    xPos += 180;

    // Description
    const descLines = itemDescription.split(' ').reduce((acc, word) => {
      const lastLine = acc[acc.length - 1] || '';
      if ((lastLine + ' ' + word).length <= 25) {
        acc[acc.length - 1] = (lastLine + ' ' + word).trim();
      } else {
        acc.push(word);
      }
      return acc;
    }, ['']);
    descLines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, xPos, yPos + 15 + (i * 15), 145);
    });
    xPos += 150;

    // Dates
    ctx.fillText(randomDate(), xPos, yPos + 30, 65);
    xPos += 70;
    ctx.fillText(randomDate(2020, 2024), xPos, yPos + 30, 65);
    xPos += 70;

    // How acquired
    ctx.fillText('Purchase', xPos, yPos + 30, 55);
    xPos += 60;

    // Cost basis
    const costBasis = Math.floor(amount * 0.4);
    ctx.fillText(formatCurrency(costBasis), xPos, yPos + 30, 75);
    xPos += 80;

    // FMV
    ctx.fillText(formatCurrency(amount), xPos, yPos + 30, 75);
    xPos += 80;

    // Method
    ctx.fillText('Comp. Sales', xPos, yPos + 30, 75);

  } else {
    // Section B header
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(30, yPos, width - 60, 25);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('Section B. Donated Property Over $5,000 (Except Publicly Traded Securities)', 35, yPos + 17);
    yPos += 40;

    // Part I - Information on Donated Property
    ctx.font = 'bold 10px Arial';
    ctx.fillText('Part I    Information on Donated Property', 35, yPos);
    yPos += 20;
    ctx.font = '9px Arial';
    ctx.fillText('Note: Figure the amount of your contribution deduction before completing this part. See your tax return instructions.', 35, yPos);
    yPos += 25;

    // Property description
    ctx.strokeRect(30, yPos, width - 60, 100);
    ctx.font = '9px Arial';
    ctx.fillText('5  Description of donated property', 35, yPos + 15);
    ctx.font = '10px Arial';
    ctx.fillText(itemDescription, 40, yPos + 40);
    ctx.fillText(`Condition: ${randomFrom(['Excellent', 'Good', 'Fair'])}`, 40, yPos + 60);
    ctx.fillText(`Appraised Fair Market Value: ${formatCurrency(amount)}`, 40, yPos + 80);
    yPos += 115;

    // Part II - Taxpayer (Donor) Statement
    ctx.font = 'bold 10px Arial';
    ctx.fillText('Part II    Taxpayer (Donor) Statement', 35, yPos);
    yPos += 20;
    ctx.font = '9px Arial';
    ctx.fillText('I declare that the following statement is true: The appraised fair market value represents my estimate of the', 35, yPos);
    yPos += 12;
    ctx.fillText('fair market value of the donated property on the date of gift.', 35, yPos);
    yPos += 30;

    // Signature line
    ctx.strokeRect(30, yPos, 400, 30);
    ctx.font = '9px Arial';
    ctx.fillText("Donor's signature", 35, yPos + 12);
    ctx.font = 'italic 12px Arial';
    ctx.fillText(donorInfo.name, 150, yPos + 22);
    
    ctx.strokeRect(440, yPos, 200, 30);
    ctx.font = '9px Arial';
    ctx.fillText("Date", 445, yPos + 12);
    ctx.font = '12px Arial';
    ctx.fillText(randomDate(), 480, yPos + 22);
    yPos += 50;

    // Part III - Declaration of Appraiser
    ctx.font = 'bold 10px Arial';
    ctx.fillText('Part III    Declaration of Appraiser', 35, yPos);
    yPos += 20;
    ctx.font = '9px Arial';
    const declaration = [
      'I declare that I am not the donor, the donee, a party to the transaction, or employed by any of the foregoing.',
      'I performed the majority of my services regarding the appraised property in my capacity as an appraiser.',
      'I hold myself out to the public as an appraiser or perform appraisals on a regular basis.',
      'I am qualified to make appraisals of the type of property being valued.'
    ];
    declaration.forEach(line => {
      ctx.fillText('• ' + line, 40, yPos);
      yPos += 15;
    });
    yPos += 20;

    // Appraiser info
    if (appraiserInfo) {
      ctx.strokeRect(30, yPos, width - 60, 120);
      ctx.font = '9px Arial';
      ctx.fillText("Appraiser's signature", 35, yPos + 15);
      ctx.font = 'italic 12px Arial';
      ctx.fillText(appraiserInfo.name, 150, yPos + 15);
      
      ctx.font = '9px Arial';
      ctx.fillText("Date", 450, yPos + 15);
      ctx.font = '12px Arial';
      ctx.fillText(randomDate(), 480, yPos + 15);

      ctx.font = '9px Arial';
      ctx.fillText("Business address", 35, yPos + 40);
      ctx.font = '10px Arial';
      ctx.fillText(appraiserInfo.address, 150, yPos + 40);
      ctx.fillText(`${appraiserInfo.city}, ${appraiserInfo.state} ${appraiserInfo.zip}`, 150, yPos + 55);

      ctx.font = '9px Arial';
      ctx.fillText("Appraiser's license/certification", 35, yPos + 80);
      ctx.font = '10px Arial';
      ctx.fillText(appraiserInfo.license, 200, yPos + 80);

      ctx.font = '9px Arial';
      ctx.fillText("Appraised fair market value", 35, yPos + 100);
      ctx.font = 'bold 12px Arial';
      ctx.fillText(formatCurrency(amount), 200, yPos + 100);
    }
    yPos += 140;

    // Part IV - Donee Acknowledgment
    ctx.font = 'bold 10px Arial';
    ctx.fillText('Part IV    Donee Acknowledgment', 35, yPos);
    yPos += 25;

    ctx.strokeRect(30, yPos, width - 60, 80);
    ctx.font = '9px Arial';
    ctx.fillText("Donee organization name", 35, yPos + 15);
    ctx.font = '11px Arial';
    ctx.fillText(orgInfo.name, 180, yPos + 15);

    ctx.font = '9px Arial';
    ctx.fillText("EIN", 35, yPos + 35);
    ctx.font = '11px Arial';
    ctx.fillText(orgInfo.ein, 180, yPos + 35);

    ctx.font = '9px Arial';
    ctx.fillText("Address", 35, yPos + 55);
    ctx.font = '10px Arial';
    ctx.fillText(`${orgInfo.address}, ${orgInfo.city}, ${orgInfo.state} ${orgInfo.zip}`, 180, yPos + 55);

    ctx.font = '9px Arial';
    ctx.fillText("Authorized signature", 35, yPos + 75);
    ctx.font = 'italic 11px Arial';
    ctx.fillText("Authorized Representative", 180, yPos + 75);
  }

  // Watermark
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.font = 'bold 40px Arial';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);
  ctx.textAlign = 'center';
  ctx.fillText('SAMPLE - FOR TESTING ONLY', 0, 0);
  ctx.restore();

  return canvas;
}

/**
 * Generate Form 1098-C - Contributions of Motor Vehicles
 */
function generateForm1098C(vehicleInfo, amount, donorInfo, orgInfo) {
  const width = 850;
  const height = 700;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';

  // Red header bar (simulated)
  ctx.fillStyle = '#cc0000';
  ctx.fillRect(30, 25, 60, 5);
  ctx.fillStyle = '#000000';

  // Header
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Form 1098-C', 30, 50);
  ctx.font = '10px Arial';
  ctx.fillText('(Rev. January 2024)', 30, 65);

  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Contributions of Motor Vehicles, Boats, and Airplanes', width / 2, 50);
  ctx.textAlign = 'left';

  ctx.font = '9px Arial';
  ctx.fillText('Department of the Treasury - Internal Revenue Service', width - 250, 50);
  ctx.fillText('OMB No. 1545-1959', width - 130, 65);

  // Copy indicator
  ctx.fillStyle = '#cc0000';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('Copy B', width - 80, 90);
  ctx.fillStyle = '#000000';
  ctx.font = '9px Arial';
  ctx.fillText('For Donor', width - 80, 105);

  // Box layout
  let yPos = 130;
  
  // Donee's info
  ctx.strokeRect(30, yPos, 380, 80);
  ctx.font = '8px Arial';
  ctx.fillText("DONEE'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.", 35, yPos + 12);
  ctx.font = '11px Arial';
  ctx.fillText(orgInfo.name, 35, yPos + 30);
  ctx.fillText(orgInfo.address, 35, yPos + 45);
  ctx.fillText(`${orgInfo.city}, ${orgInfo.state} ${orgInfo.zip}`, 35, yPos + 60);
  ctx.fillText('(555) 123-4567', 35, yPos + 75);

  // Donee's EIN
  ctx.strokeRect(420, yPos, 200, 40);
  ctx.font = '8px Arial';
  ctx.fillText("DONEE'S TIN", 425, yPos + 12);
  ctx.font = '12px Arial';
  ctx.fillText(orgInfo.ein, 425, yPos + 32);

  // Date of contribution
  ctx.strokeRect(630, yPos, 190, 40);
  ctx.font = '8px Arial';
  ctx.fillText("1  Date of contribution", 635, yPos + 12);
  ctx.font = '12px Arial';
  ctx.fillText(randomDate(), 635, yPos + 32);

  yPos += 90;

  // Donor's info
  ctx.strokeRect(30, yPos, 380, 80);
  ctx.font = '8px Arial';
  ctx.fillText("DONOR'S name, street address, city or town, state or province, country, and ZIP or foreign postal code", 35, yPos + 12);
  ctx.font = '11px Arial';
  ctx.fillText(donorInfo.name, 35, yPos + 30);
  ctx.fillText(donorInfo.address, 35, yPos + 45);
  ctx.fillText(`${donorInfo.city}, ${donorInfo.state} ${donorInfo.zip}`, 35, yPos + 60);

  // Donor's TIN
  ctx.strokeRect(420, yPos, 200, 40);
  ctx.font = '8px Arial';
  ctx.fillText("DONOR'S TIN", 425, yPos + 12);
  ctx.font = '12px Arial';
  ctx.fillText(donorInfo.ssn, 425, yPos + 32);

  // Odometer mileage
  ctx.strokeRect(630, yPos, 190, 40);
  ctx.font = '8px Arial';
  ctx.fillText("2  Odometer mileage", 635, yPos + 12);
  ctx.font = '12px Arial';
  ctx.fillText(`${randomInt(50000, 150000).toLocaleString()} miles`, 635, yPos + 32);

  yPos += 90;

  // Vehicle description
  ctx.strokeRect(30, yPos, width - 60, 60);
  ctx.font = '8px Arial';
  ctx.fillText("3  Year, make, model, and condition of vehicle", 35, yPos + 12);
  ctx.font = '12px Arial';
  ctx.fillText(`${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`, 35, yPos + 35);
  ctx.fillText(`Condition: ${randomFrom(['Excellent', 'Good', 'Fair'])}`, 35, yPos + 52);

  // VIN
  ctx.strokeRect(500, yPos, width - 530, 60);
  ctx.font = '8px Arial';
  ctx.fillText("4  Vehicle identification number (VIN)", 505, yPos + 12);
  ctx.font = '11px Arial';
  ctx.fillText(vehicleInfo.vin, 505, yPos + 40);

  yPos += 75;

  // Checkbox section
  ctx.strokeRect(30, yPos, width - 60, 120);
  ctx.font = '9px Arial';
  ctx.fillText("5a  Check if the vehicle was sold by the donee organization at arm's length to an unrelated party", 35, yPos + 20);
  ctx.strokeRect(600, yPos + 8, 15, 15);
  ctx.fillText('X', 603, yPos + 20); // Checked

  ctx.fillText("5b  Check if the vehicle will be transferred to a needy individual for significantly below fair market value", 35, yPos + 45);
  ctx.strokeRect(600, yPos + 33, 15, 15);

  ctx.fillText("5c  Check if the donee organization will make a material improvement to the vehicle", 35, yPos + 70);
  ctx.strokeRect(600, yPos + 58, 15, 15);

  ctx.font = '8px Arial';
  ctx.fillText("6  Gross proceeds from sale (see instructions)", 35, yPos + 95);
  ctx.font = 'bold 14px Arial';
  ctx.fillText(formatCurrency(amount), 280, yPos + 95);

  yPos += 135;

  // Certification
  ctx.strokeRect(30, yPos, width - 60, 60);
  ctx.font = 'bold 9px Arial';
  ctx.fillText("Under penalties of perjury, I certify that:", 35, yPos + 15);
  ctx.font = '9px Arial';
  ctx.fillText("• The information on this form is true and correct to the best of my knowledge", 35, yPos + 30);
  ctx.fillText("• This donee organization is a section 501(c)(3) organization or a state or political subdivision", 35, yPos + 45);

  // Watermark
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.font = 'bold 40px Arial';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);
  ctx.textAlign = 'center';
  ctx.fillText('SAMPLE - FOR TESTING ONLY', 0, 0);
  ctx.restore();

  return canvas;
}

/**
 * Generate Qualified Appraisal Summary
 */
function generateAppraisal(itemDescription, amount, donorInfo, orgInfo, appraiserInfo) {
  const width = 850;
  const height = 1100;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';

  // Header
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('QUALIFIED APPRAISAL', width / 2, 50);
  ctx.font = '12px Arial';
  ctx.fillText('For Charitable Contribution Purposes', width / 2, 70);
  ctx.fillText('(In Accordance with IRS Requirements under IRC §170)', width / 2, 90);
  ctx.textAlign = 'left';

  let yPos = 130;

  // Appraisal details box
  ctx.strokeRect(30, yPos, width - 60, 120);
  ctx.font = 'bold 11px Arial';
  ctx.fillText('APPRAISAL SUMMARY', 40, yPos + 20);
  
  ctx.font = '10px Arial';
  ctx.fillText(`Appraisal Date: ${randomDate()}`, 40, yPos + 45);
  ctx.fillText(`Date of Valuation: ${randomDate()}`, 40, yPos + 65);
  ctx.fillText(`Purpose: Charitable donation to qualified 501(c)(3) organization`, 40, yPos + 85);
  ctx.fillText(`Type of Value: Fair Market Value`, 40, yPos + 105);

  yPos += 140;

  // Property description
  ctx.strokeRect(30, yPos, width - 60, 100);
  ctx.font = 'bold 11px Arial';
  ctx.fillText('PROPERTY DESCRIPTION', 40, yPos + 20);
  ctx.font = '10px Arial';
  const descWords = itemDescription.split(' ');
  let line = '';
  let lineY = yPos + 45;
  descWords.forEach(word => {
    if ((line + ' ' + word).length > 90) {
      ctx.fillText(line.trim(), 40, lineY);
      line = word;
      lineY += 15;
    } else {
      line += ' ' + word;
    }
  });
  if (line) ctx.fillText(line.trim(), 40, lineY);

  yPos += 120;

  // Donor information
  ctx.strokeRect(30, yPos, (width - 70) / 2, 100);
  ctx.font = 'bold 11px Arial';
  ctx.fillText('DONOR INFORMATION', 40, yPos + 20);
  ctx.font = '10px Arial';
  ctx.fillText(`Name: ${donorInfo.name}`, 40, yPos + 45);
  ctx.fillText(`Address: ${donorInfo.address}`, 40, yPos + 60);
  ctx.fillText(`${donorInfo.city}, ${donorInfo.state} ${donorInfo.zip}`, 40, yPos + 75);

  // Donee information
  ctx.strokeRect(30 + (width - 70) / 2 + 10, yPos, (width - 70) / 2, 100);
  ctx.font = 'bold 11px Arial';
  ctx.fillText('DONEE INFORMATION', 45 + (width - 70) / 2, yPos + 20);
  ctx.font = '10px Arial';
  ctx.fillText(`Name: ${orgInfo.name}`, 45 + (width - 70) / 2, yPos + 45);
  ctx.fillText(`EIN: ${orgInfo.ein}`, 45 + (width - 70) / 2, yPos + 60);
  ctx.fillText(`${orgInfo.city}, ${orgInfo.state}`, 45 + (width - 70) / 2, yPos + 75);

  yPos += 120;

  // Valuation
  ctx.strokeRect(30, yPos, width - 60, 150);
  ctx.font = 'bold 11px Arial';
  ctx.fillText('VALUATION ANALYSIS', 40, yPos + 20);
  ctx.font = '10px Arial';
  ctx.fillText(`Method of Valuation: Market Comparison Approach`, 40, yPos + 45);
  ctx.fillText(`Basis of Valuation: Comparable sales of similar items in the current market`, 40, yPos + 65);
  ctx.fillText(`Physical Condition: ${randomFrom(['Excellent', 'Good', 'Fair'])}`, 40, yPos + 85);
  ctx.fillText(`Restrictions on Property: None`, 40, yPos + 105);
  
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`APPRAISED FAIR MARKET VALUE: ${formatCurrency(amount)}`, 40, yPos + 135);

  yPos += 170;

  // Appraiser certification
  ctx.strokeRect(30, yPos, width - 60, 180);
  ctx.font = 'bold 11px Arial';
  ctx.fillText('APPRAISER CERTIFICATION', 40, yPos + 20);
  ctx.font = '9px Arial';
  const certText = [
    'I certify that, to the best of my knowledge and belief:',
    '1. The statements of fact contained in this report are true and correct.',
    '2. The reported analyses, opinions, and conclusions are limited only by the reported assumptions',
    '   and limiting conditions and are my personal, impartial, and unbiased professional analyses.',
    '3. I have no present or prospective interest in the property that is the subject of this report.',
    '4. I have no bias with respect to the property or parties involved.',
    '5. My engagement in this assignment was not contingent upon developing or reporting',
    '   predetermined results.',
    '6. My compensation for completing this assignment is not contingent upon the development',
    '   or reporting of a predetermined value or direction in value.'
  ];
  let certY = yPos + 40;
  certText.forEach(line => {
    ctx.fillText(line, 40, certY);
    certY += 13;
  });

  yPos += 200;

  // Appraiser signature
  ctx.strokeRect(30, yPos, width - 60, 80);
  ctx.font = '10px Arial';
  ctx.fillText('Appraiser:', 40, yPos + 20);
  ctx.font = 'italic 14px Arial';
  ctx.fillText(appraiserInfo.name, 120, yPos + 20);
  
  ctx.font = '10px Arial';
  ctx.fillText('License/Certification:', 40, yPos + 40);
  ctx.fillText(appraiserInfo.license, 170, yPos + 40);
  
  ctx.fillText('Address:', 40, yPos + 60);
  ctx.fillText(`${appraiserInfo.address}, ${appraiserInfo.city}, ${appraiserInfo.state} ${appraiserInfo.zip}`, 100, yPos + 60);
  
  ctx.fillText('Date:', 600, yPos + 40);
  ctx.fillText(randomDate(), 640, yPos + 40);

  // Watermark
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.font = 'bold 45px Arial';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);
  ctx.textAlign = 'center';
  ctx.fillText('SAMPLE - FOR TESTING ONLY', 0, 0);
  ctx.restore();

  return canvas;
}

/**
 * Generate Written Acknowledgment Letter (for cash donations ≥$250)
 */
function generateAcknowledgmentLetter(amount, donorInfo, orgInfo, isCash = true, itemDescription = null) {
  const width = 850;
  const height = 1100;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // White background with slight off-white for letterhead feel
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';

  // Organization letterhead
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(orgInfo.name, width / 2, 60);
  ctx.font = '11px Arial';
  ctx.fillText(orgInfo.address, width / 2, 85);
  ctx.fillText(`${orgInfo.city}, ${orgInfo.state} ${orgInfo.zip}`, width / 2, 100);
  ctx.fillText(`EIN: ${orgInfo.ein}`, width / 2, 115);
  ctx.textAlign = 'left';

  // Line under letterhead
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 135);
  ctx.lineTo(width - 100, 135);
  ctx.stroke();

  // Date
  ctx.font = '11px Arial';
  ctx.fillText(randomDate(), width - 150, 170);

  // Donor address
  let yPos = 210;
  ctx.fillText(donorInfo.name, 70, yPos);
  ctx.fillText(donorInfo.address, 70, yPos + 18);
  ctx.fillText(`${donorInfo.city}, ${donorInfo.state} ${donorInfo.zip}`, 70, yPos + 36);

  yPos += 80;

  // Salutation
  ctx.fillText(`Dear ${donorInfo.name.split(' ')[0]},`, 70, yPos);

  yPos += 30;

  // Body
  ctx.font = '11px Arial';
  const lines = [
    `Thank you for your generous ${isCash ? 'cash' : 'in-kind'} contribution to ${orgInfo.name}.`,
    '',
    'This letter serves as your official acknowledgment and receipt for tax purposes in accordance',
    'with IRS requirements under IRC Section 170(f)(8).',
    '',
    'DONATION DETAILS:',
    '',
    `Date of Contribution: ${randomDate()}`,
    `Donation Type: ${isCash ? 'Cash/Check/Credit Card' : 'Property/Goods'}`,
    isCash ? `Amount: ${formatCurrency(amount)}` : `Description: ${itemDescription}`,
    !isCash ? `Estimated Fair Market Value: ${formatCurrency(amount)}` : '',
    '',
    'IMPORTANT TAX INFORMATION:',
    '',
    `${orgInfo.name} is a tax-exempt organization under Section 501(c)(3) of the Internal`,
    'Revenue Code. Our Federal Tax ID (EIN) is listed above.',
    '',
  ];

  if (isCash) {
    lines.push(
      'No goods or services were provided in exchange for this contribution.',
      'The full amount of your donation is tax-deductible to the extent allowed by law.',
    );
  } else {
    lines.push(
      'No goods or services were provided in exchange for this contribution other than',
      'intangible religious benefits.',
      '',
      'NOTE: The IRS requires that you, the donor, determine the fair market value of non-cash',
      'donations. The value listed above is your estimate. We have not provided any goods or',
      'services in return for this donation.',
    );
  }

  lines.push(
    '',
    'We deeply appreciate your support of our mission. Your contribution makes a real difference',
    'in the communities we serve.',
    '',
    'Please retain this letter with your tax records.',
    '',
    'With sincere gratitude,',
  );

  lines.forEach(line => {
    ctx.fillText(line, 70, yPos);
    yPos += 16;
  });

  yPos += 20;

  // Signature
  ctx.font = 'italic 14px Arial';
  ctx.fillText('Development Director', 70, yPos);
  ctx.font = '11px Arial';
  ctx.fillText(orgInfo.name, 70, yPos + 20);

  // Receipt number at bottom
  yPos = height - 100;
  ctx.font = '9px Arial';
  ctx.fillStyle = '#666666';
  ctx.fillText(`Receipt #: ${randomInt(100000, 999999)}`, 70, yPos);
  ctx.fillText(`This acknowledgment satisfies IRS substantiation requirements for charitable contributions of $250 or more.`, 70, yPos + 15);

  // Watermark
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 45px Arial';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);
  ctx.textAlign = 'center';
  ctx.fillText('SAMPLE - FOR TESTING ONLY', 0, 0);
  ctx.restore();

  return canvas;
}

/**
 * Main generation function
 */
async function generateAllForms() {
  const outputDir = path.join(__dirname, '..', 'documents');
  const manifest = { documents: [], generated: new Date().toISOString() };

  console.log('Generating IRS-compliant test forms...\n');

  // 1. Form 8283 Section A (Non-cash $500-$5,000) - Generate 10
  console.log('Generating Form 8283 Section A...');
  for (let i = 1; i <= 10; i++) {
    const amount = randomInt(500, 5000);
    const donor = randomFrom(DONORS);
    const org = randomFrom(ORGANIZATIONS);
    const item = randomFrom(NON_CASH_ITEMS);
    const quality = randomFrom(['high', 'medium', 'low']);
    
    const canvas = generateForm8283('A', amount, item.description, donor, org);
    const filename = `form_8283/form_8283_section_a_${quality}_${String(i).padStart(3, '0')}.png`;
    const filePath = path.join(outputDir, filename);
    
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);
    
    manifest.documents.push({
      filename,
      documentType: 'form_8283_section_a',
      quality,
      synthetic: true,
      expectedFields: {
        form_type: '8283',
        section: 'A',
        donor_name: donor.name,
        organization_name: org.name,
        ein: org.ein,
        amount: amount,
        description: item.description
      }
    });
  }
  console.log('  ✓ 10 Form 8283 Section A documents');

  // 2. Form 8283 Section B (Non-cash >$5,000) - Generate 10
  console.log('Generating Form 8283 Section B with appraisals...');
  for (let i = 1; i <= 10; i++) {
    const amount = randomInt(5001, 50000);
    const donor = randomFrom(DONORS);
    const org = randomFrom(ORGANIZATIONS);
    const item = randomFrom(NON_CASH_ITEMS);
    const appraiser = randomFrom(APPRAISERS);
    const quality = randomFrom(['high', 'medium', 'low']);
    
    // Form 8283 Section B
    const canvas8283 = generateForm8283('B', amount, item.description, donor, org, appraiser);
    const filename8283 = `form_8283/form_8283_section_b_${quality}_${String(i).padStart(3, '0')}.png`;
    fs.writeFileSync(path.join(outputDir, filename8283), canvas8283.toBuffer('image/png'));
    
    manifest.documents.push({
      filename: filename8283,
      documentType: 'form_8283_section_b',
      quality,
      synthetic: true,
      expectedFields: {
        form_type: '8283',
        section: 'B',
        donor_name: donor.name,
        organization_name: org.name,
        ein: org.ein,
        amount: amount,
        description: item.description,
        appraiser_name: appraiser.name,
        appraiser_license: appraiser.license
      }
    });

    // Corresponding Appraisal
    const canvasAppraisal = generateAppraisal(item.description, amount, donor, org, appraiser);
    const filenameAppraisal = `appraisals/appraisal_${quality}_${String(i).padStart(3, '0')}.png`;
    fs.writeFileSync(path.join(outputDir, filenameAppraisal), canvasAppraisal.toBuffer('image/png'));
    
    manifest.documents.push({
      filename: filenameAppraisal,
      documentType: 'qualified_appraisal',
      quality,
      synthetic: true,
      relatedForm: filename8283,
      expectedFields: {
        donor_name: donor.name,
        organization_name: org.name,
        ein: org.ein,
        appraised_value: amount,
        description: item.description,
        appraiser_name: appraiser.name,
        appraiser_license: appraiser.license
      }
    });
  }
  console.log('  ✓ 10 Form 8283 Section B documents');
  console.log('  ✓ 10 Qualified Appraisal documents');

  // 3. Form 1098-C (Vehicles >$500) - Generate 10
  console.log('Generating Form 1098-C for vehicles...');
  for (let i = 1; i <= 10; i++) {
    const amount = randomInt(501, 25000);
    const donor = randomFrom(DONORS);
    const org = randomFrom(ORGANIZATIONS);
    const vehicle = randomFrom(VEHICLE_TYPES);
    const quality = randomFrom(['high', 'medium', 'low']);
    
    const canvas = generateForm1098C(vehicle, amount, donor, org);
    const filename = `form_1098c/form_1098c_${quality}_${String(i).padStart(3, '0')}.png`;
    
    fs.mkdirSync(path.join(outputDir, 'form_1098c'), { recursive: true });
    fs.writeFileSync(path.join(outputDir, filename), canvas.toBuffer('image/png'));
    
    manifest.documents.push({
      filename,
      documentType: 'form_1098c',
      quality,
      synthetic: true,
      expectedFields: {
        form_type: '1098-C',
        donor_name: donor.name,
        organization_name: org.name,
        ein: org.ein,
        gross_proceeds: amount,
        vehicle_year: vehicle.year,
        vehicle_make: vehicle.make,
        vehicle_model: vehicle.model,
        vin: vehicle.vin
      }
    });
  }
  console.log('  ✓ 10 Form 1098-C documents');

  // 4. Written Acknowledgment Letters (Cash ≥$250) - Generate 15
  console.log('Generating Written Acknowledgment Letters (cash)...');
  for (let i = 1; i <= 15; i++) {
    const amount = randomInt(250, 10000);
    const donor = randomFrom(DONORS);
    const org = randomFrom(ORGANIZATIONS);
    const quality = randomFrom(['high', 'medium', 'low']);
    
    const canvas = generateAcknowledgmentLetter(amount, donor, org, true);
    const filename = `acknowledgment_letters/ack_cash_${quality}_${String(i).padStart(3, '0')}.png`;
    fs.writeFileSync(path.join(outputDir, filename), canvas.toBuffer('image/png'));
    
    manifest.documents.push({
      filename,
      documentType: 'acknowledgment_letter_cash',
      quality,
      synthetic: true,
      expectedFields: {
        donor_name: donor.name,
        organization_name: org.name,
        ein: org.ein,
        amount: amount,
        donation_type: 'cash',
        goods_services_provided: false
      }
    });
  }
  console.log('  ✓ 15 Written Acknowledgment Letters (cash)');

  // 5. Written Acknowledgment Letters (Non-cash) - Generate 10
  console.log('Generating Written Acknowledgment Letters (non-cash)...');
  for (let i = 1; i <= 10; i++) {
    const amount = randomInt(250, 4999);
    const donor = randomFrom(DONORS);
    const org = randomFrom(ORGANIZATIONS);
    const item = randomFrom(NON_CASH_ITEMS);
    const quality = randomFrom(['high', 'medium', 'low']);
    
    const canvas = generateAcknowledgmentLetter(amount, donor, org, false, item.description);
    const filename = `acknowledgment_letters/ack_noncash_${quality}_${String(i).padStart(3, '0')}.png`;
    fs.writeFileSync(path.join(outputDir, filename), canvas.toBuffer('image/png'));
    
    manifest.documents.push({
      filename,
      documentType: 'acknowledgment_letter_noncash',
      quality,
      synthetic: true,
      expectedFields: {
        donor_name: donor.name,
        organization_name: org.name,
        ein: org.ein,
        estimated_value: amount,
        donation_type: 'property',
        description: item.description,
        goods_services_provided: false
      }
    });
  }
  console.log('  ✓ 10 Written Acknowledgment Letters (non-cash)');

  // Update manifest
  const manifestPath = path.join(__dirname, '..', 'manifest_irs_forms.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\n=== GENERATION COMPLETE ===');
  console.log(`Total IRS forms generated: ${manifest.documents.length}`);
  console.log(`Manifest saved to: manifest_irs_forms.json`);
}

// Run if called directly
if (require.main === module) {
  generateAllForms().catch(console.error);
}

module.exports = { generateForm8283, generateForm1098C, generateAppraisal, generateAcknowledgmentLetter };
