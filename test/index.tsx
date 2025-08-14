import { Component, Prop, Vue, Emit } from 'vue-property-decorator'
import { Button, Modal, Radio, Form } from 'ant-design-vue'
import styles from './index.module.less'
import i18n from './lang'
import { StudentsNet } from '@/api/apis/Students'

interface Params {
	students: number[]
}

@Component({ name: 'ResetPassword', i18n })
export default class ResetPassword extends Vue {
	visible: boolean = false
	params: Params | null = null
	form!: any // Form 实例

	handleOpen(params: Params) {
		this.params = params
		this.visible = true
	}

	created() {
		this.form = this.$form.createForm(this, {
			name: 'resetPasswordForm',
			onValuesChange: (props, values) => {
				// 表单值变化时的处理
			},
		})
	}

	// 上一步
	@Emit('prev')
	handlePrev() {}

	// 确定
	@Emit('confirm')
	async handleConfirm() {
		const value = this.form.getFieldsValue()
		const res = await StudentsNet.BatchStuRestPwd({ ...this.params, ...value })
		this.form.resetFields()
		this.visible = false
		return res
	}

	handleCancel() {
		this.visible = false
	}

	render() {
		const h = this.$createElement
		const { getFieldDecorator } = this.form
		return (
			<Modal
				title={this.$t('重置密码方式')}
				visible={this.visible}
				maskClosable={false}
				footer={
					<div class={styles.footer}>
						<Button type="primary" onClick={this.handleConfirm}>
							{this.$t('确定')}
						</Button>
						{/* <Button onClick={this.handlePrev}>{this.$t('上一步')}</Button> */}
						<Button onClick={this.handleCancel}>{this.$t('取消')}</Button>
					</div>
				}
				width={1000}
				wrapClassName={styles.modalWrapper}
				onCancel={this.handleCancel}
			>
				<div class={styles.content}>
					{/* 登录密码选项 */}
					<Form class={styles.form} layout="inline">
						{/* 登录密码选项 */}
						<Form.Item label={this.$t('登录密码')} class={styles.formItem}>
							{getFieldDecorator('useDefaultPassword', {
								initialValue: true,
							})(
								<Radio.Group class={styles.radioGroup}>
									<Radio value={true}>{this.$t('默认密码')} "Hello"</Radio>
									<Radio value={false}>{this.$t('随机密码')}</Radio>
								</Radio.Group>
							)}
						</Form.Item>

						{/* 发送短信选项 */}
						<Form.Item label={this.$t('发送短信')} class={styles.formItem}>
							{getFieldDecorator('notice', {
								initialValue: true,
							})(
								<Radio.Group class={styles.radioGroup}>
									<Radio value={true}>{this.$t('是（将重置密码发给对应学生）')}</Radio>
									<Radio value={false}>{this.$t('否')}</Radio>
								</Radio.Group>
							)}
						</Form.Item>
					</Form>
				</div>
			</Modal>
		)
	}
}
