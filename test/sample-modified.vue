<template>
  <div class="login-container">
    <h1>{{ $t('用户登录') }}</h1>
    <el-form ref="loginForm" :model="loginForm" :rules="loginRules" class="login-form">
      <el-form-item prop="username">
        <el-input
          v-model="loginForm.username"
          :placeholder="$t('请输入用户名')"
          prefix-icon="el-icon-user"
          clearable
        />
      </el-form-item>
      <el-form-item prop="password">
        <el-input
          v-model="loginForm.password"
          :placeholder="$t('请输入密码')"
          prefix-icon="el-icon-lock"
          show-password
          clearable
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          style="width: 100%"
          :loading="loading"
          @click="handleLogin"
        >
          {{ $t('登录') }}
        </el-button>
      </el-form-item>
    </el-form>
    <p>{{ $t('description.text') }}</p>
    <button @click="handleClick">{{ $t('button.click') }}</button>
    <div>{{ $t('welcome.message') }}</div>
  </div>
</template>

<script>
export default {
  name: 'LoginPage',
  data() {
    return {
      loginForm: {
        username: '',
        password: ''
      },
      loginRules: {
        username: [
          { required: true, message: this.$t('请输入用户名'), trigger: 'blur' }
        ],
        password: [
          { required: true, message: this.$t('请输入密码'), trigger: 'blur' }
        ]
      },
      loading: false
    }
  },
  methods: {
    handleLogin() {
      this.$message.success(this.$t('登录成功'))
      // 登录逻辑
    },
    handleClick() {
      this.$message.info(this.$t('按钮被点击了'))
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f5f5f5;
}

.login-form {
  width: 300px;
  padding: 20px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
</style>