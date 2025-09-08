# vscode-i18n README

## 功能

此扩展帮助您从 Vue.js 项目中提取和管理 i18n 文本。它提供以下功能：

1. **提取 i18n 文本**：自动从文件中提取 i18n 文本。
3. **编辑 i18n 条目**：直接在 Webview 面板中编辑 i18n 条目。
4. **保存到语言文件**：将编辑的 i18n 条目保存到语言文件中。
5. **刷新数据**：从源文件和语言文件中刷新数据。
6. **删除条目**：删除不再需要的 i18n 条目。

## 适配项目

### 选择 $t 模式

```js
// vue - $t() 函数
<template>
  <div>
    <h1>{{ $t('用户登录') }}</h1>
    <p>{{ $t('请输入用户名') }}</p>
    <button @click="handleClick">{{ $t('请输入密码') }}</button>
    <!-- 重复的 key -->
    <span>{{ $t('登录') }}</span>
  </div>
</template>

// lang 文件
import VueI18n from "vue-i18n";
const cn: VueI18n.LocaleMessageObject = {
};
const en: VueI18n.LocaleMessageObject = {
};
const i18n: VueI18n.I18nOptions = {
  messages: {
    cn,
    en
  }
};
export default i18n;
```

### 选择 $lang[] 模式

```js
// vue - $lang[] 数组
<div :class="styles.container">
	<van-tabs sticky v-model="activeFileTab" @change="changeFileTab">
		<van-tab :title="$lang['学生资料库']" name="all">
			<ResourceItem type="all" />
		</van-tab>
		<van-tab :title="$lang['分享给我的']" name="share">
			<ResourceItem type="share" />
		</van-tab>
	</van-tabs>
</div>


// lang.cn.js 文件
const $lang = {
};
export default $lang;

// lang.en.js 文件
const $lang = {
};
export default $lang;

```

### 选择 t() 函数模式

```js
// react - t() 函数
import { t } from 'i18next';

const App = () => {
  return (
    <div>
      <h1>{t('用户登录')}</h1>
      <p>{t('请输入用户名')}</p>
      <button onClick={handleClick}>{t('请输入密码')}</button>
      <span>{t('登录')}</span>
    </div>
  );
};

// lang 文件
const message = {
  cn: {
  },
  en: {
  },
}
export default message
```

## 使用方法

以下是如何使用此扩展的演示：

<img src="https://github.com/XiangQiuZhiYi/vscode-i18n/blob/main/Demonstration.gif" controls></img>
