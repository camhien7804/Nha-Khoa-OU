import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

function roleHome(role) {
  if (role === "Admin") return "/admin";
  if (role === "Dentist") return "/dentist";
  return "/dashboard"; // Patient/khác
}

export default function TopHeader() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const { t, i18n } = useTranslation();

  const changeLang = (lng) => {
    i18n.changeLanguage(lng);
  };


  const loginHref = `/login?redirect=${encodeURIComponent(
    loc.pathname + (loc.search || "")
  )}`;

  const doLogout = async () => {
    await logout();
    setOpen(false);
    nav("/", { replace: true });
  };

  return (
    <div
      className="bg-gradient-to-r from-green-50 via-green-100 to-blue-50 
                 shadow-sm border-b border-gray-200 
                 py-3 px-4 flex justify-between items-center"
    >
      {/* Logo + tên */}
      <a href="/" className="flex items-center space-x-2">
        <img
          src="/images/logo.png"
          alt="Nha Khoa OU"
          className="h-10 w-auto object-contain"
        />
        <span className="text-lg font-bold text-green-700">{t("Nha Khoa OU")}</span>
      </a>

      {/* Hotline + Đặt lịch + User + Google Translate */}
      <div className="flex items-center space-x-3">
        <a
          href="tel:19001234"
          className="hidden md:flex items-center px-4 py-2 bg-green-100 text-green-700 font-semibold rounded-full hover:bg-green-200 transition"
        >
          📞 1900 1234
        </a>

        <Link
          to="/dat-lich"
          className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-green-600 text-white shadow hover:opacity-90 transition"
        >
          {t("Đặt lịch hẹn")}
        </Link>
            
            <button onClick={() => i18n.changeLanguage("vi")}>🇻🇳 VI</button>
            <button onClick={() => i18n.changeLanguage("en")}>🇬🇧 EN</button>

        {!user ? (
          <Link
            to={loginHref}
            className="px-4 py-2 rounded-full border border-green-600 text-green-700 hover:bg-green-50 transition"
          >
            {t("Đăng nhập")}
          </Link>
        ) : (
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 rounded-full border hover:bg-gray-50 transition"
            >
              <span className="w-7 h-7 rounded-full bg-green-600/10 grid place-content-center text-green-700 font-semibold">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </span>
              <span className="hidden sm:flex flex-col items-start leading-4 text-left">
                <b className="text-sm">{user?.name || user?.email}</b>
                <i className="text-[11px] text-gray-500">
                  {user?.role || "User"}
                </i>
              </span>
              <svg
                className="w-4 h-4 opacity-60"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
              </svg>
            </button>

            {/* Dropdown user */}
            <div
              className={`absolute right-0 mt-2 w-64 bg-white border rounded-xl shadow-xl z-[70] 
                          origin-top-right transform transition-all duration-200 ease-out
                          ${
                            open
                              ? "opacity-100 scale-100"
                              : "opacity-0 scale-95 pointer-events-none"
                          }`}
              onMouseLeave={() => setOpen(false)}
            >
              <Link
                to={roleHome(user?.role)}
                className="block px-4 py-2 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                {t("Về trang Cá nhân")}
              </Link>
              {user?.role === "Admin" && (
                <>
                  <Link
                    to="/admin/doctors"
                    className="block px-4 py-2 hover:bg-gray-50"
                  >
                    {t("Quản lý bác sĩ")}
                  </Link>
                  <Link
                    to="/admin/services"
                    className="block px-4 py-2 hover:bg-gray-50"
                  >
                    {t("Quản lý dịch vụ")}
                  </Link>
                  <Link
                    to="/admin/inventory"
                    className="block px-4 py-2 hover:bg-gray-50"
                  >
                    {t("Kho vật tư")}
                  </Link>
                  <Link
                    to="/admin/posts"
                    className="block px-4 py-2 hover:bg-gray-50"
                  >
                    {t("Quản lý bài viết")}
                  </Link>
                  <Link
                    to="/admin/users"
                    className="block px-4 py-2 hover:bg-gray-50"
                  >
                    {t("Quản lý người dùng")}
                  </Link>
                </>
              )}
              {user?.role === "Dentist" && (
                <Link
                  to="/dentist/patient-history"
                  className="block px-4 py-2 hover:bg-gray-50"
                >
                  {t("Tra cứu lịch sử bệnh nhân")}
                </Link>
              )}
              {!user?.role || user?.role === "Patient" ? (
                <Link
                  to="/patient/history"
                  className="block px-4 py-2 hover:bg-gray-50"
                >
                  {t("Lịch sử điều trị")}
                </Link>
              ) : null}
              <button
                onClick={doLogout}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600"
              >
                {t("Đăng xuất")}
              </button>
            </div>           
          </div>
        )}
      </div>
    </div>
  );
}
