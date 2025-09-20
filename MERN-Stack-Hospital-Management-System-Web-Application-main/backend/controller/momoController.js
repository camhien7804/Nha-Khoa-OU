import crypto from "crypto";
import https from "https";
import Appointment from "../models/appointment.js";

const partnerCode = process.env.MOMO_PARTNER_CODE;
const accessKey = process.env.MOMO_ACCESS_KEY;
const secretKey = process.env.MOMO_SECRET_KEY;
const redirectUrl = process.env.MOMO_REDIRECT_URL;
const ipnUrl = process.env.MOMO_IPN_URL;

const momoRequestTypes = {
  momo: "captureWallet",
  atm: "payWithATM",
  cc: "payWithCC",
  vts: "payWithVTS",
};

export const createMoMoPayment = async (req, res) => {
  try {
    const { appointmentId, paymentMethod } = req.body;
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // ✅ Lấy giá đã lưu sẵn trong appointment
    let amount = appointment.servicePrice || 50000;

    const orderId = `${appointmentId}_${Date.now()}`;
    const requestId = orderId;
    const orderInfo = `Thanh toán lịch hẹn #${appointmentId}`;
    const requestType = momoRequestTypes[paymentMethod] || "captureWallet";
    const extraData = "";

    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

    const requestBody = JSON.stringify({
      partnerCode,
      accessKey,
      requestId,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      amount: String(amount),
      requestType,
      extraData,
      signature,
      lang: "vi",
    });

    const options = {
      hostname: "test-payment.momo.vn",
      port: 443,
      path: "/v2/gateway/api/create",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    const momoReq = https.request(options, (momoRes) => {
      let data = "";
      momoRes.on("data", (chunk) => {
        data += chunk;
      });
      momoRes.on("end", () => {
        const response = JSON.parse(data);
        return res.json({ success: true, payUrl: response.payUrl, amount });
      });
    });

    momoReq.on("error", (e) => {
      console.error("MoMo request error:", e);
      res.status(500).json({ success: false, message: "MoMo request failed" });
    });

    momoReq.write(requestBody);
    momoReq.end();
  } catch (err) {
    console.error("MoMo create error:", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
};

export const momoIPN = async (req, res) => {
  try {
    const { orderId, resultCode } = req.body;
    if (resultCode === 0) {
      const appointmentId = orderId.split("_")[0];
      await Appointment.findByIdAndUpdate(appointmentId, { paymentStatus: "paid" });
      return res.json({ success: true, message: "Payment confirmed" });
    }
    res.json({ success: false, message: "Payment failed" });
  } catch (err) {
    console.error("MoMo IPN error:", err);
    res.status(500).json({ success: false });
  }
};
