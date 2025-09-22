import React, { useEffect} from 'react'

import { useIsCn } from '@/store'
import useLanguage from '@/language/useLanguage'

import lang from './lang-vue'
import { BdModal } from 'next-business-components'
import { Form, Input } from 'antd'
import { ActivityExperienceCreateActivityExperienceOrgType } from '@/client/api/ActivityExperience/apis/ActivityExperienceCreateActivityExperienceOrgType'
import { UpdateActivityExperienceOrgTypeid } from '@/client/api/ActivityExperience/apis/UpdateActivityExperienceOrgTypeid'
import { SimpleStruct } from '@/client/api/ActivityExperience/Type/SimpleStruct'
import { MountComponentShow } from '@/components/MountComponent'
import { IProps } from 'ahooks/lib/useWhyDidYouUpdate'
import { SISBdModal } from '@/components/SISModal'

interface Props {
  visible: boolean
  params?: SimpleStruct
  title: string
  type: string
  onClose: () => void
  onOk: () => void
}

const EditModal: React.FC<Props> = props => {
  const { visible, params, title, type, onClose, onOk } = props
  const isCn = useIsCn()
  const { t } = useLanguage(lang)
  const [form] = Form.useForm()

  const onFinish = (values: any) => {
    console.log('Success:', values)
  }

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo)
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    if (type === 'add') {
      await ActivityExperienceCreateActivityExperienceOrgType(values)
    } else if (type === 'edit') {
      await UpdateActivityExperienceOrgTypeid(params?.id || 0, values)
    }
    onOk()
  }

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        name: params?.name || '',
        eName: params?.eName || '',
      })
    } else {
      form.resetFields()
    }
  }, [visible])

  return (
    <SISBdModal
      title={title}
      visible={visible}
      maskClosable={true}
      onCancel={onClose}
      onOk={handleOk}
      cancelText={t('取消')}
      okText={t('保存')}
      width={560}
    >
      <Form
        form={form}
        name="basic"
        labelCol={{ span: isCn ? 4 : 6 }}
        wrapperCol={{ span: isCn ? 20 : 18 }}
        initialValues={{ remember: true }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
      >
        <Form.Item label={t('中文名称')} name="name" rules={[{ required: true, message: t('请输入') }]}>
          <Input placeholder={t('请输入中文名称，限制 32 个字符')} />
        </Form.Item>

        <Form.Item label={t('英文名称')} name="eName" rules={[{ required: true, message: t('请输入') }]}>
          <Input placeholder={t('请输入英文名称，限制 64 个字符')} />
        </Form.Item>
      </Form>
    </SISBdModal>
  )
}

export default React.memo(EditModal)

export const EditModalShow = (props: Props) => MountComponentShow(EditModal, props)
