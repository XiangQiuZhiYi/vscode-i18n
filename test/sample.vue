<template>
  <div>
    <h1>{{ $t('用户登录') }}</h1>
    <p>{{ $t('description.text') }}</p>
    <button @click="handleClick">{{ $t('button.click') }}</button>
    <!-- 重复的 key -->
    <span>{{ $t('welcome.message') }}</span>
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