// router/appointmentRoutes.js
import express from "express";
import {
  createAppointment,
  downloadInvoice,
  cancelAppointment,
  cancelAppointmentByPatient,
  getMyAppointmentsForPatient,
  getMyAppointmentsForDentist,
  getTreatmentHistoryForPatient,
  getPatientHistoryById,
  updateAppointmentStatus,
  updateAppointmentHistory,
  appendAppointmentHistory,
} from "../controller/appointmentController.js";

import { isAuthenticatedUser, authorizeRoles } from "../middlewares/auth.js";

const router = express.Router();

/** 📅 Tạo lịch hẹn */
router.post("/", isAuthenticatedUser, createAppointment);

/** 👤 Patient: xem lịch hẹn của mình */
router.get("/me", isAuthenticatedUser, getMyAppointmentsForPatient);

/** 👤 Patient: lịch sử điều trị */
router.get("/history/me", isAuthenticatedUser, getTreatmentHistoryForPatient);

/** 🦷 Dentist: lịch của tôi */
router.get(
  "/dentist/me",
  isAuthenticatedUser,
  authorizeRoles("Dentist"),
  getMyAppointmentsForDentist
);


/** 🔎 Admin/Dentist: xem lịch sử bệnh nhân */
router.get(
  "/patient/:id/history",
  isAuthenticatedUser,
  authorizeRoles("Admin", "Dentist"),
  getPatientHistoryById
);

/** 🔁 Admin/Dentist: cập nhật trạng thái */
router.put(
  "/:id/status",
  isAuthenticatedUser,
  authorizeRoles("Admin", "Dentist"),
  updateAppointmentStatus
);

/** 🔁 Admin/Dentist: cập nhật lịch sử điều trị */
// router.put(
//   "/:id/history",
//   isAuthenticatedUser,
//   authorizeRoles("Admin", "Dentist"),
//   updateAppointmentHistory
// );

router.put(
  "/:id/history",
  isAuthenticatedUser,
  authorizeRoles("Admin", "Dentist"),
  appendAppointmentHistory
);



/** ❌ Hủy lịch (Admin/Dentist) */
router.delete(
  "/:id",
  isAuthenticatedUser,
  authorizeRoles("Admin", "Dentist"),
  cancelAppointment
);

/** ❌ Hủy lịch (Patient) */
router.delete("/:id/cancel/patient", isAuthenticatedUser, authorizeRoles("Patient"), cancelAppointmentByPatient);


/** 📄 Tải file PDF hóa đơn */
router.get("/:id/invoice", downloadInvoice);

export default router;
