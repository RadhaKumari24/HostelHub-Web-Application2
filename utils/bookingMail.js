const { sendMail } = require("./mailer");

exports.sendBookingConfirmationEmail = async ({
  studentEmail,
  studentName,
  hostelName,
  location,
  amount,
  bookingDate
}) => {
  await sendMail({
    to: studentEmail,
    subject: "🎉 Hostel Booking Confirmed - HostelHub",

    text: `
Hello ${studentName},

Your hostel booking has been confirmed.

Hostel: ${hostelName}
Location: ${location}
Amount Paid: ₹${amount}
Booking Date: ${bookingDate}

Thank you for choosing HostelHub.
`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width:600px;">
        <h2 style="color:#2563eb;">
          🎉 Booking Confirmed
        </h2>

        <p>Hello <strong>${studentName}</strong>,</p>

        <p>
          Your hostel booking has been successfully confirmed.
        </p>

        <table style="border-collapse:collapse;">
          <tr>
            <td><strong>Hostel:</strong></td>
            <td>${hostelName}</td>
          </tr>

          <tr>
            <td><strong>Location:</strong></td>
            <td>${location}</td>
          </tr>

          <tr>
            <td><strong>Amount Paid:</strong></td>
            <td>₹${amount}</td>
          </tr>

          <tr>
            <td><strong>Date:</strong></td>
            <td>${bookingDate}</td>
          </tr>
        </table>

        <br>

        <p>
          We wish you a comfortable stay.
        </p>

        <p>
          <strong>HostelHub Team</strong>
        </p>
      </div>
    `
  });
};