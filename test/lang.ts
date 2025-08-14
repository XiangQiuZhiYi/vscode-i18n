import VueI18n from "vue-i18n";
const cn: VueI18n.LocaleMessageObject = {
  请输入用户名: "请输入用户名",
  请输入密码: "请输入密码",
  登录: "登录",
  "description.text": "description.text",
  "button.click": "button.click",
  "welcome.message": "welcome.message",
  用户登录: "用户登录",
  "button.clicked": "button.clicked"
};
const en: VueI18n.LocaleMessageObject = {
  请输入用户名: "Please Input Name",
  请输入密码: "Please Input Password",
  登录: "Log In",
  "description.text": "description.text_en",
  "button.click": "button.click_en",
  "welcome.message": "welcome.message_en",
  用户登录: "Login",
  "button.clicked": "button.clicked_en"
};
const i18n: VueI18n.I18nOptions = {
  messages: {
    cn,
    en
  }
};
export default i18n;