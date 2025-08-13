<template>
  <div>
    <h1>{{ $t('用户登录') }}</h1>
    <p>{{ $t('请输入用户名') }}</p>
    <button @click="handleClick">{{ $t('请输入密码') }}</button>
    <!-- 重复的 key -->
    <span>{{ $t('登录') }}</span>
  </div>
</template>

<script>
export default {
  name: 'SampleComponent',
  methods: {
    handleClick() {
      console.log(this.$t('button.clicked'));
      // 重复的 key
      console.log(this.$t('welcome.message'));
    }
  }
}
</script>

<style>
div {
  padding: 20px;
}
</style>