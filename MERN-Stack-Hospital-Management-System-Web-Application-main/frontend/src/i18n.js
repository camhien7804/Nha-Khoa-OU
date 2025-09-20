import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import dictionary from "./locales/dictionary.json";

// Hàm tìm chuỗi dịch: nếu không có thì trả lại gốc
const translateFunc = (key) => {
  return dictionary[key] || key;
};

i18n
  .use(initReactI18next)
  .init({
    lng: "vi",
    fallbackLng: "vi",
    interpolation: { escapeValue: false },
    resources: {
      vi: { translation: {} },
      en: { translation: dictionary }
    }
  });

// Gắn hàm auto vào i18n để dịch bất kỳ text nào
i18n.autoTranslate = (text) => translateFunc(text);

export default i18n;
