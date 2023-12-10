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
    const centerX = (doc.internal.pageSize.getWidth() - logoWidth) / 2;

    doc.addImage(imageData, "PNG", centerX, 10, logoWidth, logoHeight, "FAST");
    const textCompanyName = "The Furrst Love - Dattaram Gawde";
    const textCompanyAddress =
      "7 Rue Jean-Pierre Bierman, Valerie 4, Luxembourg/Cents, L-1268, Luxembourg";
    const textContactNumber = "Phone: +352 691971 959 / +352 691 123 253";
    const textEmail = "Email: info@thefurrstlove.com";

    const textWidthCompanyName =
      (doc.getStringUnitWidth(textCompanyName) * fontSize) /
      doc.internal.scaleFactor;
    const textXCompanyName =
      (doc.internal.pageSize.getWidth() - textWidthCompanyName) / 2;

    const textWidthCompanyAddress =
      (doc.getStringUnitWidth(textCompanyAddress) * fontSize) /
      doc.internal.scaleFactor;
    const textXCompanyAddress =
      (doc.internal.pageSize.getWidth() - textWidthCompanyAddress) / 2;

    const textWidthContactNumber =
      (doc.getStringUnitWidth(textContactNumber) * fontSize) /
      doc.internal.scaleFactor;
    const textXContactNumber =
      (doc.internal.pageSize.getWidth() - textWidthContactNumber) / 2;

    const textWidthEmail =
      (doc.getStringUnitWidth(textEmail) * fontSize) / doc.internal.scaleFactor;
    const textXEmail = (doc.internal.pageSize.getWidth() - textWidthEmail) / 2;

    doc.setFontSize(fontSize);
    doc.text(textCompanyName, textXCompanyName, 50);
    doc.text(textCompanyAddress, textXCompanyAddress, 55);
    doc.text(textContactNumber, textXContactNumber, 60);
    doc.text(textEmail, textXEmail, 65);

    // Calculate the width of the text
    doc.setFont("helvetica", "bold");
    const fontSizeInvoice = 18;
    const textInvoice = "Invoice";
    const textWidthInvoice =
      (doc.getStringUnitWidth(textInvoice) * fontSizeInvoice) /
      doc.internal.scaleFactor;
    const textX = (doc.internal.pageSize.getWidth() - textWidthInvoice) / 2;
    doc.setFontSize(fontSizeInvoice);
    doc.text(textInvoice, textX, 75);

    // Add the centered text to the PDF
    doc.setFontSize(fontSize);
    // Add content to the PDF
    // Left-align outward number
    doc.setFont("helvetica", "bold");
    doc.text(15, 85, `Customer Details`);
    doc.setFont("helvetica", "normal");
    doc.text(15, 90, order.shippingInfo.name);
    doc.text(15, 95, order.shippingInfo.contact);
    doc.text(15, 100, order.shippingInfo.email);

    // Right-align date
    const margin = 15;
    const date = moment(order.createdAt).format('DD/MM/YYYY'); 
    const invoiceDateX =
      pageWidth -
      (doc.getStringUnitWidth(`Invoice Date: ${date}`) * fontSize) /
        doc.internal.scaleFactor -
      margin;
    doc.text(invoiceDateX, 85, `Invoice Date: ${date}`);

    doc.setFont("helvetica", "bold");
    doc.text(15, 110, `Shipping Details`);
    doc.setFont("helvetica", "normal");
    doc.text(15, 115, order.shippingInfo.name);
    doc.text(15, 120, order.shippingInfo.contact);
    doc.text(15, 125, order.shippingInfo.houseInfo);
    doc.text(15, 130, order.shippingInfo.streetName);
    doc.text(15, 135, order.shippingInfo.city);
    doc.text(15, 140, order.shippingInfo.state);
    doc.text(15, 145, order.shippingInfo.country);
    doc.text(15, 150, order.shippingInfo.pincode);

    doc.setFont("helvetica", "bold");
    doc.text(15, 160, `Order Number`);
    doc.setFont("helvetica", "normal");
    doc.text(15, 165, order.receipt);

    doc.setFont("helvetica", "bold");
    doc.text(15, 175, `Product Details`);

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
      startY: 180,
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
