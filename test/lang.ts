import VueI18n from "vue-i18n";
const cn: VueI18n.LocaleMessageObject = {
  "用户登录": "用户登录",
  "请输入用户名": "请输入用户名",
  "请输入密码": "请输入密码",
  "登录": "登录",
  "button.clicked": "button.clicked",
  "welcome.message": "welcome.message"
};
const en: VueI18n.LocaleMessageObject = {
  "用户登录": "用户登录_en",
  "请输入用户名": "请输入用户名_en",
  "请输入密码": "请输入密码_en",
  "登录": "登录_en",
  "button.clicked": "button.clicked_en",
  "welcome.message": "welcome.message_en"
};
const i18n: VueI18n.I18nOptions = {
  messages: {
    cn,
    en
  }
};
export default i18n;