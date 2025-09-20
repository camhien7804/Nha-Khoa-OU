// controller/appointmentController.js
import fs from "fs";
import path from "path";
import Appointment from "../models/appointment.js";
import PatientProfile from "../models/PatientProfile.js";
import DentistProfile from "../models/DentistProfile.js";
import Service from "../models/Service.js";
import { sendMail } from "../utils/mailer.js";
import { generateInvoice } from "../utils/invoice.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Helpers
const pad = (n) => String(n).padStart(2, "0");
const toTimeSlot = (s, e) =>
  `${pad(s.getHours())}:${pad(s.getMinutes())} - ${pad(e.getHours())}:${pad(
    e.getMinutes()
  )}`;

// Populate configs
const POPULATE_PATIENT = {
  path: "patient",
  select: "phone user",
  populate: { path: "user", select: "name email" },
};
const POPULATE_DENTIST = {
  path: "dentist",
  select: "specialization user",
  populate: { path: "user", select: "name email" },
};
const POPULATE_SERVICE = {
  path: "serviceId",
  select: "name minPrice maxPrice durationMins discountPercent",
};

export const appendAppointmentHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const appt = await Appointment.findById(id);
    if (!appt) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // Lấy dữ liệu từ nhiều khả năng FE gửi
    const treatment = {
      diagnosis: req.body?.diagnosis || req.body?.result || req.body?.treatment?.diagnosis || "",
      procedures: req.body?.procedures || req.body?.servicesPerformed || req.body?.treatment?.procedures || [],
      medicines: req.body?.medicines || req.body?.drugs || req.body?.prescriptions || req.body?.treatment?.medicines || [],
      notes: req.body?.treatmentNotes || req.body?.note || req.body?.treatment?.notes || "",
      attachments: req.body?.attachments || req.body?.treatment?.attachments || [],
      date: req.body?.date || req.body?.treatment?.date || new Date(),
    };

    // ép medicines về array
    const medicinesArr = Array.isArray(treatment.medicines)
      ? treatment.medicines
      : treatment.medicines
      ? [treatment.medicines]
      : [];

    // tìm dentist id
    let dentistId = null;
    try {
      const dp = await DentistProfile.findOne({ user: req.user.id }).select("_id");
      dentistId = dp?._id || null;
    } catch (_) {}

    const entry = {
      date: treatment.date,
      diagnosis: treatment.diagnosis,
      procedures: Array.isArray(treatment.procedures) ? treatment.procedures : [treatment.procedures],
      medicines: medicinesArr,
      notes: treatment.notes,
      dentist: dentistId,
      attachments: Array.isArray(treatment.attachments) ? treatment.attachments : [treatment.attachments],
    };

    const updateOps = {
      $push: { treatmentHistory: entry },
      $set: {
        treatmentNotes: entry.notes,
        prescriptions: medicinesArr,
        status: "completed", // auto completed
      },
    };

    const updated = await Appointment.findByIdAndUpdate(id, updateOps, {
      new: true,
      runValidators: true,
    })
      .populate("patient", "user")
      .populate({ path: "dentist", select: "specialization user", populate: { path: "user", select: "name email" } })
      .populate("serviceId", "name minPrice maxPrice durationMins discountPercent");

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("appendAppointmentHistory error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


/** 🔎 Admin/Dentist: xem lịch sử bệnh nhân theo ID */
export const getPatientHistoryById = async (req, res) => {
  try {
    const { id } = req.params; // patientId

    const items = await Appointment.find({ patient: id })
      .populate("dentist", "specialization user")
      .populate("serviceId", "name minPrice maxPrice durationMins discountPercent")
      .sort({ startAt: -1 });

    if (!items.length) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch sử của bệnh nhân này",
      });
    }

    res.json({ success: true, data: items });
  } catch (err) {
    console.error("❌ getPatientHistoryById error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/** 📝 Patient: xem lịch sử điều trị */
export const getTreatmentHistoryForPatient = async (req, res) => {
  try {
    const patient = await PatientProfile.findOne({ user: req.user.id }).select("_id");
    if (!patient) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ bệnh nhân" });
    }

    const items = await Appointment.find({
      patient: patient._id,
      status: "completed", // chỉ lấy các lịch đã hoàn tất điều trị
    })
      .select(
        "service startAt timeSlot dentist treatmentNotes prescriptions notes treatmentHistory"
      ) // ✅ thêm field FE cần
      .populate("dentist", "specialization user")
      .populate("serviceId", "name minPrice maxPrice durationMins discountPercent")
      .sort({ startAt: -1 });

    res.json({ success: true, data: items });
  } catch (err) {
    console.error("❌ getTreatmentHistoryForPatient error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};



/** 📅 Patient/Admin tạo lịch hẹn */
export const createAppointment = async (req, res) => {
  try {
    const {
      dentist,
      serviceId,
      service,
      startAt,
      endAt,
      notes,
      name: formName,
      phone: formPhone,
      email: formEmail,
      selectedPrice,        // GIÁ GỐC min/max (nếu có khoảng giá)
      paymentMethod,        // Lưu lựa chọn thanh toán
    } = req.body;

    if (!serviceId && !service) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin dịch vụ" });
    }
    if (!startAt || !endAt) {
      return res.status(400).json({ success: false, message: "Thiếu thời gian bắt đầu/kết thúc" });
    }

    const s = new Date(startAt);
    const e = new Date(endAt);
    if (isNaN(s) || isNaN(e)) {
      return res.status(400).json({ success: false, message: "Định dạng thời gian không hợp lệ" });
    }

    // Lấy dịch vụ
    let svc = null;
    if (serviceId) svc = await Service.findById(serviceId).lean();
    if (!svc && service) svc = await Service.findOne({ name: service }).lean();
    if (!svc) return res.status(404).json({ success: false, message: "Không tìm thấy dịch vụ" });

    // ✅ Tính GIÁ: chỉ giảm 1 lần ở server
    let basePrice = 0;
    if (svc.minPrice === svc.maxPrice) {
      basePrice = Number(svc.minPrice);
    } else {
      if (selectedPrice === undefined || selectedPrice === null || selectedPrice === "") {
        return res.status(400).json({ success: false, message: "Vui lòng chọn giá cụ thể cho dịch vụ" });
      }
      basePrice = Number(selectedPrice);
      // sanity check
      const inRange = basePrice === Number(svc.minPrice) || basePrice === Number(svc.maxPrice);
      if (!inRange) {
        return res.status(400).json({ success: false, message: "Giá chọn không hợp lệ" });
      }
    }
    const servicePrice =
      svc.discountPercent > 0
        ? Math.round(basePrice * (1 - svc.discountPercent / 100))
        : basePrice;

    // Lấy patient
    let patientProfile = null;
    let patientId = null;
    if (req.user.role === "Patient") {
      patientProfile = await PatientProfile.findOne({ user: req.user.id }).populate("user");
      if (!patientProfile) {
        return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ bệnh nhân" });
      }
      patientId = patientProfile._id;
    } else {
      if (!formName || !formPhone) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin bệnh nhân (tên, SĐT)" });
      }
    }

    // Auto-assign dentist nếu cần (giữ logic cũ)
    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const pad = (n) => String(n).padStart(2, "0");
    const weekday = DAYS[s.getDay()];
    const timeStr = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
    let assignedDentistId = dentist || null;

    if (!assignedDentistId) {
      const candidates = await DentistProfile.find({
        workDays: weekday,
        workStart: { $lte: timeStr },
        workEnd:   { $gte: timeStr },
      }).populate("user", "name");

      const freeDentists = [];
      for (const d of candidates) {
        const conflict = await Appointment.findOne({
          dentist: d._id,
          startAt: { $lt: e },
          endAt:   { $gt: s },
          status:  { $in: ["pending", "confirmed"] },
        });
        if (!conflict) freeDentists.push(d);
      }
      if (!freeDentists.length) {
        return res.status(400).json({ success: false, message: "Không có bác sĩ nào trống giờ này" });
      }
      const randomDentist = freeDentists[Math.floor(Math.random() * freeDentists.length)];
      assignedDentistId = randomDentist._id;
      console.log("🎯 Auto assign dentist:", randomDentist.user?.name);
    }

    const toTimeSlot = (st, en) =>
      `${pad(st.getHours())}:${pad(st.getMinutes())} - ${pad(en.getHours())}:${pad(en.getMinutes())}`;

    const appointmentDate = new Date(s);
    appointmentDate.setHours(0, 0, 0, 0);

    let createdSource = "web";
    if (req.user.role === "Admin")   createdSource = "admin";
    if (req.user.role === "Dentist") createdSource = "dentist";

    let appt = await Appointment.create({
      patient: patientId,
      patientName:  formName?.trim() || patientProfile?.user?.name  || "",
      patientPhone: formPhone?.trim() || patientProfile?.phone      || "",
      patientEmail: formEmail?.trim() || patientProfile?.user?.email|| "",
      dentist: assignedDentistId,
      serviceId: svc._id,
      service:   svc.name || service || "",
      servicePrice,                 // ✅ giá đã giảm đúng 1 lần
      startAt: s,
      endAt:   e,
      appointmentDate,
      timeSlot: toTimeSlot(s, e),
      status: "pending",
      notes:  notes || "",
      createdBy: req.user.id,
      createdSource,
      paymentStatus: "unpaid",
      paymentMethod: paymentMethod || "cash",
    });

    appt = await Appointment.findById(appt._id)
      .populate({
        path: "dentist",
        select: "specialization user",
        populate: { path: "user", select: "name email" },
      })
      .lean();

    // ✅ TẠO INVOICE PDF & GỬI MAIL kèm file
    let invoicePath = "";
    try {
      invoicePath = await generateInvoice(appt); // trả về đường dẫn file PDF trên server
      await sendMail({
        to: formEmail || patientProfile?.user?.email,
        subject: "Xác nhận lịch hẹn nha khoa",
        text: `Bạn đã đặt lịch thành công dịch vụ ${svc.name} vào ${s.toLocaleString("vi-VN")}. Giá: ${servicePrice.toLocaleString("vi-VN")}đ.`,
        html: `
          <h2>Xin chào ${formName || patientProfile?.user?.name},</h2>
          <p>Bạn đã đặt lịch thành công dịch vụ: <b>${svc.name}</b></p>
          <p><b>Thời gian:</b> ${s.toLocaleDateString("vi-VN")} lúc ${s.toLocaleTimeString("vi-VN")}</p>
          <p><b>Bác sĩ:</b> ${appt.dentist?.user?.name || "Đang chờ sắp xếp"}</p>
          <p><b>Giá:</b> ${servicePrice.toLocaleString("vi-VN")} đ</p>
          <p>Hóa đơn (PDF) được đính kèm theo email này.</p>
          <br/>
          <p>Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi.</p>
        `,
        attachments: invoicePath
          ? [
              {
                filename: `invoice_${appt._id}.pdf`,
                path: invoicePath,
                contentType: "application/pdf",
              },
            ]
          : [],
      });
    } catch (mailErr) {
      console.error("⚠️ Lỗi tạo/gửi invoice:", mailErr.message);
    }

    res.status(201).json({
      success: true,
      message: "Đặt lịch thành công",
      data: appt,
      downloadUrl: `/api/v1/appointments/${appt._id}/invoice`, // vẫn trả về link download
    });
  } catch (err) {
    console.error("❌ createAppointment error:", err);
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};




/** 📄 Tải file PDF */
export const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate(POPULATE_DENTIST)
      .lean();
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lịch hẹn" });
    }

    const filePath = await generateInvoice(appointment);
    res.download(filePath, `invoice_${appointment._id}.pdf`);
  } catch (err) {
    res.status(500).json({ success: false, message: "Không thể tải PDF" });
  }
};

/** 🔄 Admin/Dentist: cập nhật trạng thái lịch hẹn */
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
    }

    const updated = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate(POPULATE_PATIENT)
      .populate(POPULATE_DENTIST)
      .populate(POPULATE_SERVICE);

    if (!updated) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });
    }

    res.json({ success: true, message: "Cập nhật trạng thái thành công", data: updated });
  } catch (err) {
    console.error("❌ updateAppointmentStatus error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/** 📝 Admin/Dentist: cập nhật lịch sử điều trị (notes, kết quả, thuốc,...) */
export const updateAppointmentHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, treatment } = req.body;

    const updated = await Appointment.findByIdAndUpdate(
      id,
      { $set: { notes, treatmentHistory: treatment || [] } }, // treatmentHistory: bạn nên định nghĩa field này trong model Appointment
      { new: true }
    )
      .populate(POPULATE_PATIENT)
      .populate(POPULATE_DENTIST)
      .populate(POPULATE_SERVICE);

    if (!updated) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });
    }

    res.json({ success: true, message: "Cập nhật lịch sử điều trị thành công", data: updated });
  } catch (err) {
    console.error("❌ updateAppointmentHistory error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};


/** ❌ Hủy lịch (Admin/Dentist) */
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const cancelled = await Appointment.findByIdAndUpdate(
      id,
      { status: "cancelled", cancelReason: reason || "Không rõ" },
      { new: true }
    )
      .populate(POPULATE_PATIENT)
      .populate(POPULATE_DENTIST)
      .populate(POPULATE_SERVICE);

    if (!cancelled)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lịch hẹn" });

    // gửi mail thông báo
    try {
      await sendMail({
        to: cancelled.patientEmail,
        subject: "Lịch hẹn đã bị hủy",
        text: `Lịch hẹn dịch vụ ${cancelled.service} đã bị hủy.\nLý do: ${
          reason || "Không rõ"
        }`,
      });
    } catch (mailErr) {
      console.error("⚠️ Lỗi gửi email hủy:", mailErr.message);
    }

    res.json({ success: true, message: "Đã hủy lịch", data: cancelled });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/** ❌ Hủy lịch (Patient) */
export const cancelAppointmentByPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const patientProfile = await PatientProfile.findOne({ user: req.user.id });
    if (!patientProfile) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy hồ sơ bệnh nhân" });
    }

    const appt = await Appointment.findOne({
      _id: id,
      patient: patientProfile._id,
    });
    if (!appt) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn của bạn",
      });
    }

    if (appt.status === "cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "Lịch này đã bị hủy trước đó" });
    }

    appt.status = "cancelled";
    appt.cancelReason = "Bệnh nhân hủy lịch";
    await appt.save();

    // gửi mail thông báo
    try {
      await sendMail({
        to: appt.patientEmail,
        subject: "Bạn đã hủy lịch hẹn",
        text: `Bạn đã hủy lịch hẹn dịch vụ ${appt.service} vào ${appt.timeSlot}`,
      });
    } catch (mailErr) {
      console.error("⚠️ Lỗi gửi email patient hủy:", mailErr.message);
    }

    res.json({ success: true, message: "Bạn đã hủy lịch hẹn thành công" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/** 👤 Patient: xem lịch của mình */
export const getMyAppointmentsForPatient = async (req, res) => {
  try {
    const patient = await PatientProfile.findOne({
      user: req.user.id,
    }).select("_id");
    if (!patient)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bệnh nhân" });

    const items = await Appointment.find({ patient: patient._id })
      .populate(POPULATE_DENTIST)
      .populate(POPULATE_SERVICE)
      .sort({ startAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/** 🦷 Dentist: xem lịch của mình */
export const getMyAppointmentsForDentist = async (req, res) => {
  try {
    const dentist = await DentistProfile.findOne({
      user: req.user.id,
    }).select("_id");
    if (!dentist)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bác sĩ" });

    const items = await Appointment.find({ dentist: dentist._id })
      .populate(POPULATE_PATIENT)
      .populate(POPULATE_SERVICE)
      .sort({ startAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
