const { sendMail } = require("./mailer");

exports.sendBookingConfirmationEmail = async ({
  studentName,
  studentEmail,
  hostel,
  booking
}) => {
  const moveInDate = booking.moveInDate
    ? new Date(booking.moveInDate).toLocaleDateString("en-IN")
    : "Not Provided";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
      <h2 style="color:#2563eb;">🎉 Booking Confirmed</h2>

      <p>Hello <strong>${studentName}</strong>,</p>

      <p>Your hostel booking has been confirmed successfully.</p>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td><strong>Hostel</strong></td>
          <td>${hostel.name}</td>
        </tr>

        <tr>
          <td><strong>City</strong></td>
          <td>${hostel.city}</td>
        </tr>

        <tr>
          <td><strong>Area</strong></td>
          <td>${hostel.street}</td>
        </tr>

        <tr>
          <td><strong>Location</strong></td>
          <td>${hostel.location}</td>
        </tr>

        <tr>
          <td><strong>Move-in Date</strong></td>
          <td>${moveInDate}</td>
        </tr>

        <tr>
          <td><strong>Sharing</strong></td>
          <td>${hostel.sharingType}</td>
        </tr>

        <tr>
          <td><strong>Amount Paid</strong></td>
          <td>₹${booking.amount}</td>
        </tr>

        <tr>
          <td><strong>Owner Contact</strong></td>
          <td>${hostel.contactNumber}</td>
        </tr>

        <tr>
          <td><strong>Booking Status</strong></td>
          <td>${booking.bookingStatus}</td>
        </tr>

        <tr>
          <td><strong>Payment Status</strong></td>
          <td>${booking.paymentStatus}</td>
        </tr>
      </table>

      <br>

      <p>Thank you for choosing <b>HostelHub</b>.</p>

      <p>Regards,<br><b>HostelHub Team</b></p>
    </div>
  `;

  await sendMail({
    to: studentEmail,
    subject: "🎉 Your Hostel Booking is Confirmed",
    html
  });
};