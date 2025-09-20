// frontend/src/pages/ServiceDetail.jsx 
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";

export default function ServiceDetail() {
  const { t } = useTranslation();
  const { category, slug } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    async function load() {
      if (!slug) return;
      setLoading(true);
      try {
        const res = await api.get(`/services/${slug}`);
        setService(res.data.data);
      } catch (err) {
        console.error("load service detail", err);
        setService(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) return <div className="p-6">{t("Đang tải...")}</div>;
  if (!service) return <div className="p-6">{t("Không tìm thấy dịch vụ")}</div>;

  // Hàm tính giá sau giảm
  const calcDiscount = (price, percent) => {
    if (!percent || percent <= 0) return price;
    const v = Math.round((price * (100 - percent)) / 100);
    return Math.round(v / 1000) * 1000; // làm tròn nghìn
  };

  return (
    <div className="p-6">
      {/* breadcrumb */}
      <nav className="text-sm text-gray-500 mb-2">
        {t("Trang chủ")} &gt; {t("Dịch vụ")} &gt;{" "}
        {service.category} &gt; {service.title || service.name}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* main content */}
        <div className="lg:col-span-2 bg-white rounded shadow p-4">
          {/* gallery */}
          <div className="mb-4">
            <img
              src={
                service.image ||
                (service.gallery && service.gallery[0]) ||
                "/images/placeholder.png"
              }
              alt={service.title}
              className="w-full max-h-80 object-contain rounded bg-white"
            />
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">
              {t("Nội dung dịch vụ")}
            </h2>
            <div
              dangerouslySetInnerHTML={{
                __html:
                  service.description ||
                  service.detail?.content?.map((c) => c.text || "").join("<p/>") ||
                  `<p>${t("Chưa có mô tả")}</p>`,
              }}
            />
          </div>
        </div>

        {/* sidebar */}
        <aside className="bg-white rounded shadow p-4">
          <div className="text-orange-300 text-xs font-semibold mb-2">
            {t("Giá dịch vụ")}
          </div>

          {/* ✅ Giá có tính giảm giá */}
          <div className="mb-2">
            {service.discountPercent > 0 ? (
              <>
                {/* Giá sau giảm */}
                <div className="text-2xl font-bold text-blue-700">
                  {service.minPrice && service.maxPrice
                    ? `${calcDiscount(
                        service.minPrice,
                        service.discountPercent
                      ).toLocaleString("vi-VN")}đ – ${calcDiscount(
                        service.maxPrice,
                        service.discountPercent
                      ).toLocaleString("vi-VN")}đ`
                    : service.minPrice
                    ? `${calcDiscount(
                        service.minPrice,
                        service.discountPercent
                      ).toLocaleString("vi-VN")}đ`
                    : t("Liên hệ")}
                </div>

                {/* Giá gốc gạch ngang */}
                <div className="text-gray-400 line-through text-sm">
                  {service.minPrice && service.maxPrice
                    ? `${Number(service.minPrice).toLocaleString(
                        "vi-VN"
                      )}đ – ${Number(service.maxPrice).toLocaleString(
                        "vi-VN"
                      )}đ`
                    : service.minPrice
                    ? `${Number(service.minPrice).toLocaleString("vi-VN")}đ`
                    : ""}
                </div>

                {/* Nhãn giảm giá */}
                <div className="text-sm text-red-600 font-medium">
                  {t("Giảm")} {service.discountPercent}%
                </div>
              </>
            ) : (
              // Không có giảm giá
              <div className="text-2xl font-bold text-blue-700">
                {service.minPrice && service.maxPrice
                  ? `${Number(service.minPrice).toLocaleString(
                      "vi-VN"
                    )}đ – ${Number(service.maxPrice).toLocaleString("vi-VN")}đ`
                  : service.minPrice
                  ? `${Number(service.minPrice).toLocaleString("vi-VN")}đ`
                  : t("Liên hệ")}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <div>
              <b>{t("Đơn vị")}:</b>{" "}
              {service.detail?.unit || t("Liệu trình")}
            </div>
            <div>
              <b>{t("Danh mục")}:</b>{" "}
              {service.category || t("Khác")}
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {service.detail?.shortNotes || ""}
            </div>
          </div>

          <div className="space-y-2">
            <a
              href={`tel:19008059`}
              className="block px-4 py-2 bg-green-700 text-white rounded text-center"
            >
              📞 {t("Gọi ngay")}
            </a>
            <button
              onClick={() => {
                nav(`/dat-lich?serviceId=${service._id || service.slug}`);
              }}
              className="w-full px-4 py-2 bg-green-50 text-green-700 rounded"
            >
              📅 {t("Đặt lịch ngay")}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
