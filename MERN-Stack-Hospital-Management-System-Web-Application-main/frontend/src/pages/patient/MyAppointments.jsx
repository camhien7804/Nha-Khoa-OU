import { useEffect, useState } from "react";
import api from "../../api";

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load appointments của patient
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get("/appointments/me");
        if (mounted) setAppointments(res.data?.data || []);
      } catch (err) {
        console.error("❌ Lỗi khi tải lịch hẹn:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => (mounted = false);
  }, []);

  // 📌 Gọi API hủy lịch (Patient)
const handleCancel = async (id) => {
  if (!window.confirm("Bạn có chắc muốn hủy lịch này không?")) return;

  try {
    const res = await api.delete(`/appointments/${id}/cancel/patient`);

    if (res?.data?.success) {
      alert("✅ Đã hủy lịch hẹn thành công");
      // cập nhật lại state để không cần reload trang
      setAppointments((prev) =>
        prev.map((appt) =>
          appt._id === id ? { ...appt, status: "cancelled" } : appt
        )
      );
    } else {
      alert(res?.data?.message || "❌ Không thể hủy lịch hẹn");
    }
  } catch (err) {
    console.error("❌ Hủy lịch lỗi:", err.response?.data || err.message);
    alert(
      err.response?.data?.message ||
        "Có lỗi xảy ra khi hủy lịch. Vui lòng thử lại."
    );
  }
};


  if (loading) return <p className="text-center py-6">Đang tải lịch hẹn...</p>;

  if (!appointments.length)
    return <p className="text-center py-6">Bạn chưa có lịch hẹn nào.</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-green-700">
        Lịch sử đặt lịch
      </h2>
      <div className="space-y-4">
        {appointments.map((appt) => (
          <div
            key={appt._id}
            className="border rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-semibold">{appt.service}</p>
              <p>
                <span className="font-medium">Bác sĩ:</span>{" "}
                {appt.dentist?.user?.name || "Đang phân công"}
              </p>
              <p>
                <span className="font-medium">Ngày:</span>{" "}
                {new Date(appt.startAt).toLocaleDateString("vi-VN")}
              </p>
              <p>
                <span className="font-medium">Giờ:</span> {appt.timeSlot}
              </p>
              <p>
                <span className="font-medium">Trạng thái:</span>{" "}
                <span
                  className={
                    appt.status === "cancelled"
                      ? "text-red-600"
                      : appt.status === "completed"
                      ? "text-green-600"
                      : "text-blue-600"
                  }
                >
                  {appt.status}
                </span>
              </p>
            </div>

            {/* Action */}
            <div className="mt-3 md:mt-0 flex gap-2">
              {appt.status !== "cancelled" && (
                <button
                  onClick={() => handleCancel(appt._id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Hủy lịch
                </button>
              )}
              <a
                href={`/api/v1/appointments/${appt._id}/invoice`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
              >
                Hóa đơn
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
