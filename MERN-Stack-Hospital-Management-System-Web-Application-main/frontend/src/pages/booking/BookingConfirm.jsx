import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function BookingConfirm() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Nếu có appointmentId từ MoMo thì ok, còn không thì về lịch sử đặt lịch
    const query = new URLSearchParams(location.search);
    const orderId = query.get("orderId");
    if (!orderId) {
      navigate("/patient/appointments");
      return;
    }

    // Tách appointmentId từ orderId (dạng: <appointmentId>_<timestamp>)
    const appointmentId = orderId.split("_")[0];
    if (!appointmentId) {
      navigate("/patient/appointments");
      return;
    }

    // Sau thanh toán thành công → quay về danh sách
    navigate("/patient/appointments");
  }, [location.search, navigate]);

  return (
    <div className="p-6 text-center">
      <h2 className="text-xl font-bold text-green-700">Đang xử lý thanh toán...</h2>
      <p>Bạn sẽ được chuyển hướng về lịch sử đặt lịch.</p>
    </div>
  );
}
