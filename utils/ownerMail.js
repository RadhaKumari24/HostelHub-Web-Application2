const { sendMail } = require("./mailer");

exports.sendOwnerBookingNotification = async ({
  ownerEmail,
  ownerName,
  studentName,
  studentEmail,
  contactNumber,
  hostel,
  booking
}) => {
  const moveInDate = booking.moveInDate
    ? new Date(booking.moveInDate).toLocaleDateString("en-IN")
    : "Not Provided";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
      <h2 style="color:#2563eb;">📢 New Booking Received</h2>

      <p>Hello <strong>${ownerName}</strong>,</p>

      <p>A student has successfully booked your hostel.</p>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td><strong>Student Name</strong></td>
          <td>${studentName}</td>
        </tr>

        <tr>
          <td><strong>Student Email</strong></td>
          <td>${studentEmail}</td>
        </tr>

        <tr>
          <td><strong>Student Contact</strong></td>
          <td>${contactNumber}</td>
        </tr>

        <tr>
          <td><strong>Hostel</strong></td>
          <td>${hostel.name}</td>
        </tr>

        <tr>
          <td><strong>Move-in Date</strong></td>
          <td>${moveInDate}</td>
        </tr>

        <tr>
          <td><strong>Amount </strong></td>
          <td>₹${booking.amount}</td>
        </tr>
      </table>

      <br>

      <p>Please check your Owner Dashboard for complete booking details.</p>

      <p>Regards,<br><b>HostelHub Team</b></p>
    </div>
  `;

  await sendMail({
    to: ownerEmail,
    subject: "📢 New Hostel Booking Received",
    html
  });
};