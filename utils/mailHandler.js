const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 25,
  secure: false, // Use true for port 465, false for port 587
  auth: {
    user: "",
    pass: "",
  },
});

module.exports = {
  sendMail: async (to, url) => {
    const info = await transporter.sendMail({
      from: "admin@haha.com",
      to: to,
      subject: "RESET PASSWORD REQUEST",
      text: "lick vo day de doi pass", // Plain-text version of the message
      html: "lick vo <a href=" + url + ">day</a> de doi pass", // HTML version of the message
    });

    console.log("Message sent:", info.messageId);
  },
  sendPasswordMail: async (to, password) => {
    const info = await transporter.sendMail({
      from: "admin@haha.com",
      to: to,
      subject: "Tài khoản của bạn đã được tạo",
      text: `Chào bạn, tài khoản của bạn đã được tạo thành công. Mật khẩu của bạn là: ${password}`, // Plain-text version
      html: `<p>Chào bạn, tài khoản của bạn đã được tạo thành công.</p><p>Mật khẩu đăng nhập của bạn là: <strong style="color: blue;">${password}</strong></p>`, // HTML version
    });

    console.log("Password email sent:", info.messageId);
  },
};
