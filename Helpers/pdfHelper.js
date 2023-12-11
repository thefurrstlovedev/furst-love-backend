const { jsPDF } = require("jspdf");
const { Resend } = require("resend");
const Order = require("../Models/OrderModel");
const resend = new Resend(process.env.RESEND_API_KEY);
const fs = require("fs");
const ftp = require("basic-ftp");
const moment = require("moment")
require("jspdf-autotable");
module.exports = {
  generateInvoice: async (receipt) => {
    const order = await Order.findOne({ receipt: receipt })
      .populate("orderItems.product", "name")
      .lean();
    const imageData = fs.readFileSync(
      "./public/furrst_love_logo_round.png",
      "base64url"
    );

    const doc = new jsPDF("p", "", "a4", true);
    const pageWidth = doc.internal.pageSize.getWidth();
    const fontSize = 11;
    const logoWidth = 30;
    const logoHeight = 30;
    // const centerX = (doc.internal.pageSize.getWidth() - logoWidth) / 2;

    doc.addImage(imageData, "PNG", 15, 10, logoWidth, logoHeight, "FAST");

    const textAuthorizationNo = 'Authorization No.: 10155601/0';
    
    doc.setFontSize(fontSize);  
    doc.setFont('helvetica', 'bold');
    doc.text(textAuthorizationNo, 15, 50);

    // Calculate the width of the text
    doc.setFont("helvetica", "bold");
    const fontSizeInvoice = 28;
    const textInvoiceMargin = 15;
    const textInvoice = "Invoice";
    const textWidthInvoice = pageWidth - doc.getStringUnitWidth(textInvoice) * fontSizeInvoice / doc.internal.scaleFactor - textInvoiceMargin;
    // Set the text color before drawing the text
    doc.setTextColor(235, 69, 151); // RGB color, e.g., red
    doc.setFontSize(fontSizeInvoice);
    doc.text(textWidthInvoice, 30, `Invoice`);

    // Reset the text color to default (black) if needed
    doc.setTextColor(0, 0, 0); // Reset to black

    // Add the centered text to the PDF
    doc.setFontSize(fontSize);

    doc.setFont('helvetica', 'normal');
    // Right-align date
    const margin = 15;
    const date = moment(order.createdAt).format('DD/MM/YYYY'); 
    const invoiceDateX = pageWidth - doc.getStringUnitWidth(`Invoice Date: ${date}`) * fontSize / doc.internal.scaleFactor  - margin;
    doc.text(invoiceDateX, 50, `Invoice Date: ${date}`);

    // Add a horizontal line
    const lineY = 55; // Adjust the Y-coordinate as needed
    doc.setLineWidth(0.2); // Set line width
    doc.line(15, lineY, pageWidth - 15, lineY); // Draw the line
    
    // Add content to the PDF
    const billFromX = 15;
    doc.setFont('helvetica', 'bold');
    doc.text(billFromX, 65, `Bill From:`);
    doc.setFont('helvetica', 'normal');
    doc.text(billFromX, 70, `Dattaram Gawde (Proprietor)`);
    doc.text(billFromX, 75, `The Furrst Love`);
    doc.text(billFromX, 80, `7 Rue Jean-Pierre Bierman, Cents,`);
    doc.text(billFromX, 85, `L-1268, Luxembourg`);
    doc.text(billFromX, 90, `+352 691 371 959`);
    doc.text(billFromX, 95, `info@thefurrstlove.com`);

    // Calculate the width of the "Bill From" section
    const billFromWidth = doc.getStringUnitWidth("Bill From:") * fontSize / doc.internal.scaleFactor;
    // Move "Bill To" section to the right side of "Bill From" section
    const billToX = billFromX + billFromWidth + 70; // Adjust the value based on your layout

    doc.setFont('helvetica', 'bold');
    doc.text(billToX, 65, `Bill To:`);
    doc.setFont('helvetica', 'normal');
    doc.text(billToX, 70, order.shippingInfo.name);
    doc.text(billToX, 75, order.shippingInfo.contact);
    doc.text(billToX, 80, order.shippingInfo.email);
    doc.text(billToX, 85, order.shippingInfo.houseInfo);
    doc.text(billToX, 90, order.shippingInfo.streetName);
    doc.text(billToX, 95, order.shippingInfo.city);
    doc.text(billToX, 100, order.shippingInfo.state);
    doc.text(billToX, 105, order.shippingInfo.country);
    doc.text(billToX, 110, order.shippingInfo.pincode);


    doc.setFont("helvetica", "bold");
    doc.text(15, 125, `Order Number`);
    doc.setFont("helvetica", "normal");
    doc.text(15, 130, order.receipt);

    doc.setFont("helvetica", "bold");
    doc.text(15, 140, `Product Details`);

    // Define the columns for the table
    const columns = [
      { header: "Sr. No.", dataKey: "sr_no" },
      { header: "Product Name", dataKey: "productName" },
      { header: "Quantity", dataKey: "quantity" },
      { header: "Size", dataKey: "size" },
      { header: "Color", dataKey: "color" },
      { header: "Total", dataKey: "total" },
    ];

    let products = [];
    let index = 1;
    order.orderItems.forEach((element) => {
      products.push({
        sr_no: index,
        productName: element.product.name,
        quantity: element.quantity,
        size: element.size,
        color: element.color,
        total: element.itemTotalAmount,
      });
    });

    // Generate the table using jspdf-autotable
    const productsTable = doc.autoTable({
      head: [columns.map((column) => column.header)],
      body: [
        ...products.map((product) =>
          columns.map((column) => product[column.dataKey])
        ),
      ], // Ensure products data is correctly formatted
      startY: 145,
      theme: "plain", // Use a plain theme (no borders)
      styles: {
        fontSize: 10,
        fontStyle: "normal",
        lineColor: [0, 0, 0], // Black color for the table border
        lineWidth: 0.2, // Width of the table lines
      },
      headStyles: {
        fillColor: [200, 200, 200], // Gray color for the header background
        textColor: [0, 0, 0], // Black color for header text
        fontStyle: "bold", // Make headers bold
        halign: "center", // Center align headers
      },
      columnStyles: {
        0: { cellWidth: 15 }, // Set the width for the first column
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
      },
    });

    const subTotal = order.orderOriginalAmount;
    const couponCode = order.couponId;
    const couponDiscount = order.orderDiscountAmount;
    const vatRate = order.taxRate;
    const taxAmount = order.taxAmount;
    const shippingCharges = order.shippingCharges;
    const totalPayableAmount = order.totalPayable;

    const finalValuesTable = [
      ["Sub-Total", "€ " + subTotal],
      ["Coupon Code" + " (" + couponCode + ")", "- € " + couponDiscount],
      [`VAT (${vatRate}%)`, "+ € " + taxAmount],
      ["Shipping Charges", "+ € " + shippingCharges],
      ["Total Payable Amount", "€ " + totalPayableAmount],
    ];

    const StartYFinalValuesTable = productsTable.lastAutoTable.finalY + 5;
    // console.log(finalValuesTableStartY);

  doc.autoTable({
      body: finalValuesTable, // Ensure products data is correctly formatted
      startY: StartYFinalValuesTable,
      theme: "plain", // Use a plain theme (no borders)
      styles: {
        fontSize: 10,
        fontStyle: "normal",
        lineColor: [0, 0, 0], // Black color for the table border
        lineWidth: 0.2, // Width of the table lines
      },
    });

  const termsAndConditionsFontSize = 8;
  const rightMargin = 15;

  const textTermsAndConditions = `Terms & Conditions:
  \nCompany Details:
  \nThe Furrst Love is a commercial name of the company owned by Dattaram Gawde – The Furrst Love having its registered office at 7 Rue Jean Pierre Biermann in Luxembourg. Authorization No.: 10155601/0
  \nUse of Personal Data:
  \nThe Furrst Love use your personal information to provide our service to you, which includes: offering products for sale, processing payments, shipping and fulfilment of your order, keeping you up to date on new products, services and offers. When you place an order through our Website/Email, you agree to provide us with your email address, postal address, and/or other contact details truthfully and exactly. You also agree that we may use this information to contact you in the context of your order if it is necessary. We respect your right to privacy.
  \nCancellation and Refund Policy:
  \nReturns:
  \nDue to the custom nature of all of the products we produce at The Furrst Love, we are unable to offer returns.
  \nCancellation:
  \nOnce The Furrst Love has e-mailed the order confirmation to the customer and “art-work” has been approved by the customer, no further amendment to the products ordered can be requested. If, exceptionally, The Furrst Love should agree to such an amendment after sending the order confirmation, a new order - cancelling the previous one - shall need to be placed by the customer.
  \nThe Furrst Love shall be entitled to claim reimbursement from the customer for the expenses incurred as a result of the cancellation of the original order, amounting to 20% of the order total.
  \nThe Furrst Love reserves the right to refuse or cancel any order or delivery in the event of:
  \nI. Total or partial non-payment by the customer of a previous order (even if the new order is paid for by credit card or bank transfer)
  \nII. Dispute between the customer and The Furrst Love
  \nIII. Refusal of the credit card payment by the banking institutions. In this event, The Furrst Love cannot under any circumstance be held liable.
  \nComplaints:
  \nAny complaint concerning the goods and work carried out by The Furrst Love must reach us by registered letter within 7 working days following their reception or via email info@thefurrstlove.com.
  \nDelivery:
  \nThe delivery date is given as an indication. The transport costs are chargeable to the customer, except if contrary mention on the order form.
  \nColors and Size:
  \nThe colors of the projects are given as an indication and we cannot guarantee an absolute similarity of the execution, although we always try to get as close as possible. Due to the customized nature of the products, size once selected by the customer, cannot be modified.
  \nCopyright Infringement:
  \nOur customers are supposed to have the right to reproduce documents, logos, images of persons. The Furrst Love explicitly refuses any responsibility towards possible third parties having right in case of reproduction or illicit diffusion. This concerns in particular the laws of copyright, the protection of industrial secret.`;


  doc.setFont('helvetica', 'normal');
  doc.setFontSize(termsAndConditionsFontSize);

  // doc.text(textTermsAndConditions, 15, startYTermsAndConditions, );

  // Combine all terms and conditions into a single string
  // const allTermsAndConditionsText = `${textTermsAndConditions}`;
  const textWidth = doc.getStringUnitWidth(textTermsAndConditions) * termsAndConditionsFontSize;

  // Check if the content fits on the current page, otherwise add a new page
  if (doc.internal.pageSize.width - textWidth < 15) {
    doc.addPage();
  }

  // Add the terms and conditions to the PDF
  doc.text(15, 20, textTermsAndConditions, { maxWidth: doc.internal.pageSize.width - 15 - rightMargin });
    


    // Add a footer with the current date
    const footerText = "*** This is computer generated invoice. ***";
    const footerFontSize = 10;

    // Calculate the width of the text
    const textWidthFooterText =
      (doc.getStringUnitWidth(footerText) * footerFontSize) /
      doc.internal.scaleFactor;

    // Calculate the center coordinates for the text
    const textXFooterText =
      (doc.internal.pageSize.getWidth() - textWidthFooterText) / 2;
    const textYFooterText = doc.internal.pageSize.getHeight() - 20; // Adjust the vertical position as needed

    doc.setFont("helvetica", "normal");
    // Set font size for the footer text
    doc.setFontSize(footerFontSize);

    // Add the footer text to the PDF
    doc.text(footerText, textXFooterText, textYFooterText);
    doc.save(`./public/${order.receipt}.pdf`);
    return {
      path: `./public/${order.receipt}.pdf`,
      orderId: order.receipt,
      email: order.shippingInfo.email,
      customerName: order.shippingInfo.name,
    };
  },
  sendInvoice: async (path, orderId, email, customerName) => {
    const client = new ftp.Client();

    try {
      // Connect to GoDaddy FTP server
      await client.access({
        host: process.env.FTP_HOST, // Replace with your GoDaddy FTP hostname
        user: process.env.FTP_USER,
        password: process.env.FTP_KEY,

        secure: false, // Change to true if your server requires secure connection (FTP over TLS)
      });

      // Upload the PDF file
      const data = await client.uploadFrom(path, `/invoices/${orderId}.pdf`);
      const mailData = await resend.emails.send({
        from: "no-reply@transactional.thefurrstlove.com",
        to: [email],
        subject: `${orderId} Invoice`,
        html: `<!DOCTYPE html>
          <html xmlns="http://www.w3.org/1999/xhtml">
          
          <head>
            <title></title>
            <!--[if !mso]><!-- -->
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <!--<![endif]-->
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style type="text/css">
              #outlook a {
                padding: 0;
              }
          
              .ReadMsgBody {
                width: 100%;
              }
          
              .ExternalClass {
                width: 100%;
              }
          
              .ExternalClass * {
                line-height: 100%;
              }
          
              body {
                margin: 0;
                padding: 0;
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
              }
          
              table,
              td {
                border-collapse: collapse;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
              }
          
            </style>
            <!--[if !mso]><!-->
            <style type="text/css">
              @media only screen and (max-width:480px) {
                @-ms-viewport {
                  width: 320px;
                }
                @viewport {
                  width: 320px;
                }
              }
            </style>
            <!--<![endif]-->
            <!--[if mso]><xml>  <o:OfficeDocumentSettings>    <o:AllowPNG/>    <o:PixelsPerInch>96</o:PixelsPerInch>  </o:OfficeDocumentSettings></xml><![endif]-->
            <!--[if lte mso 11]><style type="text/css">  .outlook-group-fix {    width:100% !important;  }</style><![endif]-->
            <!--[if !mso]><!-->
            <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" type="text/css">
            <style type="text/css">
              @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap');
            </style>
            <!--<![endif]-->
            <style type="text/css">
              @media only screen and (max-width:595px) {
                .container {
                  width: 100% !important;
                }
                .button {
                  display: block !important;
                  width: auto !important;
                }
              }
            </style>
          </head>
          
          <body style="font-family: 'Inter', sans-serif; background: #E5E5E5;">
            <table width="100%" cellspacing="0" cellpadding="0" border="0" align="center" bgcolor="#F6FAFB">
              <tbody>
                <tr>
                  <td valign="top" align="center">
                    <table class="container" width="600" cellspacing="0" cellpadding="0" border="0">
                      <tbody>
                        <tr>
                          <td style="padding:48px 0 30px 0; text-align: center; font-size: 14px; color: #4C83EE;">
                            <img src="https://mailsend-email-assets.mailtrap.io/xmc1j14ju90kh7lh1ndxkmriihd1.png" style="height: 100px;" alt="" class="img-fluid">
                          </td>
                        </tr>
                        <tr>
                          <td class="main-content" style="padding: 48px 30px 40px; color: #000000;" bgcolor="#ffffff">
                            <table width="100%" cellspacing="0" cellpadding="0" border="0">
                              <tbody>
                                <tr>
                                  <td style="padding: 0 0 24px 0; font-size: 18px; line-height: 150%; font-weight: bold; color: #000000; letter-spacing: 0.01em;">
                                    Thank you for your order!
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 0 0 10px 0; font-size: 14px; line-height: 150%; font-weight: 400; color: #000000; letter-spacing: 0.01em;">
                                    Order Confirmation
                                  </td>
                                </tr>
                                
                                
                                <tr>
                                  <td style="padding: 0 0 10px 0; font-size: 14px; line-height: 150%; font-weight: 400; color: #000000; letter-spacing: 0.01em;">
                                    ${customerName}, Thank you for your order!
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 0 0 60px 0; font-size: 14px; line-height: 150%; font-weight: 400; color: #000000; letter-spacing: 0.01em;">
                                    We've received your order. You can find your purchase invoice copy below.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 0 0 16px;">
                                    <span style="display: block; width: 117px; border-bottom: 1px solid #8B949F;"></span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="font-size: 14px; line-height: 170%; font-weight: 400; color: #000000; letter-spacing: 0.01em;">
                                    Best regards, <br><strong>The Furrst Love</strong>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 24px 0 48px; font-size: 0px;">
                            <!--[if mso | IE]>      <table role="presentation" border="0" cellpadding="0" cellspacing="0">        <tr>          <td style="vertical-align:top;width:300px;">      <![endif]-->
                            <div class="outlook-group-fix" style="padding: 0 0 20px 0; vertical-align: top; display: inline-block; text-align: center; width:100%;">
                              <span style="padding: 0; font-size: 11px; line-height: 15px; font-weight: normal; color: #8B949F;"><strong>Dattaram Gawde - The Furrst Love</strong><br/>7 Rue Jean-Pierre Bierman , Valerie 4, 1268, Luxembourg
                              </div>
                            </div>
                            <!--[if mso | IE]>      </td></tr></table>      <![endif]-->
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </body>
          </html>`,
        attachments: [
          {
            path: `https://thefurrstlove.com/thefurrstlove.com/backendserver/invoices/${orderId}.pdf`,
            filename: `${orderId}.pdf`,
          },
        ],
      });
      console.log(mailData);
    } catch (error) {
      console.log(error);
      console.error("Error uploading file:", error.message);
    } finally {
      fs.unlinkSync(path);
      client.close();
    }
  },
};
