import { Link } from "react-router-dom";
import { FaFacebookF, FaYoutube, FaInstagram } from "react-icons/fa";
import { SiZalo } from "react-icons/si";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-[#1E2A5A] text-white mt-12 text-sm">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Logo + Thông tin công ty */}
        <div>
          <img src="/images/logo.png" alt={t("Nha khoa")} className="h-12 mb-3" />
          <p className="mb-2 font-semibold">{t("Công ty chủ quản: CÔNG TY CỔ PHẦN Y TẾ OU")}</p>
          <p>{t("Địa chỉ: 123 Đường ABC, P. Võ Thị Sáu, Q3, TP. Hồ Chí Minh.")}</p>
          <p>{t("Email: it@nhakhoaou.com")}</p>
          <p>{t("CMSDN: 12345678 do Sở KH&ĐT TP.HCM cấp ngày 01/01/2019, sửa đổi lần 7 ngày 01/01/2022.")}</p>
          <p className="text-xs mt-2 italic">{t("Hiệu quả điều trị phụ thuộc vào cơ địa mỗi người (*)")}</p>
        </div>

        {/* Giới thiệu */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{t("Giới thiệu")}</h3>
          <ul className="space-y-2">
            <li>
              <Link to="/gioi-thieu" className="hover:underline">
                {t("Về Chúng Tôi")}
              </Link>
            </li>
            <li>
              <Link to="/bang-gia" className="hover:underline">
                {t("Bảng Giá Dịch Vụ")}
              </Link>
            </li>
            <li>
              <Link to="/kien-thuc" className="hover:underline">
                {t("Kiến Thức Nha Khoa")}
              </Link>
            </li>
            <li>
              <Link to="/chinh-sach-bao-mat" className="hover:underline">
                {t("Chính sách bảo mật")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Hệ thống phòng khám */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{t("Hệ thống phòng khám")}</h3>
          <ul className="space-y-1">
            <li>{t("Tp. Hồ Chí Minh")}</li>
            <li>{t("Hà Nội")}</li>
            <li>{t("Các Tỉnh")}</li>
          </ul>
          <h4 className="text-lg font-semibold mt-4 mb-1">{t("Giờ làm việc")}</h4>
          <p>{t("Từ 8:30 tới 18:30 tất cả các ngày trong tuần")}</p>
        </div>

        {/* Liên hệ */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{t("Liên hệ")}</h3>
          <p className="mb-2">
            {t("HOTLINE:")}{" "}
            <a href="tel:19001234" className="underline">
              1900 1234
            </a>
          </p>
          <div className="flex gap-4 text-xl">
            <a href="https://facebook.com" target="_blank" rel="noreferrer">
              <FaFacebookF />
            </a>
            <a href="https://zalo.me" target="_blank" rel="noreferrer">
              <SiZalo />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer">
              <FaYoutube />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              <FaInstagram />
            </a>
          </div>
        </div>
      </div>

      {/* Bản quyền */}
      <div className="bg-[#162040] text-center text-xs py-3">
        {t("Người chịu trách nhiệm nội dung: Giám đốc Nguyễn Văn ABC - SĐT: 1900 1234")}
      </div>
    </footer>
  );
}
